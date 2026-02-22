# filepath: /Users/iam.pxk/Desktop/CNN_Meow/backend/app/routers/predict.py
import logging
from fastapi import APIRouter, File, UploadFile, HTTPException

from app.schemas.prediction import PredictionResponse
from app.services.preprocessing import preprocess_image
from app.services.pipeline import run_pipeline
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/predict", response_model=PredictionResponse)
async def predict_pain(file: UploadFile = File(...)):
    """
    Upload a cat photo and get FGS pain assessment.
    
    - Accepts: JPEG, PNG images
    - Returns: FGS scores, pain level, and veterinary advice
    """
    # Validate file type
    if file.content_type not in ["image/jpeg", "image/png", "image/jpg"]:
        raise HTTPException(
            status_code=400,
            detail="กรุณาอัปโหลดไฟล์ภาพ JPEG หรือ PNG เท่านั้น",
        )

    # Read and validate size
    contents = await file.read()
    if len(contents) > settings.MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"ไฟล์ใหญ่เกินไป (สูงสุด {settings.MAX_IMAGE_SIZE // (1024*1024)}MB)",
        )

    try:
        # Preprocess
        image = preprocess_image(contents)

        # Import models from app state
        from app.main import models

        if not models:
            raise HTTPException(status_code=503, detail="Models not loaded yet")

        # Run full pipeline
        result = run_pipeline(
            image=image,
            detector=models["detector"],
            scorer=models["scorer"],
            advisor=models["advisor"],
        )

        return result

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Prediction error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="เกิดข้อผิดพลาดในการวิเคราะห์ กรุณาลองใหม่อีกครั้ง",
        )