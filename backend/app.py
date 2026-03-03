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

# ─── MLflow ───────────────────────────────────────────────────────────
from mlflow_tracking import PetMLflow

# ─── Load .env ────────────────────────────────────────────────────────
load_dotenv()

# ─── Paths & Config ──────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent
WEIGHTS  = BASE_DIR / "weights" / "pet_emotion.pth"

EMOTIONS = ["angry", "happy", "other", "sad"]
IMG_SIZE = 224
DEVICE   = "cuda" if torch.cuda.is_available() else "cpu"

# ─── MLflow Tracker ──────────────────────────────────────────────────
try:
    mlflow_tracker = PetMLflow()
    MLFLOW_READY = True
    print("[OK] MLflow tracker initialized")
except Exception as e:
    mlflow_tracker = None
    MLFLOW_READY = False
    print(f"[WARN] MLflow init failed: {e}")

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
# STEP 2: ImageNet Universal Animal Classifier + LangChain Fallback
# ═══════════════════════════════════════════════════════════════════════

# Load a separate MobileNetV2 with ImageNet weights for species/breed classification
_imagenet_model = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.IMAGENET1K_V1).to(DEVICE)
_imagenet_model.eval()
_imagenet_labels = models.MobileNet_V2_Weights.IMAGENET1K_V1.meta["categories"]
print(f"[OK] ImageNet classifier loaded ({len(_imagenet_labels)} classes)")

# ─── ImageNet Animal Index Groups ────────────────────────────────────
_DOG_INDICES   = set(range(151, 269))   # 151-268 domestic dogs
_CAT_INDICES   = set(range(281, 286))   # 281-285 domestic cats
_WILD_CAT_IDX  = set(range(286, 294))   # 286-293 cougar,lynx,leopard,snow leopard,jaguar,lion,tiger,cheetah
_WOLF_FOX_IDX  = set(range(269, 281))   # 269-280 wolves,coyote,dingo,dhole,hunting dog,hyena,foxes
_BEAR_IDX      = set(range(294, 298))   # 294-297 bears
_FISH_IDX      = set(range(0, 7)) | set(range(389, 398)) # 0-6 fish + 389-397 more fish
_BIRD_IDX      = set(range(7, 25)) | set(range(80, 101)) | set(range(127, 147))  # various birds
_REPTILE_IDX   = set(range(25, 69))     # 25-68 salamanders,frogs,turtles,lizards,snakes
_INSECT_IDX    = set(range(300, 327))   # 300-326 beetles,flies,bees,butterflies
_SPIDER_IDX    = set(range(69, 80))     # 69-79 arachnids
_MARINE_IDX    = set(range(107, 127)) | {327, 328, 329}  # jellyfish,crabs,lobsters,starfish etc.
_PRIMATE_IDX   = set(range(365, 385))   # 365-384 apes,monkeys,lemurs
_RABBIT_IDX    = {330, 331, 332}        # rabbit, hare, Angora
_RODENT_IDX    = {333, 334, 335, 336, 337, 338}  # hamster,porcupine,squirrel,marmot,beaver,guinea pig
_HORSE_IDX     = {339}                  # sorrel (horse)
_FARM_IDX      = {340, 341, 342, 343, 344, 345, 346, 347, 348, 349, 350}  # zebra,hog,boar,ox,bison,ram
_WILD_HERB_IDX = {351, 352, 353, 354, 355}  # hartebeest,impala,gazelle,camel,llama
_WEASEL_IDX    = set(range(356, 365))   # weasel,mink,ferret,otter,skunk,badger,armadillo,sloth
_ELEPHANT_IDX  = {101, 385, 386}        # tusker, Indian/African elephant
_PANDA_IDX     = {387, 388}             # lesser panda, giant panda
_SEAL_IDX      = {147, 148, 149, 150}   # grey whale,killer whale,dugong,sea lion
_PENGUIN_IDX   = {145}
_MARSUPIAL_IDX = {102, 103, 104, 105, 106}  # echidna,platypus,wallaby,koala,wombat
_MONGOOSE_IDX  = {298, 299}             # mongoose, meerkat

# All known animal indices
_ALL_ANIMAL_INDICES = (
    _DOG_INDICES | _CAT_INDICES | _WILD_CAT_IDX | _WOLF_FOX_IDX | _BEAR_IDX |
    _FISH_IDX | _BIRD_IDX | _REPTILE_IDX | _INSECT_IDX | _SPIDER_IDX |
    _MARINE_IDX | _PRIMATE_IDX | _RABBIT_IDX | _RODENT_IDX | _HORSE_IDX |
    _FARM_IDX | _WILD_HERB_IDX | _WEASEL_IDX | _ELEPHANT_IDX | _PANDA_IDX |
    _SEAL_IDX | _PENGUIN_IDX | _MARSUPIAL_IDX | _MONGOOSE_IDX
)

def _get_animal_group(idx: int) -> str:
    """Return the species group name for an ImageNet index."""
    if idx in _DOG_INDICES:    return "Dog (สุนัข)"
    if idx in _CAT_INDICES:    return "Cat (แมว)"
    if idx in _WILD_CAT_IDX:   return "Wild Cat (แมวป่า/เสือ)"
    if idx in _WOLF_FOX_IDX:   return "Wild Canine (สุนัขป่า/จิ้งจอก)"
    if idx in _BEAR_IDX:       return "Bear (หมี)"
    if idx in _FISH_IDX:       return "Fish (ปลา)"
    if idx in _BIRD_IDX:       return "Bird (นก)"
    if idx in _REPTILE_IDX:
        if idx in range(25, 30):  return "Amphibian (สัตว์สะเทินน้ำสะเทินบก)"
        if idx in range(30, 33):  return "Frog (กบ)"
        if idx in range(33, 38):  return "Turtle (เต่า)"
        if idx in range(38, 49):  return "Lizard (กิ้งก่า/จิ้งเหลน)"
        return "Snake (งู)"
    if idx in _INSECT_IDX:
        if idx in range(321, 327): return "Butterfly (ผีเสื้อ)"
        return "Insect (แมลง)"
    if idx in _SPIDER_IDX:     return "Arachnid (แมงมุม/แมงป่อง)"
    if idx in _MARINE_IDX:     return "Marine Animal (สัตว์ทะเล)"
    if idx in _PRIMATE_IDX:    return "Primate (ลิง/วานร)"
    if idx in _RABBIT_IDX:     return "Rabbit (กระต่าย)"
    if idx in _RODENT_IDX:     return "Rodent (สัตว์ฟันแทะ)"
    if idx in _HORSE_IDX:      return "Horse (ม้า)"
    if idx in _FARM_IDX:       return "Farm/Wild Herbivore (สัตว์กินพืช)"
    if idx in _WILD_HERB_IDX:  return "Wild Herbivore (สัตว์กินพืชป่า)"
    if idx in _WEASEL_IDX:     return "Small Mammal (สัตว์เลี้ยงลูกด้วยนมขนาดเล็ก)"
    if idx in _ELEPHANT_IDX:   return "Elephant (ช้าง)"
    if idx in _PANDA_IDX:      return "Panda (แพนด้า)"
    if idx in _SEAL_IDX:       return "Marine Mammal (สัตว์เลี้ยงลูกด้วยนมทะเล)"
    if idx in _PENGUIN_IDX:    return "Penguin (เพนกวิน)"
    if idx in _MARSUPIAL_IDX:  return "Marsupial (สัตว์มีกระเป๋าหน้าท้อง)"
    if idx in _MONGOOSE_IDX:   return "Mongoose (พังพอน)"
    return "Animal (สัตว์)"


