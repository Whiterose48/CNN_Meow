# filepath: /Users/iam.pxk/Desktop/CNN_Meow/backend/train/dataset.py
"""
Dataset preparation for FGS training — v2.

Key changes:
  • CLAHE pre-processing applied BEFORE augmentation (matches inference pipeline)
  • Input size 260×260 for EfficientNet-B2 (was 224 for B0)
  • Stronger augmentations: RandAugment-style, perspective, channel shuffle
  • Larger crop margin (resize 288 → crop 260)
  • RandomErasing scale tuned for cat faces
"""

import os
import logging
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
import pandas as pd
import torch
from torch.utils.data import Dataset
from torchvision import transforms

logger = logging.getLogger(__name__)

# Input size: 260 for EfficientNet-B2 (timm default), fallback 224 for B0
try:
    import timm
    INPUT_SIZE = 260
except ImportError:
    INPUT_SIZE = 224


def download_cat_dataset(output_dir: str = "./data/raw") -> str:
    """Download cat dataset from Kaggle."""
    import kagglehub

    os.makedirs(output_dir, exist_ok=True)
    logger.info("Downloading cat dataset from Kaggle...")
    path = kagglehub.dataset_download("crawford/cat-dataset")
    logger.info(f"Dataset downloaded to: {path}")
    return path


def _apply_clahe(image_bgr: np.ndarray) -> np.ndarray:
    """Apply CLAHE — same parameters as preprocessing.py for consistency."""
    lab = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l = clahe.apply(l)
    enhanced = cv2.merge([l, a, b])
    return cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)


class FGSDataset(Dataset):
    """
    Custom dataset for Feline Grimace Scale training.

    Expected structure:
        data/processed/
        ├── images/
        │   ├── cat_001.jpg
        │   └── ...
        └── labels.csv

    labels.csv columns: filename, ears, eyes, muzzle, whiskers, head_position
    """

    def __init__(
        self,
        csv_path: str,
        image_dir: str,
        transform: Optional[transforms.Compose] = None,
        augment: bool = False,
    ):
        self.df = pd.read_csv(csv_path)
        self.image_dir = Path(image_dir)
        self.augment = augment

        self.feature_columns = [
            "ears", "eyes", "muzzle", "whiskers", "head_position"
        ]

        for col in self.feature_columns:
            if col not in self.df.columns:
                raise ValueError(f"Missing column '{col}' in {csv_path}")

        if transform is not None:
            self.transform = transform
        else:
            self.transform = self._default_transform()

        if augment:
            self.augmentation = self._augmentation_transform()
        else:
            self.augmentation = None

        logger.info(
            f"FGS Dataset loaded: {len(self.df)} samples from {csv_path} "
            f"(input_size={INPUT_SIZE}, augment={augment})"
        )

    def _default_transform(self) -> transforms.Compose:
        """Validation / inference transform — match CLAHE + resize."""
        return transforms.Compose([
            transforms.ToPILImage(),
            transforms.Resize((INPUT_SIZE, INPUT_SIZE)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225],
            ),
        ])

    def _augmentation_transform(self) -> transforms.Compose:
        """
        Strong augmentation for heuristic-label robustness.
        
        Strategy:
          - Resize to larger (288) then RandomResizedCrop → better scale variety
          - Horizontal flip, rotation, perspective for geometric diversity
          - ColorJitter + GaussianBlur for photometric diversity
          - RandomErasing (cutout) for occlusion robustness
          - All together push the model to learn robust features
        """
        crop_size = INPUT_SIZE
        resize_size = int(INPUT_SIZE * 1.12)  # 291 for 260, 251 for 224

        return transforms.Compose([
            transforms.ToPILImage(),
            # Scale/position variety
            transforms.RandomResizedCrop(
                crop_size,
                scale=(0.80, 1.0),
                ratio=(0.9, 1.1),
            ),
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.RandomRotation(25),
            # Perspective distortion (simulates different camera angles)
            transforms.RandomPerspective(distortion_scale=0.15, p=0.3),
            # Photometric
            transforms.ColorJitter(
                brightness=0.3,
                contrast=0.3,
                saturation=0.25,
                hue=0.1,
            ),
            # Blur (simulates out-of-focus)
            transforms.GaussianBlur(kernel_size=5, sigma=(0.1, 2.0)),
            # Affine (translation + scale jitter)
            transforms.RandomAffine(
                degrees=0,
                translate=(0.10, 0.10),
                scale=(0.85, 1.15),
            ),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225],
            ),
            # Cutout-style regularisation
            transforms.RandomErasing(p=0.20, scale=(0.02, 0.20), ratio=(0.3, 3.3)),
        ])

    def __len__(self) -> int:
        return len(self.df)

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, dict[str, torch.Tensor]]:
        row = self.df.iloc[idx]

        # Load image
        img_path = self.image_dir / row["filename"]
        image = cv2.imread(str(img_path))

        if image is None:
            raise FileNotFoundError(f"Image not found: {img_path}")

        # ── CLAHE pre-processing (matches inference pipeline) ──
        image = _apply_clahe(image)
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        # Apply transforms
        if self.augment and self.augmentation is not None:
            tensor = self.augmentation(image)
        else:
            tensor = self.transform(image)

        # Load labels
        labels = {
            col: torch.tensor(int(row[col]), dtype=torch.long)
            for col in self.feature_columns
        }

        return tensor, labels


def create_sample_labels_csv(output_path: str, num_samples: int = 100):
    """Create a sample labels CSV for testing/demo purposes."""
    np.random.seed(42)
    data = {
        "filename": [f"cat_{i:04d}.jpg" for i in range(num_samples)],
        "ears": np.random.randint(0, 3, num_samples),
        "eyes": np.random.randint(0, 3, num_samples),
        "muzzle": np.random.randint(0, 3, num_samples),
        "whiskers": np.random.randint(0, 3, num_samples),
        "head_position": np.random.randint(0, 3, num_samples),
    }
    df = pd.DataFrame(data)
    df.to_csv(output_path, index=False)
    logger.info(f"Sample labels written to {output_path}")
    return output_path