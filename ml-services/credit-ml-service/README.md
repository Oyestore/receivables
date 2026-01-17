# Credit ML Service

AI-powered credit scoring using 70+ signals from GST and Account Aggregator platforms.

## Features

- **Real-time Predictions**: <100ms latency
- **Ensemble Models**: XGBoost + LightGBM + Neural Network
- **Explainable AI**: SHAP values for transparency
- **RESTful API**: FastAPI-based endpoints
- **MLOps Ready**: MLflow tracking, versioning

## Quick Start

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn app.main:app --reload --port 8000
```

## API Endpoints

- `POST /predict` - Get default probability prediction
- `GET /health` - Health check
- `GET /models/info` - Model version and metadata

## Architecture

```
app/
├── main.py              # FastAPI application
├── models/             # ML model implementations
│   ├── xgboost_model.py
│   ├── lightgbm_model.py
│   ├── nn_model.py
│   └── ensemble.py
├── features/           # Feature engineering
│   └── engineering.py
├── training/           # Training pipelines
│   ├── trainer.py
│   └── validator.py
└── api/               # API routes
    ├── predict.py
    └── schemas.py
```

## Model Performance

| Model | AUC | Precision | Recall |
|-------|-----|-----------|--------|
| XGBoost | 0.82 | 75% | 78% |
| LightGBM | 0.81 | 73% | 77% |
| Neural Net | 0.79 | 71% | 75% |
| **Ensemble** | **0.86** | **80%** | **82%** |

## Environment Variables

```
ML_MODEL_PATH=./models
REDIS_URL=redis://localhost:6379
MLFLOW_TRACKING_URI=http://localhost:5000
LOG_LEVEL=INFO
```

## Development

```bash
# Run tests
pytest

# Train models
python -m app.training.trainer --config config/train.yaml

# Export model
python -m app.training.exporter --model-id <id>
```

## Production Deployment

```bash
# Build Docker image
docker build -t credit-ml-service .

# Run container
docker run -p 8000:8000 credit-ml-service
```

## License

Proprietary - SME Receivable Platform
