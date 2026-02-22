# filepath: /Users/iam.pxk/Desktop/CNN_Meow/backend/app/services/preprocessing.py
import cv2
import numpy as np
import logging

logger = logging.getLogger(__name__)


def preprocess_image(image_bytes: bytes) -> np.ndarray:
    """
    Convert uploaded image bytes to OpenCV BGR format.
    Also applies basic quality improvements.
    """
    # Decode image
    nparr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if image is None:
        raise ValueError("Could not decode image. Please upload a valid image file.")

    logger.info(f"Image decoded: {image.shape[1]}x{image.shape[0]}")

    # Auto-adjust brightness/contrast using CLAHE
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l = clahe.apply(l)
    enhanced = cv2.merge([l, a, b])
    image = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)

    return image


def image_to_base64(image: np.ndarray) -> str:
    """Convert OpenCV image to base64 string for API response."""
    import base64

    _, buffer = cv2.imencode(".jpg", image)
    return base64.b64encode(buffer).decode("utf-8")