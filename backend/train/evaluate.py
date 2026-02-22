# filepath: /Users/iam.pxk/Desktop/CNN_Meow/backend/train/evaluate.py
"""
Evaluation script for the FGS model.

Computes:
- F1-Score (per feature and overall)
- Weighted Kappa Score (per feature)
- Confusion Matrix (per feature)

Usage:
    python -m train.evaluate
    python -m train.evaluate --weights ./weights/efficientnet_fgs.pt
"""

import argparse
import logging
import os
import time
from pathlib import Path

import numpy as np
import torch
from torch.utils.data import DataLoader
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    f1_score,
    confusion_matrix,
    classification_report,
    cohen_kappa_score,
)

from train.dataset import FGSDataset
from app.models.efficientnet_scorer import MultiHeadFGS

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

FEATURE_NAMES = ["ears", "eyes", "muzzle", "whiskers", "head_position"]

# Default paths (relative to backend/)
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_CSV_PATH = str(_PROJECT_ROOT / "data" / "processed" / "labels.csv")
DEFAULT_IMAGE_DIR = str(_PROJECT_ROOT / "data" / "processed" / "images")
DEFAULT_WEIGHTS = str(Path(__file__).resolve().parent.parent / "weights" / "efficientnet_fgs.pt")


def evaluate_model(
    model: MultiHeadFGS,
    dataloader: DataLoader,
    device: str,
    output_dir: str,
):
    model.eval()

    all_preds = {feat: [] for feat in FEATURE_NAMES}
    all_labels = {feat: [] for feat in FEATURE_NAMES}

    total_batches = len(dataloader)
    print(f"\n🔍 Evaluating {total_batches} batches...")

    with torch.no_grad():
        for batch_idx, (images, labels) in enumerate(dataloader, 1):
            print(f"   Processing batch {batch_idx}/{total_batches}...", end="\r")
            images = images.to(device)
            outputs = model(images)

            for feat in FEATURE_NAMES:
                preds = torch.argmax(outputs[feat], dim=1).cpu().numpy()
                true = labels[feat].numpy()
                all_preds[feat].extend(preds)
                all_labels[feat].extend(true)

    print(f"   ✅ All {total_batches} batches processed!          ")

    os.makedirs(output_dir, exist_ok=True)

    print("\n" + "=" * 60)
    print("FELINE GRIMACE SCALE - MODEL EVALUATION REPORT")
    print("=" * 60)

    overall_f1_scores = []

    for feat in FEATURE_NAMES:
        y_true = np.array(all_labels[feat])
        y_pred = np.array(all_preds[feat])

        # F1 Score
        f1 = f1_score(y_true, y_pred, average="weighted")
        overall_f1_scores.append(f1)

        # Weighted Kappa
        kappa = cohen_kappa_score(y_true, y_pred, weights="quadratic")

        # Classification Report
        report = classification_report(
            y_true, y_pred, target_names=["Score 0", "Score 1", "Score 2"]
        )

        print(f"\n--- {feat.upper()} ---")
        print(f"F1 Score (weighted): {f1:.4f}")
        print(f"Weighted Kappa:      {kappa:.4f}")
        print(report)

        # Confusion Matrix
        cm = confusion_matrix(y_true, y_pred)
        fig, ax = plt.subplots(figsize=(6, 5))
        sns.heatmap(
            cm,
            annot=True,
            fmt="d",
            cmap="Blues",
            xticklabels=["Score 0", "Score 1", "Score 2"],
            yticklabels=["Score 0", "Score 1", "Score 2"],
            ax=ax,
        )
        ax.set_title(f"Confusion Matrix - {feat.upper()}")
        ax.set_xlabel("Predicted")
        ax.set_ylabel("Actual")
        plt.tight_layout()
        plt.savefig(os.path.join(output_dir, f"confusion_matrix_{feat}.png"), dpi=150)
        plt.close()

    # Overall metrics
    mean_f1 = np.mean(overall_f1_scores)
    print(f"\n{'=' * 60}")
    print(f"OVERALL WEIGHTED F1 SCORE: {mean_f1:.4f}")
    print(f"{'=' * 60}")

    # Save summary
    summary_path = os.path.join(output_dir, "evaluation_summary.txt")
    with open(summary_path, "w") as f:
        f.write(f"Overall Weighted F1: {mean_f1:.4f}\n\n")
        for feat, f1_val in zip(FEATURE_NAMES, overall_f1_scores):
            f.write(f"{feat}: F1={f1_val:.4f}\n")

    print(f"\n📁 Confusion matrix plots saved to: {output_dir}/")
    print(f"📄 Summary saved to: {summary_path}")


def main():
    parser = argparse.ArgumentParser(description="Evaluate FGS Model")
    parser.add_argument("--csv_path", type=str, default=DEFAULT_CSV_PATH, help="Path to labels CSV")
    parser.add_argument("--image_dir", type=str, default=DEFAULT_IMAGE_DIR, help="Path to image directory")
    parser.add_argument("--weights", type=str, default=DEFAULT_WEIGHTS, help="Path to model weights (.pt)")
    parser.add_argument("--output_dir", type=str, default="./evaluation", help="Directory to save results")
    parser.add_argument("--batch_size", type=int, default=16, help="Batch size")
    args = parser.parse_args()

    # ── Banner ─────────────────────────────────────────────────
    print()
    print("=" * 70)
    print("🐱  CNN Meow — FGS Model Evaluation")
    print("=" * 70)

    device = "mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu")
    device_name = {"mps": "Apple Silicon GPU", "cuda": "NVIDIA GPU", "cpu": "CPU"}

    print(f"\n📋 Configuration:")
    print(f"   Labels CSV:  {args.csv_path}")
    print(f"   Image dir:   {args.image_dir}")
    print(f"   Weights:     {args.weights}")
    print(f"   Device:      {device} ({device_name.get(device, device)})")
    print(f"   Batch size:  {args.batch_size}")
    print(f"   Output dir:  {args.output_dir}")

    # ── Load model ─────────────────────────────────────────────
    print("\n📦 Loading EfficientNet FGS model...")
    model = MultiHeadFGS(num_classes=3, pretrained=False)
    state_dict = torch.load(args.weights, map_location=device, weights_only=True)
    # Handle SWA-wrapped or EMA state dicts
    if any(k.startswith("module.") for k in state_dict):
        state_dict = {k.replace("module.", ""): v for k, v in state_dict.items()}
    model.load_state_dict(state_dict, strict=False)
    model.to(device)
    print("✅ Model loaded successfully!")

    # ── Load dataset ───────────────────────────────────────────
    print("\n📂 Loading dataset...")
    dataset = FGSDataset(
        csv_path=args.csv_path,
        image_dir=args.image_dir,
        augment=False,
    )
    dataloader = DataLoader(dataset, batch_size=args.batch_size, shuffle=False)
    print(f"✅ Loaded {len(dataset)} images")

    # ── Evaluate ───────────────────────────────────────────────
    print(f"\n🚀 Starting evaluation...")
    print("-" * 70)
    start_time = time.time()
    evaluate_model(model, dataloader, device, args.output_dir)
    elapsed = time.time() - start_time
    minutes, seconds = divmod(int(elapsed), 60)

    print(f"\n⏱️  Evaluation completed in {minutes}m {seconds}s")
    print("=" * 70)


if __name__ == "__main__":
    main()