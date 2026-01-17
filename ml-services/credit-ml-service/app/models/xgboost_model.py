"""
XGBoost Model Implementation

Gradient boosting model optimized for credit scoring.
Typically achieves AUC 0.80-0.85 on structured tabular data.

Best for:
- Feature importance analysis
- Nonlinear patterns
- Robust to missing values
"""

import xgboost as xgb
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple
from datetime import datetime
import logging

from .base_model import BaseModel

logger = logging.getLogger(__name__)


class XGBoostModel(BaseModel):
    """
    XGBoost credit scoring model
    
    Hyperparameters tuned for credit default prediction:
    - max_depth: Controls overfitting
    - learning_rate: Step size
    - n_estimators: Number of trees
    - subsample: Fraction of samples per tree
    - colsample_bytree: Fraction of features per tree
    """
    
    def __init__(
        self,
        version: str = "1.0.0",
        hyperparameters: Dict[str, Any] = None
    ):
        super().__init__(model_name="xgboost", version=version)
        
        # Default hyperparameters (reasonable starting point)
        # ML team should tune these with real data
        self.params = hyperparameters or {
            "max_depth": 6,                    # Prevent overfitting
            "learning_rate": 0.05,             # Slower learning = better generalization
            "n_estimators": 300,               # Number of trees
            "min_child_weight": 3,             # Minimum samples per leaf
            "gamma": 0.1,                      # Minimum loss reduction for split
            "subsample": 0.8,                  # Sample 80% of data per tree
            "colsample_bytree": 0.8,           # Sample 80% of features per tree
            "objective": "binary:logistic",    # Binary classification
            "eval_metric": "auc",              # Optimize for AUC
            "random_state": 42,
            "n_jobs": -1,                      # Use all CPU cores
            "tree_method": "hist",             # Faster training
        }
        
        self.model = xgb.XGBClassifier(**self.params)
        logger.info(f"XGBoost model initialized with params: {self.params}")
    
    def train(
        self,
        X_train: pd.DataFrame,
        y_train: np.ndarray,
        X_val: pd.DataFrame = None,
        y_val: np.ndarray = None
    ) -> Dict[str, Any]:
        """Train XGBoost model"""
        
        logger.info(f"Training XGBoost on {len(X_train)} samples...")
        
        self.feature_names = list(X_train.columns)
        
        # Prepare evaluation set if provided
        eval_set = None
        if X_val is not None and y_val is not None:
            eval_set = [(X_val, y_val)]
        
        # Train model
        self.model.fit(
            X_train,
            y_train,
            eval_set=eval_set,
            verbose=False
        )
        
        self.is_trained = True
        self.metadata["trained_at"] = datetime.now().isoformat()
        self.metadata["train_samples"] = len(X_train)
        self.metadata["n_features"] = X_train.shape[1]
        
        # Validate on training set
        train_metrics = self.validate(X_train, y_train)
        self.metadata["train_metrics"] = train_metrics
        
        logger.info(f"Training complete. Train AUC: {train_metrics['auc']:.4f}")
        
        # Validate on validation set if provided
        if X_val is not None and y_val is not None:
            val_metrics = self.validate(X_val, y_val)
            self.metadata["val_metrics"] = val_metrics
            logger.info(f"Validation AUC: {val_metrics['auc']:.4f}")
        
        return self.metadata
    
    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """Generate binary predictions"""
        if not self.is_trained:
            raise ValueError("Model not trained yet")
        
        return self.model.predict(X)
    
    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        """Generate probability estimates"""
        if not self.is_trained:
            raise ValueError("Model not trained yet")
        
        # Return probability of default (class 1)
        probas = self.model.predict_proba(X)
        return probas[:, 1]
    
    def get_feature_importance(self) -> List[Tuple[str, float]]:
        """Get feature importance from XGBoost"""
        if not self.is_trained:
            raise ValueError("Model not trained yet")
        
        importance = self.model.feature_importances_
        
        # Create (feature, importance) tuples and sort
        feature_importance = sorted(
            zip(self.feature_names, importance),
            key=lambda x: x[1],
            reverse=True
        )
        
        return feature_importance
    
    def get_explainability(self, X: pd.DataFrame, top_n: int = 10) -> Dict[str, Any]:
        """
        Get model explainability using SHAP (if installed)
        
        Note: SHAP takes time to compute. Use sparingly in production.
        """
        try:
            import shap
            
            explainer = shap.TreeExplainer(self.model)
            shap_values = explainer.shap_values(X)
            
            # Get top N most important features
            mean_abs_shap = np.abs(shap_values).mean(axis=0)
            top_indices = np.argsort(mean_abs_shap)[-top_n:][::-1]
            
            top_features = [
                {
                    "feature": self.feature_names[i],
                    "importance": float(mean_abs_shap[i])
                }
                for i in top_indices
            ]
            
            return {
                "top_features": top_features,
                "explainer_type": "SHAP TreeExplainer"
            }
        
        except ImportError:
            logger.warning("SHAP not installed. Using feature importance instead.")
            return {
                "top_features": [
                    {"feature": f, "importance": float(i)}
                    for f, i in self.get_feature_importance()[:top_n]
                ],
                "explainer_type": "XGBoost Feature Importance"
            }
