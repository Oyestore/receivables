"""
Prediction API Routes

FastAPI endpoints for ML predictions.
"""

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
import logging
import time
import numpy as np
from typing import Dict, Any

from .schemas import PredictRequest, PredictResponse, FeatureImportance, ModelPrediction
from app.features import transform_for_prediction
from app.models import EnsembleModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["predictions"])

# Global model instance (loaded on first request - lazy loading)
_model: EnsembleModel = None


def get_model() -> EnsembleModel:
    """
    Get or load the ensemble model
    
    Uses lazy loading - model is loaded on first prediction request.
    In production, you'd load from a model registry (MLflow, S3, etc.)
    """
    global _model
    
    if _model is None:
        logger.info("Loading ensemble model (lazy initialization)...")
        
        try:
            # In production, load from model registry
            # For now, create a new instance (will need to be trained first)
            _model = EnsembleModel(version="1.0.0", use_neural_net=False)
            
            # TODO: Load pre-trained weights
            # _model.load("./models/ensemble_v1.0.0.pkl")
            
            logger.info("Ensemble model loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise HTTPException(status_code=503, detail="Model not available")
    
    return _model


@router.post("/predict", response_model=PredictResponse)
async def predict(request: PredictRequest) -> PredictResponse:
    """
    Generate credit default prediction
    
    Process:
    1. Transform unified profile into features (100+)
    2. Run through ensemble model
    3. Calculate risk score and category
    4. Extract feature importance
    5. Return prediction with explainability
    """
    start_time = time.time()
    
    try:
        logger.info(f"Prediction request for buyer: {request.buyer_id}")
        
        # Transform to feature vector
        unified_profile = {
            "gst": request.gst,
            "banking": request.banking,
            "alerts": request.alerts,
            "scores": request.scores or {}
        }
        
        features_df = transform_for_prediction(unified_profile)
        logger.info(f"Extracted {features_df.shape[1]} features")
        
        # Get model (lazy load)
        model = get_model()
        
        # TEMPORARY: Since model isn't trained yet, return mock prediction
        # In production, replace with: probability = model.predict_proba(features_df)[0]
        
        if not model.is_trained:
            logger.warning("Model not trained - returning rule-based fallback")
            return _fallback_prediction(unified_profile, features_df, start_time)
        
        # Generate prediction
        probability = model.predict_proba(features_df)[0]
        
        # Convert to percentage
        default_probability = float(probability * 100)
        
        # Risk score (inverse of probability)
        risk_score = int((1 - probability) * 100)
        
        # Risk category
        risk_category = _categorize_risk(probability)
        
        # Confidence interval (simple ±3% for now, can use bootstrap for better estimates)
        confidence_interval = [
            max(0, default_probability - 3),
            min(100, default_probability + 3)
        ]
        
        # Feature importance
        importance_list = model.get_feature_importance()[:10]  # Top 10
        top_features = [
            FeatureImportance(
                feature=feature,
                importance=float(importance),
                contribution="+" if importance > 0.5 else "-"
            )
            for feature, importance in importance_list
        ]
        
        # Model contributions (for ensemble)
        model_contributions = model.get_model_contributions(features_df)
        model_predictions = [
            ModelPrediction(
                model_name="xgboost",
                probability=float(model_contributions["xgboost"][0]),
                weight=model.weights["xgboost"]
            ),
            ModelPrediction(
                model_name="lightgbm",
                probability=float(model_contributions["lightgbm"][0]),
                weight=model.weights["lightgbm"]
            )
        ]
        
        # Calculate processing time
        processing_time_ms = (time.time() - start_time) * 1000
        
        # Data completeness
        data_completeness = (
            (50 if request.gst.get("available", False) else 0) +
            (50 if request.banking.get("available", False) else 0)
        )
        
        response = PredictResponse(
            default_probability=default_probability,
            risk_score=risk_score,
            risk_category=risk_category,
            confidence=85.0,  # Can calculate based on data quality
            confidence_interval=confidence_interval,
            model_version=f"{model.model_name}_v{model.version}",
            model_type="ensemble",
            top_features=top_features,
            model_predictions=model_predictions,
            prediction_time_ms=processing_time_ms,
            features_used=features_df.shape[1],
            data_completeness=data_completeness
        )
        
        logger.info(f"Prediction complete in {processing_time_ms:.2f}ms. Default prob: {default_probability:.2f}%")
        
        return response
        
    except Exception as e:
        logger.error(f"Prediction error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


def _categorize_risk(probability: float) -> str:
    """Categorize default probability into risk levels"""
    if probability >= 0.5:
        return "CRITICAL"
    elif probability >= 0.3:
        return "HIGH"
    elif probability >= 0.15:
        return "MEDIUM"
    else:
        return "LOW"


def _fallback_prediction(
    unified_profile: Dict[str, Any],
    features_df,
    start_time: float
) -> PredictResponse:
    """
    Fallback to rule-based prediction when ML model not available
    
    Uses simple heuristics based on scores
    """
    logger.info("Using rule-based fallback prediction")
    
    # Get scores
    gst_score = unified_profile.get("scores", {}).get("gstScore", 50)
    banking_score = unified_profile.get("scores", {}).get("bankingScore", 50)
    alert_penalty = unified_profile.get("scores", {}).get("alertPenalty", 100)
    
    # Simple weighted average
    overall_score = (gst_score * 0.4 + banking_score * 0.45 + alert_penalty * 0.15)
    
    # Convert score to default probability (inverse relationship)
    # Score 100 = 5% default, Score 0 = 95% default
    default_probability = 5 + (100 - overall_score) * 0.9
    
    risk_score = int(overall_score)
    risk_category = _categorize_risk(default_probability / 100)
    
    # Mock feature importance
    top_features = [
        FeatureImportance(feature="gst_overall_score", importance=0.8, contribution="-"),
        FeatureImportance(feature="bank_overall_score", importance=0.75, contribution="-"),
        FeatureImportance(feature="alert_penalty", importance=0.65, contribution="-"),
    ]
    
    processing_time_ms = (time.time() - start_time) * 1000
    
    return PredictResponse(
        default_probability=default_probability,
        risk_score=risk_score,
        risk_category=risk_category,
        confidence=60.0,  # Lower confidence for rule-based
        confidence_interval=[default_probability - 5, default_probability + 5],
        model_version="rule_based_v1.0.0",
        model_type="fallback",
        top_features=top_features,
        model_predictions=None,
        prediction_time_ms=processing_time_ms,
        features_used=features_df.shape[1],
        data_completeness=50.0
    )


@router.get("/models/info")
async def get_model_info():
    """Get information about loaded models"""
    
    model = get_model()
    
    return {
        "ensemble": {
            "name": model.model_name,
            "version": model.version,
            "is_trained": model.is_trained,
            "weights": model.weights,
            "metadata": model.metadata
        },
        "base_models": {
            "xgboost": {
                "name": model.xgboost.model_name,
                "version": model.xgboost.version,
                "is_trained": model.xgboost.is_trained
            },
            "lightgbm": {
                "name": model.lightgbm.model_name,
                "version": model.lightgbm.version,
                "is_trained": model.lightgbm.is_trained
            }
        }
    }


@router.post("/models/reload")
async def reload_models():
    """Reload models from disk (for hot-swapping new versions)"""
    global _model
    
    try:
        logger.info("Reloading models...")
        _model = None  # Force reload on next request
        
        # Pre-load
        get_model()
        
        return {"status": "success", "message": "Models reloaded"}
        
    except Exception as e:
        logger.error(f"Failed to reload models: {e}")
        raise HTTPException(status_code=500, detail=str(e))
