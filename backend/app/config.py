# filepath: /Users/iam.pxk/Desktop/CNN_Meow/backend/app/config.py
from pydantic_settings import BaseSettings
from pathlib import Path

# Resolve the project root (CNN_Meow/) — works whether CWD is backend/ or project root
_THIS_DIR = Path(__file__).resolve().parent          # app/
_BACKEND_DIR = _THIS_DIR.parent                       # backend/
_PROJECT_ROOT = _BACKEND_DIR.parent                   # CNN_Meow/

# Find .env — check backend/ first, then project root
_ENV_FILE = _BACKEND_DIR / ".env"
if not _ENV_FILE.exists():
    _ENV_FILE = _PROJECT_ROOT / ".env"


class Settings(BaseSettings):
    # API
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Paths
    MODEL_WEIGHTS_PATH: Path = Path("./weights")
    YOLO_WEIGHTS_PATH: Path = Path("./weights/yolo_cat_face.pt")
    EFFICIENTNET_WEIGHTS_PATH: Path = Path("./weights/efficientnet_fgs.pt")
    UPLOAD_DIR: Path = Path("./uploads")

    # OpenAI
    OPENAI_API_KEY: str = ""

    # Image constraints
    MAX_IMAGE_SIZE: int = 10 * 1024 * 1024  # 10MB
    INPUT_IMAGE_SIZE: int = 260  # EfficientNet-B2 input (timm default)

    # FGS scoring
    FGS_FEATURES: list[str] = ["ears", "eyes", "muzzle", "whiskers", "head_position"]
    NUM_CLASSES_PER_FEATURE: int = 3  # 0, 1, 2
    PAIN_THRESHOLD: int = 4  # Score >= 4 means action required

    model_config = {"env_file": str(_ENV_FILE), "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()