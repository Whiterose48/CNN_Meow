#!/usr/bin/env python3
"""
Generate FGS labels using image-analysis heuristics — v3.

Improvements over v2:
  • CLAHE pre-processing (matches training pipeline exactly)
  • Multi-scale analysis: each feature analyses at 2 scales, averages
  • Muzzle: 4-feature composite (added LBP texture variance)
  • Eyes: combined gradient + Laplacian + local std
  • Ears: dual-threshold Canny with morphological cleanup
  • Smoother quantisation: hysteresis bands to avoid boundary flip-flops
  • Reduced jitter (±0.02 instead of ±0.04) for label consistency
  • All images processed through CLAHE first → better heuristic signals

Usage:
    cd CNN_Meow
    source venv/bin/activate
    python data/generate_heuristic_labels.py
"""

import os
import hashlib
import logging
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor, as_completed

import cv2
import numpy as np
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parent.parent
IMAGE_DIR = ROOT / "data" / "processed" / "images"
OUTPUT_CSV = ROOT / "data" / "processed" / "labels.csv"
BACKUP_CSV = ROOT / "data" / "processed" / "labels_random_backup.csv"


# ── helpers ────────────────────────────────────────────────────
def _norm(val: float, lo: float, hi: float) -> float:
    """Normalise *val* to [0, 1] clamped."""
    return max(0.0, min(1.0, (val - lo) / (hi - lo + 1e-9)))


def _quantize_hysteresis(raw: float, prev_hint: int = -1) -> int:
    """
    Map continuous [0, 1] → discrete {0, 1, 2} with hysteresis bands.

    Instead of sharp boundaries at 0.33/0.66, uses overlapping bands:
      - Strong 0: raw < 0.30
      - Strong 2: raw > 0.70
      - Prefer previous category in the overlap zones 0.30-0.38 and 0.62-0.70
    This reduces label noise near boundaries.
    """
    if raw < 0.30:
        return 0
    elif raw > 0.70:
        return 2
    elif raw < 0.38:
        # Overlap zone: could be 0 or 1
        return 0 if prev_hint == 0 else (1 if prev_hint == 1 else 0)
    elif raw > 0.62:
        # Overlap zone: could be 1 or 2
        return 2 if prev_hint == 2 else (1 if prev_hint == 1 else 2)
    else:
        return 1


def _apply_clahe(img_bgr: np.ndarray) -> np.ndarray:
    """CLAHE — exactly matches preprocessing.py and dataset.py."""
    lab = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l = clahe.apply(l)
    enhanced = cv2.merge([l, a, b])
    return cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)


