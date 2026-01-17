"""
Credit ML Service - Main Application

FastAPI application for ML-powered credit scoring.
Consumes 70+ signals from GST + AA platforms to predict default probability.
"""

from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Credit ML Service",
    description="AI-powered credit scoring using 70+ signals",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model storage
models = {
    "xgboost": None,
    "lightgbm": None,
    "neural_net": None,
    "ensemble": None
}

@app.on_event("startup")
async def startup_event():
    """Load ML models on startup"""
    logger.info("Starting Credit ML Service...")
    logger.info("Models will be loaded on first prediction (lazy loading)")
    logger.info("Service ready!")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down Credit ML Service...")

@app.get("/")
def root():
    """Root endpoint"""
    return {
        "service": "Credit ML Service",
        "version": "1.0.0",
        "status": "operational",
        "capabilities": [
            "Default probability prediction",
            "Risk score calculation",
            "Feature importance analysis",
            "Ensemble model inference"
        ]
    }

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "models_loaded": {
            "xgboost": models["xgboost"] is not None,
            "lightgbm": models["lightgbm"] is not None,
            "neural_net": models["neural_net"] is not None,
            "ensemble": models["ensemble"] is not None
        }
    }

@app.get("/metrics")
def metrics():
    """Prometheus metrics endpoint"""
    from app.monitoring.prometheus_metrics import get_metrics
    return Response(content=get_metrics(), media_type="text/plain")

# Import and include API routes
from app.api import predict_router
from app.routes import collections

app.include_router(predict_router)
app.include_router(collections.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
