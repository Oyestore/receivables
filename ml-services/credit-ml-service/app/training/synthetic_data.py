"""
Synthetic Data Generator for Credit Scoring

Generates realistic credit profiles for model training.
Mimics patterns from actual GST and banking data.

Strategy:
- 70% "good" profiles (low default risk)
- 20% "medium" profiles (moderate risk)
- 10% "bad" profiles (high default risk)
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List
import random
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class SyntheticDataGenerator:
    """
    Generates synthetic credit profiles with realistic patterns
    
    Each profile includes:
    - GST signals (50)
    - Banking signals (20)
    - Alert signals (5)
    - Default label (0/1)
    """
    
    def __init__(self, random_seed: int = 42):
        np.random.seed(random_seed)
        random.seed(random_seed)
        logger.info(f"Synthetic data generator initialized with seed: {random_seed}")
    
    def generate_dataset(
        self,
        n_samples: int = 10000,
        good_ratio: float = 0.70,
        medium_ratio: float = 0.20,
        bad_ratio: float = 0.10
    ) -> pd.DataFrame:
        """
        Generate complete dataset
        
        Args:
            n_samples: Total number of profiles to generate
            good_ratio: Fraction of "good" (non-default) profiles
            medium_ratio: Fraction of "medium risk" profiles
            bad_ratio: Fraction of "bad" (default) profiles
        
        Returns:
            DataFrame with features and labels
        """
        logger.info(f"Generating {n_samples} synthetic profiles...")
        
        # Calculate counts
        n_good = int(n_samples * good_ratio)
        n_medium = int(n_samples * medium_ratio)
        n_bad = n_samples - n_good - n_medium
        
        profiles = []
        
        # Generate good profiles
        logger.info(f"Generating {n_good} good profiles...")
        for _ in range(n_good):
            profiles.append(self._generate_profile("good"))
        
        # Generate medium profiles
        logger.info(f"Generating {n_medium} medium profiles...")
        for _ in range(n_medium):
            profiles.append(self._generate_profile("medium"))
        
        # Generate bad profiles
        logger.info(f"Generating {n_bad} bad profiles...")
        for _ in range(n_bad):
            profiles.append(self._generate_profile("bad"))
        
        # Shuffle
        random.shuffle(profiles)
        
        # Convert to DataFrame
        df = pd.DataFrame(profiles)
        
        logger.info(f"Generated {len(df)} profiles. Default rate: {df['default_label'].mean():.2%}")
        
        return df
    
    def _generate_profile(self, risk_level: str) -> Dict[str, Any]:
        """
        Generate a single credit profile
        
        Args:
            risk_level: "good", "medium", or "bad"
        
        Returns:
            Dictionary with all features and label
        """
        profile = {}
        
        # Generate GST signals
        profile.update(self._generate_gst_signals(risk_level))
        
        # Generate banking signals
        profile.update(self._generate_banking_signals(risk_level))
        
        # Generate alert signals
        profile.update(self._generate_alert_signals(risk_level))
        
        # Generate composite scores
        profile.update(self._generate_score_signals(risk_level))
        
        # Default label
        if risk_level == "good":
            profile["default_label"] = 0
        elif risk_level == "medium":
            profile["default_label"] = 1 if random.random() < 0.3 else 0  # 30% default
        else:  # bad
            profile["default_label"] = 1 if random.random() < 0.8 else 0  # 80% default
        
        return profile
    
    def _generate_gst_signals(self, risk_level: str) -> Dict[str, float]:
        """Generate 50 GST features based on risk level"""
        
        if risk_level == "good":
            # Strong GST performance
            gst_score = np.random.uniform(70, 95)
            cagr = np.random.uniform(10, 50)
            monthly_avg = np.random.uniform(0.5, 0.9)  # Normalized
            compliance_score = np.random.uniform(80, 100)
            fraud_score = np.random.uniform(80, 100)
            bounce_rate = np.random.uniform(0, 0.02)
            
        elif risk_level == "medium":
            # Moderate GST performance
            gst_score = np.random.uniform(45, 70)
            cagr = np.random.uniform(-10, 20)
            monthly_avg = np.random.uniform(0.3, 0.6)
            compliance_score = np.random.uniform(50, 80)
            fraud_score = np.random.uniform(50, 80)
            bounce_rate = np.random.uniform(0.02, 0.05)
            
        else:  # bad
            # Poor GST performance
            gst_score = np.random.uniform(20, 45)
            cagr = np.random.uniform(-50, 0)
            monthly_avg = np.random.uniform(0.1, 0.4)
            compliance_score = np.random.uniform(20, 50)
            fraud_score = np.random.uniform(20, 50)
            bounce_rate = np.random.uniform(0.05, 0.15)
        
        # Normalize to 0-1
        return {
            "gst_overall_score": gst_score / 100,
            "gst_cagr": np.clip((cagr + 50) / 150, 0, 1),  # -50 to 100 → 0 to 1
            "gst_mom_growth": np.random.uniform(0.3, 0.7),
            "gst_monthly_avg": monthly_avg,
            "gst_seasonality": np.random.uniform(0.4, 0.6),
            "gst_hhi": np.random.uniform(0.3, 0.7),
            "gst_avg_transaction": np.random.uniform(0.3, 0.7),
            "gst_b2b_ratio": np.random.uniform(0.4, 0.8),
            "gst_export_pct": np.random.uniform(0, 0.3),
            "gst_interstate_pct": np.random.uniform(0.2, 0.5),
            
            "gst_compliance_score": compliance_score / 100,
            "gst_filing_regularity": np.random.uniform(0.7, 1.0) if risk_level == "good" else np.random.uniform(0.3, 0.7),
            "gst_late_filing_count": np.random.uniform(0, 0.1) if risk_level == "good" else np.random.uniform(0.2, 0.8),
            "gst_tax_timeliness": np.random.uniform(0.7, 1.0) if risk_level == "good" else np.random.uniform(0.3, 0.7),
            "gst_outstanding_dues": np.random.uniform(0, 0.2) if risk_level == "good" else np.random.uniform(0.3, 0.8),
            "gst_penalty_count": np.random.uniform(0, 0.1) if risk_level == "good" else np.random.uniform(0.2, 0.6),
            "gst_notice_count": np.random.uniform(0, 0.1) if risk_level == "good" else np.random.uniform(0.2, 0.6),
            "gst_refund_claims": np.random.uniform(0, 0.3),
            "gst_itc_utilization": np.random.uniform(0.6, 0.9),
            "gst_itc_reversal_freq": np.random.uniform(0, 0.2),
            "gst_amendment_freq": np.random.uniform(0, 0.2),
            "gst_consistency_score": compliance_score / 100,
            
            "gst_customer_count": np.random.uniform(0.3, 0.8),
            "gst_supplier_count": np.random.uniform(0.3, 0.8),
            "gst_customer_hhi": np.random.uniform(0.3, 0.7),
            "gst_supplier_hhi": np.random.uniform(0.3, 0.7),
            "gst_geographic_diversity": np.random.uniform(0.4, 0.8),
            "gst_top5_customer_pct": np.random.uniform(0.3, 0.7),
            "gst_top5_supplier_pct": np.random.uniform(0.3, 0.7),
            "gst_new_customer_rate": np.random.uniform(0.1, 0.3),
            "gst_customer_churn": np.random.uniform(0.05, 0.2),
            "gst_network_score": np.random.uniform(0.5, 0.9) if risk_level == "good" else np.random.uniform(0.2, 0.5),
            
            "gst_fraud_score": fraud_score / 100,
            "gst_circular_trading": 1 if (risk_level == "bad" and random.random() < 0.3) else 0,
            "gst_fake_invoice": 1 if (risk_level == "bad" and random.random() < 0.2) else 0,
            "gst_gstr_mismatch": bounce_rate,
            "gst_itc_anomaly": 1 if (risk_level == "bad" and random.random() < 0.2) else 0,
            "gst_dormant_periods": np.random.uniform(0, 0.1) if risk_level == "good" else np.random.uniform(0.2, 0.5),
            "gst_activity_spikes": np.random.uniform(0, 0.1) if risk_level == "good" else np.random.uniform(0.2, 0.5),
            "gst_related_party_txn": np.random.uniform(0, 0.3),
            
            "gst_ccc_days": np.random.uniform(0.3, 0.5),
            "gst_dso_days": np.random.uniform(0.3, 0.6),
            "gst_dio_days": np.random.uniform(0.3, 0.6),
            "gst_dpo_days": np.random.uniform(0.3, 0.6),
            "gst_wc_trend": np.random.uniform(0.4, 0.7),
            "gst_wc_score": np.random.uniform(0.5, 0.9) if risk_level == "good" else np.random.uniform(0.2, 0.5),
            
            "gst_business_age_years": np.random.uniform(0.2, 0.8),
            "gst_reg_type_pvt": random.choice([0, 1]),
            "gst_industry_benchmark": np.random.uniform(0.4, 0.7),
            "gst_peer_rank": np.random.uniform(0.3, 0.7),
        }
    
    def _generate_banking_signals(self, risk_level: str) -> Dict[str, float]:
        """Generate 22 banking features based on risk level"""
        
        if risk_level == "good":
            # Strong banking performance
            income = np.random.uniform(0.6, 0.9)
            bounce_rate = np.random.uniform(0, 0.02)
            savings_rate = np.random.uniform(0.15, 0.35)
            liquidity_buffer = np.random.uniform(0.5, 0.9)
            
        elif risk_level == "medium":
            income = np.random.uniform(0.4, 0.6)
            bounce_rate = np.random.uniform(0.02, 0.08)
            savings_rate = np.random.uniform(0.05, 0.15)
            liquidity_buffer = np.random.uniform(0.2, 0.5)
            
        else:  # bad
            income = np.random.uniform(0.2, 0.4)
            bounce_rate = np.random.uniform(0.08, 0.20)
            savings_rate = np.random.uniform(0, 0.05)
            liquidity_buffer = np.random.uniform(0, 0.2)
        
        return {
            "bank_monthly_income": income,
            "bank_income_stability": np.random.uniform(0.6, 0.9) if risk_level == "good" else np.random.uniform(0.3, 0.6),
            "bank_monthly_expense": np.random.uniform(0.4, 0.7),
            "bank_net_cash_flow": income * np.random.uniform(0.1, 0.3),
            "bank_cash_trend": np.random.uniform(0.5, 0.8) if risk_level == "good" else np.random.uniform(0.2, 0.5),
            "bank_cash_volatility": np.random.uniform(0.6, 0.9) if risk_level == "good" else np.random.uniform(0.3, 0.6),
            
            "bank_emi_amount": np.random.uniform(0.2, 0.5),
            "bank_rent_fixed": np.random.uniform(0.2, 0.4),
            "bank_discretionary": np.random.uniform(0.1, 0.3),
            "bank_bounce_rate": bounce_rate,  # CRITICAL FEATURE
            "bank_overdraft_usage": np.random.uniform(0, 0.1) if risk_level == "good" else np.random.uniform(0.2, 0.6),
            
            "bank_savings_rate": savings_rate,
            "bank_avg_balance": income * np.random.uniform(1.5, 3.0),
            "bank_min_balance": income * np.random.uniform(0.5, 1.5),
            "bank_balance_trend": np.random.uniform(0.5, 0.8) if risk_level == "good" else np.random.uniform(0.2, 0.5),
            
            "bank_account_age_years": np.random.uniform(0.3, 0.9),
            "bank_relationships": np.random.uniform(0.2, 0.6),
            "bank_digital_activity": np.random.uniform(0.5, 0.9),
            
            "bank_liquidity_buffer": liquidity_buffer,
            "bank_emergency_fund": np.random.uniform(0.5, 0.9) if risk_level == "good" else np.random.uniform(0.2, 0.5),
            
            "bank_overall_score": np.random.uniform(0.7, 0.95) if risk_level == "good" else (
                np.random.uniform(0.45, 0.7) if risk_level == "medium" else np.random.uniform(0.2, 0.45)
            ),
            "bank_data_fresh": 1 if random.random() < 0.8 else 0.5,
        }
    
    def _generate_alert_signals(self, risk_level: str) -> Dict[str, float]:
        """Generate 5 alert features"""
        
        if risk_level == "good":
            return {
                "alert_critical_count": 0,
                "alert_warning_count": np.random.uniform(0, 0.1),
                "alert_has_emi_bounce": 0,
                "alert_has_cash_drop": 0,
                "alert_total_count": np.random.uniform(0, 0.1),
            }
        elif risk_level == "medium":
            return {
                "alert_critical_count": np.random.uniform(0, 0.2),
                "alert_warning_count": np.random.uniform(0.1, 0.4),
                "alert_has_emi_bounce": 1 if random.random() < 0.2 else 0,
                "alert_has_cash_drop": 1 if random.random() < 0.3 else 0,
                "alert_total_count": np.random.uniform(0.2, 0.5),
            }
        else:  # bad
            return {
                "alert_critical_count": np.random.uniform(0.3, 0.7),
                "alert_warning_count": np.random.uniform(0.4, 0.8),
                "alert_has_emi_bounce": 1 if random.random() < 0.6 else 0,
                "alert_has_cash_drop": 1 if random.random() < 0.5 else 0,
                "alert_total_count": np.random.uniform(0.5, 1.0),
            }
    
    def _generate_score_signals(self, risk_level: str) -> Dict[str, float]:
        """Generate 5 composite score features"""
        
        if risk_level == "good":
            overall = np.random.uniform(0.75, 0.95)
        elif risk_level == "medium":
            overall = np.random.uniform(0.50, 0.75)
        else:
            overall = np.random.uniform(0.20, 0.50)
        
        gst_score = overall + np.random.uniform(-0.1, 0.1)
        bank_score = overall + np.random.uniform(-0.1, 0.1)
        
        return {
            "score_gst": np.clip(gst_score, 0, 1),
            "score_banking": np.clip(bank_score, 0, 1),
            "score_alert_penalty": np.random.uniform(0.8, 1.0) if risk_level == "good" else np.random.uniform(0.4, 0.8),
            "score_overall": overall,
            "score_confidence": np.random.uniform(0.7, 0.95),
        }


def generate_train_test_split(
    df: pd.DataFrame,
    test_size: float = 0.2,
    val_size: float = 0.1
) -> tuple:
    """
    Split data into train/validation/test sets
    
    Args:
        df: Full dataset
        test_size: Fraction for test set
        val_size: Fraction for validation set
    
    Returns:
        (X_train, y_train, X_val, y_val, X_test, y_test)
    """
    from sklearn.model_selection import train_test_split
    
    # Separate features and labels
    X = df.drop(columns=["default_label"])
    y = df["default_label"].values
    
    # First split: train+val vs test
    X_temp, X_test, y_temp, y_test = train_test_split(
        X, y, test_size=test_size, random_state=42, stratify=y
    )
    
    # Second split: train vs val
    val_size_adjusted = val_size / (1 - test_size)
    X_train, X_val, y_train, y_val = train_test_split(
        X_temp, y_temp, test_size=val_size_adjusted, random_state=42, stratify=y_temp
    )
    
    logger.info(f"Dataset split: Train={len(X_train)}, Val={len(X_val)}, Test={len(X_test)}")
    
    return X_train, y_train, X_val, y_val, X_test, y_test


if __name__ == "__main__":
    # Example usage
    logging.basicConfig(level=logging.INFO)
    
    generator = SyntheticDataGenerator()
    df = generator.generate_dataset(n_samples=1000)
    
    print(f"\nDataset shape: {df.shape}")
    print(f"Default rate: {df['default_label'].mean():.2%}")
    print(f"\nFirst few rows:")
    print(df.head())
