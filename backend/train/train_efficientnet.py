"""
Training script for Multi-Head EfficientNet-B2 FGS Scorer.

v4 — Optimised for ≥ 85 % accuracy with heuristic labels:
  - EfficientNet-B2 backbone (via timm) → richer features
  - Focal Loss with per-feature class weights (gamma 1.5)
  - 3-phase: heads warmup → full fine-tune → SWA consolidation
  - OneCycleLR with lower max LR (6e-4) for stable convergence
  - Mixup α=0.4 (off during SWA) for noisy-label robustness
  - Label smoothing 0.08 (lighter — don't over-smooth 3-class)
  - Cosine-annealed weight decay schedule
  - EMA tracking alongside SWA
  - Gradient clipping 0.5 (tighter for stability)
  - 60 epochs default, patience 12

Usage:
    cd backend
    python -m train.train_efficientnet
    python -m train.train_efficientnet --epochs 60 --batch_size 48 --lr 6e-4
"""

import argparse
import copy
import logging
import os
import time
from pathlib import Path

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader, Subset, random_split
from torch.optim import AdamW
from torch.optim.lr_scheduler import OneCycleLR
from torch.optim.swa_utils import AveragedModel, SWALR
from torch.amp import autocast, GradScaler
from tqdm import tqdm

from train.dataset import FGSDataset
from app.models.efficientnet_scorer import MultiHeadFGS

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

FEATURE_NAMES = ["ears", "eyes", "muzzle", "whiskers", "head_position"]

_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_CSV_PATH = str(_PROJECT_ROOT / "data" / "processed" / "labels.csv")
DEFAULT_IMAGE_DIR = str(_PROJECT_ROOT / "data" / "processed" / "images")


