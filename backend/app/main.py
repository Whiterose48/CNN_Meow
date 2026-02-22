# filepath: /Users/iam.pxk/Desktop/CNN_Meow/backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.config import settings
from app.routers import predict
from app.models.yolo_detector import YOLODetector
from app.models.efficientnet_scorer import FGSScorer
from app.models.llm_advisor import LLMAdvisor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global model instances
models = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load models on startup, release on shutdown."""
    logger.info("Loading YOLOv8 Cat Face Detector...")
    models["detector"] = YOLODetector(weights_path=str(settings.YOLO_WEIGHTS_PATH))

    logger.info("Loading EfficientNet-B2 FGS Scorer (TTA enabled)...")
    models["scorer"] = FGSScorer(weights_path=str(settings.EFFICIENTNET_WEIGHTS_PATH), tta=True)

    logger.info("Initializing LLM Advisor...")
    models["advisor"] = LLMAdvisor(api_key=settings.OPENAI_API_KEY)

    # Ensure upload directory exists
    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    logger.info("All models loaded successfully!")
    yield

    # Cleanup
    models.clear()
    logger.info("Models unloaded.")


app = FastAPI(
    title="CNN_Meow - Feline Grimace Scale Analyzer",
    description="AI-powered cat pain detection using YOLOv8 + EfficientNet-B2 + GPT-4o",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict.router, prefix="/api/v1", tags=["prediction"])


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "models_loaded": list(models.keys()),
    }