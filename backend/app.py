"""
Pet Insight 360 — FastAPI Backend (LangChain + LangGraph Edition)
Hybrid AI Pipeline:
  1. Custom CNN (MobileNetV2) → Emotion Detection
  2. LangChain + GPT-4o Vision → Breed Identification (Zero-shot)
  3. LangChain + GPT-4o LLM → Veterinary Advisor (Persona Prompting)
  4. LangGraph → Orchestrates the full analysis pipeline

Run with:
    python -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload
"""

import os, io, json, base64, time
from pathlib import Path
from typing import TypedDict, Optional

import cv2
import numpy as np
import torch
import torch.nn as nn
import torchvision.models as models
import torchvision.transforms as transforms
from PIL import Image
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# ─── LangChain & LangGraph ───────────────────────────────────────────
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser
from langgraph.graph import StateGraph, END

# ─── Load .env ────────────────────────────────────────────────────────
load_dotenv()

# ─── Paths & Config ──────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent
WEIGHTS  = BASE_DIR / "weights" / "pet_emotion.pth"

EMOTIONS = ["angry", "happy", "other", "sad"]
IMG_SIZE = 224
DEVICE   = "cuda" if torch.cuda.is_available() else "cpu"

# ─── LangChain LLM Setup ─────────────────────────────────────────────
LLM_READY = False
llm = None
llm_vision = None

try:
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if api_key:
        # GPT-4o for vet advice (text)
        llm = ChatOpenAI(
            model="gpt-4o",
            temperature=0.7,
            max_tokens=800,
            api_key=api_key,
        )
        # GPT-4o for breed identification (vision)
        llm_vision = ChatOpenAI(
            model="gpt-4o",
            temperature=0.3,
            max_tokens=200,
            api_key=api_key,
        )
        LLM_READY = True
        print("[OK] LangChain ChatOpenAI initialized (GPT-4o)")
    else:
        print("[WARN] No OPENAI_API_KEY — LLM features disabled")
except Exception as e:
    print(f"[WARN] LangChain init failed: {e}")


# ═══════════════════════════════════════════════════════════════════════
# STEP 1: Custom CNN — Emotion Detection (MobileNetV2)
# ═══════════════════════════════════════════════════════════════════════
class PetEmotionNet(nn.Module):
    def __init__(self, num_classes=4):
        super().__init__()
        backbone = models.mobilenet_v2(weights=None)
        self.features   = backbone.features
        self.pool       = nn.AdaptiveAvgPool2d(1)
        in_features     = backbone.last_channel  # 1280
        self.classifier = nn.Sequential(
            nn.Dropout(0.4),
            nn.Linear(in_features, 256),
            nn.ReLU(inplace=True),
            nn.Dropout(0.2),
            nn.Linear(256, num_classes),
        )

    def forward(self, x):
        x = self.features(x)
        x = self.pool(x)
        x = torch.flatten(x, 1)
        return self.classifier(x)


def load_model():
    m = PetEmotionNet(num_classes=len(EMOTIONS)).to(DEVICE)
    if WEIGHTS.exists():
        try:
            state = torch.load(str(WEIGHTS), map_location=DEVICE, weights_only=True)
            m.load_state_dict(state)
            m.eval()
            print(f"[OK] CNN Model loaded from {WEIGHTS} on {DEVICE}")
            return m, True
        except RuntimeError as e:
            print(f"[WARN] Weights incompatible: {e}")
            return None, False
    print(f"[WARN] No weights at {WEIGHTS} — running in demo mode")
    return None, False


emotion_model, MODEL_READY = load_model()

val_tf = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])


def predict_emotion(img_pil: Image.Image):
    """Step 1: Predict emotion using custom-trained CNN."""
    if not MODEL_READY:
        scores = [0.04, 0.87, 0.05, 0.04]
        return "happy", 0.87, {EMOTIONS[i]: f"{scores[i]:.0%}" for i in range(len(EMOTIONS))}
    tensor = val_tf(img_pil).unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        probs = torch.softmax(emotion_model(tensor), dim=1)[0].cpu().numpy()
    idx = int(np.argmax(probs))
    return EMOTIONS[idx], float(probs[idx]), {EMOTIONS[i]: f"{probs[i]:.0%}" for i in range(len(EMOTIONS))}


