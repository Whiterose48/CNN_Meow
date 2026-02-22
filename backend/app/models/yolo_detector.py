# filepath: /Users/iam.pxk/Desktop/CNN_Meow/backend/app/models/yolo_detector.py
import logging
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
from ultralytics import YOLO

logger = logging.getLogger(__name__)


class YOLODetector:
    """
    YOLOv8 Cat Face Detector.
    
    Detects cat faces in images and returns bounding boxes.
    If custom weights don't exist, falls back to pretrained YOLOv8n
    and filters for 'cat' class (class 15 in COCO).
    """

    def __init__(self, weights_path: str = "yolov8n.pt"):
        self.weights_path = weights_path

        if Path(weights_path).exists():
            logger.info(f"Loading custom YOLO weights from {weights_path}")
            self.model = YOLO(weights_path)
        else:
            logger.warning(
                f"Custom weights not found at {weights_path}. "
                "Falling back to pretrained YOLOv8n (COCO cat class)."
            )
            self.model = YOLO("yolov8n.pt")

        self.is_custom = Path(weights_path).exists()

    def detect(
        self, image: np.ndarray, confidence_threshold: float = 0.3
    ) -> Optional[dict]:
        """
        Detect cat face in image.
        
        Args:
            image: BGR image (OpenCV format)
            confidence_threshold: Minimum detection confidence
            
        Returns:
            dict with keys: x1, y1, x2, y2, confidence, cropped_face
            or None if no cat face found
        """
        results = self.model(image, verbose=False)[0]

        best_detection = None
        best_confidence = 0.0

        for box in results.boxes:
            conf = float(box.conf[0])
            cls = int(box.cls[0])

            # If using pretrained COCO model, filter for cat (class 15)
            if not self.is_custom and cls != 15:
                continue

            if conf > confidence_threshold and conf > best_confidence:
                best_confidence = conf
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                best_detection = {
                    "x1": float(x1),
                    "y1": float(y1),
                    "x2": float(x2),
                    "y2": float(y2),
                    "confidence": conf,
                }

        if best_detection is None:
            logger.warning("No cat face detected in image.")
            return None

        # Crop and align face
        x1, y1, x2, y2 = (
            int(best_detection["x1"]),
            int(best_detection["y1"]),
            int(best_detection["x2"]),
            int(best_detection["y2"]),
        )

        # Add padding (10%) for better face context
        h, w = image.shape[:2]
        pad_x = int((x2 - x1) * 0.1)
        pad_y = int((y2 - y1) * 0.1)
        x1 = max(0, x1 - pad_x)
        y1 = max(0, y1 - pad_y)
        x2 = min(w, x2 + pad_x)
        y2 = min(h, y2 + pad_y)

        cropped_face = image[y1:y2, x1:x2]
        best_detection["cropped_face"] = cropped_face

        logger.info(
            f"Cat face detected: confidence={best_confidence:.3f}, "
            f"bbox=({x1},{y1},{x2},{y2})"
        )
        return best_detection

    def align_face(self, face_image: np.ndarray) -> np.ndarray:
        """
        Basic face alignment - ensure eyes are on the same horizontal plane.
        Uses image symmetry heuristics for cat faces.
        """
        # Convert to grayscale for analysis
        gray = cv2.cvtColor(face_image, cv2.COLOR_BGR2GRAY)

        # Split image into left and right halves
        h, w = gray.shape
        left_half = gray[:h // 2, :w // 2]
        right_half = gray[:h // 2, w // 2:]

        # Compute center of brightness for each half (approximating eye positions)
        left_moments = cv2.moments(left_half)
        right_moments = cv2.moments(cv2.flip(right_half, 1))

        if left_moments["m00"] == 0 or right_moments["m00"] == 0:
            return face_image

        left_cy = left_moments["m01"] / left_moments["m00"]
        right_cy = right_moments["m01"] / right_moments["m00"]

        # Calculate rotation angle
        angle = np.degrees(np.arctan2(right_cy - left_cy, w / 2))

        # Limit rotation to avoid extreme transformations
        angle = np.clip(angle, -15, 15)

        if abs(angle) > 1.0:  # Only rotate if significant
            center = (w // 2, h // 2)
            rotation_matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
            aligned = cv2.warpAffine(face_image, rotation_matrix, (w, h))
            logger.info(f"Face aligned by {angle:.1f} degrees")
            return aligned

        return face_image