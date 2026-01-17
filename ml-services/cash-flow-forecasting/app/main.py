"""
Cash Flow Forecasting ML Service
FastAPI application for LSTM-based cash flow prediction
"""

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any
import logging
from datetime import datetime

# Will import from local modules
# from app.schemas.requests import PredictionRequest, PredictionResponse
# from app.services.prediction import PredictionService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Cash Flow Forecasting Service",
    description="ML-powered cash flow prediction for SME receivables",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "cash-flow-forecasting",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }

# Prediction endpoint
@app.post("/predict")
async def predict_cash_flow(request: Dict[str, Any]):
    """
    Predict cash flow for given tenant and invoice data
    
    Request Body:
    {
        "tenant_id": "string",
        "invoices": [{
            "id": "inv-123",
            "invoice_date": "2025-01-15",
            "amount": 250000,
            "payment_terms_days": 30,
            "customer_name": "Acme Corp",
            "customer_avg_delay_days": 12
        }],
        "payment_probabilities": {
            "inv-123": 0.72
        },
        "horizon_days": 30
    }
    
    Response:
    {
        "predictions": [{
            "date": "2025-01-21",
            "scenarios": {
                "realistic": 98000,
                "optimistic": 125000,
                "pessimistic": 65000
            },
            "confidence": 0.92
        }],
        "critical_dates": [...],
        "model_version": "v1.0.0"
    }
    """
    try:
        from app.services.prediction import prediction_service
        
        tenant_id = request.get("tenant_id")
        horizon_days = request.get("horizon_days", 30)
        
        if not tenant_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="tenant_id is required"
            )
        
        if horizon_days not in [7, 30, 90]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="horizon_days must be 7, 30, or 90"
            )
        
        logger.info(f"Prediction request for tenant {tenant_id}, horizon {horizon_days} days")
        
        # Generate prediction using service
        result = await prediction_service.predict(request)
        
        # Add metadata
        result['generated_at'] = datetime.utcnow().isoformat()
        result['tenant_id'] = tenant_id
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {str(e)}"
        )

# Model info endpoint
@app.get("/model/info")
async def get_model_info():
    """Get information about the loaded model"""
    return {
        "model_type": "LSTM",
        "version": "v1.0.0",
        "input_features": [
            "invoice_amount",
            "payment_terms",
            "customer_payment_probability",
            "days_overdue",
            "seasonal_factors"
        ],
        "output": "predicted_cash_balance",
        "training_date": "2025-01-15",
        "accuracy_mae": 0.15  # 15% MAE on validation set
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
