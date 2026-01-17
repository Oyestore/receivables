"""
Trade Finance ML Service - FastAPI Application
Provides ML-powered endpoints for financing recommendations and risk scoring
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn

from financing_recommendation import (
    FinancingRecommendationModel,
    TradeData,
    RecommendationResponse,
    model as recommendation_model
)

# === FastAPI App ===
app = FastAPI(
    title="Trade Finance ML Service",
    description="ML-powered financing recommendations and risk scoring for cross-border trade",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === Endpoints ===

@app.get("/")
async def root():
    return {
        "service": "Trade Finance ML",
        "version": "1.0.0",
        "status": "operational",
        "model_loaded": recommendation_model.is_trained
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "model_status": "loaded" if recommendation_model.is_trained else "using_rules",
        "timestamp": "2024-12-28T08:30:00Z"
    }

@app.post("/api/v1/financing/recommend", response_model=RecommendationResponse)
async def recommend_financing(trade_data: TradeData):
    """
    Get AI-powered financing product recommendations
    
    Analyzes trade data and returns recommended financing products
    with suitability scores, estimated costs, and success probabilities
    """
    try:
        recommendations = recommendation_model.predict(trade_data)
        return recommendations
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.post("/api/v1/risk/assess")
async def assess_risk(trade_data: TradeData):
    """
    Comprehensive risk assessment for trade
    
    Returns credit risk, trade risk, forex risk scores
    """
    try:
        result = recommendation_model.predict(trade_data)
        return {
            "risk_assessment": result.risk_assessment,
            "overall_eligibility": result.overall_eligibility,
            "risk_level": "low" if result.overall_eligibility > 70 else "medium" if result.overall_eligibility > 40 else "high"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Risk assessment error: {str(e)}")

@app.get("/api/v1/model/info")
async def model_info():
    """Get model information and statistics"""
    return {
        "model_type": "XGBoost Multi-Output" if recommendation_model.is_trained else "Rules-based",
        "model_version": "1.0.0",
        "trained": recommendation_model.is_trained,
        "features": [
            "trade_amount",
            "buyer_credit_score",
            "seller_credit_score",
            "origin_country_risk",
            "destination_country_risk",
            "product_category_risk",
            "payment_history_score",
            "forex_volatility",
            "customs_complexity",
            "shipping_duration"
        ],
        "products": [
            "invoice_factoring",
            "supply_chain_finance",
            "export_credit",
            "letter_of_credit",
            "forfaiting",
            "trade_credit_insurance"
        ]
    }

# === Run Server ===
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )
