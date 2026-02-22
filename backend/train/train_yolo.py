# filepath: /Users/iam.pxk/Desktop/CNN_Meow/backend/train/train_yolo.py
"""
YOLOv8 fine-tuning script for cat face detection.

Usage:
    python -m train.train_yolo
    python -m train.train_yolo --epochs 100 --batch_size 8
"""

import argparse
import logging
import os
import shutil
import time
from pathlib import Path

import torch
from tqdm import tqdm
from ultralytics import YOLO

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

# Default paths (relative to backend/)
DEFAULT_DATA_YAML = str(Path(__file__).resolve().parent.parent.parent / "data" / "yolo" / "cat_faces.yaml")
DEFAULT_OUTPUT_DIR = "./weights"


def main():
    parser = argparse.ArgumentParser(description="Train YOLOv8 Cat Face Detector")
    parser.add_argument("--data_yaml", type=str, default=DEFAULT_DATA_YAML, help="Path to YOLO data YAML")
    parser.add_argument("--epochs", type=int, default=3, help="Number of epochs")
    parser.add_argument("--batch_size", type=int, default=16, help="Batch size")
    parser.add_argument("--img_size", type=int, default=640, help="Image size")
    parser.add_argument("--model", type=str, default="yolov8n.pt", help="Base YOLO model")
    parser.add_argument("--output_dir", type=str, default=DEFAULT_OUTPUT_DIR, help="Output directory")
    args = parser.parse_args()

    # ── Banner ───────────────────────────────────────────────
    print()
    print("=" * 70)
    print("🐱  CNN Meow — YOLOv8 Cat Face Detector Training")
    print("=" * 70)

    device = "mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu")
    device_name = {"mps": "Apple Silicon GPU", "cuda": "NVIDIA GPU", "cpu": "CPU"}

    print(f"\n📋 Configuration:")
    print(f"   Data YAML:   {args.data_yaml}")
    print(f"   Base model:  {args.model}")
    print(f"   Epochs:      {args.epochs}")
    print(f"   Batch size:  {args.batch_size}")
    print(f"   Image size:  {args.img_size}")
    print(f"   Device:      {device} ({device_name.get(device, device)})")
    print(f"   Output:      {args.output_dir}")

    os.makedirs(args.output_dir, exist_ok=True)

    # ── Load model ───────────────────────────────────────────
    print("\n📦 Loading YOLOv8 model...")
    model = YOLO(args.model)
    print("✅ Model loaded successfully!")

    # ── Train ────────────────────────────────────────────────
    print(f"\n🚀 Starting YOLO training ({args.epochs} epochs)...")
    print("-" * 70)
    start_time = time.time()

    results = model.train(
        data=args.data_yaml,
        epochs=args.epochs,
        batch=args.batch_size,
        imgsz=args.img_size,
        project=args.output_dir,
        name="yolo_cat_face",
        # ── Optimized hyperparameters ──
        patience=10,
        save=True,
        plots=True,
        device=device,
        exist_ok=True,
        verbose=True,
        # Optimizer
        optimizer="AdamW",
        lr0=0.001,            # Initial LR
        lrf=0.01,             # Final LR = lr0 * lrf
        weight_decay=0.0005,
        warmup_epochs=1.0,    # Warmup for stable start
        # Augmentation (YOLO built-in)
        mosaic=1.0,           # Mosaic augmentation
        mixup=0.1,            # Light MixUp
        hsv_h=0.015,          # HSV-Hue augmentation
        hsv_s=0.7,            # HSV-Saturation
        hsv_v=0.4,            # HSV-Value
        degrees=10.0,         # Rotation augmentation
        scale=0.5,            # Scale augmentation
        fliplr=0.5,           # Horizontal flip
        flipud=0.0,           # No vertical flip (faces have orientation)
        # Performance
        amp=True,             # Mixed precision
        cos_lr=True,          # Cosine LR schedule
    )

    elapsed = time.time() - start_time
    minutes, seconds = divmod(int(elapsed), 60)

    # ── Save best weights ────────────────────────────────────
    print("-" * 70)
    print(f"\n✅ Training completed in {minutes}m {seconds}s")

    best_weights = Path(results.save_dir) / "weights" / "best.pt"
    target_path = Path(args.output_dir) / "yolo_cat_face.pt"

    if best_weights.exists():
        shutil.copy2(best_weights, target_path)
        print(f"💾 Model saved: {target_path}")
    else:
        print("⚠️  No best.pt found, skipping copy")

    print(f"\n🎉 Next: python -m train.train_efficientnet")
    print("=" * 70)


if __name__ == "__main__":
    main()