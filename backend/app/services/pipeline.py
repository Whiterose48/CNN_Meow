# filepath: /Users/iam.pxk/Desktop/CNN_Meow/backend/app/services/pipeline.py
import logging
from typing import Optional

from app.models.yolo_detector import YOLODetector
from app.models.efficientnet_scorer import FGSScorer
from app.models.llm_advisor import LLMAdvisor
from app.schemas.prediction import (
    BoundingBox,
    FGSScores,
    PainLevel,
    PredictionResponse,
)
from app.services.preprocessing import image_to_base64
from app.config import settings

import numpy as np

logger = logging.getLogger(__name__)


def determine_pain_level(total_score: int) -> PainLevel:
    """Map total FGS score to pain level."""
    if total_score <= 1:
        return PainLevel(
            total_score=total_score,
            level="normal",
            description="ไม่พบสัญญาณความเจ็บปวด",
        )
    elif total_score <= 3:
        return PainLevel(
            total_score=total_score,
            level="monitor",
            description="ควรเฝ้าระวัง สังเกตอาการต่อเนื่อง",
        )
    else:
        return PainLevel(
            total_score=total_score,
            level="action_required",
            description="พบสัญญาณความเจ็บปวด ควรพาไปพบสัตวแพทย์",
        )


def run_pipeline(
    image: np.ndarray,
    detector: YOLODetector,
    scorer: FGSScorer,
    advisor: LLMAdvisor,
) -> PredictionResponse:
    """
    Full inference pipeline:
    1. YOLOv8 detects cat face
    2. EfficientNet scores 5 FGS features
    3. Aggregate pain level
    4. LLM generates advice
    """
    # Step 1: Detect cat face
    detection = detector.detect(image)

    if detection is None:
        return PredictionResponse(
            success=False,
            error="ไม่พบใบหน้าแมวในภาพ กรุณาถ่ายรูปหน้าแมวให้ชัดเจนอีกครั้ง",
        )

    bounding_box = BoundingBox(
        x1=detection["x1"],
        y1=detection["y1"],
        x2=detection["x2"],
        y2=detection["y2"],
        confidence=detection["confidence"],
    )

    # Step 1.5: Align face
    cropped_face = detection["cropped_face"]
    aligned_face = detector.align_face(cropped_face)

    # Encode cropped face for response
    face_base64 = image_to_base64(aligned_face)

    # Step 2: Score with EfficientNet
    scores_dict = scorer.predict(aligned_face)

    fgs_scores = FGSScores(
        ears=scores_dict["ears"],
        eyes=scores_dict["eyes"],
        muzzle=scores_dict["muzzle"],
        whiskers=scores_dict["whiskers"],
        head_position=scores_dict["head_position"],
    )

    # Step 3: Determine pain level
    total = fgs_scores.total
    pain_level = determine_pain_level(total)

    # Step 4: Get LLM advice
    advice = advisor.get_advice(
        scores=scores_dict,
        total_score=total,
        pain_level=pain_level.level,
    )

    logger.info(
        f"Pipeline complete: total_score={total}, level={pain_level.level}"
    )

    return PredictionResponse(
        success=True,
        bounding_box=bounding_box,
        fgs_scores=fgs_scores,
        pain_level=pain_level,
        llm_advice=advice,
        cropped_face_base64=face_base64,
    )