# ── Focal Loss ────────────────────────────────────────────────
class FocalLoss(nn.Module):
    """
    Focal Loss: FL(pt) = -alpha * (1-pt)^gamma * log(pt)
    
    gamma=1.5 (was 2.0): slightly less aggressive down-weighting of easy
    examples → lets the model still learn from confident predictions,
    important when labels are noisy.
    """

    def __init__(
        self,
        weight: torch.Tensor | None = None,
        gamma: float = 1.5,
        label_smoothing: float = 0.08,
    ):
        super().__init__()
        self.gamma = gamma
        self.label_smoothing = label_smoothing
        self.register_buffer("weight", weight)

    def forward(self, logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        ce = F.cross_entropy(
            logits, targets,
            weight=self.weight,
            reduction="none",
            label_smoothing=self.label_smoothing,
        )
        pt = torch.exp(-ce)
        focal = ((1 - pt) ** self.gamma) * ce
        return focal.mean()


# ── Mixup ─────────────────────────────────────────────────────
def mixup_data(
    images: torch.Tensor,
    labels: dict[str, torch.Tensor],
    alpha: float = 0.4,
) -> tuple[torch.Tensor, dict[str, torch.Tensor], dict[str, torch.Tensor], float]:
    """Mixup augmentation — alpha=0.4 gives stronger blending for noisy labels."""
    if alpha > 0:
        lam = np.random.beta(alpha, alpha)
        lam = max(lam, 1 - lam)
    else:
        lam = 1.0

    batch_size = images.size(0)
    index = torch.randperm(batch_size, device=images.device)

    mixed_images = lam * images + (1 - lam) * images[index]
    labels_a = labels
    labels_b = {k: v[index] for k, v in labels.items()}

    return mixed_images, labels_a, labels_b, lam


def mixup_criterion(
    criteria: dict[str, FocalLoss],
    outputs: dict[str, torch.Tensor],
    labels_a: dict[str, torch.Tensor],
    labels_b: dict[str, torch.Tensor],
    lam: float,
    feature_names: list[str],
) -> torch.Tensor:
    loss = torch.tensor(0.0, device=next(iter(outputs.values())).device)
    for f in feature_names:
        loss += lam * criteria[f](outputs[f], labels_a[f]) + \
                (1 - lam) * criteria[f](outputs[f], labels_b[f])
    return loss


# ── EMA (Exponential Moving Average) ─────────────────────────
class EMA:
    """Maintains an exponential moving average of model parameters."""

    def __init__(self, model: nn.Module, decay: float = 0.999):
        self.decay = decay
        self.shadow = {k: v.clone().detach() for k, v in model.state_dict().items()}

    @torch.no_grad()
    def update(self, model: nn.Module):
        for k, v in model.state_dict().items():
            if v.is_floating_point():
                self.shadow[k].mul_(self.decay).add_(v, alpha=1 - self.decay)
            else:
                # Non-float params (e.g. BatchNorm num_batches_tracked) — copy directly
                self.shadow[k].copy_(v)

    def state_dict(self):
        return self.shadow


# ── Utilities ─────────────────────────────────────────────────
def _get_device() -> tuple[str, str]:
    if torch.backends.mps.is_available():
        return "mps", "cpu"
    elif torch.cuda.is_available():
        return "cuda", "cuda"
    return "cpu", "cpu"


def compute_class_weights(csv_path: str) -> dict[str, torch.Tensor]:
    """Inverse-frequency class weights per feature — smoothed."""
    df = pd.read_csv(csv_path)
    weights = {}
    for feat in FEATURE_NAMES:
        counts = df[feat].value_counts().sort_index()
        freq = np.array([counts.get(c, 1) for c in range(3)], dtype=np.float32)
        # Smoothed inverse frequency: less extreme than raw inverse
        w = 1.0 / np.sqrt(freq + 1)
        w = w / w.sum() * 3
        weights[feat] = torch.tensor(w, dtype=torch.float32)
    return weights


# ── Train / Eval ──────────────────────────────────────────────
def train_one_epoch(
    model: nn.Module,
    dataloader: DataLoader,
    criteria: dict[str, FocalLoss],
    optimizer: torch.optim.Optimizer,
    scheduler,
    device: str,
    scaler: GradScaler | None,
    use_amp: bool,
    ema: EMA | None = None,
    use_mixup: bool = True,
    mixup_alpha: float = 0.4,
    grad_clip: float = 0.5,
) -> float:
    model.train()
    total_loss = 0.0

    pbar = tqdm(dataloader, desc="   Train", leave=False, dynamic_ncols=True)
    for images, labels in pbar:
        images = images.to(device, non_blocking=True)
        labels = {k: v.to(device, non_blocking=True) for k, v in labels.items()}

        optimizer.zero_grad(set_to_none=True)

        if use_mixup:
            mixed_images, labels_a, labels_b, lam = mixup_data(images, labels, alpha=mixup_alpha)
        else:
            mixed_images, labels_a, labels_b, lam = images, labels, labels, 1.0

        if use_amp and scaler is not None:
            with autocast(device_type="cuda"):
                outputs = model(mixed_images)
                loss = mixup_criterion(criteria, outputs, labels_a, labels_b, lam, FEATURE_NAMES)
            scaler.scale(loss).backward()
            scaler.unscale_(optimizer)
            nn.utils.clip_grad_norm_(model.parameters(), max_norm=grad_clip)
            scaler.step(optimizer)
            scaler.update()
        else:
            outputs = model(mixed_images)
            loss = mixup_criterion(criteria, outputs, labels_a, labels_b, lam, FEATURE_NAMES)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), max_norm=grad_clip)
            optimizer.step()

        scheduler.step()
        if ema is not None:
            ema.update(model)

        total_loss += loss.item()
        pbar.set_postfix({"loss": f"{loss.item():.3f}", "lr": f"{scheduler.get_last_lr()[0]:.1e}"})

    return total_loss / len(dataloader)


@torch.no_grad()
def evaluate(
    model: nn.Module,
    dataloader: DataLoader,
    criteria: dict[str, FocalLoss],
    device: str,
) -> tuple[float, dict[str, float]]:
    model.eval()
    total_loss = 0.0
    correct = {f: 0 for f in FEATURE_NAMES}
    total = 0

    pbar = tqdm(dataloader, desc="   Val  ", leave=False, dynamic_ncols=True)
    for images, labels in pbar:
        images = images.to(device, non_blocking=True)
        labels = {k: v.to(device, non_blocking=True) for k, v in labels.items()}

        outputs = model(images)
        loss = sum(criteria[f](outputs[f], labels[f]) for f in FEATURE_NAMES)
        total_loss += loss.item()

        for feat in FEATURE_NAMES:
            preds = outputs[feat].argmax(dim=1)
            correct[feat] += (preds == labels[feat]).sum().item()
        total += images.size(0)

    accuracy = {f: correct[f] / total for f in FEATURE_NAMES}
    return total_loss / len(dataloader), accuracy


