# filepath: /Users/iam.pxk/Desktop/CNN_Meow/backend/app/models/efficientnet_scorer.py
"""
EfficientNet-B2 Multi-Head FGS Scorer — v2 (Optimised for ≥85 %).

Key changes from v1:
  • Backbone: EfficientNet-B2 via `timm` (better pretrained weights, 1408-d features)
  • Shared trunk: 2-layer MLP 1408→768→512 with residual shortcut + SE
  • Per-feature heads: 512→192→3 with BatchNorm + GELU + Dropout
  • Built-in TTA at inference (horizontal-flip + small crops)
  • CLAHE preprocessing in the transform to match inference pipeline
  • Fallback to efficientnet-pytorch B0 if timm unavailable
"""

import logging
from pathlib import Path

import cv2
import numpy as np
import torch
import torch.nn as nn
from torchvision import transforms

logger = logging.getLogger(__name__)

# ── Try timm first (better pretrained); fall back to efficientnet_pytorch ──
_USE_TIMM = False
_HAS_EFFICIENTNET_PYTORCH = False
try:
    import timm
    _USE_TIMM = True
except ImportError:
    logger.warning("timm not installed — falling back to efficientnet_pytorch")

try:
    from efficientnet_pytorch import EfficientNet
    _HAS_EFFICIENTNET_PYTORCH = True
except ImportError:
    if not _USE_TIMM:
        raise ImportError("Neither timm nor efficientnet_pytorch is installed")


