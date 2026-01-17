"""
Collection Strategy Prediction API
====================================

ML-powered collection strategy predictor for autonomous collections engine.

Predicts optimal collection strategy based on:
- Invoice characteristics (amount, days overdue)
- Customer payment history
- Industry benchmarks
- Temporal factors

Returns: Recommended strategy with confidence score and success prediction
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
import numpy as np
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/predict/collections", tags=["collections"])

# ============================================================================
# Request/Response Models
# ============================================================================

class CustomerPaymentHistory(BaseModel):
    """Customer payment behavior history"""
    avg_days_to_pay: float = Field(..., description="Average days to pay invoices")
    paid_late_count: int = Field(..., description="Number of late payments")
    total_invoices: int = Field(..., description="Total invoices processed")
    payment_disputes: int = Field(default=0, description="Number of disputes")
    last_payment_date: Optional[str] = Field(None, description="Last payment date (ISO format)")

class CollectionPredictionRequest(BaseModel):
    """Request model for collection strategy prediction"""
    invoice_amount: float = Field(..., gt=0, description="Invoice amount in rupees")
    days_overdue: int = Field(..., ge=0, description="Days past due date")
    payment_terms: int = Field(..., gt=0, description="Payment terms in days")
    customer_ltv: float = Field(..., ge=0, description="Customer lifetime value")
    customer_payment_history: CustomerPaymentHistory
    industry_code: str = Field(..., description="Industry classification code")
    company_size: str = Field(..., description="Company size: micro, small, medium, large")
    geography_state: str = Field(..., description="State code")
    invoice_count_mtd: int = Field(..., ge=0, description="Invoices this month")
    
    class Config:
        schema_extra = {
            "example": {
                "invoice_amount": 50000.00,
                "days_overdue": 10,
                "payment_terms": 30,
                "customer_ltv": 500000.00,
                "customer_payment_history": {
                    "avg_days_to_pay": 35,
                    "paid_late_count": 3,
                    "total_invoices": 12,
                    "payment_disputes": 0
                },
                "industry_code": "MFG_TEXTILES",
                "company_size": "small",
                "geography_state": "Maharashtra",
                "invoice_count_mtd": 25
            }
        }

class AlternativeStrategy(BaseModel):
    """Alternative collection strategy option"""
    strategy: str
    confidence: float
    success_rate: float

class CollectionPredictionResponse(BaseModel):
    """Response model with recommended strategy"""
    recommended_strategy: str = Field(..., description="Best strategy to execute")
    confidence: float = Field(..., ge=0, le=1, description="Model confidence (0-1)")
    predicted_outcome: str = Field(..., description="Expected outcome: paid_full, paid_partial")
    predicted_collection_days: int = Field(..., description="Expected days to collection")
    expected_recovery_amount: float = Field(..., description="Expected recovery in rupees")
    alternative_strategies: List[AlternativeStrategy] = Field(..., description="Top 3 alternatives")
    model_version: str = Field(default="1.0.0", description="Model version used")
    
    class Config:
        schema_extra = {
            "example": {
                "recommended_strategy": "firm_notice_whatsapp",
                "confidence": 0.85,
                "predicted_outcome": "paid_full",
                "predicted_collection_days": 7,
                "expected_recovery_amount": 47500.00,
                "alternative_strategies": [
                    {"strategy": "gentle_reminder_email", "confidence": 0.72, "success_rate": 0.68},
                    {"strategy": "payment_plan_offer", "confidence": 0.65, "success_rate": 0.82}
                ],
                "model_version": "1.0.0"
            }
        }

# ============================================================================
# Strategy Definitions
# ============================================================================

COLLECTION_STRATEGIES = [
    'gentle_reminder_whatsapp',
    'gentle_reminder_email',
    'firm_notice_whatsapp',
    'firm_notice_email',
    'payment_plan_offer',
    'phone_call_request',
    'escalate_to_manager'
]

# ============================================================================
# Feature Engineering
# ============================================================================

def extract_features(request: CollectionPredictionRequest) -> np.ndarray:
    """
    Extract ML features from request
    
    Features (15 total):
    1. Invoice amount (normalized)
    2. Days overdue
    3. Payment terms
    4. Overdue ratio (days_overdue / payment_terms)
    5. Customer LTV (normalized)
    6. Avg days to pay
    7. Late payment ratio
    8. Dispute ratio
    9. Company size encoded (0-3)
    10. Invoice amount risk bucket (0-4)
    11. Days overdue severity (0-4)
    12. Customer reliability score (0-1)
    13. Recency factor (days since last payment)
    14. Invoice count MTD
    15. Weekend factor (0/1) - based on current day
    """
    
    # Normalize invoice amount (₹10K = 1.0)
    amount_normalized = request.invoice_amount / 10000.0
    
    # Overdue ratio
    overdue_ratio = request.days_overdue / request.payment_terms if request.payment_terms > 0 else 0
    
    # Customer LTV normalized (₹100K = 1.0)
    ltv_normalized = request.customer_ltv / 100000.0
    
    # Late payment ratio
    hist = request.customer_payment_history
    late_ratio = hist.paid_late_count / hist.total_invoices if hist.total_invoices > 0 else 0
    
    # Dispute ratio
    dispute_ratio = hist.payment_disputes / hist.total_invoices if hist.total_invoices > 0 else 0
    
    # Company size encoding
    size_map = {'micro': 0, 'small': 1, 'medium': 2, 'large': 3}
    company_size_encoded = size_map.get(request.company_size.lower(), 1)
    
    # Invoice amount risk bucket
    if amount_normalized < 1:  # < ₹10K
        amount_bucket = 0
    elif amount_normalized < 5:  # ₹10K-₹50K
        amount_bucket = 1
    elif amount_normalized < 10:  # ₹50K-₹100K
        amount_bucket = 2
    elif amount_normalized < 50:  # ₹100K-₹500K
        amount_bucket = 3
    else:  # > ₹500K
        amount_bucket = 4
    
    # Days overdue severity
    if request.days_overdue <= 7:
        overdue_severity = 0
    elif request.days_overdue <= 14:
        overdue_severity = 1
    elif request.days_overdue <= 30:
        overdue_severity = 2
    elif request.days_overdue <= 60:
        overdue_severity = 3
    else:
        overdue_severity = 4
    
    # Customer reliability score (inverse of late ratio, adjusted by disputes)
    reliability = max(0, 1.0 - late_ratio - (dispute_ratio * 0.5))
    
    # Recency factor (days since last payment - approximate)
    recency_days = request.days_overdue  # Simplified - would use actual last_payment_date
    recency_factor = min(1.0, recency_days / 90.0)
    
    # Weekend factor (simplified - would use actual date)
    weekend_factor = 0  # Placeholder
    
    features = np.array([
        amount_normalized,
        request.days_overdue,
        request.payment_terms,
        overdue_ratio,
        ltv_normalized,
        hist.avg_days_to_pay,
        late_ratio,
        dispute_ratio,
        company_size_encoded,
        amount_bucket,
        overdue_severity,
        reliability,
        recency_factor,
        request.invoice_count_mtd,
        weekend_factor
    ])
    
    logger.debug(f"Extracted features: {features}")
    return features

# ============================================================================
# Rule-Based Prediction (Placeholder for ML Model)
# ============================================================================
# NOTE: In production, this would be replaced with trained Gradient Boosting model
# For now, using sophisticated rule-based logic that mimics ML behavior

def predict_strategy_rule_based(features: np.ndarray, request: CollectionPredictionRequest) -> tuple:
    """
    Rule-based strategy prediction (placeholder for ML model)
    
    Returns: (strategy_index, confidence_scores)
    """
    
    amount_norm, days_overdue, payment_terms, overdue_ratio, ltv_norm, \
    avg_days, late_ratio, dispute_ratio, company_size, amount_bucket, \
    overdue_severity, reliability, recency, invoice_mtd, weekend = features
    
    # Initialize strategy scores
    scores = np.zeros(len(COLLECTION_STRATEGIES))
    
    # Strategy 0: gentle_reminder_whatsapp
    if days_overdue <= 7 and late_ratio < 0.3 and amount_norm < 10:
        scores[0] = 0.85
    elif days_overdue <= 7:
        scores[0] = 0.70
    
    # Strategy 1: gentle_reminder_email
    if days_overdue <= 7 and amount_norm >= 10:  # High-value prefer email
        scores[1] = 0.80
    elif days_overdue <= 7:
        scores[1] = 0.65
    
    # Strategy 2: firm_notice_whatsapp
    if 8 <= days_overdue <= 14 and late_ratio >= 0.3:
        scores[2] = 0.85
    elif 8 <= days_overdue <= 14:
        scores[2] = 0.75
    
    # Strategy 3: firm_notice_email
    if 8 <= days_overdue <= 14 and amount_norm >= 5:
        scores[3] = 0.80
    elif 8 <= days_overdue <= 14:
        scores[3] = 0.70
    
    # Strategy 4: payment_plan_offer
    if days_overdue >= 15 and amount_norm >= 5 and ltv_norm >= 5:  # High value customer
        scores[4] = 0.90
    elif days_overdue >= 15 and amount_norm >= 3:
        scores[4] = 0.75
    
    # Strategy 5: phone_call_request
    if days_overdue >= 20 and amount_norm >= 10:
        scores[5] = 0.85
    elif days_overdue >= 20 and ltv_norm >= 10:
        scores[5] = 0.80
    
    # Strategy 6: escalate_to_manager
    if days_overdue >= 30 and amount_norm >= 10:
        scores[6] = 0.90
    elif days_overdue >= 30:
        scores[6] = 0.75
    
    # Normalize scores to probabilities
    if scores.sum() > 0:
        probabilities = scores / scores.sum()
    else:
        # Default to gentle reminder if no strong signals
        probabilities = np.array([0.5, 0.3, 0.1, 0.05, 0.03, 0.01, 0.01])
    
    best_idx = np.argmax(probabilities)
    
    return best_idx, probabilities

def predict_success_rate(request: CollectionPredictionRequest, strategy: str) -> float:
    """
    Predict probability of successful collection for given strategy
    """
    base_rate = 0.75
    hist = request.customer_payment_history
    
    # Adjust based on customer reliability
    late_ratio = hist.paid_late_count / hist.total_invoices if hist.total_invoices > 0 else 0
    if late_ratio > 0.5:
        base_rate -= 0.20
    elif late_ratio > 0.3:
        base_rate -= 0.10
    
    # Adjust based on days overdue
    if request.days_overdue > 60:
        base_rate -= 0.25
    elif request.days_overdue > 30:
        base_rate -= 0.15
    elif request.days_overdue > 14:
        base_rate -= 0.05
    
    # Adjust based on strategy effectiveness
    if 'payment_plan' in strategy and request.invoice_amount > 50000:
        base_rate += 0.10  # Payment plans work well for high-value
    elif 'escalate' in strategy:
        base_rate += 0.05  # Escalation adds urgency
    
    # Adjust based on customer LTV (preserve good customers)
    if request.customer_ltv > 500000 and 'gentle' in strategy:
        base_rate += 0.05
    
    return max(0.10, min(0.95, base_rate))

def predict_collection_days(request: CollectionPredictionRequest, strategy: str) -> int:
    """
    Predict days until successful collection
    """
    base_days = 7
    
    # Gentle strategies take longer
    if 'gentle' in strategy:
        base_days += 3
    elif 'firm' in strategy:
        base_days += 1
    elif 'payment_plan' in strategy:
        base_days += 10  # Payment plans need negotiation time
    elif 'escalate' in strategy:
        base_days += 5  # Escalation takes time
    
    # Already overdue adds to timeline
    if request.days_overdue > 30:
        base_days += 7
    elif request.days_overdue > 14:
        base_days += 3
    
    # Customer reliability affects speed
    hist = request.customer_payment_history
    if hist.avg_days_to_pay > request.payment_terms:
        base_days += 2
    
    return min(base_days, 30)  # Cap at 30 days

# ============================================================================
# API Endpoint
# ============================================================================

@router.post("/predict-strategy", response_model=CollectionPredictionResponse)
async def predict_collection_strategy(request: CollectionPredictionRequest):
    """
    Predict optimal collection strategy using ML model
    
    **Algorithm:**
    1. Extract 15 features from request
    2. Predict strategy using Gradient Boosting (or rules for v1.0)
    3. Calculate success probability
    4. Estimate collection timeline
    5. Return top strategy + 3 alternatives
    
    **Strategies:**
    - gentle_reminder_whatsapp: Days 1-7, low-risk
    - gentle_reminder_email: Days 1-7, high-value
    - firm_notice_whatsapp: Days 8-14, medium-risk
    - firm_notice_email: Days 8-14, formal
    - payment_plan_offer: Days 15+, high-value customers
    - phone_call_request: Days 20+, personal touch
    - escalate_to_manager: Days 30+, final warning
    """
    
    try:
        logger.info(f"Predicting strategy for invoice: ₹{request.invoice_amount}, {request.days_overdue} days overdue")
        
        # Feature extraction
        features = extract_features(request)
        
        # Predict strategy
        best_idx, probabilities = predict_strategy_rule_based(features, request)
        recommended_strategy = COLLECTION_STRATEGIES[best_idx]
        confidence = float(probabilities[best_idx])
        
        # Success prediction
        success_rate = predict_success_rate(request, recommended_strategy)
        collection_days = predict_collection_days(request, recommended_strategy)
        
        # Expected recovery
        expected_recovery = request.invoice_amount * success_rate
        
        # Predicted outcome
        if success_rate > 0.75:
            predicted_outcome = "paid_full"
        elif success_rate > 0.50:
            predicted_outcome = "paid_partial"
        else:
            predicted_outcome = "no_response"
        
        # Alternative strategies (top 3 excluding best)
        alternatives = []
        sorted_indices = np.argsort(probabilities)[::-1]
        for idx in sorted_indices[1:4]:  # Top 3 alternatives
            alt_strategy = COLLECTION_STRATEGIES[idx]
            alt_confidence = float(probabilities[idx])
            alt_success = predict_success_rate(request, alt_strategy)
            
            alternatives.append(AlternativeStrategy(
                strategy=alt_strategy,
                confidence=alt_confidence,
                success_rate=alt_success
            ))
        
        response = CollectionPredictionResponse(
            recommended_strategy=recommended_strategy,
            confidence=confidence,
            predicted_outcome=predicted_outcome,
            predicted_collection_days=collection_days,
            expected_recovery_amount=expected_recovery,
            alternative_strategies=alternatives,
            model_version="1.0.0-rules"
        )
        
        logger.info(f"Prediction: {recommended_strategy} (confidence: {confidence:.2f}, success: {success_rate:.2f})")
        
        return response
        
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@router.get("/strategies")
async def list_strategies():
    """
    List all available collection strategies
    """
    return {
        "strategies": COLLECTION_STRATEGIES,
        "total": len(COLLECTION_STRATEGIES),
        "categories": {
            "gentle": ["gentle_reminder_whatsapp", "gentle_reminder_email"],
            "firm": ["firm_notice_whatsapp", "firm_notice_email"],
            "negotiation": ["payment_plan_offer"],
            "escalation": ["phone_call_request", "escalate_to_manager"]
        }
    }

@router.get("/health")
async def health_check():
    """
    Health check for collections prediction service
    """
    return {
        "status": "healthy",
        "service": "collections_predictor",
        "model_version": "1.0.0-rules",
        "strategies_available": len(COLLECTION_STRATEGIES)
    }
