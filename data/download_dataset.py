# filepath: /Users/iam.pxk/Desktop/CNN_Meow/data/download_dataset.py
"""
Dataset download & automatic preparation script.

Downloads the Crawford Cat Dataset from Kaggle, then:
1. Parses .cat landmark files → auto-generates YOLO bounding-box labels
2. Copies & splits images into YOLO train/val folders
3. Crops cat faces → saves to data/processed/images/
4. Creates FGS labels.csv pre-filled with filenames (demo random scores)

The Crawford .cat format:  9 landmark points (x,y pairs)
  Point 0: left ear tip
  Point 1: right ear tip
  Point 2: left eye
  Point 3: right eye
  Point 4: nose
  Point 5-8: mouth corners / chin
"""

import os
import glob
import shutil
import random
import logging
from pathlib import Path

import cv2
import numpy as np
import pandas as pd

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

# ── configuration ──────────────────────────────────────────────
ROOT_DIR = Path(__file__).resolve().parent.parent          # CNN_Meow/
DATA_DIR = ROOT_DIR / "data"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_IMG_DIR = DATA_DIR / "processed" / "images"
YOLO_DIR = DATA_DIR / "yolo"
VAL_RATIO = 0.2          # 20 % validation
FACE_PAD_RATIO = 0.35     # padding around landmarks for crop
SEED = 42
MAX_IMAGES = None          # set to e.g. 500 for quick test runs
# ───────────────────────────────────────────────────────────────


def _ensure_dirs():
    """Create all required directories."""
    dirs = [
        RAW_DIR,
        PROCESSED_IMG_DIR,
        YOLO_DIR / "images" / "train",
        YOLO_DIR / "images" / "val",
        YOLO_DIR / "labels" / "train",
        YOLO_DIR / "labels" / "val",
    ]
    for d in dirs:
        d.mkdir(parents=True, exist_ok=True)


def _download_kaggle() -> Path:
    """Download crawford/cat-dataset via kagglehub and return its local path."""
    import kagglehub

    logger.info("⬇️  Downloading cat dataset from Kaggle …")
    path = Path(kagglehub.dataset_download("crawford/cat-dataset"))
    logger.info(f"✅ Dataset cached at: {path}")
    return path


def _find_cat_annotation_pairs(dataset_path: Path) -> list[tuple[Path, Path]]:
    """
    Walk the downloaded folder and find every (image, .cat annotation) pair.
    Returns list of (image_path, cat_annotation_path).
    """
    cat_files = sorted(dataset_path.rglob("*.cat"))
    pairs: list[tuple[Path, Path]] = []

    for cat_f in cat_files:
        # The image file has the same name without '.cat'
        img_path = cat_f.with_suffix("")   # e.g. 00000001_000.jpg.cat → 00000001_000.jpg
        if not img_path.exists():
            # try common extensions
            for ext in [".jpg", ".jpeg", ".png"]:
                candidate = cat_f.with_suffix(ext)
                if candidate.exists():
                    img_path = candidate
                    break
        if img_path.exists() and img_path.suffix.lower() in {".jpg", ".jpeg", ".png"}:
            pairs.append((img_path, cat_f))

    logger.info(f"🔎 Found {len(cat_files)} .cat files, {len(pairs)} valid image+annotation pairs")
    return pairs


def _parse_cat_annotation(cat_path: Path) -> np.ndarray | None:
    """
    Parse a .cat annotation file.
    Format:  N x1 y1 x2 y2 ... xN yN
    Returns ndarray of shape (N, 2) or None on failure.
    """
    try:
        text = cat_path.read_text().strip()
        tokens = text.split()
        n_points = int(tokens[0])
        coords = list(map(int, tokens[1:]))
        if len(coords) != n_points * 2:
            return None
        return np.array(coords, dtype=np.float32).reshape(n_points, 2)
    except Exception:
        return None


def _landmarks_to_yolo_bbox(
    landmarks: np.ndarray,
    img_w: int,
    img_h: int,
    pad_ratio: float = FACE_PAD_RATIO,
) -> tuple[float, float, float, float]:
    """
    Convert landmark points → YOLO format bbox (class cx cy w h) normalised 0-1.
    Adds padding around the landmarks so the crop includes the whole face.
    """
    x_min, y_min = landmarks.min(axis=0)
    x_max, y_max = landmarks.max(axis=0)

    w = x_max - x_min
    h = y_max - y_min
    pad_x = w * pad_ratio
    pad_y = h * pad_ratio

    x_min = max(0, x_min - pad_x)
    y_min = max(0, y_min - pad_y)
    x_max = min(img_w, x_max + pad_x)
    y_max = min(img_h, y_max + pad_y)

    cx = (x_min + x_max) / 2 / img_w
    cy = (y_min + y_max) / 2 / img_h
    bw = (x_max - x_min) / img_w
    bh = (y_max - y_min) / img_h

    return cx, cy, bw, bh


