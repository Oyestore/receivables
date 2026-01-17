"""
MLflow Client Manager

Centralized MLflow client for experiment tracking, model registry, and promotion.

Features:
- Experiment tracking (params, metrics, artifacts)
- Model registry (registration, versioning)
- Model promotion (staging → production)
- Artifact logging
"""

import mlflow
from mlflow.tracking import MlflowClient
import os
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


class MLflowManager:
    """
    MLflow Manager for ML operations
    
    Handles all MLflow interactions including:
    - Experiment creation and tracking
    - Parameter and metric logging
    - Model registration and promotion
    - Artifact storage
    """
    
    def __init__(self):
        """Initialize MLflow client"""
        self.tracking_uri = os.getenv("MLFLOW_TRACKING_URI", "http://localhost:5000")
        mlflow.set_tracking_uri(self.tracking_uri)
        self.client = MlflowClient()
        
        logger.info(f"MLflow client initialized. Tracking URI: {self.tracking_uri}")
        
    def create_experiment(self, name: str, artifact_location: Optional[str] = None) -> str:
        """
        Create or get experiment by name
        
        Args:
            name: Experiment name
            artifact_location: Optional artifact storage location
            
        Returns:
            experiment_id
        """
        try:
            experiment = mlflow.get_experiment_by_name(name)
            if experiment:
                logger.info(f"Using existing experiment: {name}")
                return experiment.experiment_id
            else:
                experiment_id = mlflow.create_experiment(
                    name, 
                    artifact_location=artifact_location
                )
                logger.info(f"Created new experiment: {name} (ID: {experiment_id})")
                return experiment_id
        except Exception as e:
            logger.error(f"Failed to create experiment: {e}")
            raise
            
    def start_run(self, experiment_name: str, run_name: Optional[str] = None):
        """
        Start a new MLflow run
        
        Args:
            experiment_name: Name of experiment
            run_name: Optional name for this run
            
        Returns:
            ActiveRun context manager
        """
        experiment_id = self.create_experiment(experiment_name)
        mlflow.set_experiment(experiment_name)
        
        return mlflow.start_run(run_name=run_name, experiment_id=experiment_id)
        
    def log_params(self, params: Dict[str, Any]) -> None:
        """
        Log multiple parameters
        
        Args:
            params: Dictionary of parameters
        """
        try:
            for key, value in params.items():
                # Convert complex types to strings
                if isinstance(value, (dict, list)):
                    value = str(value)
                mlflow.log_param(key, value)
            logger.debug(f"Logged {len(params)} parameters")
        except Exception as e:
            logger.error(f"Failed to log parameters: {e}")
            
    def log_metrics(self, metrics: Dict[str, float], step: Optional[int] = None) -> None:
        """
        Log multiple metrics
        
        Args:
            metrics: Dictionary of metrics
            step: Optional step number for tracking over time
        """
        try:
            for key, value in metrics.items():
                mlflow.log_metric(key, value, step=step)
            logger.debug(f"Logged {len(metrics)} metrics")
        except Exception as e:
            logger.error(f"Failed to log metrics: {e}")
            
    def log_artifact(self, local_path: str, artifact_path: Optional[str] = None) -> None:
        """
        Log an artifact (file, plot, etc.)
        
        Args:
            local_path: Path to local file
            artifact_path: Optional path within artifact store
        """
        try:
            mlflow.log_artifact(local_path, artifact_path)
            logger.debug(f"Logged artifact: {local_path}")
        except Exception as e:
            logger.error(f"Failed to log artifact: {e}")
            
    def log_model(self, model: Any, artifact_path: str = "model") -> None:
        """
        Log sklearn model
        
        Args:
            model: Trained sklearn model
            artifact_path: Path within artifact store
        """
        try:
            mlflow.sklearn.log_model(model, artifact_path)
            logger.info(f"Logged model to: {artifact_path}")
        except Exception as e:
            logger.error(f"Failed to log model: {e}")
            
    def register_model(
        self, 
        run_id: str, 
        model_name: str,
        model_path: str = "model"
    ) -> Any:
        """
        Register model in MLflow Model Registry
        
        Args:
            run_id: MLflow run ID
            model_name: Name for registered model
            model_path: Path to model within run artifacts
            
        Returns:
            ModelVersion object
        """
        try:
            model_uri = f"runs:/{run_id}/{model_path}"
            model_version = mlflow.register_model(model_uri, model_name)
            logger.info(
                f"Registered model: {model_name} version {model_version.version}"
            )
            return model_version
        except Exception as e:
            logger.error(f"Failed to register model: {e}")
            raise
            
    def promote_model(
        self, 
        model_name: str, 
        version: int, 
        stage: str
    ) -> None:
        """
        Promote model to a stage (Staging, Production, Archived)
        
        Args:
            model_name: Registered model name
            version: Model version number
            stage: Target stage ("Staging", "Production", "Archived")
        """
        try:
            self.client.transition_model_version_stage(
                name=model_name,
                version=version,
                stage=stage,
                archive_existing_versions=(stage == "Production")
            )
            logger.info(f"Promoted {model_name} v{version} to {stage}")
        except Exception as e:
            logger.error(f"Failed to promote model: {e}")
            raise
            
    def get_latest_model_version(
        self, 
        model_name: str, 
        stage: Optional[str] = None
    ) -> Optional[Any]:
        """
        Get latest model version
        
        Args:
            model_name: Registered model name
            stage: Optional stage filter ("Production", "Staging", etc.)
            
        Returns:
            ModelVersion or None
        """
        try:
            if stage:
                versions = self.client.get_latest_versions(model_name, stages=[stage])
            else:
                versions = self.client.search_model_versions(f"name='{model_name}'")
                
            if versions:
                latest = max(versions, key=lambda v: int(v.version))
                logger.info(f"Found latest version: {model_name} v{latest.version}")
                return latest
            else:
                logger.warning(f"No versions found for: {model_name}")
                return None
        except Exception as e:
            logger.error(f"Failed to get latest model version: {e}")
            return None
            
    def load_model(self, model_name: str, stage: str = "Production") -> Any:
        """
        Load model from registry
        
        Args:
            model_name: Registered model name
            stage: Stage to load from
            
        Returns:
            Loaded model
        """
        try:
            model_uri = f"models:/{model_name}/{stage}"
            model = mlflow.sklearn.load_model(model_uri)
            logger.info(f"Loaded model: {model_name} from {stage}")
            return model
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise
            
    def get_run_metrics(self, run_id: str) -> Dict[str, float]:
        """
        Get all metrics for a run
        
        Args:
            run_id: MLflow run ID
            
        Returns:
            Dictionary of metrics
        """
        try:
            run = self.client.get_run(run_id)
            return run.data.metrics
        except Exception as e:
            logger.error(f"Failed to get run metrics: {e}")
            return {}
            
    def compare_runs(self, run_ids: list) -> Dict[str, Dict[str, float]]:
        """
        Compare metrics across multiple runs
        
        Args:
            run_ids: List of run IDs to compare
            
        Returns:
            Dictionary mapping run_id to metrics
        """
        comparison = {}
        for run_id in run_ids:
            metrics = self.get_run_metrics(run_id)
            comparison[run_id] = metrics
        return comparison
        
    def end_run(self) -> None:
        """End the current MLflow run"""
        mlflow.end_run()
        
    def set_tag(self, key: str, value: str) -> None:
        """
        Set a tag on the current run
        
        Args:
            key: Tag key
            value: Tag value
        """
        mlflow.set_tag(key, value)
        
    def set_tags(self, tags: Dict[str, str]) -> None:
        """
        Set multiple tags
        
        Args:
            tags: Dictionary of tags
        """
        for key, value in tags.items():
            self.set_tag(key, value)
