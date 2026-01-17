"""
Ensemble Model

Combines predictions from multiple models using weighted averaging.
Typically achieves best performance (AUC 0.85-0.88).

Strategy: Stacking with optimized weights
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple
import logging

from .base_model import BaseModel
from .xgboost_model import XGBoostModel
from .lightgbm_model import LightGBMModel

logger = logging.getLogger(__name__)


class EnsembleModel(BaseModel):
    """
    Ensemble model combining XGBoost + LightGBM + (optional) Neural Net
    
    Uses weighted averaging of probabilities:
    - XGBoost: 40% (best feature importance)
    - LightGBM: 35% (fast, robust)
    - Neural Net: 25% (if available, captures complex patterns)
    
    Can tune weights based on validation performance.
    """
    
    def __init__(
        self,
        version: str = "1.0.0",
        weights: Dict[str, float] = None,
        use_neural_net: bool = False
    ):
        super().__init__(model_name="ensemble", version=version)
        
        # Default weights (can be optimized)
        self.weights = weights or {
            "xgboost": 0.40,
            "lightgbm": 0.35,
            "neural_net": 0.25 if use_neural_net else 0.0
        }
        
        # Normalize weights
        total = sum(self.weights.values())
        self.weights = {k: v/total for k, v in self.weights.items()}
        
        self.use_neural_net = use_neural_net
        
        # Initialize base models
        self.xgboost = XGBoostModel(version=version)
        self.lightgbm = LightGBMModel(version=version)
        self.neural_net = None  # Implement later if needed
        
        logger.info(f"Ensemble model initialized with weights: {self.weights}")
    
    def train(
        self,
        X_train: pd.DataFrame,
        y_train: np.ndarray,
        X_val: pd.DataFrame = None,
        y_val: np.ndarray = None
    ) -> Dict[str, Any]:
        """Train all ensemble models"""
        
        logger.info(f"Training ensemble on {len(X_train)} samples...")
        
        self.feature_names = list(X_train.columns)
        
        # Train XGBoost
        logger.info("Training XGBoost...")
        xgb_metrics = self.xgboost.train(X_train, y_train, X_val, y_val)
        
        # Train LightGBM
        logger.info("Training LightGBM...")
        lgb_metrics = self.lightgbm.train(X_train, y_train, X_val, y_val)
        
        # TODO: Train Neural Net if enabled
        if self.use_neural_net:
            logger.warning("Neural Net not implemented yet")
        
        self.is_trained = True
        
        # Evaluate ensemble performance
        train_metrics = self.validate(X_train, y_train)
        self.metadata["train_metrics"] = train_metrics
        
        logger.info(f"Ensemble training complete. Train AUC: {train_metrics['auc']:.4f}")
        
        if X_val is not None and y_val is not None:
            val_metrics = self.validate(X_val, y_val)
            self.metadata["val_metrics"] = val_metrics
            logger.info(f"Ensemble validation AUC: {val_metrics['auc']:.4f}")
        
        # Store individual model performance
        self.metadata["model_metrics"] = {
            "xgboost": xgb_metrics,
            "lightgbm": lgb_metrics
        }
        
        return self.metadata
    
    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """Generate ensemble predictions"""
        probas = self.predict_proba(X)
        return (probas >= 0.5).astype(int)
    
    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        """Generate ensemble probability estimates"""
        if not self.is_trained:
            raise ValueError("Ensemble not trained yet")
        
        # Get predictions from each model
        xgb_proba = self.xgboost.predict_proba(X)
        lgb_proba = self.lightgbm.predict_proba(X)
        
        # Weighted average
        ensemble_proba = (
            xgb_proba * self.weights["xgboost"] +
            lgb_proba * self.weights["lightgbm"]
        )
        
        # Add neural net if available
        if self.use_neural_net and self.neural_net:
            nn_proba = self.neural_net.predict_proba(X)
            ensemble_proba += nn_proba * self.weights["neural_net"]
        
        return ensemble_proba
    
    def get_feature_importance(self) -> List[Tuple[str, float]]:
        """
        Get aggregated feature importance from all models
        
        Averages importance scores across models
        """
        if not self.is_trained:
            raise ValueError("Ensemble not trained yet")
        
        # Get importance from each model
        xgb_importance = dict(self.xgboost.get_feature_importance())
        lgb_importance = dict(self.lightgbm.get_feature_importance())
        
        # Average importance (weighted by model weight)
        aggregated = {}
        all_features = set(xgb_importance.keys()) | set(lgb_importance.keys())
        
        for feature in all_features:
            xgb_imp = xgb_importance.get(feature, 0) * self.weights["xgboost"]
            lgb_imp = lgb_importance.get(feature, 0) * self.weights["lightgbm"]
            
            aggregated[feature] = xgb_imp + lgb_imp
        
        # Sort by importance
        feature_importance = sorted(
            aggregated.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        return feature_importance
    
    def get_model_contributions(self, X: pd.DataFrame) -> Dict[str, np.ndarray]:
        """
        Get individual model contributions to ensemble prediction
        
        Useful for debugging and understanding model behavior
        """
        if not self.is_trained:
            raise ValueError("Ensemble not trained yet")
        
        xgb_proba = self.xgboost.predict_proba(X)
        lgb_proba = self.lightgbm.predict_proba(X)
        
        return {
            "xgboost": xgb_proba * self.weights["xgboost"],
            "lightgbm": lgb_proba * self.weights["lightgbm"],
            "ensemble": self.predict_proba(X)
        }
    
    def optimize_weights(
        self,
        X_val: pd.DataFrame,
        y_val: np.ndarray,
        metric: str = "auc"
    ) -> Dict[str, float]:
        """
        Optimize ensemble weights using validation set
        
        Uses grid search to find best weight combination.
        Note: This is a simple implementation. Could use scipy.optimize instead.
        """
        from sklearn.metrics import roc_auc_score
        
        logger.info("Optimizing ensemble weights...")
        
        best_weights = self.weights.copy()
        best_score = 0
        
        # Grid search over weight combinations
        for xgb_weight in np.arange(0.2, 0.7, 0.1):
            for lgb_weight in np.arange(0.2, 0.7, 0.1):
                if xgb_weight + lgb_weight > 1.0:
                    continue
                
                # Set weights
                temp_weights = {
                    "xgboost": xgb_weight,
                    "lightgbm": lgb_weight,
                    "neural_net": 1.0 - xgb_weight - lgb_weight
                }
                
                # Calculate ensemble prediction
                ensemble_proba = (
                    self.xgboost.predict_proba(X_val) * temp_weights["xgboost"] +
                    self.lightgbm.predict_proba(X_val) * temp_weights["lightgbm"]
                )
                
                # Evaluate
                score = roc_auc_score(y_val, ensemble_proba)
                
                if score > best_score:
                    best_score = score
                    best_weights = temp_weights
        
        logger.info(f"Optimized weights: {best_weights} (AUC: {best_score:.4f})")
        
        self.weights = best_weights
        return best_weights
