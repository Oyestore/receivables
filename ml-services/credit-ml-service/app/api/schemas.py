"""
Pydantic Schemas for API Request/Response

Defines the contract between NestJS backend and Python ML service.
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime


class PredictRequest(BaseModel):
    """
    Prediction request schema
    
    Accepts the output from UnifiedCreditIntelligenceService
    """
    
    # Buyer information
    tenant_id: str = Field(..., description="Tenant ID")
    buyer_id: str = Field(..., description="Buyer ID")
    gstin: Optional[str] = Field(None, description="GSTIN (if available)")
    
    # GST data
    gst: Dict[str, Any] = Field(..., description="GST intelligence data")
    
    # Banking data
    banking: Dict[str, Any] = Field(..., description="Live financial data")
    
    # Alerts
    alerts: Dict[str, Any] = Field(..., description="Active risk alerts")
    
    # Scores
    scores: Optional[Dict[str, Any]] = Field(None, description="Composite scores")
    
    class Config:
        json_schema_extra = {
            "example": {
                "tenant_id": "tenant-123",
                "buyer_id": "buyer-456",
                "gstin": "29ABCDE1234F1Z5",
                "gst": {
                    "available": True,
                    "signals": {
                        "overallScore": 75,
                        "turnover": {"cagr": 15.5, "monthlyAverage": 500000}
                    }
                },
                "banking": {
                    "available": True,
                    "signals": {
                        "overallScore": 80,
                        "cashFlow": {"monthlyIncome": 50000}
                    }
                },
                "alerts": {
                    "active": [],
                    "criticalCount": 0,
                    "warningCount": 0
                }
            }
        }


class FeatureImportance(BaseModel):
    """Feature importance/contribution"""
    feature: str = Field(..., description="Feature name")
    importance: float = Field(..., description="Importance score (0-1)")
    contribution: str = Field(..., description="'+' increases risk, '-' decreases risk")


class ModelPrediction(BaseModel):
    """Individual model prediction"""
    model_name: str = Field(..., description="Model name")
    probability: float = Field(..., description="Default probability (0-1)")
    weight: float = Field(..., description="Model weight in ensemble")


class PredictResponse(BaseModel):
    """
    Prediction response schema
    
    Returns ML prediction with explainability
    """
    
    # Prediction results
    default_probability: float = Field(..., description="Probability of default (0-100%)")
    risk_score: int = Field(..., description="Risk score (0-100, inverse of probability)")
    risk_category: str = Field(..., description="LOW/MEDIUM/HIGH/CRITICAL")
    
    # Confidence
    confidence: float = Field(..., description="Model confidence (0-100%)")
    confidence_interval: List[float] = Field(..., description="[lower, upper] bounds")
    
    # Model details
    model_version: str = Field(..., description="Model version used")
    model_type: str = Field(..., description="ensemble/xgboost/lightgbm")
    
    # Explainability
    top_features: List[FeatureImportance] = Field(..., description="Top contributing features")
    model_predictions: Optional[List[ModelPrediction]] = Field(None, description="Individual model predictions")
    
    # Metadata
    prediction_time_ms: float = Field(..., description="Processing time in milliseconds")
    features_used: int = Field(..., description="Number of features used")
    data_completeness: float = Field(..., description="% of data available")
    
    class Config:
        json_schema_extra = {
            "example": {
                "default_probability": 15.5,
                "risk_score": 84,
                "risk_category": "LOW",
                "confidence": 85.0,
                "confidence_interval": [12.0, 19.0],
                "model_version": "ensemble_v1.0.0",
                "model_type": "ensemble",
                "top_features": [
                    {"feature": "bank_bounce_rate", "importance": 0.85, "contribution": "+"},
                    {"feature": "gst_compliance_score", "importance": 0.72, "contribution": "-"}
                ],
                "prediction_time_ms": 15.2,
                "features_used": 107,
                "data_completeness": 100.0
            }
        }


class ModelInfo(BaseModel):
    """Model metadata"""
    model_name: str
    version: str
    trained_at: Optional[str]
    train_samples: int
    train_auc: Optional[float]
    val_auc: Optional[float]


class HealthResponse(BaseModel):
    """Health check response"""
    status: str = Field(..., description="healthy/degraded/unhealthy")
    service: str = Field(default="Credit ML Service")
    version: str = Field(default="1.0.0")
    models_loaded: Dict[str, bool] = Field(..., description="Model availability")
    uptime_seconds: Optional[float] = Field(None, description="Service uptime")


class ErrorResponse(BaseModel):
    """Error response"""
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional details")
