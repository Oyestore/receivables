"""
LightGBM Model Implementation

Fast gradient boosting model with efficient memory usage.
Typically achieves AUC 0.78-0.83 on structured data.

Best for:
- Large datasets (>100K samples)
- Fast training
- Categorical features
"""

import lightgbm as lgb
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple
from datetime import datetime
import logging

from .base_model import BaseModel

logger = logging.getLogger(__name__)


class LightGBMModel(BaseModel):
    """
    LightGBM credit scoring model
    
    Advantages over XGBoost:
    - Faster training
    - Lower memory usage
    - Native categorical support
    """
    
    def __init__(
        self,
        version: str = "1.0.0",
        hyperparameters: Dict[str, Any] = None
    ):
        super().__init__(model_name="lightgbm", version=version)
        
        # Default hyperparameters
        self.params = hyperparameters or {
            "num_leaves": 31,                  # Tree complexity
            "learning_rate": 0.05,              
            "n_estimators": 300,
            "min_child_samples": 20,           # Minimum samples per leaf
            "subsample": 0.8,
            "colsample_bytree": 0.8,
            "reg_alpha": 0.1,                  # L1 regularization
            "reg_lambda": 0.1,                 # L2 regularization
            "objective": "binary",
            "metric": "auc",
            "random_state": 42,
            "n_jobs": -1,
            "verbose": -1,
        }
        
        self.model = lgb.LGBMClassifier(**self.params)
        logger.info(f"LightGBM model initialized with params: {self.params}")
    
    def train(
        self,
        X_train: pd.DataFrame,
        y_train: np.ndarray,
        X_val: pd.DataFrame = None,
        y_val: np.ndarray = None
    ) -> Dict[str, Any]:
        """Train LightGBM model"""
        
        logger.info(f"Training LightGBM on {len(X_train)} samples...")
        
        self.feature_names = list(X_train.columns)
        
        # Prepare evaluation set
        eval_set = None
        if X_val is not None and y_val is not None:
            eval_set = [(X_val, y_val)]
        
        # Train model
        self.model.fit(
            X_train,
            y_train,
            eval_set=eval_set,
            eval_metric='auc',
        )
        
        self.is_trained = True
        self.metadata["trained_at"] = datetime.now().isoformat()
        self.metadata["train_samples"] = len(X_train)
        self.metadata["n_features"] = X_train.shape[1]
        
        # Training metrics
        train_metrics = self.validate(X_train, y_train)
        self.metadata["train_metrics"] = train_metrics
        
        logger.info(f"Training complete. Train AUC: {train_metrics['auc']:.4f}")
        
        # Validation metrics
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
        """Get feature importance from LightGBM"""
        if not self.is_trained:
            raise ValueError("Model not trained yet")
        
        importance = self.model.feature_importances_
        
        feature_importance = sorted(
            zip(self.feature_names, importance),
            key=lambda x: x[1],
            reverse=True
        )
        
        return feature_importance