# ── Squeeze-and-Excitation block ──────────────────────────────
class SEBlock(nn.Module):
    """Channel attention (lightweight)."""

    def __init__(self, channels: int, reduction: int = 8):
        super().__init__()
        self.fc = nn.Sequential(
            nn.AdaptiveAvgPool1d(1),
            nn.Flatten(),
            nn.Linear(channels, channels // reduction),
            nn.GELU(),
            nn.Linear(channels // reduction, channels),
            nn.Sigmoid(),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: [B, C]
        w = self.fc(x.unsqueeze(-1))  # [B, C]
        return x * w


# ── Model ─────────────────────────────────────────────────────
class MultiHeadFGS(nn.Module):
    """
    EfficientNet-B2 + 5 classification heads for Feline Grimace Scale.

    Architecture:
      backbone (EfficientNet-B2, 1408-d)
        → shared MLP (1408 → 768 → 512) with SE + residual
        → 5 × head (512 → 192 → 3)

    Optimisations over v1:
      • Larger backbone (B2 vs B0): +0.8 pp on ImageNet → better features
      • 2-layer shared trunk with SE attention → richer feature mixing
      • Larger heads (192 vs 128) → more capacity for per-feature nuance
      • Dropout tuned (0.25 shared, 0.15 heads) to reduce overfitting
    """

    FEATURE_NAMES = ["ears", "eyes", "muzzle", "whiskers", "head_position"]

    def __init__(self, num_classes: int = 3, pretrained: bool = True):
        super().__init__()

        if _USE_TIMM:
            # timm gives access to better pretrained weights (e.g. ImageNet-21k)
            self.backbone = timm.create_model(
                "efficientnet_b2",
                pretrained=pretrained,
                num_classes=0,          # remove classifier → feature extractor
                global_pool="avg",
            )
            feature_dim = self.backbone.num_features  # 1408 for B2
        else:
            # Legacy path: efficientnet_pytorch (B0 only for safety)
            if pretrained:
                self.backbone = EfficientNet.from_pretrained("efficientnet-b0")
            else:
                self.backbone = EfficientNet.from_name("efficientnet-b0")
            feature_dim = self.backbone._fc.in_features  # 1280 for B0
            self.backbone._fc = nn.Identity()

        # ── Shared feature refinement (2-layer + SE + residual) ──
        self.shared_fc = nn.Sequential(
            nn.Linear(feature_dim, 768),
            nn.BatchNorm1d(768),
            nn.GELU(),
            nn.Dropout(0.25),
            nn.Linear(768, 512),
            nn.BatchNorm1d(512),
            nn.GELU(),
        )
        self.shared_se = SEBlock(512, reduction=8)
        self.shared_proj = nn.Linear(feature_dim, 512)   # skip projection
        self.shared_drop = nn.Dropout(0.15)

        # ── 5 classification heads ──
        self.head_ears = self._make_head(512, num_classes)
        self.head_eyes = self._make_head(512, num_classes)
        self.head_muzzle = self._make_head(512, num_classes)
        self.head_whiskers = self._make_head(512, num_classes)
        self.head_position = self._make_head(512, num_classes)

    def _make_head(self, in_features: int, num_classes: int) -> nn.Sequential:
        """2-layer head: 512 → 192 → num_classes."""
        return nn.Sequential(
            nn.Linear(in_features, 192),
            nn.BatchNorm1d(192),
            nn.GELU(),
            nn.Dropout(0.15),
            nn.Linear(192, num_classes),
        )

    def forward(self, x: torch.Tensor) -> dict[str, torch.Tensor]:
        features = self.backbone(x)           # [B, feature_dim]
        shared = self.shared_fc(features)     # [B, 512]
        shared = self.shared_se(shared)       # [B, 512]  (channel attention)
        skip = self.shared_proj(features)     # [B, 512]  (residual)
        shared = self.shared_drop(shared + skip)

        return {
            "ears": self.head_ears(shared),
            "eyes": self.head_eyes(shared),
            "muzzle": self.head_muzzle(shared),
            "whiskers": self.head_whiskers(shared),
            "head_position": self.head_position(shared),
        }


# ── Inference wrapper ─────────────────────────────────────────
class FGSScorer:
    """
    Production inference wrapper with optional Test-Time Augmentation (TTA).

    TTA: horizontal flip + slight overcrop → 3 forward passes → logit avg.
    Typically adds +1–2 % accuracy at the cost of ~3× inference time.
    """

    def __init__(self, weights_path: str, device: str = None, tta: bool = True):
        global _USE_TIMM
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.tta = tta
        logger.info(f"FGS Scorer — device: {self.device}, TTA: {self.tta}")

        if Path(weights_path).exists():
            logger.info(f"Loading FGS weights from {weights_path}")
            state_dict = torch.load(weights_path, map_location=self.device, weights_only=True)
            # Handle both SWA-wrapped and plain state dicts
            if any(k.startswith("module.") for k in state_dict):
                state_dict = {k.replace("module.", ""): v for k, v in state_dict.items()}

            # Auto-detect backbone from checkpoint dimensions:
            # B2 (timm) → shared_fc.0.weight shape [768, 1408]
            # B0 (legacy) → shared_fc.0.weight shape [768, 1280]
            ckpt_dim = state_dict.get("shared_fc.0.weight", None)
            if ckpt_dim is not None:
                feat_dim = ckpt_dim.shape[1]
            else:
                feat_dim = None

            use_timm_for_load = _USE_TIMM and (feat_dim is None or feat_dim == 1408)
            if feat_dim == 1280 and _USE_TIMM:
                # Weights are from B0 → force B0 backbone for compatibility
                logger.warning(
                    f"Checkpoint has feature_dim={feat_dim} (EfficientNet-B0) "
                    f"but timm is available. Forcing B0 backbone to match weights."
                )
                use_timm_for_load = False

            # Temporarily override global flag for model construction
            original_flag = _USE_TIMM
            _USE_TIMM = use_timm_for_load
            self.model = MultiHeadFGS(num_classes=3, pretrained=False)
            _USE_TIMM = original_flag

            self.model.load_state_dict(state_dict, strict=False)
            logger.info(f"Weights loaded (feature_dim={feat_dim}, timm={use_timm_for_load})")
        else:
            logger.warning(
                f"Weights not found at {weights_path}. "
                "Using untrained model — predictions will be unreliable."
            )
            self.model = MultiHeadFGS(num_classes=3, pretrained=True)

        self.model.to(self.device)
        self.model.eval()

        # Inference transform — B2 uses 260, B0 uses 224
        # Detect from actual backbone
        if hasattr(self.model.backbone, 'num_features'):
            self._input_size = 260  # timm B2
        else:
            self._input_size = 224  # efficientnet-pytorch B0
        self.transform = transforms.Compose([
            transforms.ToPILImage(),
            transforms.Resize((self._input_size, self._input_size)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225],
            ),
        ])

    # ── helpers ────────────────────────────────────────────────
    def _apply_clahe(self, bgr_image: np.ndarray) -> np.ndarray:
        """Apply CLAHE (same as preprocessing.py) to match training distribution."""
        lab = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l = clahe.apply(l)
        enhanced = cv2.merge([l, a, b])
        return cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)

    def _prepare_tensor(self, rgb_image: np.ndarray) -> torch.Tensor:
        return self.transform(rgb_image).unsqueeze(0).to(self.device)

    def _predict_single(self, tensor: torch.Tensor) -> dict[str, np.ndarray]:
        """Return raw logits as numpy for a single tensor."""
        with torch.no_grad():
            outputs = self.model(tensor)
        return {k: v.cpu().numpy() for k, v in outputs.items()}

    # ── Main predict ──────────────────────────────────────────
    def predict(self, face_image: np.ndarray) -> dict[str, int]:
        """
        Predict FGS scores for a cropped cat face.

        Args:
            face_image: BGR image of cat face (OpenCV format)

        Returns:
            dict mapping feature name → score (0, 1, or 2)
        """
        # Apply CLAHE then convert to RGB
        enhanced = self._apply_clahe(face_image)
        rgb = cv2.cvtColor(enhanced, cv2.COLOR_BGR2RGB)

        if not self.tta:
            tensor = self._prepare_tensor(rgb)
            logits = self._predict_single(tensor)
            scores = {k: int(np.argmax(v, axis=1)[0]) for k, v in logits.items()}
            logger.info(f"FGS Scores: {scores}")
            return scores

        # ── TTA: original + horizontal flip + slight overcrop ──
        from PIL import Image as _PILImage
        pil = _PILImage.fromarray(rgb)

        tta_transforms = [
            # (1) Original centre crop
            transforms.Compose([
                transforms.Resize((self._input_size, self._input_size)),
                transforms.ToTensor(),
                transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
            ]),
            # (2) Horizontal flip
            transforms.Compose([
                transforms.Resize((self._input_size, self._input_size)),
                transforms.RandomHorizontalFlip(p=1.0),
                transforms.ToTensor(),
                transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
            ]),
            # (3) Slightly larger → centre crop
            transforms.Compose([
                transforms.Resize((int(self._input_size * 1.1), int(self._input_size * 1.1))),
                transforms.CenterCrop(self._input_size),
                transforms.ToTensor(),
                transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
            ]),
        ]

        # Accumulate logits
        accum = None
        for t in tta_transforms:
            tensor = t(pil).unsqueeze(0).to(self.device)
            logits = self._predict_single(tensor)
            if accum is None:
                accum = logits
            else:
                for k in accum:
                    accum[k] += logits[k]

        scores = {k: int(np.argmax(v, axis=1)[0]) for k, v in accum.items()}
        logger.info(f"FGS Scores (TTA): {scores}")
        return scores