# ─── Thai translations: label → (species, breed, traits) ─────────────
_BREED_TH = {
    # ── Domestic Cats ──
    "tabby": ("Cat (แมว)", "Tabby (แมวลายสลิด)", "ขนลายทาง กระฉับกระเฉง ฉลาด ชอบล่าเหยื่อ เป็นมิตรกับคน"),
    "tiger cat": ("Cat (แมว)", "Tiger Cat (แมวลายเสือ)", "ขนลายเสือ กระฉับกระเฉง ฉลาด ว่องไว ชอบสำรวจ"),
    "Persian cat": ("Cat (แมว)", "Persian (แมวเปอร์เซีย)", "ขนยาวหนานุ่ม หน้าแบน นิสัยเรียบร้อย สงบ ชอบนอน"),
    "Siamese cat": ("Cat (แมว)", "Siamese (แมวสยาม/วิเชียรมาศ)", "ขนสั้นสีอ่อนปลายเข้ม ฉลาดมาก ช่างพูด ร้องเสียงดัง ผูกพันเจ้าของ"),
    "Egyptian cat": ("Cat (แมว)", "Egyptian Mau (แมวอียิปต์)", "ขนลายจุด ว่องไวที่สุดในแมวบ้าน สง่างาม"),

    # ── Wild Cats ──
    "cougar": ("Wild Cat (แมวป่า/เสือ)", "Cougar / Puma (สิงโตภูเขา)", "แมวป่าขนาดใหญ่ ว่องไว แข็งแรง ล่าเหยื่อเก่ง พบในทวีปอเมริกา"),
    "lynx": ("Wild Cat (แมวป่า/เสือ)", "Lynx (ลิงซ์)", "แมวป่าขนาดกลาง หูมีพู่ หางสั้น ชอบอากาศหนาว ล่าเหยื่อในป่า"),
    "leopard": ("Wild Cat (แมวป่า/เสือ)", "Leopard (เสือดาว)", "ขนลายจุดดอกดวง ปีนต้นไม้เก่ง แข็งแรง ว่องไว ล่าเหยื่อเวลากลางคืน"),
    "snow leopard": ("Wild Cat (แมวป่า/เสือ)", "Snow Leopard (เสือดาวหิมะ)", "ขนสีเทาขาวลายจุด หางยาว อาศัยในภูเขาสูง สัตว์หายาก ใกล้สูญพันธุ์"),
    "jaguar": ("Wild Cat (แมวป่า/เสือ)", "Jaguar (จากัวร์)", "แมวป่าขนาดใหญ่ที่สุดในทวีปอเมริกา ลายจุดรูปดอกกุหลาบ กัดแรงมาก ว่ายน้ำเก่ง"),
    "lion": ("Wild Cat (แมวป่า/เสือ)", "Lion (สิงโต)", "ราชาแห่งสัตว์ป่า ตัวผู้มีแผงคอ อยู่เป็นฝูง ล่าเหยื่อร่วมกัน พบในแอฟริกา"),
    "tiger": ("Wild Cat (แมวป่า/เสือ)", "Tiger (เสือโคร่ง)", "แมวป่าที่ใหญ่ที่สุด ขนลายทาง แข็งแรง ว่ายน้ำเก่ง สัตว์ใกล้สูญพันธุ์"),
    "cheetah": ("Wild Cat (แมวป่า/เสือ)", "Cheetah (เสือชีตาห์)", "สัตว์ที่วิ่งเร็วที่สุดในโลก ลายจุดกลม ตัวเพรียว มีรอยน้ำตาสีดำ"),

    # ── Dogs (common breeds) ──
    "golden retriever": ("Dog (สุนัข)", "Golden Retriever (โกลเด้น รีทรีฟเวอร์)", "ขนยาวสีทอง นิสัยเป็นมิตร ฉลาด ซื่อสัตย์ ชอบเล่นน้ำ เหมาะเป็นสุนัขครอบครัว"),
    "Labrador retriever": ("Dog (สุนัข)", "Labrador Retriever (ลาบราดอร์ รีทรีฟเวอร์)", "ขนสั้นหนา สีดำ/น้ำตาล/เหลือง เป็นมิตร ฉลาด ชอบเล่นน้ำ เทรนง่าย"),
    "German shepherd": ("Dog (สุนัข)", "German Shepherd (เยอรมัน เชพเพิร์ด)", "ขนหนาสีน้ำตาลดำ ฉลาดมาก กล้าหาญ ซื่อสัตย์ เหมาะเป็นสุนัขอารักขา"),
    "Chihuahua": ("Dog (สุนัข)", "Chihuahua (ชิวาวา)", "ตัวเล็กที่สุดในโลก กล้าหาญ ซื่อสัตย์ ช่างเห่า หวงเจ้าของ"),
    "Shih-Tzu": ("Dog (สุนัข)", "Shih Tzu (ชิห์สุ)", "ขนยาวสวย หน้าแบน นิสัยร่าเริง เป็นมิตร ชอบอยู่กับคน"),
    "Pomeranian": ("Dog (สุนัข)", "Pomeranian (ปอมเมอเรเนียน)", "ขนฟูหนา ตัวเล็ก ร่าเริง กล้าหาญ ชอบเห่า ผูกพันเจ้าของ"),
    "Pembroke": ("Dog (สุนัข)", "Pembroke Welsh Corgi (คอร์กี้)", "ขาสั้น ตัวยาว หูตั้งใหญ่ ร่าเริง ฉลาด ชอบวิ่งเล่น"),
    "French bulldog": ("Dog (สุนัข)", "French Bulldog (เฟรนช์ บูลด็อก)", "ตัวล่ำ หูค้างคาว หน้าแบน นิสัยร่าเริง สงบ เหมาะอยู่คอนโด"),
    "pug": ("Dog (สุนัข)", "Pug (ปั๊ก)", "หน้าย่น ตาโต นิสัยร่าเริง ตลก ชอบนอน เหมาะเลี้ยงในบ้าน"),
    "Rottweiler": ("Dog (สุนัข)", "Rottweiler (ร็อตไวเลอร์)", "ตัวใหญ่ กล้ามแน่น ซื่อสัตย์ ปกป้องครอบครัว ต้องเทรนตั้งแต่เล็ก"),
    "Doberman": ("Dog (สุนัข)", "Doberman (โดเบอร์แมน)", "ตัวสูงเพรียว ฉลาด กล้าหาญ ซื่อสัตย์ เหมาะเป็นสุนัขอารักขา"),
    "beagle": ("Dog (สุนัข)", "Beagle (บีเกิ้ล)", "หูยาว จมูกดี ร่าเริง ชอบสำรวจ เสียงร้องดัง เป็นมิตร"),
    "boxer": ("Dog (สุนัข)", "Boxer (บ็อกเซอร์)", "ตัวล่ำ กล้ามเป็นมัด ร่าเริง ขี้เล่น ซื่อสัตย์ เหมาะกับครอบครัว"),
    "Siberian husky": ("Dog (สุนัข)", "Siberian Husky (ไซบีเรียน ฮัสกี้)", "ขนหนา ตาสีฟ้า ร่าเริง ชอบวิ่ง ทนหนาว ต้องออกกำลังกายมาก"),
    "Yorkshire terrier": ("Dog (สุนัข)", "Yorkshire Terrier (ยอร์คเชียร์ เทอร์เรีย)", "ขนยาวเป็นเงา ตัวเล็ก กล้าหาญ ช่างเห่า ผูกพันเจ้าของ"),
    "cocker spaniel": ("Dog (สุนัข)", "Cocker Spaniel (ค็อกเกอร์ สแปเนียล)", "หูยาว ขนหยักสวย ร่าเริง เป็นมิตร ชอบเล่นกับเด็ก"),
    "Border collie": ("Dog (สุนัข)", "Border Collie (บอร์เดอร์ คอลลี่)", "ฉลาดที่สุดในสุนัข ขนยาว กระฉับกระเฉง ชอบทำงาน ต้องออกกำลังกายมาก"),
    "Maltese dog": ("Dog (สุนัข)", "Maltese (มอลทีส)", "ขนยาวสีขาว ตัวเล็ก อ่อนโยน ร่าเริง เหมาะอยู่ในบ้าน"),
    "Samoyed": ("Dog (สุนัข)", "Samoyed (ซามอยด์)", "ขนขาวฟู ยิ้มตลอด ร่าเริง เป็นมิตร ทนหนาว ขนร่วงเยอะ"),
    "Great Dane": ("Dog (สุนัข)", "Great Dane (เกรท เดน)", "ตัวใหญ่มาก นิสัยอ่อนโยน ใจดี สงบ เหมือนยักษ์ใจดี"),
    "dalmatian": ("Dog (สุนัข)", "Dalmatian (ดัลเมเชียน)", "ขนขาวลายจุดดำ ร่าเริง ว่องไว ชอบวิ่ง ต้องออกกำลังกายมาก"),
    "bull mastiff": ("Dog (สุนัข)", "Bullmastiff (บูลมาสตีฟ)", "ตัวใหญ่ กล้ามแน่น สงบ ซื่อสัตย์ ปกป้องครอบครัว"),
    "chow": ("Dog (สุนัข)", "Chow Chow (เชาเชา)", "ขนฟูหนา ลิ้นสีม่วง ตัวใหญ่ ซื่อสัตย์ หวงเจ้าของ"),
    "toy poodle": ("Dog (สุนัข)", "Toy Poodle (ทอย พูเดิ้ล)", "ขนหยิก ตัวเล็กมาก ฉลาด ร่าเริง เหมาะอยู่คอนโด"),
    "miniature poodle": ("Dog (สุนัข)", "Miniature Poodle (มินิเอเจอร์ พูเดิ้ล)", "ขนหยิกหนา ตัวเล็กกว่าพูเดิ้ลมาตรฐาน ร่าเริง ฉลาด ชอบเรียนรู้"),
    "standard poodle": ("Dog (สุนัข)", "Standard Poodle (สแตนดาร์ด พูเดิ้ล)", "ขนหยิกหนา ตัวใหญ่ ฉลาดมาก สง่างาม ว่ายน้ำเก่ง"),
    "Bernese mountain dog": ("Dog (สุนัข)", "Bernese Mountain Dog (เบอร์นีส เมาท์เท่น ด็อก)", "ขนยาวสามสี ตัวใหญ่ อ่อนโยน ซื่อสัตย์ ชอบอากาศเย็น"),
    "Saint Bernard": ("Dog (สุนัข)", "Saint Bernard (เซนต์เบอร์นาร์ด)", "ตัวใหญ่มาก อ่อนโยน ใจดี ลากเลื่อนช่วยคนบนภูเขาหิมะ"),
    "Tibetan mastiff": ("Dog (สุนัข)", "Tibetan Mastiff (ทิเบตัน มาสตีฟ)", "ตัวใหญ่ขนฟูหนา กล้าหาญ ปกป้องครอบครัว สุนัขเฝ้าบ้านโบราณ"),
    "basset": ("Dog (สุนัข)", "Basset Hound (บาสเซ็ท ฮาวนด์)", "หูยาว ตาเศร้า จมูกดีมาก สงบ ดื้อเล็กน้อย ชอบตามกลิ่น"),

    # ── Wolves, Foxes, Wild Canines ──
    "timber wolf": ("Wild Canine (สุนัขป่า/จิ้งจอก)", "Timber Wolf / Grey Wolf (หมาป่าสีเทา)", "หมาป่าขนาดใหญ่ อยู่เป็นฝูง ฉลาดมาก สื่อสารด้วยเสียงหอน"),
    "white wolf": ("Wild Canine (สุนัขป่า/จิ้งจอก)", "Arctic Wolf (หมาป่าอาร์กติก)", "หมาป่าขนขาว ทนหนาวจัด อยู่ในอาร์กติก ล่าเหยื่อเป็นฝูง"),
    "red wolf": ("Wild Canine (สุนัขป่า/จิ้งจอก)", "Red Wolf (หมาป่าแดง)", "หมาป่าสีน้ำตาลแดง ใกล้สูญพันธุ์ พบในอเมริกาเหนือ"),
    "coyote": ("Wild Canine (สุนัขป่า/จิ้งจอก)", "Coyote (โคโยตี้)", "สุนัขป่าขนาดกลาง ฉลาด ปรับตัวเก่ง หากินได้ทุกอย่าง"),
    "dingo": ("Wild Canine (สุนัขป่า/จิ้งจอก)", "Dingo (ดิงโก้)", "สุนัขป่าออสเตรเลีย ฉลาด อิสระ ขนสั้นสีน้ำตาลทอง"),
    "red fox": ("Wild Canine (สุนัขป่า/จิ้งจอก)", "Red Fox (จิ้งจอกแดง)", "สัตว์ฉลาดแกมโกง ขนสีส้มแดง หางฟู ปรับตัวเก่ง"),
    "Arctic fox": ("Wild Canine (สุนัขป่า/จิ้งจอก)", "Arctic Fox (จิ้งจอกอาร์กติก)", "ขนเปลี่ยนสีตามฤดูกาล ขาวในหน้าหนาว น้ำตาลในหน้าร้อน ทนหนาวจัด"),
    "grey fox": ("Wild Canine (สุนัขป่า/จิ้งจอก)", "Grey Fox (จิ้งจอกเทา)", "จิ้งจอกปีนต้นไม้ได้ ขนสีเทา หากินกลางคืน"),
    "hyena": ("Wild Canine (สุนัขป่า/จิ้งจอก)", "Hyena (ไฮยีน่า)", "สัตว์นักล่าและซากอาหาร กรามแข็งแรงมาก อยู่เป็นฝูง หัวเราะเสียงดัง"),

    # ── Bears ──
    "brown bear": ("Bear (หมี)", "Brown Bear (หมีสีน้ำตาล)", "หมีขนาดใหญ่ แข็งแรงมาก กินทั้งพืชและสัตว์ จำศีลในฤดูหนาว"),
    "American black bear": ("Bear (หมี)", "American Black Bear (หมีดำอเมริกัน)", "หมีขนดำ ปีนต้นไม้เก่ง กินทุกอย่าง พบมากที่สุดในอเมริกาเหนือ"),
    "ice bear": ("Bear (หมี)", "Polar Bear (หมีขั้วโลก)", "หมีขนขาว ตัวใหญ่ที่สุด ว่ายน้ำเก่ง ล่าแมวน้ำบนน้ำแข็ง สัตว์ใกล้สูญพันธุ์"),
    "sloth bear": ("Bear (หมี)", "Sloth Bear (หมีควาย)", "หมีขนดกรุงรัง ริมฝีปากยาว ดูดกินแมลง พบในเอเชียใต้"),

    # ── Birds ──
    "cock": ("Bird (นก)", "Rooster (ไก่ตัวผู้)", "ไก่ตัวผู้ หงอนแดง ขนสีสด ขันเสียงดัง เลี้ยงเป็นสัตว์เศรษฐกิจ"),
    "hen": ("Bird (นก)", "Hen (แม่ไก่)", "ไก่ตัวเมีย เลี้ยงเพื่อไข่และเนื้อ ดูแลลูกเก่ง"),
    "ostrich": ("Bird (นก)", "Ostrich (นกกระจอกเทศ)", "นกที่ใหญ่ที่สุด วิ่งเร็วมาก บินไม่ได้ ไข่ใหญ่ที่สุดในโลก"),
    "bald eagle": ("Bird (นก)", "Bald Eagle (นกอินทรีหัวขาว)", "นกนักล่าขนาดใหญ่ สัญลักษณ์ของอเมริกา ล่าปลาเก่ง"),
    "great grey owl": ("Bird (นก)", "Great Grey Owl (นกฮูกเทา)", "นกฮูกขนาดใหญ่ หน้ากลม ตาเหลือง ล่าเหยื่อในเวลากลางคืน หูดีมาก"),
    "peacock": ("Bird (นก)", "Peacock (นกยูง)", "นกที่สวยที่สุด หางยาวรำแพน ตัวผู้สีน้ำเงินเขียว สัญลักษณ์ของความสวยงาม"),
    "macaw": ("Bird (นก)", "Macaw (นกมาคอว์)", "นกแก้วขนาดใหญ่ สีสดใส ฉลาดมาก เลียนเสียงได้ อายุยืนมาก"),
    "toucan": ("Bird (นก)", "Toucan (นกทูแคน)", "จะงอยปากขนาดใหญ่สีสด อาศัยในป่าเขตร้อนอเมริกาใต้ กินผลไม้"),
    "flamingo": ("Bird (นก)", "Flamingo (นกฟลามิงโก้)", "นกขายาวสีชมพู ยืนขาเดียว อาศัยเป็นฝูง สีชมพูมาจากอาหาร"),
    "king penguin": ("Penguin (เพนกวิน)", "King Penguin (เพนกวินราชา)", "เพนกวินขนาดใหญ่ ว่ายน้ำเก่ง ทนหนาว อาศัยในแอนตาร์กติกา"),
    "pelican": ("Bird (นก)", "Pelican (นกกระทุง)", "นกน้ำขนาดใหญ่ ถุงใต้ปากจุน้ำ ล่าปลาเป็นฝูง"),
    "hummingbird": ("Bird (นก)", "Hummingbird (นกฮัมมิ่งเบิร์ด)", "นกที่เล็กที่สุด กระพือปีกเร็วมาก บินอยู่กับที่ได้ ดูดน้ำหวานจากดอกไม้"),
    "goose": ("Bird (นก)", "Goose (ห่าน)", "นกน้ำขนาดใหญ่ เลี้ยงเป็นสัตว์เศรษฐกิจ เสียงดัง เฝ้าบ้านเก่ง"),
    "black swan": ("Bird (นก)", "Black Swan (หงส์ดำ)", "หงส์ขนดำ คอยาวสง่างาม พบในออสเตรเลีย สัญลักษณ์ของความงาม"),

    # ── Reptiles & Amphibians ──
    "common iguana": ("Lizard (กิ้งก่า/จิ้งเหลน)", "Green Iguana (อีกัวน่าเขียว)", "กิ้งก่าขนาดใหญ่ สีเขียว กินพืช นิยมเลี้ยงเป็นสัตว์เลี้ยง"),
    "Komodo dragon": ("Lizard (กิ้งก่า/จิ้งเหลน)", "Komodo Dragon (มังกรโคโมโด)", "กิ้งก่าที่ใหญ่ที่สุดในโลก น้ำลายมีแบคทีเรีย สัตว์หายาก พบในอินโดนีเซีย"),
    "African chameleon": ("Lizard (กิ้งก่า/จิ้งเหลน)", "Chameleon (กิ้งก่าเปลี่ยนสี)", "เปลี่ยนสีได้ ตาหมุนอิสระ ลิ้นยาว จับแมลงเก่ง"),
    "American chameleon": ("Lizard (กิ้งก่า/จิ้งเหลน)", "Anole (อะโนล)", "กิ้งก่าขนาดเล็ก เปลี่ยนสีได้ พบในอเมริกา"),
    "loggerhead": ("Turtle (เต่า)", "Loggerhead Sea Turtle (เต่าหัวค้อน)", "เต่าทะเลขนาดใหญ่ ว่ายทะเลข้ามมหาสมุทร สัตว์ใกล้สูญพันธุ์"),
    "leatherback turtle": ("Turtle (เต่า)", "Leatherback Turtle (เต่ามะเฟือง)", "เต่าทะเลที่ใหญ่ที่สุด กระดองหนังไม่มีเกล็ด ดำน้ำลึกมาก"),
    "box turtle": ("Turtle (เต่า)", "Box Turtle (เต่ากล่อง)", "เต่าบก หลบเข้ากระดองได้มิด อายุยืนถึง 100 ปี นิยมเลี้ยง"),
    "axolotl": ("Amphibian (สัตว์สะเทินน้ำสะเทินบก)", "Axolotl (แอกโซลอเติล)", "ซาลาแมนเดอร์เม็กซิโก เหงือกภายนอก งอกอวัยวะใหม่ได้ นิยมเลี้ยงเป็นสัตว์เลี้ยง"),
    "bullfrog": ("Frog (กบ)", "Bullfrog (กบบูลฟร็อก)", "กบขนาดใหญ่ เสียงร้องดังก้อง กระโดดเก่ง กินได้ทุกอย่างที่เข้าปาก"),
    "tree frog": ("Frog (กบ)", "Tree Frog (กบต้นไม้)", "กบตัวเล็ก สีสดใส อาศัยบนต้นไม้ นิ้วมีแผ่นดูด ปีนป่ายเก่ง"),
    "boa constrictor": ("Snake (งู)", "Boa Constrictor (งูเหลือมบัว)", "งูขนาดใหญ่ รัดเหยื่อ ลายสวย นิยมเลี้ยง ไม่มีพิษ"),
    "king snake": ("Snake (งู)", "King Snake (งูคิงสเนค)", "งูไม่มีพิษ กินงูพิษเป็นอาหาร ลายสีสด นิยมเลี้ยง"),
    "Indian cobra": ("Snake (งู)", "Indian Cobra (งูเห่าอินเดีย)", "งูพิษร้ายแรง แผ่แม่เบี้ย สัญลักษณ์ในวัฒนธรรมอินเดีย อันตราย"),

    # ── Fish ──
    "goldfish": ("Fish (ปลา)", "Goldfish (ปลาทอง)", "ปลาสวยงาม สีส้มทอง เลี้ยงง่าย นิยมเลี้ยงในตู้ปลาและบ่อ"),
    "great white shark": ("Fish (ปลา)", "Great White Shark (ฉลามขาว)", "ฉลามนักล่าขนาดใหญ่ ฟันคม ว่ายเร็ว อยู่ในทะเลเปิด"),
    "clown fish": ("Fish (ปลา)", "Clownfish (ปลาการ์ตูน)", "ปลาสีส้ม-ขาว อาศัยในดอกไม้ทะเล มีสารเมือกป้องกันพิษ"),
    "lionfish": ("Fish (ปลา)", "Lionfish (ปลาสิงโต)", "ปลาสีสดลายทาง ครีบยาวสวย มีพิษ พบในแนวปะการัง"),
    "stingray": ("Fish (ปลา)", "Stingray (ปลากระเบน)", "ปลากระดูกอ่อน ลำตัวแบน หางมีเหล็กในพิษ อาศัยตามท้องทะเล"),
    "anemone fish": ("Fish (ปลา)", "Clownfish/Anemonefish (ปลาการ์ตูน)", "ปลาสีสด อาศัยร่วมกับดอกไม้ทะเล มีชื่อเสียงจากภาพยนตร์ Finding Nemo"),
    "puffer": ("Fish (ปลา)", "Pufferfish (ปลาปักเป้า)", "ปลาพองตัวเป็นลูกบอลเมื่อตกใจ มีพิษร้ายแรง บางชนิดเป็นอาหารราคาแพง"),

    # ── Marine Animals ──
    "jellyfish": ("Marine Animal (สัตว์ทะเล)", "Jellyfish (แมงกะพรุน)", "สัตว์ทะเลตัวใส มีหนวดพิษ ลอยตามกระแสน้ำ สวยแต่อันตราย"),
    "starfish": ("Marine Animal (สัตว์ทะเล)", "Starfish (ปลาดาว)", "สัตว์ทะเลรูปดาว 5 แฉก งอกแขนใหม่ได้ อาศัยตามแนวปะการัง"),
    "sea anemone": ("Marine Animal (สัตว์ทะเล)", "Sea Anemone (ดอกไม้ทะเล)", "สัตว์ทะเลคล้ายดอกไม้ มีหนวดพิษ อยู่ร่วมกับปลาการ์ตูน"),
    "hermit crab": ("Marine Animal (สัตว์ทะเล)", "Hermit Crab (ปูเสฉวน)", "ปูอาศัยในเปลือกหอย เปลี่ยนเปลือกเมื่อโตขึ้น นิยมเลี้ยง"),
    "Dungeness crab": ("Marine Animal (สัตว์ทะเล)", "Dungeness Crab (ปูดันเจเนส)", "ปูทะเลขนาดใหญ่ เนื้ออร่อย พบในแปซิฟิก"),
    "American lobster": ("Marine Animal (สัตว์ทะเล)", "American Lobster (ล็อบสเตอร์อเมริกัน)", "กุ้งมังกรขนาดใหญ่ ก้ามแข็งแรง เนื้อเหนียวหวาน อาหารราคาแพง"),

    # ── Marine Mammals ──
    "grey whale": ("Marine Mammal (สัตว์เลี้ยงลูกด้วยนมทะเล)", "Grey Whale (วาฬเทา)", "วาฬขนาดใหญ่ อพยพไกลที่สุดในโลก กินสัตว์หน้าดิน"),
    "killer whale": ("Marine Mammal (สัตว์เลี้ยงลูกด้วยนมทะเล)", "Killer Whale / Orca (วาฬเพชฌฆาต)", "ฉลาดมาก ล่าเหยื่อเป็นฝูง สีขาวดำ พบทุกมหาสมุทร"),
    "dugong": ("Marine Mammal (สัตว์เลี้ยงลูกด้วยนมทะเล)", "Dugong (พะยูน)", "สัตว์ทะเลหายาก กินหญ้าทะเล ว่ายช้า สัตว์ใกล้สูญพันธุ์ พบในอ่าวไทย"),
    "sea lion": ("Marine Mammal (สัตว์เลี้ยงลูกด้วยนมทะเล)", "Sea Lion (สิงโตทะเล)", "แมวน้ำหูนอก ว่ายเก่ง ฉลาด เทรนง่าย มักแสดงในสวนสัตว์"),

    # ── Primates ──
    "orangutan": ("Primate (ลิง/วานร)", "Orangutan (อุรังอุตัง)", "ลิงใหญ่ขนส้ม ฉลาดมาก ใช้เครื่องมือเป็น อาศัยบนต้นไม้ สัตว์ใกล้สูญพันธุ์"),
    "gorilla": ("Primate (ลิง/วานร)", "Gorilla (กอริลลา)", "ลิงที่ใหญ่ที่สุด แข็งแรงมาก อ่อนโยน อยู่เป็นครอบครัว สัตว์ใกล้สูญพันธุ์"),
    "chimpanzee": ("Primate (ลิง/วานร)", "Chimpanzee (ชิมแพนซี)", "ลิงที่ใกล้ชิดมนุษย์ที่สุด ฉลาดมาก ใช้เครื่องมือ แสดงอารมณ์ได้หลากหลาย"),
    "gibbon": ("Primate (ลิง/วานร)", "Gibbon (ชะนี)", "ลิงไม่มีหาง แขนยาว โหนต้นไม้เก่ง เสียงร้องดังไกล พบในเอเชียตะวันออกเฉียงใต้"),
    "baboon": ("Primate (ลิง/วานร)", "Baboon (ลิงบาบูน)", "ลิงขนาดใหญ่ หน้ายาว ฟันเขี้ยว อยู่เป็นฝูง พบในแอฟริกา"),
    "macaque": ("Primate (ลิง/วานร)", "Macaque (ลิงแสม/ลิงกัง)", "ลิงขนาดกลาง ปรับตัวเก่ง พบในเอเชีย ฉลาด อาศัยได้ทั้งในป่าและเมือง"),
    "spider monkey": ("Primate (ลิง/วานร)", "Spider Monkey (ลิงแมงมุม)", "ลิงแขนยาว หางจับกิ่งไม้ได้ โหนตัวเก่ง อาศัยในป่าเขตร้อนอเมริกา"),
    "capuchin": ("Primate (ลิง/วานร)", "Capuchin Monkey (ลิงคาปูชิน)", "ลิงขนาดเล็ก ฉลาดมาก ใช้เครื่องมือได้ มักเห็นในภาพยนตร์"),

    # ── Rabbits ──
    "wood rabbit": ("Rabbit (กระต่าย)", "Cottontail Rabbit (กระต่ายฝ้าย)", "กระต่ายป่า หางสั้นสีขาวคล้ายปุยฝ้าย กระโดดเก่ง กินหญ้าและผัก"),
    "hare": ("Rabbit (กระต่าย)", "Hare (กระต่ายป่า)", "กระต่ายป่าขนาดใหญ่ หูยาว วิ่งเร็วมาก ไม่ขุดรู เกิดมาตาเปิด"),
    "Angora": ("Rabbit (กระต่าย)", "Angora Rabbit (กระต่ายแองโกร่า)", "กระต่ายขนยาวฟู นุ่มมาก เลี้ยงเพื่อเก็บขน นิยมเป็นสัตว์เลี้ยง"),

    # ── Rodents ──
    "hamster": ("Rodent (สัตว์ฟันแทะ)", "Hamster (แฮมสเตอร์)", "สัตว์เลี้ยงตัวเล็ก กระพุ้งแก้มใหญ่ ออกหากินกลางคืน น่ารัก เลี้ยงง่าย"),
    "guinea pig": ("Rodent (สัตว์ฟันแทะ)", "Guinea Pig (หนูตะเภา)", "สัตว์เลี้ยงตัวอ้วน ไม่มีหาง เสียงร้องเซี้ยว นิสัยเรียบร้อย ชอบอยู่เป็นคู่"),
    "fox squirrel": ("Rodent (สัตว์ฟันแทะ)", "Fox Squirrel (กระรอกจิ้งจอก)", "กระรอกขนาดใหญ่ ขนสีน้ำตาลแดง เก็บลูกโอ๊กสะสมอาหาร ปีนต้นไม้เก่ง"),
    "beaver": ("Rodent (สัตว์ฟันแทะ)", "Beaver (บีเวอร์)", "สัตว์ฟันแทะขนาดใหญ่ สร้างเขื่อนกั้นลำธาร หางแบน ว่ายน้ำเก่ง"),
    "porcupine": ("Rodent (สัตว์ฟันแทะ)", "Porcupine (เม่น)", "สัตว์ฟันแทะมีขนเป็นหนามแหลม ป้องกันตัวจากสัตว์นักล่า หากินกลางคืน"),

    # ── Elephants ──
    "tusker": ("Elephant (ช้าง)", "Tusker Elephant (ช้างงา)", "ช้างตัวผู้งายาว สง่างาม แข็งแรง เป็นสัตว์คุ้มครอง"),
    "Indian elephant": ("Elephant (ช้าง)", "Asian Elephant (ช้างเอเชีย)", "ช้างเอเชีย หูเล็กกว่าช้างแอฟริกา ฉลาด เชื่อง เป็นสัตว์สัญลักษณ์ของไทย"),
    "African elephant": ("Elephant (ช้าง)", "African Elephant (ช้างแอฟริกา)", "ช้างขนาดใหญ่ที่สุดบนบก หูใหญ่ งายาว อยู่เป็นฝูง"),

    # ── Pandas ──
    "lesser panda": ("Panda (แพนด้า)", "Red Panda (แพนด้าแดง)", "สัตว์ขนาดเล็กสีน้ำตาลแดง หางลายปล้อง น่ารักมาก ใกล้สูญพันธุ์ พบในเทือกเขาหิมาลัย"),
    "giant panda": ("Panda (แพนด้า)", "Giant Panda (แพนด้ายักษ์)", "หมีขาวดำ กินไผ่เป็นหลัก น่ารักมาก สัตว์ใกล้สูญพันธุ์ สัญลักษณ์การอนุรักษ์"),

    # ── Marsupials ──
    "koala": ("Marsupial (สัตว์มีกระเป๋าหน้าท้อง)", "Koala (โคอาล่า)", "สัตว์มีกระเป๋าหน้าท้อง กินใบยูคาลิปตัส นอนวันละ 20 ชม. น่ารักมาก พบในออสเตรเลีย"),
    "wallaby": ("Marsupial (สัตว์มีกระเป๋าหน้าท้อง)", "Wallaby (วอลลาบี)", "จิงโจ้ขนาดเล็ก กระโดดเก่ง มีกระเป๋าหน้าท้อง พบในออสเตรเลีย"),
    "wombat": ("Marsupial (สัตว์มีกระเป๋าหน้าท้อง)", "Wombat (วอมแบต)", "สัตว์ขุดรู ตัวล่ำ อุจจาระเป็นลูกเต๋า พบในออสเตรเลีย"),
    "platypus": ("Marsupial (สัตว์มีกระเป๋าหน้าท้อง)", "Platypus (ตุ่นปากเป็ด)", "สัตว์เลี้ยงลูกด้วยนมที่ออกไข่ ปากแบนเหมือนเป็ด มีพิษที่เดือย พบในออสเตรเลีย"),

    # ── Farm / Large Herbivores ──
    "sorrel": ("Horse (ม้า)", "Sorrel Horse (ม้าสีน้ำตาลแดง)", "ม้าขนสีน้ำตาลแดง แข็งแรง ซื่อสัตย์ ใช้ขี่และทำงาน"),
    "zebra": ("Farm/Wild Herbivore (สัตว์กินพืช)", "Zebra (ม้าลาย)", "ม้าป่าลายขาวดำ ทุกตัวมีลายไม่ซ้ำกัน อยู่เป็นฝูง วิ่งเร็ว พบในแอฟริกา"),
    "hippopotamus": ("Farm/Wild Herbivore (สัตว์กินพืช)", "Hippopotamus (ฮิปโป)", "สัตว์อ้วนใหญ่อยู่ในน้ำ ปากอ้ากว้างมาก อันตราย แรงกัดสูง"),
    "Arabian camel": ("Wild Herbivore (สัตว์กินพืชป่า)", "Camel (อูฐ)", "อูฐหนอกเดียว ทนร้อนทนแล้ง เดินทะเลทรายได้หลายวันโดยไม่ดื่มน้ำ"),
    "llama": ("Wild Herbivore (สัตว์กินพืชป่า)", "Llama (ลามะ)", "สัตว์คล้ายอูฐไม่มีหนอก ขนยาวนุ่ม ถ่มน้ำลายเมื่อโกรธ พบในอเมริกาใต้"),
    "bison": ("Farm/Wild Herbivore (สัตว์กินพืช)", "Bison (วัวกระทิง)", "สัตว์ขนาดใหญ่ ขนหนาฟู อยู่เป็นฝูง สัญลักษณ์ของที่ราบอเมริกา"),
    "ram": ("Farm/Wild Herbivore (สัตว์กินพืช)", "Ram (แกะตัวผู้)", "แกะตัวผู้มีเขาโค้ง ขนหนาฟู เลี้ยงเป็นสัตว์เศรษฐกิจ"),
    "water buffalo": ("Farm/Wild Herbivore (สัตว์กินพืช)", "Water Buffalo (ควาย)", "ควายน้ำ ตัวใหญ่ เขายาวโค้ง ชอบแช่น้ำ ใช้งานนา สัตว์คู่บ้านในไทย"),

    # ── Small Mammals / Weasels ──
    "otter": ("Small Mammal (สัตว์เลี้ยงลูกด้วยนมขนาดเล็ก)", "Otter (นากน้ำ)", "สัตว์น่ารัก ว่ายน้ำเก่ง ฉลาด ขี้เล่น ชอบอยู่เป็นครอบครัว"),
    "weasel": ("Small Mammal (สัตว์เลี้ยงลูกด้วยนมขนาดเล็ก)", "Weasel (วีเซิล)", "สัตว์ตัวเล็กยาว ว่องไว ล่าเหยื่อเก่ง ขนเปลี่ยนสีตามฤดู"),
    "mink": ("Small Mammal (สัตว์เลี้ยงลูกด้วยนมขนาดเล็ก)", "Mink (มิงค์)", "สัตว์ขนนุ่มมาก ว่ายน้ำเก่ง เลี้ยงเพื่อเก็บขนทำเสื้อ"),
    "black-footed ferret": ("Small Mammal (สัตว์เลี้ยงลูกด้วยนมขนาดเล็ก)", "Ferret (เฟอร์เรท)", "สัตว์เลี้ยงตัวยาว ขี้เล่น ซุกซน ชอบมุด ผูกพันเจ้าของ"),
    "skunk": ("Small Mammal (สัตว์เลี้ยงลูกด้วยนมขนาดเล็ก)", "Skunk (สกั้งค์)", "สัตว์ลายขาวดำ ปล่อยกลิ่นเหม็นป้องกันตัว ห้ามเข้าใกล้เมื่อตกใจ"),
    "armadillo": ("Small Mammal (สัตว์เลี้ยงลูกด้วยนมขนาดเล็ก)", "Armadillo (อาร์มาดิลโล)", "สัตว์มีเกราะแข็งหุ้มตัว ม้วนตัวเป็นลูกบอลป้องกันตัว ขุดดินเก่ง"),
    "three-toed sloth": ("Small Mammal (สัตว์เลี้ยงลูกด้วยนมขนาดเล็ก)", "Sloth (สลอธ)", "สัตว์เชื่องช้าที่สุดในโลก ห้อยหัวบนต้นไม้ น่ารัก มีตะไคร่เกาะขน"),

    # ── Mongoose ──
    "mongoose": ("Mongoose (พังพอน)", "Mongoose (พังพอน)", "สัตว์ตัวยาว ว่องไว ล่าเหยื่อเก่ง สู้งูเห่าได้ ปราดเปรียว"),
    "meerkat": ("Mongoose (พังพอน)", "Meerkat (เมียร์แคท)", "สัตว์ยืนสองขา เฝ้าดูอันตราย อยู่เป็นฝูง น่ารัก พบในแอฟริกาใต้"),

    # ── Insects & Spiders ──
    "monarch": ("Butterfly (ผีเสื้อ)", "Monarch Butterfly (ผีเสื้อมอนาร์ค)", "ผีเสื้อสีส้มดำ อพยพไกลหลายพันกิโลเมตร สวยงาม เป็นสัญลักษณ์แห่งการเปลี่ยนแปลง"),
    "ladybug": ("Insect (แมลง)", "Ladybug (เต่าทอง)", "แมลงตัวเล็กสีแดงจุดดำ กินเพลี้ย เป็นแมลงมีประโยชน์ต่อการเกษตร"),
    "dragonfly": ("Insect (แมลง)", "Dragonfly (แมลงปอ)", "แมลงบินเร็ว ปีกใส ตาประกอบใหญ่ ล่าแมลงขนาดเล็ก พบใกล้แหล่งน้ำ"),
    "bee": ("Insect (แมลง)", "Bee (ผึ้ง)", "แมลงผสมเกสร สำคัญต่อระบบนิเวศ ผลิตน้ำผึ้ง อยู่เป็นรัง มีเหล็กใน"),
    "mantis": ("Insect (แมลง)", "Praying Mantis (ตั๊กแตนตำข้าว)", "แมลงนักล่า ท่าทางคล้ายสวดมนต์ ขาหน้าแข็งแรงจับเหยื่อ กินแมลงอื่น"),
    "grasshopper": ("Insect (แมลง)", "Grasshopper (ตั๊กแตน)", "แมลงกระโดดเก่ง ขาหลังแข็งแรง กินพืช บางชนิดเป็นอาหาร"),
    "scorpion": ("Arachnid (แมงมุม/แมงป่อง)", "Scorpion (แมงป่อง)", "สัตว์มี 8 ขา ก้ามใหญ่ หางมีพิษ หากินกลางคืน พบในเขตร้อน"),
    "tarantula": ("Arachnid (แมงมุม/แมงป่อง)", "Tarantula (แมงมุมทารันทูล่า)", "แมงมุมขนาดใหญ่ ขนฟู มีพิษอ่อน นิยมเลี้ยงเป็นสัตว์เลี้ยง"),
}


