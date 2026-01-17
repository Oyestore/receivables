"""
Prometheus Metrics Exporter for ML Service

Exports ML-specific metrics to Prometheus for monitoring.
"""

from prometheus_client import Counter, Histogram, Gauge, generate_latest, REGISTRY
from fastapi import Response
import time


# Prediction metrics
ml_predictions_total = Counter(
    'ml_predictions_total',
    'Total number of ML predictions',
    ['model_version', 'model_type']
)

ml_prediction_latency = Histogram(
    'ml_prediction_latency_seconds',
    'ML prediction latency in seconds',
    ['model_version'],
    buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1.0]
)

ml_prediction_probability = Histogram(
    'ml_prediction_probability',
    'Distribution of default probabilities',
    buckets=[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
)

# Model metrics
ml_model_loaded = Gauge(
    'ml_model_loaded',
    'Whether ML model is loaded (1=loaded, 0=not loaded)',
    ['model_name']
)

ml_model_training_auc = Gauge(
    'ml_model_training_auc',
    'AUC score from latest training',
    ['model_name', 'model_version']
)

# Circuit breaker metrics
ml_circuit_breaker_state = Gauge(
    'ml_circuit_breaker_state',
    'Circuit breaker state (0=closed, 1=open)',
    ['service']
)

ml_circuit_breaker_failures = Counter(
    'ml_circuit_breaker_failures_total',
    'Total circuit breaker failures',
    ['service']
)

# Fallback metrics
ml_fallback_predictions_total = Counter(
    'ml_fallback_predictions_total',
    'Total predictions using fallback (rule-based)',
    ['reason']
)

# Drift metrics
ml_drift_psi_score = Gauge(
    'ml_drift_psi_score',
    'Population Stability Index (PSI) for drift detection',
    ['feature_name']
)

ml_drift_detected = Gauge(
    'ml_drift_detected',
    'Whether drift was detected (1=drifted, 0=no drift)'
)

# Feature engineering metrics
ml_feature_extraction_latency = Histogram(
    'ml_feature_extraction_latency_seconds',
    'Feature extraction latency in seconds',
    buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.075, 0.1]
)

ml_features_extracted_total = Counter(
    'ml_features_extracted_total',
    'Total number of features extracted'
)

# Error metrics
ml_errors_total = Counter(
    'ml_errors_total',
    'Total number of ML errors',
    ['error_type']
)


def get_metrics():
    """Generate Prometheus metrics in text format"""
    return generate_latest(REGISTRY)


# Helper functions to record metrics
def record_prediction(model_version: str, model_type: str, latency: float, probability: float):
    """Record a prediction"""
    ml_predictions_total.labels(model_version=model_version, model_type=model_type).inc()
    ml_prediction_latency.labels(model_version=model_version).observe(latency)
    ml_prediction_probability.observe(probability)


def record_fallback(reason: str):
    """Record a fallback prediction"""
    ml_fallback_predictions_total.labels(reason=reason).inc()


def update_model_status(model_name: str, loaded: bool):
    """Update model loaded status"""
    ml_model_loaded.labels(model_name=model_name).set(1 if loaded else 0)


def update_circuit_breaker(service: str, is_open: bool):
    """Update circuit breaker state"""
    ml_circuit_breaker_state.labels(service=service).set(1 if is_open else 0)


def record_circuit_breaker_failure(service: str):
    """Record circuit breaker failure"""
    ml_circuit_breaker_failures.labels(service=service).inc()


def update_drift_metric(feature_name: str, psi: float):
    """Update drift PSI score"""
    ml_drift_psi_score.labels(feature_name=feature_name).set(psi)


def record_drift_detection(drifted: bool):
    """Record drift detection result"""
    ml_drift_detected.set(1 if drifted else 0)


def record_error(error_type: str):
    """Record an error"""
    ml_errors_total.labels(error_type=error_type).inc()