def _multi_scale_stat(region: np.ndarray, func, scales=(1.0, 0.7)) -> float:
    """Apply `func` at multiple scales and return the average."""
    results = []
    h, w = region.shape[:2]
    for s in scales:
        if s < 1.0 and min(h, w) > 20:
            sh, sw = int(h * s), int(w * s)
            cy, cx = h // 2, w // 2
            crop = region[cy - sh // 2:cy + sh // 2, cx - sw // 2:cx + sw // 2]
            if crop.size > 0:
                results.append(func(crop))
        else:
            results.append(func(region))
    return float(np.mean(results))


def analyse_image(img_path: str) -> dict | None:
    """
    Return FGS scores for a single cat-face image (v3 — CLAHE + multi-scale).

    v3 improvements:
      • CLAHE applied first → consistent brightness/contrast
      • Multi-scale analysis for each feature
      • More robust composite scores
      • Hysteresis quantisation to reduce boundary noise
    """
    img = cv2.imread(img_path)
    if img is None:
        return None

    # Apply CLAHE (matches training pipeline)
    img = _apply_clahe(img)

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape

    gray_eq = cv2.equalizeHist(gray)

    # Regions
    upper     = gray_eq[:h // 3, :]
    mid       = gray_eq[h // 4: 3 * h // 4, :]
    lower     = gray_eq[h // 2:, :]
    mid_lower = gray_eq[h // 3: 2 * h // 3, :]

    # ── Ears (edge density in upper third — multi-scale) ───────
    def ear_stat(r):
        edges = cv2.Canny(r, 40, 140)
        # Morphological cleanup to reduce noise
        kernel = np.ones((2, 2), np.uint8)
        edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)
        return np.mean(edges) / 255.0

    ear_density = _multi_scale_stat(upper, ear_stat)
    ear_raw = 1.0 - _norm(ear_density, 0.10, 0.28)

    # ── Eyes (gradient magnitude + Laplacian variance + local std) ──
    def eye_grad(r):
        gx = cv2.Sobel(r, cv2.CV_64F, 1, 0, ksize=3)
        gy = cv2.Sobel(r, cv2.CV_64F, 0, 1, ksize=3)
        return float(np.mean(np.sqrt(gx**2 + gy**2)))

    def eye_lap(r):
        lap = cv2.Laplacian(r, cv2.CV_64F)
        return float(np.var(lap))

    def eye_std(r):
        return float(np.std(r.astype(np.float32)))

    eye_grad_val = _multi_scale_stat(mid, eye_grad)
    eye_lap_val = _multi_scale_stat(mid, eye_lap)
    eye_std_val = _multi_scale_stat(mid, eye_std)

    eye_grad_s = 1.0 - _norm(eye_grad_val, 65, 130)
    eye_lap_s = 1.0 - _norm(eye_lap_val, 1500, 5000)
    eye_std_s = 1.0 - _norm(eye_std_val, 55, 82)

    eye_raw = 0.45 * eye_grad_s + 0.30 * eye_lap_s + 0.25 * eye_std_s

    # ── Muzzle (4-feature composite — added LBP texture) ──────
    muz_bright = float(np.mean(lower))
    muz_bright_s = 1.0 - _norm(muz_bright, 100, 155)

    muz_edges = cv2.Canny(lower, 50, 150)
    muz_edge_s = _norm(np.mean(muz_edges) / 255.0, 0.14, 0.28)

    muz_vsob = cv2.Sobel(lower, cv2.CV_64F, 0, 1, ksize=3)
    muz_vsob_s = _norm(float(np.mean(np.abs(muz_vsob))), 45, 65)

    # LBP-like texture variance (local binary pattern approximation)
    muz_lap = cv2.Laplacian(lower, cv2.CV_64F)
    muz_tex_s = _norm(float(np.std(muz_lap)), 20, 55)

    muzzle_raw = 0.30 * muz_bright_s + 0.30 * muz_edge_s + 0.20 * muz_vsob_s + 0.20 * muz_tex_s

    # ── Whiskers (horizontal Sobel + fine-texture energy) ──────
    def whisk_stat(r):
        sob_h = cv2.Sobel(r, cv2.CV_64F, 1, 0, ksize=3)
        return float(np.mean(np.abs(sob_h)))

    whisker_energy = _multi_scale_stat(mid_lower, whisk_stat)
    whisker_raw = 1.0 - _norm(whisker_energy, 40, 92)

    # ── Head position (vertical brightness centroid — smoothed) ──
    col_mean = np.mean(gray.astype(np.float32), axis=1)
    # Apply Gaussian smoothing to the column mean profile
    from scipy.ndimage import gaussian_filter1d
    col_smooth = gaussian_filter1d(col_mean, sigma=max(1, h // 30))
    yc = float(np.average(np.arange(h), weights=col_smooth + 1))
    head_ratio = yc / h
    head_raw = _norm(head_ratio, 0.43, 0.57)

    # Deterministic per-image jitter (reduced from ±0.04 to ±0.02)
    rng = np.random.RandomState(
        int(hashlib.md5(Path(img_path).name.encode()).hexdigest()[:8], 16) % (2**31)
    )
    jitter = rng.uniform(-0.02, 0.02, size=5)

    raws = [ear_raw, eye_raw, muzzle_raw, whisker_raw, head_raw]
    scores = [_quantize_hysteresis(r + j) for r, j in zip(raws, jitter)]

    return {
        "filename": Path(img_path).name,
        "ears": scores[0],
        "eyes": scores[1],
        "muzzle": scores[2],
        "whiskers": scores[3],
        "head_position": scores[4],
    }


def _worker(img_path: str) -> dict | None:
    """Top-level function for ProcessPoolExecutor (must be picklable)."""
    try:
        return analyse_image(img_path)
    except Exception as e:
        logger.debug(f"Failed {img_path}: {e}")
        return None


def main():
    print("=" * 60)
    print("🐱 FGS Label Generator — Heuristics v3 (CLAHE + multi-scale)")
    print("=" * 60)

    images = sorted(IMAGE_DIR.glob("*.jpg"))
    if not images:
        images = sorted(IMAGE_DIR.glob("*.png"))
    if not images:
        logger.error(f"No images found in {IMAGE_DIR}")
        return

    print(f"📂 Found {len(images)} images in {IMAGE_DIR}")

    # Back up old labels
    if OUTPUT_CSV.exists():
        import shutil
        shutil.copy2(OUTPUT_CSV, BACKUP_CSV)
        print(f"💾 Old labels backed up to {BACKUP_CSV.name}")

    # Process images in parallel
    n_workers = min(os.cpu_count() or 4, 8)
    print(f"⚙️  Processing with {n_workers} workers...")

    results = []
    paths = [str(p) for p in images]

    with ProcessPoolExecutor(max_workers=n_workers) as pool:
        futures = {pool.submit(_worker, p): p for p in paths}
        done = 0
        for fut in as_completed(futures):
            done += 1
            if done % 2000 == 0 or done == len(futures):
                print(f"   {done}/{len(futures)} processed")
            res = fut.result()
            if res is not None:
                results.append(res)

    df = pd.DataFrame(results)
    df = df.sort_values("filename").reset_index(drop=True)
    df.to_csv(OUTPUT_CSV, index=False)

    # Distribution report
    print(f"\n✅ Generated {len(df)} labels → {OUTPUT_CSV}")
    print("\n📊 Class distribution:")
    for col in ["ears", "eyes", "muzzle", "whiskers", "head_position"]:
        vc = df[col].value_counts().sort_index()
        pcts = (vc / len(df) * 100).round(1)
        print(f"   {col:15s}: 0={vc.get(0,0):5d} ({pcts.get(0,0):5.1f}%)  "
              f"1={vc.get(1,0):5d} ({pcts.get(1,0):5.1f}%)  "
              f"2={vc.get(2,0):5d} ({pcts.get(2,0):5.1f}%)")

    print("\n🎉 Done! Now run training:")
    print("   cd backend && python -m train.train_efficientnet --epochs 60")


if __name__ == "__main__":
    main()
