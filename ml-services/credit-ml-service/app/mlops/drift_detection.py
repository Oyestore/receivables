"""
Model Drift Detection

Monitors model performance degradation using Population Stability Index (PSI)
and other statistical metrics.

Features:
- Feature drift detection (PSI)
- Prediction drift detection
- Automated alerting
- Drift visualization
"""

import numpy as np
import pandas as pd
import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import json
from pathlib import Path

logger = logging.getLogger(__name__)


class DriftDetector:
    """
    Detect model drift using statistical methods
    
    PSI (Population Stability Index):
    - PSI < 0.1: No significant drift
    - PSI 0.1-0.25: Moderate drift (investigate)
    - PSI > 0.25: Significant drift (retrain model)
    """
    
    def __init__(
        self,
        psi_threshold: float = 0.1,
        reference_data_path: Optional[str] = None
    ):
        """
        Initialize drift detector
        
        Args:
            psi_threshold: PSI threshold for drift detection
            reference_data_path: Path to reference distribution data
        """
        self.psi_threshold = psi_threshold
        self.reference_distributions = {}
        
        if reference_data_path:
            self.load_reference_distributions(reference_data_path)
            
        logger.info(f"DriftDetector initialized (PSI threshold: {psi_threshold})")
        
    def calculate_psi(
        self,
        expected_dist: np.ndarray,
        actual_dist: np.ndarray,
        epsilon: float = 1e-10
    ) -> float:
        """
        Calculate Population Stability Index
        
        PSI = sum((actual% - expected%) * ln(actual% / expected%))
        
       Args:
            expected_dist: Expected distribution (from training)
            actual_dist: Actual distribution (from production)
            epsilon: Small value to avoid division by zero
            
        Returns:
            PSI value
        """
        # Normalize to probabilities
        expected_pct = expected_dist / (np.sum(expected_dist) + epsilon)
        actual_pct = actual_dist / (np.sum(actual_dist) + epsilon)
        
        # Add epsilon to avoid log(0)
        expected_pct = np.clip(expected_pct, epsilon, 1)
        actual_pct = np.clip(actual_pct, epsilon, 1)
        
        # Calculate PSI
        psi = np.sum(
            (actual_pct - expected_pct) * np.log(actual_pct / expected_pct)
        )
        
        return float(psi)
        
    def detect_feature_drift(
        self,
        feature_name: str,
        current_values: np.ndarray,
        n_bins: int = 10
    ) -> Dict:
        """
        Detect drift in a specific feature
        
        Args:
            feature_name: Name of the feature
            current_values: Current feature values
            n_bins: Number of bins for histogram
            
        Returns:
            Dictionary with drift metrics
        """
        if feature_name not in self.reference_distributions:
            logger.warning(f"No reference distribution for feature: {feature_name}")
            return {
                "feature": feature_name,
                "psi": None,
                "drifted": False,
                "error": "No reference distribution"
            }
            
        # Get reference distribution
        reference = self.reference_distributions[feature_name]
        bins = reference.get("bins")
        expected_dist = reference.get("distribution")
        
        # Calculate current distribution
        actual_dist, _ = np.histogram(current_values, bins=bins)
        
        # Calculate PSI
        psi = self.calculate_psi(expected_dist, actual_dist)
        
        return {
            "feature": feature_name,
            "psi": psi,
            "drifted": psi > self.psi_threshold,
            "threshold": self.psi_threshold,
            "severity": self._categorize_psi(psi)
        }
        
    def detect_prediction_drift(
        self,
        predictions: np.ndarray,
        n_bins: int = 10
    ) -> Dict:
        """
        Detect drift in model predictions
        
        Args:
            predictions: Model predictions
            n_bins: Number of bins
            
        Returns:
            Dictionary with drift metrics
        """
        if "predictions" not in self.reference_distributions:
            logger.warning("No reference distribution for predictions")
            return {
                "psi": None,
                "drifted": False,
                "error": "No reference distribution"
            }
            
        # Get reference
        reference = self.reference_distributions["predictions"]
        bins = reference.get("bins")
        expected_dist = reference.get("distribution")
        
        # Calculate current distribution
        actual_dist, _ = np.histogram(predictions, bins=bins)
        
        # Calculate PSI
        psi = self.calculate_psi(expected_dist, actual_dist)
        
        return {
            "psi": psi,
            "drifted": psi > self.psi_threshold,
            "threshold": self.psi_threshold,
            "severity": self._categorize_psi(psi)
        }
        
    def detect_multivariate_drift(
        self,
        features: pd.DataFrame
    ) -> Dict:
        """
        Detect drift across multiple features
        
        Args:
            features: DataFrame with current features
            
        Returns:
            Dictionary with overall drift metrics
        """
        results = []
        drifted_features = []
        
        for feature_name in features.columns:
            result = self.detect_feature_drift(
                feature_name,
                features[feature_name].values
            )
            
            if result.get("drifted"):
                drifted_features.append(result)
                
            results.append(result)
            
        # Overall metrics
        valid_psis = [r["psi"] for r in results if r["psi"] is not None]
        avg_psi = np.mean(valid_psis) if valid_psis else None
        max_psi = np.max(valid_psis) if valid_psis else None
        
        return {
            "timestamp": datetime.now().isoformat(),
            "total_features": len(results),
            "drifted_features": len(drifted_features),
            "drift_percentage": len(drifted_features) / len(results) if results else 0,
            "average_psi": avg_psi,
            "max_psi": max_psi,
            "critical_drift": max_psi > 0.25 if max_psi else False,
            "feature_details": drifted_features
        }
        
    def save_reference_distributions(
        self,
        features: pd.DataFrame,
        predictions: Optional[np.ndarray] = None,
        save_path: str = "./drift_reference.json",
        n_bins: int = 10
    ) -> None:
        """
        Save reference distributions from training data
        
        Args:
            features: Training features
            predictions: Training predictions
            save_path: Path to save distributions
            n_bins: Number of bins for histograms
        """
        self.reference_distributions = {}
        
        # Save feature distributions
        for feature_name in features.columns:
            values = features[feature_name].values
            
            # Calculate histogram
            hist, bins = np.histogram(values, bins=n_bins)
            
            self.reference_distributions[feature_name] = {
                "distribution": hist.tolist(),
                "bins": bins.tolist(),
                "mean": float(np.mean(values)),
                "std": float(np.std(values)),
                "min": float(np.min(values)),
                "max": float(np.max(values))
            }
            
        # Save prediction distribution
        if predictions is not None:
            hist, bins = np.histogram(predictions, bins=n_bins)
            self.reference_distributions["predictions"] = {
                "distribution": hist.tolist(),
                "bins": bins.tolist(),
                "mean": float(np.mean(predictions)),
                "std": float(np.std(predictions))
            }
            
        # Save to file
        Path(save_path).parent.mkdir(parents=True, exist_ok=True)
        with open(save_path, 'w') as f:
            json.dump({
                "created_at": datetime.now().isoformat(),
                "n_samples": len(features),
                "n_features": len(features.columns),
                "distributions": self.reference_distributions
            }, f, indent=2)
            
        logger.info(f"Reference distributions saved to: {save_path}")
        
    def load_reference_distributions(self, path: str) -> None:
        """
        Load reference distributions from file
        
        Args:
            path: Path to reference distributions file
        """
        try:
            with open(path, 'r') as f:
                data = json.load(f)
                
            self.reference_distributions = data.get("distributions", {})
            logger.info(f"Loaded {len(self.reference_distributions)} reference distributions")
            
        except FileNotFoundError:
            logger.warning(f"Reference distributions file not found: {path}")
        except Exception as e:
            logger.error(f"Failed to load reference distributions: {e}")
            
    def _categorize_psi(self, psi: Optional[float]) -> str:
        """Categorize PSI value"""
        if psi is None:
            return "unknown"
        elif psi < 0.1:
            return "no_drift"
        elif psi < 0.25:
            return "moderate_drift"
        else:
            return "significant_drift"
            
    def generate_drift_report(
        self,
        drift_results: Dict,
        save_path: Optional[str] = None
    ) -> str:
        """
        Generate human-readable drift report
        
        Args:
            drift_results: Results from detect_multivariate_drift
            save_path: Optional path to save report
            
        Returns:
            Report string
        """
        report = []
        report.append("=" * 80)
        report.append("MODEL DRIFT DETECTION REPORT")
        report.append("=" * 80)
        report.append(f"Timestamp: {drift_results['timestamp']}")
        report.append(f"Total Features Monitored: {drift_results['total_features']}")
        report.append(f"Drifted Features: {drift_results['drifted_features']}")
        report.append(f"Drift Percentage: {drift_results['drift_percentage']:.1%}")
        report.append(f"Average PSI: {drift_results['average_psi']:.4f}")
        report.append(f"Max PSI: {drift_results['max_psi']:.4f}")
        
        if drift_results['critical_drift']:
            report.append("\n⚠️  CRITICAL DRIFT DETECTED - IMMEDIATE ACTION REQUIRED")
        
        if drift_results['feature_details']:
            report.append("\nDrifted Features:")
            report.append("-" * 80)
            for feature in drift_results['feature_details']:
                report.append(
                    f"  • {feature['feature']}: PSI={feature['psi']:.4f} "
                    f"({feature['severity']})"
                )
        else:
            report.append("\n✓ No significant drift detected")
            
        report.append("=" * 80)
        
        report_str = "\n".join(report)
        
        if save_path:
            with open(save_path, 'w') as f:
                f.write(report_str)
            logger.info(f"Drift report saved to: {save_path}")
            
        return report_str
        
    def should_retrain(self, drift_results: Dict) -> bool:
        """
        Determine if model should be retrained based on drift
        
        Args:
            drift_results: Results from detect_multivariate_drift
            
        Returns:
            True if retraining recommended
        """
        # Retrain if:
        # 1. Critical drift detected (PSI > 0.25)
        # 2. More than 20% of features drifted
        
        critical_drift = drift_results.get('critical_drift', False)
        drift_percentage = drift_results.get('drift_percentage', 0)
        
        return critical_drift or drift_percentage > 0.2
