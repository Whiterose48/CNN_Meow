"""
Pet Insight 360 — MLflow Tracking Module
=========================================
Centralized MLflow integration for:
  1. Training Experiment Tracking (CNN)
  2. Evaluation Metrics Logging
  3. Inference Request Logging
  4. Model Registry

Usage:
  from mlflow_tracking import PetMLflow
  tracker = PetMLflow()
"""

import os
import time
import mlflow
import mlflow.pytorch
from pathlib import Path

# ─── Config ───────────────────────────────────────────────────────────
# ใช้ absolute path เสมอ เพื่อให้ notebook, app.py, mlflow ui ชี้ที่เดียวกัน
_BACKEND_DIR = Path(__file__).resolve().parent
_DEFAULT_DB = f"sqlite:///{_BACKEND_DIR / 'mlruns.db'}"
MLFLOW_TRACKING_URI = os.environ.get("MLFLOW_TRACKING_URI", _DEFAULT_DB)
EXPERIMENT_TRAINING = "pet-emotion-training"
EXPERIMENT_INFERENCE = "pet-emotion-inference"


class PetMLflow:
    """MLflow wrapper for Pet Insight 360."""

    def __init__(self, tracking_uri=None):
        uri = tracking_uri or MLFLOW_TRACKING_URI
        mlflow.set_tracking_uri(uri)
        print(f"[MLflow] Tracking URI: {uri}")

    # ══════════════════════════════════════════════════════════════════
    # 1. TRAINING — สำหรับใช้ใน notebook
    # ══════════════════════════════════════════════════════════════════

    def start_training_run(self, run_name="cnn-training", params=None):
        """Start an MLflow run for training. Returns the run object."""
        mlflow.set_experiment(EXPERIMENT_TRAINING)

        # ปิด run เก่าที่ค้างอยู่อัตโนมัติ (กัน error ตอน re-run notebook)
        if mlflow.active_run() is not None:
            print(f"[MLflow] ⚠️ Closing stale run: {mlflow.active_run().info.run_id}")
            mlflow.end_run()

        run = mlflow.start_run(run_name=run_name)
        if params:
            mlflow.log_params(params)
        print(f"[MLflow] Training run started: {run.info.run_id}")
        return run

    def log_epoch(self, epoch, train_loss, train_acc, val_loss, val_acc, lr=None):
        """Log metrics for a single training epoch."""
        mlflow.log_metrics({
            "train_loss": train_loss,
            "train_acc": train_acc,
            "val_loss": val_loss,
            "val_acc": val_acc,
        }, step=epoch)
        if lr is not None:
            mlflow.log_metric("learning_rate", lr, step=epoch)

    def log_best_model(self, model, best_val_acc, model_path="pet_emotion.pth"):
        """Log best model as artifact and metric."""
        mlflow.log_metric("best_val_acc", best_val_acc)
        mlflow.log_artifact(model_path, artifact_path="model")
        # Also log as PyTorch model for Model Registry
        mlflow.pytorch.log_model(model, "pet_emotion_model")
        print(f"[MLflow] Best model logged (acc: {best_val_acc:.2%})")

    def log_evaluation(self, confusion_matrix_fig, classification_report_str,
                       per_class_acc=None, sample_predictions_fig=None):
        """Log evaluation artifacts: confusion matrix, classification report, etc."""
        # Log confusion matrix figure
        if confusion_matrix_fig:
            mlflow.log_figure(confusion_matrix_fig, "confusion_matrix.png")

        # Log classification report as text
        if classification_report_str:
            mlflow.log_text(classification_report_str, "classification_report.txt")

        # Log per-class accuracy
        if per_class_acc:
            for class_name, acc in per_class_acc.items():
                mlflow.log_metric(f"class_acc_{class_name}", acc)

        # Log sample predictions figure
        if sample_predictions_fig:
            mlflow.log_figure(sample_predictions_fig, "sample_predictions.png")

    def log_training_curves(self, fig):
        """Log training curves figure."""
        mlflow.log_figure(fig, "training_curves.png")

    def end_run(self):
        """End the current MLflow run."""
        mlflow.end_run()
        print("[MLflow] Run ended")

    # ══════════════════════════════════════════════════════════════════
    # 2. INFERENCE — สำหรับใช้ใน app.py
    # ══════════════════════════════════════════════════════════════════

    def log_inference(self, emotion, confidence, breed, species,
                      plan, elapsed_ms, llm_used=False):
        """Log a single inference request as a standalone run."""
        # End any active run first to avoid conflicts
        active = mlflow.active_run()
        if active:
            mlflow.end_run()

        mlflow.set_experiment(EXPERIMENT_INFERENCE)
        with mlflow.start_run(run_name=f"inference-{int(time.time())}"):
            mlflow.log_params({
                "plan": plan,
                "llm_used": str(llm_used),
            })
            mlflow.log_metrics({
                "emotion_confidence": confidence,
                "elapsed_ms": elapsed_ms,
            })
            mlflow.set_tags({
                "emotion": emotion,
                "breed": breed,
                "species": species,
            })

    # ══════════════════════════════════════════════════════════════════
    # 3. MODEL REGISTRY — จัดการ model version
    # ══════════════════════════════════════════════════════════════════

    def register_model(self, run_id, model_name="PetEmotionNet"):
        """Register a model from a run to the Model Registry."""
        model_uri = f"runs:/{run_id}/pet_emotion_model"
        result = mlflow.register_model(model_uri, model_name)
        print(f"[MLflow] Model registered: {model_name} v{result.version}")
        return result