# ═══════════════════════════════════════════════════════════════════════
# STEP 2: LangChain — Breed Identification (Zero-shot Vision)
# ═══════════════════════════════════════════════════════════════════════
def identify_breed(img_pil: Image.Image) -> dict:
    """Step 2: Use LangChain + GPT-4o Vision for zero-shot breed identification."""
    if not LLM_READY:
        return {"species": "Unknown", "breed": "Unknown", "confidence": "low",
                "note": "Set OPENAI_API_KEY to enable breed detection"}
    try:
        # Encode image to base64
        buf = io.BytesIO()
        img_pil.save(buf, format="JPEG", quality=85)
        img_b64 = base64.b64encode(buf.getvalue()).decode()

        # LangChain Vision message
        message = HumanMessage(
            content=[
                {
                    "type": "text",
                    "text": (
                        "Identify the animal species and specific breed in this image.\n"
                        "Return ONLY a JSON object in this exact format (no markdown, no extra text):\n"
                        '{"species": "<animal type>", "breed": "<specific breed>", "confidence": "<high/medium/low>"}'
                    ),
                },
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{img_b64}"},
                },
            ]
        )

        # Invoke LangChain vision model
        response = llm_vision.invoke([message])
        text = response.content.strip()

        if "{" in text:
            return json.loads(text[text.index("{"):text.rindex("}") + 1])
    except Exception as e:
        return {"species": "Unknown", "breed": "Unknown", "error": str(e)}
    return {"species": "Unknown", "breed": "Unknown"}


# ═══════════════════════════════════════════════════════════════════════
# STEP 3: LangChain — Veterinary Advisor (Persona Prompting / AI Agent)
# ═══════════════════════════════════════════════════════════════════════

# LangChain Prompt Template — Expert Persona
vet_prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        "Act as an expert Veterinary Behaviorist and Pet Lifestyle Consultant. "
        "You have deep knowledge about all pet breeds, their health conditions, "
        "behavioral patterns, and care requirements. "
        "You must give breed-specific advice, never generic advice. "
        "Always respond in Thai language with a professional yet empathetic tone."
    ),
    (
        "human",
        "Analyze the following pet data:\n"
        "- Species: {species}\n"
        "- Breed: {breed}\n"
        "- Detected Emotion: {emotion} (Confidence: {confidence})\n\n"
        "Provide a structured report covering 3 areas based on "
        "the specific traits of '{breed}' and its current emotion:\n\n"
        "1. 🩺 Healthcare (สุขภาพกาย): Common health issues for this breed "
        "and signs to watch for based on the detected emotion. (2-3 sentences)\n\n"
        "2. 🎾 Lifestyle (กิจกรรม): Suitable activities for this specific breed "
        "in this mood. (2-3 sentences)\n\n"
        "3. ⚠️ Safety (ข้อควรระวัง): Toy recommendations and specific safety "
        "warnings for this breed. (2-3 sentences)\n\n"
        "Constraint:\n"
        "- Be specific to '{breed}'. Do not give generic advice.\n"
        "- Use emoji headers as shown above."
    ),
])

# LangChain Chain: Prompt → LLM → Output Parser
vet_chain = None
if LLM_READY:
    vet_chain = vet_prompt | llm | StrOutputParser()
    print("[OK] LangChain Vet Advisor chain created")


def get_vet_advice(species: str, breed: str, emotion: str, confidence: float) -> str:
    """Step 3: Use LangChain chain for AI veterinary advice."""
    if not LLM_READY or vet_chain is None:
        return _fallback_advice(emotion, species, breed)
    try:
        result = vet_chain.invoke({
            "species": species,
            "breed": breed,
            "emotion": emotion,
            "confidence": f"{confidence:.0%}",
        })
        return result
    except Exception as e:
        print(f"[WARN] Vet chain failed: {e}")
        return _fallback_advice(emotion, species, breed)


