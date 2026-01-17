"""
Drift Monitoring Service

Automated drift monitoring with alerting.

Usage:
    python -m app.mlops.drift_monitor --hours 24
"""

import argparse
import logging
from datetime import datetime, timedelta
import httpx
import asyncio
from pathlib import Path

from app.mlops.drift_detection import DriftDetector

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class DriftMonitor:
    """
    Automated drift monitoring service
    
    Features:
    - Fetch recent predictions from API
    - Calculate drift metrics
    - Send alerts if drift detected
    - Log results
    """
    
    def __init__(
        self,
        api_url: str = "http://localhost:3000",
        reference_data_path: str = "./drift_reference.json",
        psi_threshold: float = 0.1
    ):
        """
        Initialize drift monitor
        
        Args:
            api_url: URL of NestJS API
            reference_data_path: Path to reference distributions
            psi_threshold: PSI threshold for drift
        """
        self.api_url = api_url
        self.detector = DriftDetector(
            psi_threshold=psi_threshold,
            reference_data_path=reference_data_path
        )
        
    async def fetch_recent_predictions(self, hours: int = 24) -> dict:
        """
        Fetch recent predictions from API
        
        Args:
            hours: Number of hours to look back
            
        Returns:
            Dictionary with predictions and features
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_url}/credit-decisions/recent",
                    params={"hours": hours},
                    timeout=30.0
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Failed to fetch predictions: {e}")
            return {"predictions": [], "features": []}
            
    def check_drift(self, data: dict) -> dict:
        """
        Check for drift in predictions and features
        
        Args:
            data: Data from API (predictions and features)
            
        Returns:
            Drift detection results
        """
        import pandas as pd
        import numpy as np
        
        predictions = data.get("predictions", [])
        features_list = data.get("features", [])
        
        if not predictions or not features_list:
            logger.warning("No data to check for drift")
            return {
                "timestamp": datetime.now().isoformat(),
                "error": "No data available"
            }
            
        # Convert to arrays
        predictions_array = np.array(predictions)
        features_df = pd.DataFrame(features_list)
        
        # Detect prediction drift
        prediction_drift = self.detector.detect_prediction_drift(predictions_array)
        
        # Detect feature drift
        feature_drift = self.detector.detect_multivariate_drift(features_df)
        
        return {
            "timestamp": datetime.now().isoformat(),
            "prediction_drift": prediction_drift,
            "feature_drift": feature_drift,
            "should_retrain": self.detector.should_retrain(feature_drift)
        }
        
    def send_alert(self, drift_results: dict) -> None:
        """
        Send alert if drift detected
        
        Args:
            drift_results: Drift detection results
        """
        # Generate report
        report = self.detector.generate_drift_report(
            drift_results["feature_drift"],
            save_path=f"./drift_reports/drift_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        )
        
        logger.info("\n" + report)
        
        # Send Slack notification (placeholder)
        if drift_results.get("should_retrain"):
            logger.warning("🚨 MODEL RETRAINING RECOMMENDED")
            # TODO: Implement Slack webhook
            # self.send_slack_notification(report)
            
    async def run_monitoring(self, hours: int = 24) -> None:
        """
        Run drift monitoring
        
        Args:
            hours: Hours of data to check
        """
        logger.info(f"Starting drift monitoring (last {hours} hours)...")
        
        # Fetch recent data
        data = await self.fetch_recent_predictions(hours)
        
        # Check drift
        drift_results = self.check_drift(data)
        
        # Send alert if needed
        if drift_results.get("should_retrain"):
            self.send_alert(drift_results)
        else:
            logger.info("✓ No significant drift detected")
            
        return drift_results


async def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Monitor model drift")
    parser.add_argument(
        "--hours",
        type=int,
        default=24,
        help="Hours of data to analyze"
    )
    parser.add_argument(
        "--api-url",
        type=str,
        default="http://localhost:3000",
        help="NestJS API URL"
    )
    parser.add_argument(
        "--reference-data",
        type=str,
        default="./drift_reference.json",
        help="Path to reference distributions"
    )
    
    args = parser.parse_args()
    
    monitor = DriftMonitor(
        api_url=args.api_url,
        reference_data_path=args.reference_data
    )
    
    results = await monitor.run_monitoring(hours=args.hours)
    
    logger.info("Drift monitoring complete")
    return results


if __name__ == "__main__":
    asyncio.run(main())