def _classify_breed_imagenet(img_pil: Image.Image) -> dict:
    """Classify species & breed using ImageNet MobileNetV2 — supports ALL animals."""
    try:
        tensor = val_tf(img_pil).unsqueeze(0).to(DEVICE)
        with torch.no_grad():
            logits = _imagenet_model(tensor)
            probs = torch.softmax(logits, dim=1)[0].cpu().numpy()

        # Get top-10 predictions
        top_indices = probs.argsort()[::-1][:10]
        top_label = _imagenet_labels[top_indices[0]]
        top_prob = float(probs[top_indices[0]])

        # Find the best animal match in top-10
        best_animal_idx = None
        for idx in top_indices[:10]:
            if idx in _ALL_ANIMAL_INDICES:
                best_animal_idx = idx
                break

        if best_animal_idx is not None:
            label = _imagenet_labels[best_animal_idx]
            prob = float(probs[best_animal_idx])
            species = _get_animal_group(best_animal_idx)

            # Look up Thai translation
            if label in _BREED_TH:
                species_th, breed_th, traits = _BREED_TH[label]
                species = species_th
            else:
                # Auto-generate breed name from ImageNet label
                breed_name = label.replace("_", " ").title()
                breed_th = f"{breed_name} ({breed_name})"
                traits = f"{species} — {breed_name}"

            conf = "high" if prob > 0.4 else "medium" if prob > 0.15 else "low"
            
            # Collect top-3 predictions for extra detail
            top3 = []
            for idx in top_indices[:3]:
                lbl = _imagenet_labels[idx]
                p = float(probs[idx])
                top3.append(f"{lbl} ({p:.0%})")

            return {
                "species": species,
                "breed": breed_th,
                "confidence": conf,
                "traits": traits,
                "imagenet_score": f"{prob:.0%}",
                "top_predictions": top3,
            }

        # Not an animal — report what ImageNet thinks
        return {
            "species": f"ไม่ใช่สัตว์ — {top_label.replace('_', ' ').title()}",
            "breed": top_label.replace("_", " ").title(),
            "confidence": "low",
            "traits": f"ImageNet classified as: {top_label} ({top_prob:.0%}) — ภาพนี้อาจไม่ใช่สัตว์",
            "imagenet_score": f"{top_prob:.0%}",
            "top_predictions": [f"{_imagenet_labels[idx]} ({float(probs[idx]):.0%})" for idx in top_indices[:3]],
        }

    except Exception as e:
        print(f"[WARN] ImageNet classify failed: {e}")
        return {"species": "Unknown", "breed": "Unknown", "confidence": "low", "traits": ""}