def _fallback_advice(emotion: str, species="Unknown", breed="Unknown") -> str:
    s = species if species != "Unknown" else "สัตว์เลี้ยง"
    b = breed   if breed   != "Unknown" else "ของคุณ"
    advice = {
        "happy": f"🏥 รายงานสุขภาพ {s} สายพันธุ์ {b}\n\n🧠 อารมณ์: มีความสุข (Happy)\n\n🩺 1. สุขภาพกาย:\n{s}สายพันธุ์ {b} ที่มีความสุขมักแสดงออกผ่านการเคลื่อนไหวอย่างกระตือรือร้น ควรสังเกตท่าเดินและพฤติกรรมว่าปกติดี\n\n🎾 2. กิจกรรม:\nเป็นช่วงเวลาที่ดีสำหรับ {b} ในการออกกำลังกายและเล่นของที่ชื่นชอบ\n\n⚠️ 3. ข้อควรระวัง:\nระวังไม่ให้ตื่นเต้นมากเกินไป และหลีกเลี่ยงให้อาหารทันทีหลังออกกำลังกายหนัก",
        "sad":   f"🏥 รายงานสุขภาพ {s} สายพันธุ์ {b}\n\n🧠 อารมณ์: เศร้า (Sad)\n\n🩺 1. สุขภาพกาย:\n{s}สายพันธุ์ {b} ที่มีอาการเศร้า ควรสังเกตการกินอาหาร การดื่มน้ำ และพฤติกรรมผิดปกติ\n\n🎾 2. กิจกรรม:\nให้ความสนใจ {b} มากขึ้น ชวนเล่นเบาๆ หรือพาไปเดินเล่นในที่ที่คุ้นเคย\n\n⚠️ 3. ข้อควรระวัง:\nหากอาการซึมเศร้าของ {b} ยาวนานกว่า 2-3 วัน ควรพาไปพบสัตวแพทย์",
        "angry": f"🏥 รายงานสุขภาพ {s} สายพันธุ์ {b}\n\n🧠 อารมณ์: หงุดหงิด/โกรธ (Angry)\n\n🩺 1. สุขภาพกาย:\n{s}สายพันธุ์ {b} ที่แสดงอาการหงุดหงิด อาจมาจากความเจ็บปวดหรือความเครียด ควรตรวจสอบร่างกายว่ามีบาดแผลหรือไม่\n\n🎾 2. กิจกรรม:\nให้พื้นที่ส่วนตัวแก่ {b} รอจนอารมณ์สงบแล้วค่อยเข้าหาอย่างนุ่มนวล\n\n⚠️ 3. ข้อควรระวัง:\nระวังการถูกกัดหรือข่วน ไม่ควรเข้าใกล้ใบหน้า {b} เมื่ออารมณ์ไม่ดี",
        "other": f"🏥 รายงานสุขภาพ {s} สายพันธุ์ {b}\n\n🧠 อารมณ์: ปกติ/ไม่ระบุ (Other)\n\n🩺 1. สุขภาพกาย:\n{s}สายพันธุ์ {b} ดูมีอารมณ์ปกติ ควรตรวจสุขภาพประจำปีตามกำหนด\n\n🎾 2. กิจกรรม:\nกิจกรรมตามปกติที่ {b} ชื่นชอบ เช่น เดินเล่น เล่นของเล่น\n\n⚠️ 3. ข้อควรระวัง:\nสังเกตพฤติกรรมที่ผิดปกติอย่างสม่ำเสมอ",
    }
    return advice.get(emotion.lower(), advice["other"])


# ═══════════════════════════════════════════════════════════════════════
# STEP 4: LangGraph — Pipeline Orchestration
# ═══════════════════════════════════════════════════════════════════════

