# filepath: /Users/iam.pxk/Desktop/CNN_Meow/backend/app/schemas/prediction.py
from pydantic import BaseModel, Field
from typing import Optional


class BoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float
    confidence: float


class FGSScores(BaseModel):
    ears: int = Field(..., ge=0, le=2, description="Ear position score (0=normal, 2=severe)")
    eyes: int = Field(..., ge=0, le=2, description="Eye squinting score")
    muzzle: int = Field(..., ge=0, le=2, description="Muzzle tension score")
    whiskers: int = Field(..., ge=0, le=2, description="Whisker direction score")
    head_position: int = Field(..., ge=0, le=2, description="Head tilt/position score")

    @property
    def total(self) -> int:
        return self.ears + self.eyes + self.muzzle + self.whiskers + self.head_position


class PainLevel(BaseModel):
    total_score: int = Field(..., ge=0, le=10)
    level: str  # "normal", "monitor", "action_required"
    description: str


class PredictionResponse(BaseModel):
    success: bool
    bounding_box: Optional[BoundingBox] = None
    fgs_scores: Optional[FGSScores] = None
    pain_level: Optional[PainLevel] = None
    llm_advice: Optional[str] = None
    cropped_face_base64: Optional[str] = None
    error: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    models_loaded: list[str]