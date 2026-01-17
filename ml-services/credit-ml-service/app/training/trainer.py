"""
Model Training Script

Trains credit scoring models on synthetic data with MLflow tracking.

Usage:
    python -m app.training.trainer --samples 10000 --model ensemble
"""

import argparse
import logging
from pathlib import Path
import pandas as pd
import json
from datetime import datetime
import os

from app.training.synthetic_data import SyntheticDataGenerator, generate_train_test_split
from app.models import XGBoostModel, LightGBMModel, EnsembleModel
from app.mlops.mlflow_client import MLflowManager

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def train_and_evaluate(
    model_type: str = "ensemble",
    n_samples: int = 10000,
    model_dir: str = "./models",
    use_mlflow: bool = True
):
    """
    Complete training pipeline with MLflow tracking
    
    Args:
        model_type: "xgboost", "lightgbm", or "ensemble"
        n_samples: Number of synthetic samples to generate
        model_dir: Directory to save trained models
        use_mlflow: Whether to log to MLflow
    """
    
    logger.info("=" * 80)
    logger.info(f"TRAINING CREDIT SCORING MODEL: {model_type.upper()}")
    logger.info("=" * 80)
    
    # Initialize MLflow
    mlflow_manager = None
    if use_mlflow:
        try:
            mlflow_manager = MLflowManager()
            logger.info(f"MLflow enabled: {mlflow_manager.tracking_uri}")
        except Exception as e:
            logger.warning(f"MLflow initialization failed: {e}. Continuing without MLflow.")
            use_mlflow = False
    
    # Step 1: Generate synthetic data
    logger.info(f"\n[1/5] Generating {n_samples} synthetic profiles...")
    generator = SyntheticDataGenerator(random_seed=42)
    df = generator.generate_dataset(n_samples=n_samples)
    
    logger.info(f"Dataset generated: {df.shape}")
    logger.info(f"Default rate: {df['default_label'].mean():.2%}")
    logger.info(f"Features: {df.shape[1] - 1}")
    
    # Step 2: Train/val/test split
    logger.info("\n[2/5] Splitting into train/val/test...")
    X_train, y_train, X_val, y_val, X_test, y_test = generate_train_test_split(df)
    
    logger.info(f"Train set: {len(X_train)} samples ({y_train.mean():.2%} default)")
    logger.info(f"Val set: {len(X_val)} samples ({y_val.mean():.2%} default)")
    logger.info(f"Test set: {len(X_test)} samples ({y_test.mean():.2%} default)")
    
    # Step 3: Initialize model
    logger.info(f"\n[3/5] Initializing {model_type} model...")
    
    if model_type == "xgboost":
        model = XGBoostModel(version="1.0.0")
    elif model_type == "lightgbm":
        model = LightGBMModel(version="1.0.0")
    elif model_type == "ensemble":
        model = EnsembleModel(version="1.0.0", use_neural_net=False)
    else:
        raise ValueError(f"Unknown model type: {model_type}")
    
    # Start MLflow run
    run_id = None
    if use_mlflow and mlflow_manager:
        try:
            run = mlflow_manager.start_run(
                experiment_name="credit_scoring",
                run_name=f"{model_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            )
            run_id = run.info.run_id
            
            # Log parameters
            mlflow_manager.log_params({
                "model_type": model_type,
                "model_version": model.version,
                "n_samples": n_samples,
                "n_train": len(X_train),
                "n_val": len(X_val),
                "n_test": len(X_test),
                "default_rate_train": float(y_train.mean()),
                "default_rate_test": float(y_test.mean()),
                "random_seed": 42
            })
            
            # Log tags
            mlflow_manager.set_tags({
                "stage": "development",
                "data_source": "synthetic",
                "purpose": "initial_training"
            })
            
            logger.info(f"MLflow run started: {run_id}")
        except Exception as e:
            logger.warning(f"MLflow run start failed: {e}")
            use_mlflow = False
    
    # Step 4: Train model
    logger.info(f"\n[4/5] Training {model_type} model...")
    train_metrics = model.train(X_train, y_train, X_val, y_val)
    
    logger.info("\n" + "=" * 60)
    logger.info("TRAINING RESULTS")
    logger.info("=" * 60)
    logger.info(f"Train AUC: {train_metrics['train_metrics']['auc']:.4f}")
    logger.info(f"Train Precision: {train_metrics['train_metrics']['precision']:.4f}")
    logger.info(f"Train Recall: {train_metrics['train_metrics']['recall']:.4f}")
    
    if 'val_metrics' in train_metrics:
        logger.info(f"\nVal AUC: {train_metrics['val_metrics']['auc']:.4f}")
        logger.info(f"Val Precision: {train_metrics['val_metrics']['precision']:.4f}")
        logger.info(f"Val Recall: {train_metrics['val_metrics']['recall']:.4f}")
        
        # Log validation metrics to MLflow
        if use_mlflow and mlflow_manager:
            try:
                mlflow_manager.log_metrics({
                    "val_auc": train_metrics['val_metrics']['auc'],
                    "val_precision": train_metrics['val_metrics']['precision'],
                    "val_recall": train_metrics['val_metrics']['recall'],
                    "val_f1": train_metrics['val_metrics'].get('f1_score', 0)
                })
            except Exception as e:
                logger.warning(f"Failed to log validation metrics: {e}")
    
    # Step 5: Test evaluation
    logger.info(f"\n[5/5] Evaluating on test set...")
    test_metrics = model.validate(X_test, y_test)
    
    logger.info("\n" + "=" * 60)
    logger.info("TEST SET RESULTS")
    logger.info("=" * 60)
    logger.info(f"Test AUC: {test_metrics['auc']:.4f}")
    logger.info(f"Test Accuracy: {test_metrics['accuracy']:.4f}")
    logger.info(f"Test Precision: {test_metrics['precision']:.4f}")
    logger.info(f"Test Recall: {test_metrics['recall']:.4f}")
    logger.info(f"Test F1-Score: {test_metrics['f1_score']:.4f}")
    
    logger.info(f"\nConfusion Matrix:")
    logger.info(f"  True Negatives:  {test_metrics['true_negatives']}")
    logger.info(f"  False Positives: {test_metrics['false_positives']}")
    logger.info(f"  False Negatives: {test_metrics['false_negatives']}")
    logger.info(f"  True Positives:  {test_metrics['true_positives']}")
    
    # Log test metrics to MLflow
    if use_mlflow and mlflow_manager:
        try:
            mlflow_manager.log_metrics({
                "test_auc": test_metrics['auc'],
                "test_accuracy": test_metrics['accuracy'],
                "test_precision": test_metrics['precision'],
                "test_recall": test_metrics['recall'],
                "test_f1_score": test_metrics['f1_score'],
                "test_true_negatives": test_metrics['true_negatives'],
                "test_false_positives": test_metrics['false_positives'],
                "test_false_negatives": test_metrics['false_negatives'],
                "test_true_positives": test_metrics['true_positives']
            })
            logger.info("Test metrics logged to MLflow")
        except Exception as e:
            logger.warning(f"Failed to log test metrics: {e}")
    
    # Feature importance
    logger.info(f"\nTop 10 Most Important Features:")
    feature_importance = model.get_feature_importance()[:10]
    for i, (feature, importance) in enumerate(feature_importance, 1):
        logger.info(f"  {i}. {feature}: {importance:.4f}")
    
    # Save model
    logger.info(f"\nSaving model to {model_dir}...")
    Path(model_dir).mkdir(parents=True, exist_ok=True)
    model_path = model.save(model_dir)
    logger.info(f"Model saved to: {model_path}")
    
    # Log model to MLflow
    if use_mlflow and mlflow_manager:
        try:
            mlflow_manager.log_model(model, "model")
            logger.info("Model logged to MLflow")
            
            # Register model
            if run_id:
                model_version = mlflow_manager.register_model(
                    run_id=run_id,
                    model_name=f"{model_type}_credit_scoring"
                )
                logger.info(f"Model registered: version {model_version.version}")
        except Exception as e:
            logger.warning(f"Failed to log/register model: {e}")
    
    # Save test metrics
    results = {
        "model_type": model_type,
        "model_version": model.version,
        "trained_at": datetime.now().isoformat(),
        "training_samples": len(X_train),
        "test_metrics": test_metrics,
        "train_metrics": train_metrics.get('train_metrics', {}),
        "val_metrics": train_metrics.get('val_metrics', {}),
        "top_features": [
            {"feature": f, "importance": float(i)}
            for f, i in feature_importance[:20]
        ],
        "mlflow_run_id": run_id
    }
    
    results_path = Path(model_dir) / f"{model_type}_results.json"
    with open(results_path, 'w') as f:
        json.dump(results, f, indent=2)
    
    logger.info(f"Results saved to: {results_path}")
    
    # End MLflow run
    if use_mlflow and mlflow_manager:
        try:
            mlflow_manager.end_run()
            logger.info("MLflow run ended")
        except Exception as e:
            logger.warning(f"Failed to end MLflow run: {e}")
    
    logger.info("\n" + "=" * 80)
    logger.info("TRAINING COMPLETE!")
    logger.info("=" * 80)
    
    if use_mlflow and run_id:
        logger.info(f"\nMLflow run ID: {run_id}")
        logger.info(f"View in MLflow UI: {mlflow_manager.tracking_uri}")
    
    return model, test_metrics


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train credit scoring models")
    parser.add_argument(
        "--model",
        type=str,
        default="ensemble",
        choices=["xgboost", "lightgbm", "ensemble"],
        help="Model type to train"
    )
    parser.add_argument(
        "--samples",
        type=int,
        default=10000,
        help="Number of synthetic samples to generate"
    )
    parser.add_argument(
        "--model-dir",
        type=str,
        default="./models",
        help="Directory to save trained models"
    )
    parser.add_argument(
        "--no-mlflow",
        action="store_true",
        help="Disable MLflow tracking"
    )
    
    args = parser.parse_args()
    
    train_and_evaluate(
        model_type=args.model,
        n_samples=args.samples,
        model_dir=args.model_dir,
        use_mlflow=not args.no_mlflow
    )
