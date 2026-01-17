"""
Trade Finance ML Service - Financing Recommendation Engine
Predicts optimal financing products and success probability
"""
from typing import List, Dict, Optional
from pydantic import BaseModel
import numpy as np
from datetime import datetime
import joblib
import os

# === DTOs ===
class TradeData(BaseModel):
    trade_amount: float
    buyer_credit_score: float
    seller_credit_score: float
    origin_country: str
    destination_country: str
    product_category: str
    payment_history_score: float
    forex_volatility: float
    customs_complexity: float
    shipping_duration_days: int
    currency: str
    hs_code: Optional[str] = None

class FinancingRecommendation(BaseModel):
    product: str
    suitability_score: float
    estimated_rate: float
    estimated_fees: float
    success_probability: float
    reasoning: List[str]

class RecommendationResponse(BaseModel):
    recommendations: List[FinancingRecommendation]
    overall_eligibility: float
    risk_assessment: Dict[str, float]

# === Risk Scoring Mappings ===
COUNTRY_RISK_SCORES = {
    'US': 10, 'GB': 12, 'DE': 11, 'FR': 13, 'CA': 11, 'AU': 12, 'SG': 14, 'AE': 15,
    'IN': 25, 'CN': 22, 'BR': 30, 'MX': 28, 'ZA': 32, 'TR': 35, 'AR': 40,
    'VE': 85, 'SY': 90, 'AF': 95, 'IQ': 88, 'SO': 92,
}

PRODUCT_CATEGORIES_RISK = {
    'electronics': 20, 'machinery': 18, 'automotive': 22, 'textiles': 25,
    'pharmaceuticals': 15, 'food': 30, 'chemicals': 28, 'metals': 24,
}

FOREX_VOLATILITY_MAP = {
    'USD': 5, 'EUR': 6, 'GBP': 7, 'JPY': 8, 'CHF': 5, 'AUD': 12, 'CAD': 10,
    'CNY': 15, 'INR': 18, 'BRL': 35, 'TRY': 45, 'ARS': 60, 'VES': 90,
}