def _crop_face(
    image: np.ndarray,
    landmarks: np.ndarray,
    pad_ratio: float = FACE_PAD_RATIO,
) -> np.ndarray | None:
    """Crop the cat face region from an image using landmarks."""
    h, w = image.shape[:2]
    x_min, y_min = landmarks.min(axis=0)
    x_max, y_max = landmarks.max(axis=0)

    fw = x_max - x_min
    fh = y_max - y_min
    pad_x = fw * pad_ratio
    pad_y = fh * pad_ratio

    x1 = int(max(0, x_min - pad_x))
    y1 = int(max(0, y_min - pad_y))
    x2 = int(min(w, x_max + pad_x))
    y2 = int(min(h, y_max + pad_y))

    crop = image[y1:y2, x1:x2]
    if crop.size == 0:
        return None
    return crop


def _write_yolo_yaml():
    """Write the YOLO data config YAML."""
    yaml_path = YOLO_DIR / "cat_faces.yaml"
    yaml_path.write_text(
        "# Cat Face Detection Dataset\n"
        f"path: {YOLO_DIR.resolve()}\n"
        "train: images/train\n"
        "val: images/val\n\n"
        "nc: 1\n"
        "names: ['cat_face']\n"
    )
    logger.info(f"📄 YOLO config written to {yaml_path}")


def _generate_demo_fgs_labels(filenames: list[str]) -> pd.DataFrame:
    """
    Generate REALISTIC (not random) FGS labels.
    
    Each image gets a pain level (0=no pain, 1=moderate, 2=severe)
    All 5 features then correlate to that pain level.
    This way the model has CORRELATED features to learn from.
    
    ⚠️  Still "demo" but much more realistic than pure random.
    For production-grade results, use real veterinary annotations.
    """
    rng = np.random.RandomState(SEED)
    n = len(filenames)
    
    # Generate base pain level (0-2) for each image
    # Distribution: 50% pain-free, 30% moderate, 20% severe (realistic)
    pain_levels = rng.choice([0, 1, 2], size=n, p=[0.5, 0.3, 0.2])
    
    # Generate correlated features based on pain level
    ears = np.zeros(n, dtype=int)
    eyes = np.zeros(n, dtype=int)
    muzzle = np.zeros(n, dtype=int)
    whiskers = np.zeros(n, dtype=int)
    head_position = np.zeros(n, dtype=int)
    
    for i, pain in enumerate(pain_levels):
        if pain == 0:  # No pain
            # All features =0, with 90% probability
            ears[i] = rng.choice([0, 1], p=[0.9, 0.1])
            eyes[i] = rng.choice([0, 1], p=[0.9, 0.1])
            muzzle[i] = rng.choice([0, 1], p=[0.9, 0.1])
            whiskers[i] = rng.choice([0, 1], p=[0.9, 0.1])
            head_position[i] = rng.choice([0, 1], p=[0.9, 0.1])
            
        elif pain == 1:  # Moderate pain
            # Each feature 0, 1, or 2 with different probabilities
            ears[i] = rng.choice([0, 1, 2], p=[0.3, 0.5, 0.2])
            eyes[i] = rng.choice([0, 1, 2], p=[0.2, 0.6, 0.2])  # More eyes closure
            muzzle[i] = rng.choice([0, 1, 2], p=[0.3, 0.5, 0.2])
            whiskers[i] = rng.choice([0, 1, 2], p=[0.3, 0.5, 0.2])
            head_position[i] = rng.choice([0, 1, 2], p=[0.4, 0.4, 0.2])
            
        else:  # Severe pain (pain == 2)
            # Heavy bias toward 2, some 1s
            ears[i] = rng.choice([1, 2], p=[0.2, 0.8])
            eyes[i] = rng.choice([1, 2], p=[0.1, 0.9])  # Eyes mostly 2 (severe)
            muzzle[i] = rng.choice([1, 2], p=[0.2, 0.8])
            whiskers[i] = rng.choice([1, 2], p=[0.2, 0.8])
            head_position[i] = rng.choice([1, 2], p=[0.2, 0.8])
    
    df = pd.DataFrame({
        "filename": filenames,
        "ears": ears,
        "eyes": eyes,
        "muzzle": muzzle,
        "whiskers": whiskers,
        "head_position": head_position,
    })
    return df


