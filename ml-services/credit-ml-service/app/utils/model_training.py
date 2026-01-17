"""
Shared Model Training Utilities for ML Services

Provides common functionality for training, evaluating, and persisting ML models.
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, Tuple, List, Optional
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, mean_absolute_percentage_error, mean_absolute_error
import joblib
import os
from datetime import datetime

class ModelTrainer:
    """Base class for training ML models"""
    
    def __init__(self, model_type: str = 'classification'):
        self.model_type = model_type
        self.model = None
        self.feature_names = []
        
    def prepare_data(
        self,
        df: pd.DataFrame,
        target_column: str,
        feature_columns: Optional[List[str]] = None,
        test_size: float = 0.2,
        random_state: int = 42
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """
        Prepare training and test datasets
        
        Args:
            df: Input DataFrame
            target_column: Name of target column
            feature_columns: List of feature column names (None = all except target)
            test_size: Fraction of data for testing
            random_state: Random seed for reproducibility
            
        Returns:
            X_train, X_test, y_train, y_test
        """
        if feature_columns is None:
            feature_columns = [col for col in df.columns if col != target_column]
        
        self.feature_names = feature_columns
        
        X = df[feature_columns].values
        y = df[target_column].values
        
        return train_test_split(X, y, test_size=test_size, random_state=random_state)
    
    def train_random_forest(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        hyperparameters: Optional[Dict[str, Any]] = None
    ):
        """
        Train Random Forest model
        
        Args:
            X_train: Training features
            y_train: Training labels
            hyperparameters: Model hyperparameters
        """
        if hyperparameters is None:
            hyperparameters = {
                'n_estimators': 100,
                'max_depth': 10,
                'min_samples_split': 2,
                'random_state': 42
            }
        
        if self.model_type == 'classification':
            self.model = RandomForestClassifier(**hyperparameters)
        else:
            self.model = RandomForestRegressor(**hyperparameters)
        
        self.model.fit(X_train, y_train)
        
        return self
    
    def evaluate_model(
        self,
        X_test: np.ndarray,
        y_test: np.ndarray
    ) -> Dict[str, float]:
        """
        Evaluate trained model
        
        Args:
            X_test: Test features
            y_test: Test labels
            
        Returns:
            Dictionary of metrics
        """
        if self.model is None:
            raise ValueError("Model not trained yet")
        
        y_pred = self.model.predict(X_test)
        
        metrics = {}
        
        if self.model_type == 'classification':
            metrics['accuracy'] = accuracy_score(y_test, y_pred)
            metrics['precision'] = precision_score(y_test, y_pred, average='weighted', zero_division=0)
            metrics['recall'] = recall_score(y_test, y_pred, average='weighted', zero_division=0)
            metrics['f1_score'] = f1_score(y_test, y_pred, average='weighted', zero_division=0)
        else:
            # Regression metrics
            metrics['mae'] = mean_absolute_error(y_test, y_pred)
            
            # MAPE (safe division)
            mask = y_test != 0
            if mask.any():
                mape = np.mean(np.abs((y_test[mask] - y_pred[mask]) / y_test[mask])) * 100
                metrics['mape'] = mape
            else:
                metrics['mape'] = 0.0
            
            # R-squared
            ss_res = np.sum((y_test - y_pred) ** 2)
            ss_tot = np.sum((y_test - np.mean(y_test)) ** 2)
            metrics['r2_score'] = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0.0
            
            # Convert to "accuracy" analog for consistency (1 - normalized error)
            max_error = np.max(np.abs(y_test - y_pred))
            max_value = np.max(np.abs(y_test))
            metrics['accuracy'] = 1 - (max_error / max_value) if max_value != 0 else 0.0
        
        return metrics
    
    def get_feature_importance(self) -> Dict[str, float]:
        """
        Get feature importance scores
        
        Returns:
            Dictionary mapping feature names to importance scores
        """
        if self.model is None:
            raise ValueError("Model not trained yet")
        
        if not hasattr(self.model, 'feature_importances_'):
            return {}
        
        importances = self.model.feature_importances_
        
        return {
            feature: float(importance)
            for feature, importance in zip(self.feature_names, importances)
        }
    
    def cross_validate(
        self,
        X: np.ndarray,
        y: np.ndarray,
        cv: int = 5
    ) -> Dict[str, Any]:
        """
        Perform cross-validation
        
        Args:
            X: Features
            y: Labels
            cv: Number of folds
            
        Returns:
            Cross-validation results
        """
        if self.model is None:
            raise ValueError("Model not trained yet")
        
        scores = cross_val_score(self.model, X, y, cv=cv)
        
        return {
            'cv_scores': scores.tolist(),
            'cv_mean': float(scores.mean()),
            'cv_std': float(scores.std())
        }
    
    def save_model(self, model_id: str, output_dir: str = './models') -> str:
        """
        Save trained model to disk
        
        Args:
            model_id: Unique model identifier
            output_dir: Directory to save model
            
        Returns:
            Path to saved model file
        """
        if self.model is None:
            raise ValueError("Model not trained yet")
        
        os.makedirs(output_dir, exist_ok=True)
        
        model_path = os.path.join(output_dir, f"{model_id}.joblib")
        
        model_data = {
            'model': self.model,
            'feature_names': self.feature_names,
            'model_type': self.model_type,
            'trained_at': datetime.now().isoformat()
        }
        
        joblib.dump(model_data, model_path)
        
        return model_path
    
    def load_model(self, model_path: str):
        """
        Load trained model from disk
        
        Args:
            model_path: Path to saved model file
        """
        model_data = joblib.load(model_path)
        
        self.model = model_data['model']
        self.feature_names = model_data['feature_names']
        self.model_type = model_data['model_type']
        
        return self


def optimize_hyperparameters(
    X: np.ndarray,
    y: np.ndarray,
    model_type: str = 'classification',
    param_grid: Optional[Dict[str, List]] = None,
    cv: int = 3
) -> Dict[str, Any]:
    """
    Optimize hyperparameters using GridSearchCV
    
    Args:
        X: Features
        y: Labels
        model_type: 'classification' or 'regression'
        param_grid: Grid of parameters to search
        cv: Number of cross-validation folds
        
    Returns:
        Best parameters and score
    """
    if param_grid is None:
        param_grid = {
            'n_estimators': [50, 100, 200],
            'max_depth': [5, 10, 15],
            'min_samples_split': [2, 5, 10]
        }
    
    if model_type == 'classification':
        base_model = RandomForestClassifier(random_state=42)
    else:
        base_model = RandomForestRegressor(random_state=42)
    
    grid_search = GridSearchCV(
        base_model,
        param_grid,
        cv=cv,
        scoring='accuracy' if model_type == 'classification' else 'neg_mean_absolute_error',
        n_jobs=-1
    )
    
    grid_search.fit(X, y)
    
    return {
        'best_params': grid_search.best_params_,
        'best_score': float(grid_search.best_score_),
        'cv_results': {
            'mean_test_score': grid_search.cv_results_['mean_test_score'].tolist(),
            'params': grid_search.cv_results_['params']
        }
    }


def create_mock_training_data(n_samples: int = 1000, n_features: int = 5, task: str = 'classification') -> pd.DataFrame:
    """
    Create mock training data for testing
    
    Args:
        n_samples: Number of samples
        n_features: Number of features
        task: 'classification' or 'regression'
        
    Returns:
        DataFrame with features and target
    """
    np.random.seed(42)
    
    # Generate features
    features = {}
    for i in range(n_features):
        features[f'feature_{i}'] = np.random.randn(n_samples)
    
    df = pd.DataFrame(features)
    
    # Generate target
    if task == 'classification':
        # Binary classification based on sum of features
        df['target'] = (df.sum(axis=1) > 0).astype(int)
    else:
        # Regression target
        df['target'] = df.sum(axis=1) * 10 + np.random.randn(n_samples) * 5
    
    return df