def identify_breed(img_pil: Image.Image) -> dict:
    """Step 2: Use LangChain + GPT-4o Vision for zero-shot breed identification.
    Falls back to ImageNet classifier if LLM is unavailable or fails."""
    
    # Try LLM first if available
    if LLM_READY and llm_vision:
        try:
            buf = io.BytesIO()
            img_pil.save(buf, format="JPEG", quality=85)
            img_b64 = base64.b64encode(buf.getvalue()).decode()

            message = HumanMessage(
                content=[
                    {
                        "type": "text",
                        "text": (
                            "Identify the animal species and specific breed in this image.\n"
                            "Return ONLY a JSON object in this exact format (no markdown, no extra text):\n"
                            '{"species": "<animal type in English (Thai)>", "breed": "<specific breed in English (Thai)>", "confidence": "<high/medium/low>", "traits": "<breed traits in Thai>"}'
                        ),
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{img_b64}"},
                    },
                ]
            )

            response = llm_vision.invoke([message])
            text = response.content.strip()

            if "{" in text:
                result = json.loads(text[text.index("{"):text.rindex("}") + 1])
                if result.get("breed") and result["breed"] != "Unknown":
                    return result
        except Exception as e:
            print(f"[WARN] LLM breed detection failed, using ImageNet fallback: {e}")
    
    # Fallback: ImageNet-based breed classification
    return _classify_breed_imagenet(img_pil)


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


