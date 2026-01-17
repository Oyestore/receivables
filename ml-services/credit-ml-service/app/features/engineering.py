"""Feature Engineering for Credit ML

Transforms 70+ signals from UnifiedCreditProfile into ML features.

Input: UnifiedCreditProfile (from NestJS)
Output: Feature vector (100+ normalized features)
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, List
import logging

logger = logging.getLogger(__name__)


class FeatureEngineer:
    """
    Feature engineering pipeline for credit scoring
    
    Transforms 70+ raw signals into 100+ ML features:
    - GST signals (50)
    - Banking signals (20)
    - Interaction features (20)
    - Missing indicators (5)
    - Time-based features (5)
    """
    
    def __init__(self):
        self.feature_names = None
        logger.info("Feature Engineer initialized")
        
    def transform(self, unified_profile: Dict[str, Any]) -> pd.DataFrame:
        """
        Transform unified profile into feature vector
        
        Args:
            unified_profile: Dictionary with keys:
                - gst: {signals, available, lastUpdated}
                - banking: {signals, available, lastUpdated, dataFreshness}
                - alerts: {active, criticalCount, warningCount, ...}
                - scores: {gst_score, banking_score, overall_score, ...}
        
        Returns:
            DataFrame with single row containing all features
        """
        features = {}
        
        # 1. GST Features (50)
        features.update(self._extract_gst_features(unified_profile.get('gst', {})))
        
        # 2. Banking Features (20)
        features.update(self._extract_banking_features(unified_profile.get('banking', {})))
        
        # 3. Alert Features (10)
        features.update(self._extract_alert_features(unified_profile.get('alerts', {})))
        
        # 4. Composite Score Features (5)
        features.update(self._extract_score_features(unified_profile.get('scores', {})))
        
        # 5. Interaction Features (20)
        features.update(self._create_interaction_features(features))
        
        # 6. Missing Indicators (5)
        features.update(self._create_missing_indicators(unified_profile))
        
        # Store feature names for later use
        if self.feature_names is None:
            self.feature_names = list(features.keys())
            logger.info(f"Generated {len(self.feature_names)} features")
        
        return pd.DataFrame([features])
    
    def _extract_gst_features(self, gst_data: Dict) -> Dict[str, float]:
        """Extract 50 GST signals as features"""
        features = {}
        
        if not gst_data.get('available', False):
            # Fill with zeros if GST not available
            return self._get_default_gst_features()
        
        signals = gst_data.get('signals', {})
        
        # Turnover features (10)
        turnover = signals.get('turnover', {})
        features['gst_overall_score'] = self._normalize(turnover.get('score', 0), 0, 100)
        features['gst_cagr'] = self._normalize(turnover.get('cagr', 0), -50, 100)  # -50% to 100%
        features['gst_mom_growth'] = self._normalize(turnover.get('momGrowth', 0), -50, 50)
        features['gst_monthly_avg'] = self._normalize_log(turnover.get('monthlyAverage', 0))
        features['gst_seasonality'] = turnover.get('seasonalityIndex', 0.5)
        features['gst_hhi'] = turnover.get('revenueHHI', 0.5)
        features['gst_avg_transaction'] = self._normalize_log(turnover.get('avgTransactionSize', 0))
        features['gst_b2b_ratio'] = self._normalize(turnover.get('b2bVsB2cRatio', 50), 0, 100)
        features['gst_export_pct'] = turnover.get('exportComponent', 0)
        features['gst_interstate_pct'] = turnover.get('interstatePercentage', 0)
        
        # Compliance features (12)
        compliance = signals.get('compliance', {})
        features['gst_compliance_score'] = self._normalize(compliance.get('complianceScore', 0), 0, 100)
        features['gst_filing_regularity'] = compliance.get('filingRegularity', 0)
        features['gst_late_filing_count'] = self._normalize(compliance.get('lateFilingCount', 0), 0, 12)
        features['gst_tax_timeliness'] = compliance.get('taxPaymentTimeliness', 0)
        features['gst_outstanding_dues'] = self._normalize_log(compliance.get('outstandingDues', 0))
        features['gst_penalty_count'] = self._normalize(compliance.get('penaltyCount', 0), 0, 5)
        features['gst_notice_count'] = self._normalize(compliance.get('noticeCount', 0), 0, 5)
        features['gst_refund_claims'] = self._normalize(compliance.get('refundClaimsCount', 0), 0, 10)
        features['gst_itc_utilization'] = compliance.get('itcUtilizationRate', 0)
        features['gst_itc_reversal_freq'] = self._normalize(compliance.get('itcReversalFrequency', 0), 0, 12)
        features['gst_amendment_freq'] = self._normalize(compliance.get('amendmentFrequency', 0), 0, 12)
        features['gst_consistency_score'] = compliance.get('complianceScore', 50) / 100  # Duplicate normalized
        
        # Network features (10)
        network = signals.get('network', {})
        features['gst_customer_count'] = self._normalize_log(network.get('customerCount', 0))
        features['gst_supplier_count'] = self._normalize_log(network.get('supplierCount', 0))
        features['gst_customer_hhi'] = network.get('customerConcentrationHHI', 0.5)
        features['gst_supplier_hhi'] = network.get('supplierConcentrationHHI', 0.5)
        features['gst_geographic_diversity'] = network.get('geographicDiversity', 0.5)
        features['gst_top5_customer_pct'] = network.get('top5CustomersRevenue', 0.5)
        features['gst_top5_supplier_pct'] = network.get('top5SuppliersSpend', 0.5)
        features['gst_new_customer_rate'] = network.get('newCustomerRate', 0)
        features['gst_customer_churn'] = network.get('customerChurnRate', 0)
        features['gst_network_score'] = self._normalize(network.get('score', 0), 0, 100)
        
        # Fraud features (8)
        fraud = signals.get('fraud', {})
        features['gst_fraud_score'] = self._normalize(fraud.get('score', 100), 0, 100)  # Higher = safer
        features['gst_circular_trading'] = 1 if fraud.get('hasCircularTrading', False) else 0
        features['gst_fake_invoice'] = 1 if fraud.get('hasFakeInvoiceIndicators', False) else 0
        features['gst_gstr_mismatch'] = fraud.get('gstr1Vs3bMismatch', 0) / 100  # Percentage
        features['gst_itc_anomaly'] = 1 if fraud.get('itcReversalAnomalies', False) else 0
        features['gst_dormant_periods'] = self._normalize(fraud.get('dormantPeriods', 0), 0, 12)
        features['gst_activity_spikes'] = self._normalize(fraud.get('suddenActivitySpikes', 0), 0, 5)
        features['gst_related_party_txn'] = self._normalize(fraud.get('relatedPartyTransactions', 0), 0, 100)
        
        # Working Capital features (6)
        wc = signals.get('workingCapital', {})
        features['gst_ccc_days'] = self._normalize(wc.get('cashConversionCycle', 60), 0, 180)
        features['gst_dso_days'] = self._normalize(wc.get('dso', 45), 0, 120)
        features['gst_dio_days'] = self._normalize(wc.get('dio', 60), 0, 150)
        features['gst_dpo_days'] = self._normalize(wc.get('dpo', 45), 0, 120)
        features['gst_wc_trend'] = wc.get('wcTrend', 0)  # -1 to 1
        features['gst_wc_score'] = self._normalize(wc.get('score', 0), 0, 100)
        
        # Additional features (4)
        additional = signals.get('additional', {})
        features['gst_business_age_years'] = self._normalize(additional.get('businessAge', 0), 0, 50)
        features['gst_reg_type_pvt'] = 1 if 'Private' in additional.get('registrationType', '') else 0
        features['gst_industry_benchmark'] = self._normalize(additional.get('industryBenchmarkScore', 50), 0, 100)
        features['gst_peer_rank'] = additional.get('peerGroupRank', 50) / 100
        
        return features
    
    def _extract_banking_features(self, banking_data: Dict) -> Dict[str, float]:
        """Extract 20 banking signals as features"""
        features = {}
        
        if not banking_data.get('available', False):
            return self._get_default_banking_features()
        
        signals = banking_data.get('signals', {})
        
        # Cash flow features (6)
        cash_flow = signals.get('cashFlow', {})
        features['bank_monthly_income'] = self._normalize_log(cash_flow.get('monthlyIncome', 0))
        features['bank_income_stability'] = 1 - cash_flow.get('incomeStabilityCV', 1)  # Lower CV = more stable
        features['bank_monthly_expense'] = self._normalize_log(cash_flow.get('monthlyExpenses', 0))
        features['bank_net_cash_flow'] = self._normalize_log(abs(cash_flow.get('netCashFlow', 0)))
        features['bank_cash_trend'] = (cash_flow.get('cashFlowTrend', 0) + 1) / 2  # -1 to 1 → 0 to 1
        features['bank_cash_volatility'] = 1 - min(cash_flow.get('cashFlowVolatility', 1), 1)
        
        # Spend pattern features (5)
        spend = signals.get('spendPattern', {})
        features['bank_emi_amount'] = self._normalize_log(spend.get('emiPayments', 0))
        features['bank_rent_fixed'] = self._normalize_log(spend.get('rentAndFixedCosts', 0))
        features['bank_discretionary'] = self._normalize_log(spend.get('discretionarySpend', 0))
        features['bank_bounce_rate'] = spend.get('bounceRate', 0) / 100  # CRITICAL
        features['bank_overdraft_usage'] = self._normalize(spend.get('overdraftUsage', 0), 0, 100000)
        
        # Savings features (4)
        savings = signals.get('savings', {})
        features['bank_savings_rate'] = savings.get('savingsRate', 0) / 100
        features['bank_avg_balance'] = self._normalize_log(savings.get('averageBalance', 0))
        features['bank_min_balance'] = self._normalize_log(savings.get('minimumBalance', 0))
        features['bank_balance_trend'] = (savings.get('balanceTrend', 0) + 1) / 2
        
        # Banking stability features (3)
        stability = signals.get('bankingStability', {})
        features['bank_account_age_years'] = self._normalize(stability.get('accountAgeInMonths', 0) / 12, 0, 20)
        features['bank_relationships'] = self._normalize(stability.get('bankingRelationships', 0), 0, 5)
        features['bank_digital_activity'] = stability.get('digitalActivityRate', 0) / 100
        
        # Liquidity features (2)
        liquidity = signals.get('liquidity', {})
        features['bank_liquidity_buffer'] = self._normalize(liquidity.get('liquidityBuffer', 0), 0, 12)  # Months
        features['bank_emergency_fund'] = self._normalize(liquidity.get('emergencyFundScore', 0), 0, 100)
        
        # Overall banking score
        features['bank_overall_score'] = self._normalize(signals.get('overallScore', 0), 0, 100)
        
        # Data freshness (bonus feature)
        freshness = banking_data.get('dataFreshness', 'STALE')
        features['bank_data_fresh'] = 1 if freshness == 'REAL_TIME' else (0.5 if freshness == 'RECENT' else 0)
        
        return features
    
    def _extract_alert_features(self, alerts_data: Dict) -> Dict[str, float]:
        """Extract alert-based features"""
        return {
            'alert_critical_count': min(alerts_data.get('criticalCount', 0), 10) / 10,
            'alert_warning_count': min(alerts_data.get('warningCount', 0), 10) / 10,
            'alert_has_emi_bounce': 1 if alerts_data.get('hasEMIBounce', False) else 0,
           'alert_has_cash_drop': 1 if alerts_data.get('hasCashFlowDrop', False) else 0,
            'alert_total_count': min(len(alerts_data.get('active', [])), 20) / 20,
        }
    
    def _extract_score_features(self, scores_data: Dict) -> Dict[str, float]:
        """Extract composite scores"""
        return {
            'score_gst': self._normalize(scores_data.get('gstScore', 0), 0, 100),
            'score_banking': self._normalize(scores_data.get('bankingScore', 0), 0, 100),
            'score_alert_penalty': self._normalize(scores_data.get('alertPenalty', 100), 0, 100),
            'score_overall': self._normalize(scores_data.get('overallScore', 0), 0, 100),
            'score_confidence': self._normalize(scores_data.get('confidence', 50), 0, 100),
        }
    
    def _create_interaction_features(self, features: Dict[str, float]) -> Dict[str, float]:
        """Create interaction features from existing ones"""
        interactions = {}
        
        # GST × Banking interactions
        gst_score = features.get('gst_overall_score', 0)
        bank_score = features.get('bank_overall_score', 0)
        
        interactions['interaction_gst_bank'] = gst_score * bank_score
        interactions['interaction_gst_bank_gap'] = abs(gst_score - bank_score)
        
        # Income × Turnover
        gst_turnover = features.get('gst_monthly_avg', 0)
        bank_income = features.get('bank_monthly_income', 0)
        interactions['interaction_turnover_income'] = gst_turnover * bank_income
        interactions['interaction_turnover_income_ratio'] = self._safe_divide(gst_turnover, bank_income)
        
        # Compliance × Stability
        gst_compliance = features.get('gst_compliance_score', 0)
        bank_stability = features.get('bank_account_age_years', 0)
        interactions['interaction_compliance_stability'] = gst_compliance * bank_stability
        
        # Fraud × Bounce
        gst_fraud = features.get('gst_fraud_score', 1)
        bank_bounce = features.get('bank_bounce_rate', 0)
        interactions['interaction_fraud_bounce'] = (1 - gst_fraud) * bank_bounce  # Both negative
        
        # Cash flow × Working capital
        bank_cash_trend = features.get('bank_cash_trend', 0.5)
        gst_wc_trend = features.get('gst_wc_trend', 0)
        interactions['interaction_cash_wc_trend'] = bank_cash_trend * ((gst_wc_trend + 1) / 2)
        
        return interactions
    
    def _create_missing_indicators(self, unified_profile: Dict) -> Dict[str, float]:
        """Create binary indicators for missing data"""
        return {
            'has_gst_data': 1 if unified_profile.get('gst', {}).get('available', False) else 0,
            'has_banking_data': 1 if unified_profile.get('banking', {}).get('available', False) else 0,
            'has_both_data': 1 if (unified_profile.get('gst', {}).get('available', False) and 
                                   unified_profile.get('banking', {}).get('available', False)) else 0,
            'data_completeness': unified_profile.get('dataCompleteness', 0) / 100,
            'has_alerts': 1 if len(unified_profile.get('alerts', {}).get('active', [])) > 0 else 0,
        }
    
    def _get_default_gst_features(self) -> Dict[str, float]:
        """Return zero features when GST not available"""
        return {f'gst_{i}': 0 for i in range(50)}
    
    def _get_default_banking_features(self) -> Dict[str, float]:
        """Return zero features when banking not available"""
        return {f'bank_{i}': 0 for i in range(22)}
    
    @staticmethod
    def _normalize(value: float, min_val: float, max_val: float) -> float:
        """Normalize value to 0-1 range"""
        if max_val == min_val:
            return 0.5
        return max(0, min(1, (value - min_val) / (max_val - min_val)))
    
    @staticmethod
    def _normalize_log(value: float, base: float = 100000) -> float:
        """Log-normalize value (useful for monetary amounts)"""
        if value <= 0:
            return 0
        return min(1, np.log1p(value) / np.log1p(base))
    
    @staticmethod
    def _safe_divide(numerator: float, denominator: float) -> float:
        """Safe division with zero handling"""
        if denominator == 0:
            return 0
        return min(10, numerator / denominator) / 10  # Cap at 10x


# Singleton instance
feature_engineer = FeatureEngineer()


def transform_for_prediction(unified_profile: Dict[str, Any]) -> pd.DataFrame:
    """
    Main entry point for feature transformation
    
    Args:
        unified_profile: Output from UnifiedCreditIntelligenceService
    
    Returns:
        DataFrame with normalized feature vector
    """
    return feature_engineer.transform(unified_profile)