# ── main pipeline ──────────────────────────────────────────────
def download_and_prepare():
    """Full automated pipeline: download → parse → split → label."""
    _ensure_dirs()

    # 1. Download from Kaggle
    dataset_path = _download_kaggle()

    # 2. Find all (image, annotation) pairs
    pairs = _find_cat_annotation_pairs(dataset_path)
    if not pairs:
        logger.error("❌ No valid image + .cat annotation pairs found!")
        return

    # Limit for quick testing if configured
    if MAX_IMAGES and len(pairs) > MAX_IMAGES:
        random.seed(SEED)
        pairs = random.sample(pairs, MAX_IMAGES)

    # 3. Shuffle & split into train / val
    random.seed(SEED)
    random.shuffle(pairs)
    val_count = int(len(pairs) * VAL_RATIO)
    val_pairs = pairs[:val_count]
    train_pairs = pairs[val_count:]

    logger.info(f"📦 Split: {len(train_pairs)} train / {len(val_pairs)} val")

    face_filenames: list[str] = []  # for FGS labels
    stats = {"processed": 0, "skipped": 0}

    for split_name, split_pairs in [("train", train_pairs), ("val", val_pairs)]:
        img_dst_dir = YOLO_DIR / "images" / split_name
        lbl_dst_dir = YOLO_DIR / "labels" / split_name

        for idx, (img_path, cat_path) in enumerate(split_pairs):
            # Parse landmarks
            landmarks = _parse_cat_annotation(cat_path)
            if landmarks is None:
                stats["skipped"] += 1
                continue

            # Read image to get dimensions
            image = cv2.imread(str(img_path))
            if image is None:
                stats["skipped"] += 1
                continue
            img_h, img_w = image.shape[:2]

            # --- YOLO label ---
            cx, cy, bw, bh = _landmarks_to_yolo_bbox(landmarks, img_w, img_h)
            safe_name = f"{split_name}_{idx:05d}.jpg"

            # Copy image
            shutil.copy2(img_path, img_dst_dir / safe_name)

            # Write YOLO label (class 0 = cat_face)
            label_txt = lbl_dst_dir / safe_name.replace(".jpg", ".txt")
            label_txt.write_text(f"0 {cx:.6f} {cy:.6f} {bw:.6f} {bh:.6f}\n")

            # --- Cropped face for EfficientNet ---
            face = _crop_face(image, landmarks)
            if face is not None:
                face_resized = cv2.resize(face, (224, 224))
                cv2.imwrite(str(PROCESSED_IMG_DIR / safe_name), face_resized)
                face_filenames.append(safe_name)

            stats["processed"] += 1

    logger.info(
        f"✅ Processed {stats['processed']} images "
        f"(skipped {stats['skipped']})"
    )

    # 4. Write YOLO config
    _write_yolo_yaml()

    # 5. Generate FGS labels CSV
    if face_filenames:
        df_labels = _generate_demo_fgs_labels(face_filenames)

        # Save the full demo labels
        labels_path = DATA_DIR / "processed" / "labels.csv"
        df_labels.to_csv(labels_path, index=False)
        logger.info(f"📄 FGS labels (demo) written to {labels_path}  ({len(df_labels)} rows)")

        # Also keep a blank template for manual annotation
        template_path = DATA_DIR / "processed" / "labels_template.csv"
        df_template = df_labels[["filename"]].copy()
        for col in ["ears", "eyes", "muzzle", "whiskers", "head_position"]:
            df_template[col] = ""
        df_template.to_csv(template_path, index=False)
        logger.info(f"📄 Blank template written to {template_path}")

    # 6. Summary
    logger.info(
        "\n\n"
        + "=" * 60 + "\n"
        + "🎉  DATASET PREPARATION COMPLETE\n"
        + "=" * 60 + "\n"
        + f"\n📁 YOLO images:      {YOLO_DIR / 'images'}"
        + f"\n📁 YOLO labels:      {YOLO_DIR / 'labels'}"
        + f"\n📁 YOLO config:      {YOLO_DIR / 'cat_faces.yaml'}"
        + f"\n📁 Cropped faces:    {PROCESSED_IMG_DIR}"
        + f"\n📁 FGS labels:       {DATA_DIR / 'processed' / 'labels.csv'}"
        + "\n"
        + "\n⚠️  Note: labels.csv contains DEMO random scores."
        + "\n   For real use, replace with veterinary-annotated scores"
        + "\n   or use labels_template.csv as a starting point."
        + "\n"
        + "\nReady to train:"
        + "\n  1. YOLO:         python -m train.train_yolo --data_yaml data/yolo/cat_faces.yaml"
        + "\n  2. EfficientNet:  python -m train.train_efficientnet --csv_path data/processed/labels.csv --image_dir data/processed/images"
        + "\n  3. Evaluate:      python -m train.evaluate"
        + "\n"
    )


if __name__ == "__main__":
    download_and_prepare()