# === ML Model (XGBoost-based) ===
class FinancingRecommendationModel:
    """
    ML model for trade finance recommendations
    Uses XGBoost for multi-output classification/regression
    """
    
    def __init__(self, model_path: str = None):
        self.model = None
        self.model_path = model_path or os.getenv('MODEL_PATH', './models/financing_model.pkl')
        self.is_trained = False
        
        # Try to load pre-trained model
        if os.path.exists(self.model_path):
            self.load_model()
    
    def extract_features(self, trade_data: TradeData) -> np.ndarray:
        """Extract features from trade data"""
        origin_risk = COUNTRY_RISK_SCORES.get(trade_data.origin_country, 50)
        dest_risk = COUNTRY_RISK_SCORES.get(trade_data.destination_country, 50)
        category_risk = PRODUCT_CATEGORIES_RISK.get(trade_data.product_category.lower(), 30)
        forex_volatility = FOREX_VOLATILITY_MAP.get(trade_data.currency, 20)
        
        features = np.array([
            trade_data.trade_amount / 100000,  # Normalized
            trade_data.buyer_credit_score / 100,
            trade_data.seller_credit_score / 100,
            origin_risk / 100,
            dest_risk / 100,
            category_risk / 100,
            trade_data.payment_history_score / 100,
            forex_volatility / 100,
            trade_data.customs_complexity / 100,
            trade_data.shipping_duration_days / 90,
        ])
        
        return features.reshape(1, -1)
    
    def predict(self, trade_data: TradeData) -> RecommendationResponse:
        """
        Predict financing recommendations
        Uses rules-based logic as fallback if model not trained
        """
        features = self.extract_features(trade_data)
        
        # Calculate risk scores
        credit_risk = 100 - ((trade_data.buyer_credit_score + trade_data.seller_credit_score) / 2)
        
        origin_risk = COUNTRY_RISK_SCORES.get(trade_data.origin_country, 50)
        dest_risk = COUNTRY_RISK_SCORES.get(trade_data.destination_country, 50)
        trade_risk = (origin_risk + dest_risk) / 2
        
        forex_risk = FOREX_VOLATILITY_MAP.get(trade_data.currency, 20)
        
        # Overall eligibility (weighted average, inverted from risk)
        eligibility = 100 - (credit_risk * 0.5 + trade_risk * 0.3 + forex_risk * 0.2)
        
        # Generate product recommendations
        recommendations = self._generate_recommendations(
            trade_data, credit_risk, trade_risk, forex_risk, eligibility
        )
        
        return RecommendationResponse(
            recommendations=sorted(recommendations, key=lambda x: x.suitability_score, reverse=True),
            overall_eligibility=max(0, min(100, eligibility)),
            risk_assessment={
                'credit_risk': round(credit_risk, 2),
                'trade_risk': round(trade_risk, 2),
                'forex_risk': round(forex_risk, 2),
            }
        )
    
    def _generate_recommendations(
        self, 
        trade_data: TradeData,
        credit_risk: float,
        trade_risk: float,
        forex_risk: float,
        eligibility: float
    ) -> List[FinancingRecommendation]:
        """Generate product recommendations based on ML insights"""
        recommendations = []
        base_rate = 8.0  # Base interest rate
        
        # 1. Invoice Factoring - Best for quick cash, export scenarios
        if trade_data.trade_amount > 10000 and credit_risk < 60:
            factoring_suitability = 85 - (credit_risk * 0.5)
            factoring_rate = base_rate + (credit_risk / 10) + 2
            
            recommendations.append(FinancingRecommendation(
                product='invoice_factoring',
                suitability_score=round(min(100, max(0, factoring_suitability)), 2),
                estimated_rate=round(factoring_rate, 2),
                estimated_fees=round(trade_data.trade_amount * 0.02, 2),
                success_probability=round(min(95, 100 - credit_risk), 2),
                reasoning=[
                    'Low credit risk profile' if credit_risk < 40 else 'Moderate credit risk',
                    'Suitable trade size for factoring',
                    'Quick funding (24-48 hours)'
                ]
            ))
        
        # 2. Supply Chain Finance - Best for importers, working capital
        if eligibility > 50:
            scf_suitability = 80 - (trade_risk * 0.4)
            scf_rate = base_rate + (trade_risk / 10) + 1
            
            recommendations.append(FinancingRecommendation(
                product='supply_chain_finance',
                suitability_score=round(min(100, max(0, scf_suitability)), 2),
                estimated_rate=round(scf_rate, 2),
                estimated_fees=round(trade_data.trade_amount * 0.01, 2),
                success_probability=round(min(90, eligibility), 2),
                reasoning=[
                    'Good for importers',
                    'Extended payment terms',
                    'Lower fees compared to factoring'
                ]
            ))
        
        # 3. Export Credit - Best for exporters, government-backed
        if trade_data.trade_amount > 50000:
            export_suitability = 75 - (trade_risk * 0.3)
            export_rate = base_rate + (trade_risk / 15)
            
            recommendations.append(FinancingRecommendation(
                product='export_credit',
                suitability_score=round(min(100, max(0, export_suitability)), 2),
                estimated_rate=round(export_rate, 2),
                estimated_fees=round(trade_data.trade_amount * 0.015, 2),
                success_probability=round(min(85, 100 - trade_risk), 2),
                reasoning=[
                    'Large trade value',
                    'May qualify for government support',
                    'Competitive rates'
                ]
            ))
        
        # 4. Letter of Credit - Best for high-risk trades
        if trade_risk > 40 or forex_risk > 30:
            loc_suitability = 70 + (trade_risk * 0.2)  # Higher risk = more suitable
            loc_rate = base_rate - 2 + (trade_risk / 20)
            
            recommendations.append(FinancingRecommendation(
                product='letter_of_credit',
                suitability_score=round(min(100, max(0, loc_suitability)), 2),
                estimated_rate=round(loc_rate, 2),
                estimated_fees=round(trade_data.trade_amount * 0.03, 2),
                success_probability=round(min(95, 100 - (trade_risk * 0.5)), 2),
                reasoning=[
                    'High trade/country risk mitigation',
                    'Bank-guaranteed payment',
                    'Traditional and secure'
                ]
            ))
        
        # 5. Forfaiting - Best for medium/long-term receivables
        if trade_data.shipping_duration_days > 60:
            forfait_suitability = 65 - (credit_risk * 0.3) - (forex_risk * 0.2)
            forfait_rate = base_rate + (credit_risk / 10) + (forex_risk / 20) + 3
            
            recommendations.append(FinancingRecommendation(
                product='forfaiting',
                suitability_score=round(min(100, max(0, forfait_suitability)), 2),
                estimated_rate=round(forfait_rate, 2),
                estimated_fees=round(trade_data.trade_amount * 0.025, 2),
                success_probability=round(min(80, 100 - credit_risk - forex_risk / 2), 2),
                reasoning=[
                    'Medium/long-term receivables',
                    'Removes forex risk from exporter',
                    'No recourse financing'
                ]
            ))
        
        # 6. Trade Credit Insurance - Best for risk mitigation
        if credit_risk > 50 or trade_risk > 50:
            insurance_suitability = (credit_risk + trade_risk) / 2
            
            recommendations.append(FinancingRecommendation(
                product='trade_credit_insurance',
                suitability_score=round(min(100, max(0, insurance_suitability)), 2),
                estimated_rate=0,  # Insurance premium, not interest
                estimated_fees=round(trade_data.trade_amount * 0.005, 2),  # 0.5% premium
                success_probability=round(min(98, 100 - (credit_risk * 0.3)), 2),
                reasoning=[
                    'High credit/trade risk',
                    'Protects against non-payment',
                    'May unlock other financing at better rates'
                ]
            ))
        
        return recommendations
    
    def train(self, training_data: List[Dict], labels: List[Dict]):
        """
        Train the model with historical data
        In production, this would use XGBoost/LightGBM
        """
        # Placeholder for actual ML training
        # Would implement XGBoost multi-output model here
        pass
    
    def save_model(self):
        """Save trained model to disk"""
        if self.model:
            joblib.dump(self.model, self.model_path)
    
    def load_model(self):
        """Load pre-trained model"""
        if os.path.exists(self.model_path):
            self.model = joblib.load(self.model_path)
            self.is_trained = True

# === Global model instance ===
model = FinancingRecommendationModel()
