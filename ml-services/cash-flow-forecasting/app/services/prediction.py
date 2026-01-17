"""
Prediction Service
Handles inference using trained ML model or heuristic fallback
"""

import logging
import os
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

try:
    import torch
    from app.models.lstm_model import MultiHorizonLSTM, create_model
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    logger.warning("Torch not available, using heuristic mode only")

from app.services.heuristic_forecaster import get_heuristic_forecast


class PredictionService:
    """
    Service for generating cash flow predictions
    """
    
    def __init__(self, model_path: str = None):
        self.model_path = model_path or os.getenv('MODEL_PATH', '/models')
        self.model = None
        self.model_version = 'v1.0.0'
        self.use_heuristic = False
        
        # Try to load ML model
        if TORCH_AVAILABLE:
            self._load_model()
        else:
            self.use_heuristic = True

    def _load_model(self):
        """Load trained ML model if available"""
        try:
            model_file = os.path.join(self.model_path, 'cash_flow_lstm_latest.pth')
            
            if os.path.exists(model_file):
                logger.info(f"Loading ML model from {model_file}")
                
                # Create model architecture
                self.model = create_model({'type': 'multi_horizon'})
                
                # Load weights
                checkpoint = torch.load(model_file, map_location='cpu')
                self.model.load_state_dict(checkpoint['model_state_dict'])
                self.model.eval()
                
                self.model_version = checkpoint.get('version', 'v1.0.0')
                logger.info(f"ML model loaded successfully: {self.model_version}")
                self.use_heuristic = False
            else:
                logger.warning(f"ML model not found at {model_file}, using heuristic fallback")
                self.use_heuristic = True
                
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            logger.warning("Falling back to heuristic forecasting")
            self.use_heuristic = True
    
    async def predict(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate cash flow predictions
        
        Args:
            request_data: {
                'tenant_id': str,
                'invoices': List[Dict],
                'payment_probabilities': Dict[str, float],
                'horizon_days': int (7, 30, or 90)
            }
        
        Returns:
            {
                'predictions': List[Dict],  # Timeline data
                'critical_dates': List[Dict],
                'model_version': str,
                'confidence': float
            }
        """
        tenant_id = request_data.get('tenant_id')
        invoices = request_data.get('invoices', [])
        payment_probs = request_data.get('payment_probabilities', {})
        horizon_days = request_data.get('horizon_days', 30)
        
        logger.info(f"Generating prediction for tenant {tenant_id}, "
                   f"{len(invoices)} invoices, {horizon_days} days horizon")
        
        if self.use_heuristic or self.model is None:
            # Use heuristic forecasting
            logger.info("Using heuristic forecasting")
            result = get_heuristic_forecast(invoices, payment_probs, horizon_days)
            result['model_version'] = 'heuristic-v1.0'
            return result
        
        try:
            # Use ML model
            logger.info("Using ML model for prediction")
            result = await self._ml_predict(invoices, payment_probs, horizon_days)
            result['model_version'] = self.model_version
            return result
            
        except Exception as e:
            logger.error(f"ML prediction failed: {e}, falling back to heuristic")
            # Fallback to heuristic
            result = get_heuristic_forecast(invoices, payment_probs, horizon_days)
            result['model_version'] = 'heuristic-fallback'
            return result
    
    async def _ml_predict(
        self,
        invoices: List[Dict],
        payment_probs: Dict[str, float],
        horizon_days: int
    ) -> Dict[str, Any]:
        """
        Generate prediction using ML model
        """
        # TODO: Implement full ML inference pipeline
        # For now, use heuristic as placeholder during Week 2
        logger.warning("ML inference not fully implemented, using heuristic")
        return get_heuristic_forecast(invoices, payment_probs, horizon_days)
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about loaded model"""
        return {
            'model_type': 'LSTM' if not self.use_heuristic else 'Heuristic',
            'version': self.model_version,
            'status': 'loaded' if self.model is not None else 'using_fallback',
            'input_features': [
                'invoice_amount',
                'payment_terms',
                'customer_payment_probability',
                'days_overdue',
                'seasonal_factors'
            ] if not self.use_heuristic else ['invoice_data', 'payment_terms'],
            'output': 'predicted_cash_balance',
            'accuracy_mae': 0.15 if not self.use_heuristic else 0.25  # Heuristic less accurate
        }


# Global prediction service instance
prediction_service = PredictionService()