# ── Main ──────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Train EfficientNet-B2 FGS Scorer (v4)")
    parser.add_argument("--csv_path", type=str, default=DEFAULT_CSV_PATH)
    parser.add_argument("--image_dir", type=str, default=DEFAULT_IMAGE_DIR)
    parser.add_argument("--epochs", type=int, default=60)
    parser.add_argument("--batch_size", type=int, default=48)
    parser.add_argument("--lr", type=float, default=6e-4, help="Max learning rate")
    parser.add_argument("--weight_decay", type=float, default=1e-2)
    parser.add_argument("--output_dir", type=str, default="./weights")
    parser.add_argument("--val_split", type=float, default=0.15)
    parser.add_argument("--patience", type=int, default=12, help="Early stopping patience")
    parser.add_argument("--phase1_epochs", type=int, default=5, help="Heads-only warmup epochs")
    parser.add_argument("--mixup_alpha", type=float, default=0.4, help="Mixup alpha (0=off)")
    parser.add_argument("--swa_start_frac", type=float, default=0.75, help="SWA starts at this fraction of epochs")
    parser.add_argument("--backbone_lr_mult", type=float, default=0.05, help="Backbone LR multiplier in phase 2")
    parser.add_argument("--head_lr_mult", type=float, default=0.25, help="Head/shared LR multiplier in phase 2")
    parser.add_argument("--ema_decay", type=float, default=0.999, help="EMA decay rate")
    parser.add_argument("--grad_clip", type=float, default=0.5, help="Max gradient norm")
    parser.add_argument("--num_workers", type=int, default=4, help="DataLoader workers")
    args = parser.parse_args()

    print()
    print("=" * 70)
    print("  CNN Meow  —  EfficientNet-B2 FGS Training  (v4 — ≥85 % target)")
    print("=" * 70)

    device, amp_device = _get_device()
    device_label = {"mps": "Apple Silicon GPU", "cuda": "NVIDIA GPU", "cpu": "CPU"}
    use_amp = device == "cuda"
    scaler = GradScaler() if use_amp else None
    use_mixup = args.mixup_alpha > 0

    swa_start_epoch = int(args.epochs * args.swa_start_frac)

    print(f"\n📋 Config:")
    print(f"   Epochs:       {args.epochs}  |  Batch: {args.batch_size}  |  LR: {args.lr}")
    print(f"   Phase 1:      {args.phase1_epochs} epochs (heads only)")
    print(f"   Phase 2:      backbone {args.backbone_lr_mult}×, heads {args.head_lr_mult}×")
    print(f"   Device:       {device} ({device_label.get(device, device)})")
    print(f"   AMP:          {'ON' if use_amp else 'OFF (MPS/CPU)'}")
    print(f"   Focal Loss:   gamma=1.5, label_smooth=0.08")
    print(f"   Mixup:        alpha={args.mixup_alpha}" + (" (OFF)" if not use_mixup else ""))
    print(f"   SWA:          from epoch {swa_start_epoch + 1}")
    print(f"   EMA:          decay={args.ema_decay}")
    print(f"   Grad clip:    {args.grad_clip}")
    print(f"   Patience:     {args.patience} epochs (early stopping)")
    print(f"   Weight decay: {args.weight_decay}")
    print(f"   Workers:      {args.num_workers}")

    os.makedirs(args.output_dir, exist_ok=True)

    # ── Compute class weights ──────────────────────────────────
    print("\n⚖️  Computing class weights from label distribution...")
    class_weights = compute_class_weights(args.csv_path)
    for feat in FEATURE_NAMES:
        w = class_weights[feat].numpy()
        print(f"   {feat:15s}: [{w[0]:.3f}, {w[1]:.3f}, {w[2]:.3f}]")

    criteria = {
        feat: FocalLoss(
            weight=class_weights[feat].to(device),
            gamma=1.5,
            label_smoothing=0.08,
        )
        for feat in FEATURE_NAMES
    }

    # ── Load dataset ───────────────────────────────────────────
    print("\n📂 Loading dataset...")
    full_dataset = FGSDataset(csv_path=args.csv_path, image_dir=args.image_dir, augment=True)
    val_size = int(len(full_dataset) * args.val_split)
    train_size = len(full_dataset) - val_size

    generator = torch.Generator().manual_seed(42)
    train_set, val_set = random_split(full_dataset, [train_size, val_size], generator=generator)

    # Validation without augmentation
    val_dataset_no_aug = FGSDataset(csv_path=args.csv_path, image_dir=args.image_dir, augment=False)
    val_set_clean = Subset(val_dataset_no_aug, val_set.indices)

    # Determine reasonable num_workers (0 for MPS to avoid issues)
    nw = 0 if device == "mps" else min(args.num_workers, os.cpu_count() or 1)

    train_loader = DataLoader(
        train_set, batch_size=args.batch_size, shuffle=True,
        num_workers=nw, pin_memory=(device == "cuda"), drop_last=True,
        persistent_workers=(nw > 0),
    )
    val_loader = DataLoader(
        val_set_clean, batch_size=args.batch_size, shuffle=False,
        num_workers=nw, pin_memory=(device == "cuda"),
        persistent_workers=(nw > 0),
    )
    print(f"   ✅ {len(full_dataset)} images → {train_size} train / {val_size} val")

    # ── Model ──────────────────────────────────────────────────
    print("\n🧠 Loading EfficientNet-B2 (pretrained)...")
    model = MultiHeadFGS(num_classes=3, pretrained=True).to(device)

    total_params = sum(p.numel() for p in model.parameters()) / 1e6
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad) / 1e6
    print(f"   ✅ Model loaded: {total_params:.1f}M total params")

    # ── EMA ────────────────────────────────────────────────────
    print("\n📊 Initialising EMA (Exponential Moving Average)...")
    ema = EMA(model, decay=args.ema_decay)
    print(f"   ✅ EMA ready (decay={args.ema_decay})")

    # ── SWA model ──────────────────────────────────────────────
    print("\n🔄 Preparing SWA (Stochastic Weight Averaging)...")
    swa_model = AveragedModel(model, device=device)
    swa_active = False
    print(f"   ✅ SWA will activate at epoch {swa_start_epoch + 1}")

    # ── Phase 1: Heads only ────────────────────────────────────
    unfreeze_epoch = args.phase1_epochs
    print(f"\n🔒 Phase 1: Training heads only (backbone frozen) for {unfreeze_epoch} epochs")
    for p in model.backbone.parameters():
        p.requires_grad = False

    head_params = [p for p in model.parameters() if p.requires_grad]
    optimizer = AdamW(head_params, lr=args.lr, weight_decay=args.weight_decay)

    steps_phase1 = len(train_loader) * unfreeze_epoch
    scheduler = OneCycleLR(
        optimizer, max_lr=args.lr,
        total_steps=steps_phase1, pct_start=0.3, anneal_strategy="cos",
    )

    best_val_loss = float("inf")
    best_avg_acc = 0.0
    patience_counter = 0

    save_path = os.path.join(args.output_dir, "efficientnet_fgs.pt")
    ema_save_path = os.path.join(args.output_dir, "efficientnet_fgs_ema.pt")

    print(f"\n🚀 Starting training: {args.epochs} epochs (unfreeze @{unfreeze_epoch + 1}, SWA @{swa_start_epoch + 1})")
    print("-" * 70)
    start_time = time.time()

    for epoch in range(args.epochs):
        epoch_start = time.time()

        # ── Phase 2: Unfreeze ──────────────────────────────────
        if epoch == unfreeze_epoch:
            print(f"\n🔓 Phase 2: Unfreezing backbone for full fine-tuning...")
            for p in model.backbone.parameters():
                p.requires_grad = True

            optimizer = AdamW([
                {"params": model.backbone.parameters(), "lr": args.lr * args.backbone_lr_mult},
                {"params": model.shared_fc.parameters(), "lr": args.lr * args.head_lr_mult},
                {"params": model.shared_se.parameters(), "lr": args.lr * args.head_lr_mult},
                {"params": model.shared_proj.parameters(), "lr": args.lr * args.head_lr_mult},
                {"params": (
                    list(model.head_ears.parameters()) +
                    list(model.head_eyes.parameters()) +
                    list(model.head_muzzle.parameters()) +
                    list(model.head_whiskers.parameters()) +
                    list(model.head_position.parameters())
                ), "lr": args.lr * args.head_lr_mult},
            ], weight_decay=args.weight_decay)

            remaining_steps = len(train_loader) * (args.epochs - unfreeze_epoch)
            scheduler = OneCycleLR(
                optimizer,
                max_lr=[
                    args.lr * args.backbone_lr_mult,
                    args.lr * args.head_lr_mult,
                    args.lr * args.head_lr_mult,
                    args.lr * args.head_lr_mult,
                    args.lr * args.head_lr_mult,
                ],
                total_steps=remaining_steps, pct_start=0.08, anneal_strategy="cos",
            )
            patience_counter = 0

        # ── SWA activation ─────────────────────────────────────
        if epoch == swa_start_epoch and not swa_active:
            print(f"\n🔄 SWA: Activating Stochastic Weight Averaging from epoch {epoch + 1}")
            swa_active = True

        # ── Disable Mixup during SWA ───────────────────────────
        epoch_mixup = use_mixup and not swa_active

        train_loss = train_one_epoch(
            model, train_loader, criteria, optimizer, scheduler,
            device, scaler, use_amp,
            ema=ema, use_mixup=epoch_mixup, mixup_alpha=args.mixup_alpha,
            grad_clip=args.grad_clip,
        )
        val_loss, val_acc = evaluate(model, val_loader, criteria, device)

        # SWA update
        if swa_active:
            swa_model.update_parameters(model)

        avg_acc = sum(val_acc.values()) / len(val_acc)
        epoch_s = time.time() - epoch_start

        saved = ""
        if avg_acc > best_avg_acc or (avg_acc == best_avg_acc and val_loss < best_val_loss):
            best_val_loss = val_loss
            best_avg_acc = avg_acc
            torch.save(model.state_dict(), save_path)
            torch.save(ema.state_dict(), ema_save_path)
            saved = " ★ SAVED"
            patience_counter = 0
        else:
            patience_counter += 1

        phase = "P1" if epoch < unfreeze_epoch else ("SWA" if swa_active else "P2")
        mx = "M" if epoch_mixup else " "
        print(
            f"[{phase}]{mx} Epoch {epoch+1:>2}/{args.epochs} │ "
            f"Train: {train_loss:.3f} │ Val: {val_loss:.3f} │ "
            f"Acc: {avg_acc:.1%} │ {epoch_s:.0f}s{saved}"
        )
        print(
            f"   ears:{val_acc['ears']:.0%} eyes:{val_acc['eyes']:.0%} "
            f"muzz:{val_acc['muzzle']:.0%} whis:{val_acc['whiskers']:.0%} "
            f"head:{val_acc['head_position']:.0%}"
        )

        # Early stopping — only in phase 2, not during SWA
        if epoch >= unfreeze_epoch and not swa_active and patience_counter >= args.patience:
            print(f"\n⏹️  Early stopping (no improvement for {args.patience} epochs)")
            break

    # ── Finalise SWA ───────────────────────────────────────────
    if swa_active:
        print("\n📈 Finalising SWA: updating batch norm statistics...")
        torch.optim.swa_utils.update_bn(train_loader, swa_model, device=device)

        swa_val_loss, swa_val_acc = evaluate(swa_model, val_loader, criteria, device)
        swa_avg_acc = sum(swa_val_acc.values()) / len(swa_val_acc)
        print(
            f" SWA model:  Val: {swa_val_loss:.3f} │ Acc: {swa_avg_acc:.1%}"
        )
        print(
            f"   ears:{swa_val_acc['ears']:.0%} eyes:{swa_val_acc['eyes']:.0%} "
            f"muzz:{swa_val_acc['muzzle']:.0%} whis:{swa_val_acc['whiskers']:.0%} "
            f"head:{swa_val_acc['head_position']:.0%}"
        )

        if swa_avg_acc > best_avg_acc:
            best_avg_acc = swa_avg_acc
            best_val_loss = swa_val_loss
            torch.save(swa_model.module.state_dict(), save_path)
            print(" SWA model is BETTER → saved!")
        else:
            print(f" SWA model ({swa_avg_acc:.1%}) vs best ({best_avg_acc:.1%}) — keeping best")

    # ── Evaluate EMA ───────────────────────────────────────────
    print("\n📊 Evaluating EMA model...")
    ema_model = MultiHeadFGS(num_classes=3, pretrained=False).to(device)
    ema_model.load_state_dict(ema.state_dict())
    ema_val_loss, ema_val_acc = evaluate(ema_model, val_loader, criteria, device)
    ema_avg_acc = sum(ema_val_acc.values()) / len(ema_val_acc)
    print(
        f" EMA model:  Val: {ema_val_loss:.3f} │ Acc: {ema_avg_acc:.1%}"
    )
    if ema_avg_acc > best_avg_acc:
        best_avg_acc = ema_avg_acc
        best_val_loss = ema_val_loss
        torch.save(ema.state_dict(), save_path)
        print(" EMA model is BEST → saved as primary weights!")
    else:
        print(f" EMA model ({ema_avg_acc:.1%}) vs best ({best_avg_acc:.1%}) — keeping best")

    elapsed = time.time() - start_time
    m, s = divmod(int(elapsed), 60)
    print("-" * 70)
    print(f" {m}m {s}s │ Best val acc: {best_avg_acc:.1%} │ Best val loss: {best_val_loss:.4f}")
    print(f" Saved: {save_path}")
    print(f" EMA:   {ema_save_path}")
    print(f" Next:  python -m train.evaluate")
    print("=" * 70)


if __name__ == "__main__":
    main()
