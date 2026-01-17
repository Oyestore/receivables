"""
Base Model Interface

Defines the contract for all ML models in the credit scoring system.
This ensures consistency and makes it easy to add new models.
"""

from abc import ABC, abstractmethod
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple
import joblib
import json
from pathlib import Path


class BaseModel(ABC):
    """
    Abstract base class for all credit scoring models
    
    All models must implement:
    - train(): Train the model on data
    - predict(): Generate predictions
    - predict_proba(): Generate probability estimates
    - save(): Persist model to disk
    - load(): Load model from disk
    - get_feature_importance(): Return feature contributions
    """
    
    def __init__(self, model_name: str, version: str = "1.0.0"):
        self.model_name = model_name
        self.version = version
        self.model = None
        self.is_trained = False
        self.feature_names = None
        self.metadata = {
            "model_name": model_name,
            "version": version,
            "trained_at": None,
            "train_samples": 0,
            "train_metrics": {}
        }
    
    @abstractmethod
    def train(
        self,
        X_train: pd.DataFrame,
        y_train: np.ndarray,
        X_val: pd.DataFrame = None,
        y_val: np.ndarray = None
    ) -> Dict[str, Any]:
        """
        Train the model
        
        Args:
            X_train: Training features
            y_train: Training labels (0/1 for default)
            X_val: Validation features (optional)
            y_val: Validation labels (optional)
        
        Returns:
            Dictionary with training metrics (AUC, precision, recall, etc.)
        """
        pass
    
    @abstractmethod
    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """
        Generate binary predictions (0/1)
        
        Args:
            X: Feature DataFrame
        
        Returns:
            Array of predictions (0 or 1)
        """
        pass
    
    @abstractmethod
    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        """
        Generate probability estimates
        
        Args:
            X: Feature DataFrame
        
        Returns:
            Array of probabilities (0.0 to 1.0) for default class
        """
        pass
    
    @abstractmethod
    def get_feature_importance(self) -> List[Tuple[str, float]]:
        """
        Get feature importance scores
        
        Returns:
            List of (feature_name, importance_score) tuples, sorted descending
        """
        pass
    
    def save(self, model_dir: str) -> str:
        """
        Save model to disk
        
        Args:
            model_dir: Directory to save model
        
        Returns:
            Path to saved model
        """
        if not self.is_trained:
            raise ValueError(f"{self.model_name} not trained yet")
        
        model_path = Path(model_dir)
        model_path.mkdir(parents=True, exist_ok=True)
        
        # Save model
        model_file = model_path / f"{self.model_name}_v{self.version}.pkl"
        joblib.dump(self.model, model_file)
        
        # Save metadata
        metadata_file = model_path / f"{self.model_name}_v{self.version}_metadata.json"
        with open(metadata_file, 'w') as f:
            json.dump(self.metadata, f, indent=2, default=str)
        
        return str(model_file)
    
    def load(self, model_path: str) -> 'BaseModel':
        """
        Load model from disk
        
        Args:
            model_path: Path to saved model file
        
        Returns:
            Self (for chaining)
        """
        self.model = joblib.load(model_path)
        self.is_trained = True
        
        # Load metadata if exists
        metadata_path = model_path.replace('.pkl', '_metadata.json')
        if Path(metadata_path).exists():
            with open(metadata_path, 'r') as f:
                self.metadata = json.load(f)
        
        return self
    
    def validate(self, X_test: pd.DataFrame, y_test: np.ndarray) -> Dict[str, float]:
        """
        Validate model on test set
        
        Args:
            X_test: Test features
            y_test: Test labels
        
        Returns:
            Dictionary with performance metrics
        """
        from sklearn.metrics import (
            roc_auc_score, precision_score, recall_score,
            f1_score, accuracy_score, confusion_matrix
        )
        
        y_pred = self.predict(X_test)
        y_proba = self.predict_proba(X_test)
        
        metrics = {
            "auc": roc_auc_score(y_test, y_proba),
            "accuracy": accuracy_score(y_test, y_pred),
            "precision": precision_score(y_test, y_pred, zero_division=0),
            "recall": recall_score(y_test, y_pred, zero_division=0),
            "f1_score": f1_score(y_test, y_pred, zero_division=0)
        }
        
        # Confusion matrix
        tn, fp, fn, tp = confusion_matrix(y_test, y_pred).ravel()
        metrics["true_negatives"] = int(tn)
        metrics["false_positives"] = int(fp)
        metrics["false_negatives"] = int(fn)
        metrics["true_positives"] = int(tp)
        
        return metrics