def _fallback_advice(emotion: str, species="Unknown", breed="Unknown", traits="") -> str:
    s = species if species != "Unknown" else "สัตว์เลี้ยง"
    b = breed   if breed   != "Unknown" else "ไม่ทราบสายพันธุ์"
    t = traits if traits else "มีเอกลักษณ์เฉพาะตัว น่าสนใจ"
    
    is_dog = "dog" in species.lower() or "สุนัข" in species
    is_cat = "cat" in species.lower() or "แมว" in species
    
    # ── Generic / Universal advice (works for ANY animal) ──
    advice = {
        "happy": (
            f"🏥 รายงานการวิเคราะห์ {s} — {b}\n\n"
            f"📋 ลักษณะ: {t}\n\n"
            f"🧠 อารมณ์ที่ตรวจจับ: มีความสุข (Happy)\n\n"
            f"🩺 1. สุขภาพ:\n"
            f"{b} แสดงอาการผ่อนคลายและมีความสุข ท่าทางร่างกายเปิดกว้าง "
            f"ซึ่งเป็นสัญญาณว่าสุขภาพกายและจิตใจดี ควรดูแลสุขอนามัยและตรวจสุขภาพเป็นประจำ\n\n"
            f"🎾 2. กิจกรรม/การดูแล:\n"
            f"เป็นช่วงเวลาที่ดีในการจัดกิจกรรมกระตุ้นร่างกายและจิตใจ "
            f"จัดสภาพแวดล้อมให้เหมาะสมกับธรรมชาติของ {b} เสริมพฤติกรรมดีด้วยอาหารรางวัล\n\n"
            f"⚠️ 3. ข้อควรระวัง:\n"
            f"ระวังไม่ให้ตื่นเต้นมากจนเกิดอันตราย จัดพื้นที่ปลอดภัย ให้อาหารและน้ำสะอาดเพียงพอ"
        ),
        "sad": (
            f"🏥 รายงานการวิเคราะห์ {s} — {b}\n\n"
            f"📋 ลักษณะ: {t}\n\n"
            f"🧠 อารมณ์ที่ตรวจจับ: เศร้า/ซึม (Sad)\n\n"
            f"🩺 1. สุขภาพ:\n"
            f"{b} แสดงอาการซึม ไม่ร่าเริง อาจเกิดจากความเจ็บป่วย เครียด "
            f"หรือสภาพแวดล้อมเปลี่ยนแปลง ควรสังเกตพฤติกรรมการกิน ดื่มน้ำ และการขับถ่ายอย่างใกล้ชิด\n\n"
            f"🎾 2. กิจกรรม/การดูแล:\n"
            f"จัดสภาพแวดล้อมให้สงบและปลอดภัย ให้ความสนใจมากขึ้น "
            f"จัดที่พักอาศัยให้อุ่นสบาย ลดสิ่งรบกวนรอบข้าง\n\n"
            f"⚠️ 3. ข้อควรระวัง:\n"
            f"หากอาการซึมนานกว่า 2-3 วัน ไม่กินอาหาร หรือมีพฤติกรรมผิดปกติ ควรปรึกษาสัตวแพทย์หรือผู้เชี่ยวชาญทันที"
        ),
        "angry": (
            f"🏥 รายงานการวิเคราะห์ {s} — {b}\n\n"
            f"📋 ลักษณะ: {t}\n\n"
            f"🧠 อารมณ์ที่ตรวจจับ: หงุดหงิด/ป้องกันตัว (Angry)\n\n"
            f"🩺 1. สุขภาพ:\n"
            f"{b} แสดงอาการป้องกันตัวหรือหงุดหงิด อาจเกิดจากความเจ็บปวด ความกลัว "
            f"หรือถูกรบกวน ควรตรวจสอบว่ามีบาดแผลหรือความผิดปกติทางร่างกายหรือไม่\n\n"
            f"🎾 2. กิจกรรม/การดูแล:\n"
            f"ให้พื้นที่ส่วนตัว ไม่บังคับเข้าหา รอจนอารมณ์สงบ "
            f"จัดสภาพแวดล้อมให้รู้สึกปลอดภัย ลดสิ่งเร้าที่ทำให้ตกใจ\n\n"
            f"⚠️ 3. ข้อควรระวัง:\n"
            f"ระวังการถูกกัด ข่วน ต่อย หรือทำร้าย ไม่ควรเข้าใกล้เมื่ออารมณ์ไม่ดี "
            f"ไม่ควรลงโทษ จะยิ่งทำให้ก้าวร้าว หากก้าวร้าวบ่อยควรปรึกษาผู้เชี่ยวชาญ"
        ),
        "other": (
            f"🏥 รายงานการวิเคราะห์ {s} — {b}\n\n"
            f"📋 ลักษณะ: {t}\n\n"
            f"🧠 อารมณ์ที่ตรวจจับ: ปกติ/สังเกตการณ์ (Neutral)\n\n"
            f"🩺 1. สุขภาพ:\n"
            f"{b} อยู่ในสภาพปกติ สงบ ซึ่งเป็นสัญญาณดีว่าสุขภาพแข็งแรง "
            f"ควรตรวจสุขภาพเป็นประจำ ดูแลอาหาร น้ำ และความสะอาดของที่อยู่อาศัย\n\n"
            f"🎾 2. กิจกรรม/การดูแล:\n"
            f"จัดกิจกรรมกระตุ้นตามธรรมชาติของ {b} "
            f"จัดสภาพแวดล้อมให้เหมาะสม มีที่ซ่อน ที่ปีน หรือของเล่นตามประเภทสัตว์\n\n"
            f"⚠️ 3. ข้อควรระวัง:\n"
            f"สังเกตพฤติกรรมผิดปกติเสมอ เช่น กินน้อยลง ซึมผิดปกติ หรือเปลี่ยนนิสัยกะทันหัน"
        ),
    }
    
    # ── Override with species-specific advice for dogs ──
    if is_dog:
        advice["happy"] = (
            f"🏥 รายงานสุขภาพ {s} สายพันธุ์ {b}\n\n"
            f"📋 ลักษณะประจำพันธุ์: {t}\n\n"
            f"🧠 อารมณ์: มีความสุข (Happy)\n\n"
            f"🩺 1. สุขภาพกาย:\n"
            f"{b} ที่มีความสุขมักแสดงออกผ่านการกระดิกหาง ร่างกายผ่อนคลาย ตาเป็นประกาย "
            f"ปากเปิดเล็กน้อยคล้ายยิ้ม แสดงว่าสุขภาพกายและจิตใจดี ควรตรวจสุขภาพฟันและข้อต่อเป็นประจำ\n\n"
            f"🎾 2. กิจกรรมที่เหมาะสม:\n"
            f"เป็นช่วงเวลาทองสำหรับ {b} ในการออกไปวิ่งเล่น เล่นโยนลูกบอล (fetch) "
            f"ฝึกคำสั่งใหม่ๆ หรือพาไปเดินเล่นนอกบ้าน ให้ขนมรางวัลเพื่อเสริมพฤติกรรมดี\n\n"
            f"⚠️ 3. ข้อควรระวัง:\n"
            f"ระวังไม่ให้ออกกำลังกายหนักเกินไปในอากาศร้อน ให้ดื่มน้ำเพียงพอ "
            f"หลีกเลี่ยงการให้อาหารทันทีหลังวิ่งเล่นหนัก (ป้องกันท้องอืดบิด)"
        )
        advice["sad"] = (
            f"🏥 รายงานสุขภาพ {s} สายพันธุ์ {b}\n\n"
            f"📋 ลักษณะประจำพันธุ์: {t}\n\n"
            f"🧠 อารมณ์: เศร้า (Sad)\n\n"
            f"🩺 1. สุขภาพกาย:\n"
            f"{b} ที่มีอาการซึม หางห้อย ไม่ตอบสนอง อาจเกิดจากความเจ็บป่วย ความเหงา "
            f"หรือเครียดจากการเปลี่ยนแปลงสภาพแวดล้อม ควรสังเกตการกินอาหาร ดื่มน้ำ และขับถ่าย\n\n"
            f"🎾 2. กิจกรรมที่เหมาะสม:\n"
            f"ให้ความสนใจ {b} มากขึ้น ลูบหัว นวดท้องเบาๆ พาเดินเล่นสั้นๆ นอกบ้าน "
            f"อยู่ใกล้ๆ ให้ความอุ่นใจ อาจให้ของเล่นที่ชอบหรือกระดูกแทะ\n\n"
            f"⚠️ 3. ข้อควรระวัง:\n"
            f"หาก {b} ซึมนานกว่า 2-3 วัน ไม่กินอาหาร ท้องเสีย หรืออาเจียน ควรพาไปพบสัตวแพทย์ทันที "
            f"อาจเป็นสัญญาณของโรคลำไส้อักเสบ พาร์โว หรือปัญหาอื่น"
        )
        advice["angry"] = (
            f"🏥 รายงานสุขภาพ {s} สายพันธุ์ {b}\n\n"
            f"📋 ลักษณะประจำพันธุ์: {t}\n\n"
            f"🧠 อารมณ์: หงุดหงิด/โกรธ (Angry)\n\n"
            f"🩺 1. สุขภาพกาย:\n"
            f"{b} ที่แสดงอาการคำราม แยกเขี้ยว ขนตั้ง อาจเกิดจากความเจ็บปวด ความกลัว "
            f"หรือการปกป้องอาณาเขต ควรตรวจสอบว่ามีบาดแผล ปวดข้อ หรือปัญหาสุขภาพหรือไม่\n\n"
            f"🎾 2. กิจกรรมที่เหมาะสม:\n"
            f"ให้พื้นที่ส่วนตัวแก่ {b} ไม่บังคับเข้าหา พูดเสียงเบาสงบ "
            f"รอจนอารมณ์ดีขึ้นแล้วค่อยชวนเล่นเบาๆ ฝึกความเชื่อฟังด้วยการเสริมแรงบวก\n\n"
            f"⚠️ 3. ข้อควรระวัง:\n"
            f"ระวังการถูกกัด ไม่ควรจ้องตาตรงๆ หรือเข้าใกล้ {b} เมื่ออารมณ์ไม่ดี "
            f"ไม่ควรลงโทษหรือตี จะยิ่งทำให้ก้าวร้าวมากขึ้น หากก้าวร้าวบ่อยควรปรึกษาสัตวแพทย์พฤติกรรม"
        )
        advice["other"] = (
            f"🏥 รายงานสุขภาพ {s} สายพันธุ์ {b}\n\n"
            f"📋 ลักษณะประจำพันธุ์: {t}\n\n"
            f"🧠 อารมณ์: สังเกตการณ์ / ผ่อนคลาย (Neutral)\n\n"
            f"🩺 1. สุขภาพกาย:\n"
            f"{b} อยู่ในสภาพปกติ สงบ ซึ่งเป็นสัญญาณของสุขภาพดี "
            f"ควรตรวจสุขภาพประจำปี ฉีดวัคซีนพิษสุนัขบ้าตามกำหนด ถ่ายพยาธิทุก 3 เดือน หยดยาป้องกันเห็บหมัดทุกเดือน\n\n"
            f"🎾 2. กิจกรรมที่เหมาะสม:\n"
            f"พา {b} ไปเดินเล่นวันละ 30-60 นาที ฝึก training ง่ายๆ เช่น sit, stay, shake "
            f"ให้ puzzle toy หรือของเล่นซ่อนขนม กระตุ้นสมองและลดความเบื่อ\n\n"
            f"⚠️ 3. ข้อควรระวัง:\n"
            f"สังเกตพฤติกรรมผิดปกติเสมอ เช่น เลียอุ้งเท้ามากผิดปกติ กินน้อยลง หอบผิดปกติ หรือเปลี่ยนนิสัยกะทันหัน"
        )
    
    # ── Override with species-specific advice for cats ──
    elif is_cat:
        advice["happy"] = (
            f"🏥 รายงานสุขภาพ {s} สายพันธุ์ {b}\n\n"
            f"📋 ลักษณะประจำพันธุ์: {t}\n\n"
            f"🧠 อารมณ์: มีความสุข (Happy)\n\n"
            f"🩺 1. สุขภาพกาย:\n"
            f"{b} ที่มีความสุขมักแสดงออกผ่านการกรน (purring) และเคลื่อนไหวอย่างสดใส "
            f"หางตั้งตรง หูตั้ง แสดงว่าสุขภาพกายและจิตใจดีมาก ควรตรวจสุขภาพฟันและเหงือกเป็นประจำ\n\n"
            f"🎾 2. กิจกรรมที่เหมาะสม:\n"
            f"เป็นช่วงเวลาทองสำหรับ {b} ในการเล่นของเล่นล่อเหยื่อ (feather wand) "
            f"หรือ laser pointer เพื่อออกกำลังกาย ให้ขนมรางวัลเล็กน้อยเพื่อเสริมพฤติกรรมดี\n\n"
            f"⚠️ 3. ข้อควรระวัง:\n"
            f"ระวังไม่ให้ตื่นเต้นมากเกินไปจนกระโดดจากที่สูง หลีกเลี่ยงการให้อาหารทันทีหลังเล่นหนัก"
        )
        advice["sad"] = (
            f"🏥 รายงานสุขภาพ {s} สายพันธุ์ {b}\n\n"
            f"📋 ลักษณะประจำพันธุ์: {t}\n\n"
            f"🧠 อารมณ์: เศร้า (Sad)\n\n"
            f"🩺 1. สุขภาพกาย:\n"
            f"{b} ที่มีอาการซึม ไม่ร่าเริง อาจมีสาเหตุจากความเจ็บป่วย ท้องอืด หรือเครียด "
            f"ควรสังเกตการกินอาหาร การดื่มน้ำ การขับถ่าย และอุณหภูมิร่างกาย\n\n"
            f"🎾 2. กิจกรรมที่เหมาะสม:\n"
            f"ให้ความสนใจ {b} มากขึ้นด้วยการลูบขน นวดเบาๆ บริเวณใต้คาง "
            f"จัดที่นอนอุ่นสบาย เปิดเพลงเบาๆ ช่วยผ่อนคลาย\n\n"
            f"⚠️ 3. ข้อควรระวัง:\n"
            f"หากอาการซึมเศร้าของ {b} ยาวนานกว่า 2-3 วัน ไม่กินอาหาร หรือหลบซ่อนตัวผิดปกติ ควรพาไปพบสัตวแพทย์ทันที"
        )
        advice["angry"] = (
            f"🏥 รายงานสุขภาพ {s} สายพันธุ์ {b}\n\n"
            f"📋 ลักษณะประจำพันธุ์: {t}\n\n"
            f"🧠 อารมณ์: หงุดหงิด/โกรธ (Angry)\n\n"
            f"🩺 1. สุขภาพกาย:\n"
            f"{b} ที่แสดงอาการหงุดหงิด ขู่ฟ่อ หรือหูแนบ อาจเกิดจากความเจ็บปวดร่างกาย ความเครียดจากสิ่งแวดล้อม "
            f"หรือการถูกรบกวน ควรตรวจสอบว่ามีบาดแผล ปวดท้อง หรือปัญหาฟันหรือไม่\n\n"
            f"🎾 2. กิจกรรมที่เหมาะสม:\n"
            f"ให้พื้นที่ส่วนตัวแก่ {b} ในบริเวณเงียบสงบ จัดที่ซ่อนตัว (hideout) ให้ "
            f"รอจนอารมณ์สงบแล้วค่อยเข้าหาอย่างนุ่มนวลด้วยเสียงเบาๆ\n\n"
            f"⚠️ 3. ข้อควรระวัง:\n"
            f"ระวังการถูกกัดหรือข่วน ไม่ควรจ้องตาหรือเข้าใกล้ใบหน้า {b} เมื่ออารมณ์ไม่ดี "
            f"ไม่ควรลงโทษเด็ดขาด จะยิ่งทำให้ก้าวร้าวมากขึ้น"
        )
        advice["other"] = (
            f"🏥 รายงานสุขภาพ {s} สายพันธุ์ {b}\n\n"
            f"📋 ลักษณะประจำพันธุ์: {t}\n\n"
            f"🧠 อารมณ์: สังเกตการณ์ / ผ่อนคลาย (Neutral)\n\n"
            f"🩺 1. สุขภาพกาย:\n"
            f"{b} อยู่ในอารมณ์ปกติ สงบ ซึ่งเป็นสัญญาณดีว่าสุขภาพกายแข็งแรง "
            f"ควรตรวจสุขภาพประจำปี ฉีดวัคซีนตามกำหนด และถ่ายพยาธิทุก 3 เดือน\n\n"
            f"🎾 2. กิจกรรมที่เหมาะสม:\n"
            f"กิจกรรมเสริมสร้างสมองสำหรับ {b} เช่น puzzle feeder ของเล่นซ่อนอาหาร "
            f"หรือ cat tree สำหรับปีนป่ายและสังเกตการณ์\n\n"
            f"⚠️ 3. ข้อควรระวัง:\n"
            f"สังเกตพฤติกรรมที่ผิดปกติอย่างสม่ำเสมอ เช่น กินน้อยลง นอนมากขึ้น หรือเปลี่ยนนิสัยกะทันหัน"
        )
    
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
    # If LLM failed (quota), use fallback with breed traits
    if advice == _fallback_advice(state["emotion"]):
        traits = state.get("breed_info", {}).get("traits", "")
        advice = _fallback_advice(
            state["emotion"],
            species=state["species"],
            breed=state["breed"],
            traits=traits,
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
        "mlflow_ready": MLFLOW_READY,
        "langchain": "ChatOpenAI (GPT-4o)",
        "langgraph": "emotion → breed → advisor",
        "device": DEVICE,
        "gpu": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU",
    }