class PipelineState(TypedDict):
    """State that flows through the LangGraph pipeline."""
    image: Optional[Image.Image]
    image_base64: str
    # Step 1 outputs
    emotion: str
    emotion_confidence: float
    emotion_scores: dict
    # Step 2 outputs
    species: str
    breed: str
    breed_info: dict
    # Step 3 outputs
    advice: str
    # Metadata
    elapsed_ms: int


def emotion_node(state: PipelineState) -> dict:
    """LangGraph Node 1: CNN Emotion Detection"""
    emotion, confidence, scores = predict_emotion(state["image"])
    return {
        "emotion": emotion,
        "emotion_confidence": confidence,
        "emotion_scores": scores,
    }


def breed_node(state: PipelineState) -> dict:
    """LangGraph Node 2: LangChain Breed Identification (Zero-shot)"""
    breed_info = identify_breed(state["image"])
    return {
        "species": breed_info.get("species", "Unknown"),
        "breed": breed_info.get("breed", "Unknown"),
        "breed_info": breed_info,
    }


def advisor_node(state: PipelineState) -> dict:
    """LangGraph Node 3: LangChain Veterinary Advisor (Persona Prompting)"""
    advice = get_vet_advice(
        state["species"],
        state["breed"],
        state["emotion"],
        state["emotion_confidence"],
    )
    return {"advice": advice}


# Build LangGraph
workflow = StateGraph(PipelineState)

# Add nodes
workflow.add_node("emotion_detector", emotion_node)
workflow.add_node("breed_identifier", breed_node)
workflow.add_node("vet_advisor", advisor_node)

# Define edges: emotion → breed → advisor → END
workflow.set_entry_point("emotion_detector")
workflow.add_edge("emotion_detector", "breed_identifier")
workflow.add_edge("breed_identifier", "vet_advisor")
workflow.add_edge("vet_advisor", END)

# Compile the graph
analysis_pipeline = workflow.compile()
print("[OK] LangGraph pipeline compiled: emotion_detector -> breed_identifier -> vet_advisor -> END")


# ═══════════════════════════════════════════════════════════════════════
# FastAPI App
# ═══════════════════════════════════════════════════════════════════════
app = FastAPI(title="Pet Insight 360 API", version="5.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_ready": MODEL_READY,
        "llm_ready": LLM_READY,
        "langchain": "ChatOpenAI (GPT-4o)",
        "langgraph": "emotion → breed → advisor",
        "device": DEVICE,
        "gpu": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU",
    }


@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    """Run the full LangGraph pipeline on an uploaded pet image."""
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image")

    data = await file.read()
    if len(data) > 20 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 20 MB)")

    try:
        img_pil = Image.open(io.BytesIO(data)).convert("RGB")
    except Exception:
        raise HTTPException(400, "Cannot open image")

    t0 = time.time()

    # Encode thumbnail
    thumb = img_pil.copy()
    thumb.thumbnail((600, 600))
    buf = io.BytesIO()
    thumb.save(buf, format="JPEG", quality=85)
    img_b64 = base64.b64encode(buf.getvalue()).decode()

    # Run LangGraph Pipeline
    initial_state = {
        "image": img_pil,
        "image_base64": img_b64,
        "emotion": "",
        "emotion_confidence": 0.0,
        "emotion_scores": {},
        "species": "",
        "breed": "",
        "breed_info": {},
        "advice": "",
        "elapsed_ms": 0,
    }

    result = analysis_pipeline.invoke(initial_state)

    elapsed = round((time.time() - t0) * 1000)

    return {
        "success":      True,
        "emotion":      {
            "label": result["emotion"],
            "confidence": result["emotion_confidence"],
            "all_scores": result["emotion_scores"],
        },
        "breed":        result["breed_info"],
        "advice":       result["advice"],
        "image_base64": img_b64,
        "elapsed_ms":   elapsed,
        "pipeline":     "LangGraph: emotion_detector → breed_identifier → vet_advisor",
    }


@app.get("/")
def root():
    return {
        "message": "Pet Insight 360 API v5.0 — LangChain + LangGraph Edition",
        "docs": "/docs",
    }
