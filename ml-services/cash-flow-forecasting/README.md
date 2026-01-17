# Cash Flow Forecasting ML Service
## FastAPI Microservice for LSTM-based Cash Flow Prediction

**Version:** 1.0.0  
**Python:** 3.10+  
**Framework:** FastAPI  
**ML Library:** PyTorch

---

## Overview

This service provides ML-powered cash flow forecasting for the SME Receivables Management Platform. It uses LSTM neural networks to predict future cash positions based on invoice data and payment history.

## Architecture

- **FastAPI:** RESTful API server
- **PyTorch:** Deep learning framework
- **Model:** LSTM time-series forecasting
- **Input:** Invoice data, payment history, customer credit scores
- **Output:** 7/30/90-day cash flow predictions with confidence scores

## API Endpoints

### Health Check
```
GET /health
Response: {"status": "healthy", "model_version": "v1.0.0"}
```

### Predict Cash Flow
```
POST /predict
Request Body:
{
  "tenant_id": "string",
  "invoices": [...],
  "payment_history": [...],
  "horizon_days": 30
}

Response:
{
  "predictions": [
    {"date": "2025-01-21", "balance": 98000, "confidence": 0.92}
  ],
  "model_version": "v1.0.0"
}
```

## Installation

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Docker Deployment

```bash
# Build image
docker build -t sme-platform/cash-flow-ml:v1.0.0 .

# Run container
docker run -p 8000:8000 -e MODEL_PATH=/models sme-platform/cash-flow-ml:v1.0.0
```

## Training

```bash
# Train model
python training/train.py --data-path /data/invoices.csv --epochs 100

# Evaluate model
python training/evaluate.py --model-path /models/lstm_v1.pth
```

## Environment Variables

- `MODEL_PATH`: Path to trained model file
- `BATCH_SIZE`: Inference batch size (default: 50)
- `LOG_LEVEL`: Logging level (default: INFO)

## Development

- `app/main.py`: FastAPI application
- `app/models/lstm_model.py`: LSTM architecture
- `app/services/prediction.py`: Inference logic
- `training/train.py`: Model training script