@app.post("/analyze")
async def analyze(file: UploadFile = File(...), plan: str = "free"):
    """Run the analysis pipeline on an uploaded pet image.
    
    - plan='free'    → CNN emotion only + fallback breed/advice (no LLM)
    - plan='premium' → Full LangGraph pipeline (CNN + GPT-4o Vision + GPT-4o Vet)
    """
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

    # Run analysis based on plan type
    is_premium = (plan.lower() == "premium")

    if is_premium and LLM_READY:
        # ── Premium: Full LangGraph Pipeline (CNN + GPT-4o Vision + GPT-4o Vet) ──
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

        # ── MLflow: log premium inference ──
        if MLFLOW_READY:
            try:
                mlflow_tracker.log_inference(
                    emotion=result["emotion"],
                    confidence=result["emotion_confidence"],
                    breed=result.get("breed", "Unknown"),
                    species=result.get("species", "Unknown"),
                    plan="premium",
                    elapsed_ms=elapsed,
                    llm_used=True,
                )
            except Exception as e:
                print(f"[MLflow] Inference log failed: {e}")

        return {
            "success":      True,
            "plan":         "premium",
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
            "llm_used":     True,
        }
    else:
        # ── Free: CNN Emotion + ImageNet Breed + Fallback Advice ──
        emotion, confidence, scores = predict_emotion(img_pil)
        breed_info = _classify_breed_imagenet(img_pil)
        advice = _fallback_advice(
            emotion, 
            species=breed_info.get("species", "แมว"),
            breed=breed_info.get("breed", "พันทาง"),
            traits=breed_info.get("traits", ""),
        )

        elapsed = round((time.time() - t0) * 1000)

        # ── MLflow: log free inference ──
        if MLFLOW_READY:
            try:
                mlflow_tracker.log_inference(
                    emotion=emotion,
                    confidence=confidence,
                    breed=breed_info.get("breed", "Unknown"),
                    species=breed_info.get("species", "Unknown"),
                    plan=plan.lower(),
                    elapsed_ms=elapsed,
                    llm_used=False,
                )
            except Exception as e:
                print(f"[MLflow] Inference log failed: {e}")

        return {
            "success":      True,
            "plan":         plan.lower(),
            "emotion":      {
                "label": emotion,
                "confidence": confidence,
                "all_scores": scores,
            },
            "breed":        breed_info,
            "advice":       advice,
            "image_base64": img_b64,
            "elapsed_ms":   elapsed,
            "pipeline":     "CNN emotion_detector + ImageNet breed_classifier (Free plan)",
            "llm_used":     False,
        }


@app.get("/")
def root():
    return {
        "message": "Pet Insight 360 API v5.0 — LangChain + LangGraph Edition",
        "docs": "/docs",
    }
