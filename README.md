# 🐱 CNN Meow – Cat Pain Detection (Feline Grimace Scale)

ระบบตรวจจับความเจ็บปวดของแมวผ่านใบหน้า โดยใช้ **YOLOv8** (ตรวจจับหน้าแมว) → **EfficientNet-B2** (ให้คะแนน FGS 5 จุด) → **GPT-4o** (แปลผลเป็นคำแนะนำ)

---

## สารบัญ

1. [สิ่งที่ต้องเตรียม (Prerequisites)](#1-สิ่งที่ต้องเตรียม-prerequisites)
2. [Clone โปรเจกต์](#2-clone-โปรเจกต์)
3. [ตั้งค่า Environment Variables](#3-ตั้งค่า-environment-variables)
4. [ดาวน์โหลด Dataset](#4-ดาวน์โหลด-dataset)
5. [Train Model (Optional)](#5-train-model-optional)
6. [รันด้วย Docker Compose](#6-รันด้วย-docker-compose)
7. [รันแบบ Manual (ไม่ใช้ Docker)](#7-รันแบบ-manual-ไม่ใช้-docker)
8. [โครงสร้างโปรเจกต์](#8-โครงสร้างโปรเจกต์)
9. [API Endpoints](#9-api-endpoints)
10. [Tech Stack](#10-tech-stack)

---

## 1. สิ่งที่ต้องเตรียม (Prerequisites)

| ซอฟต์แวร์ | เวอร์ชันขั้นต่ำ | หมายเหตุ |
|---|---|---|
| **Python** | 3.11+ | ใช้สำหรับ Backend + Frontend + Training |
| **Docker** | 24+ | สำหรับ Containerized deployment |
| **Docker Compose** | v2+ | มากับ Docker Desktop อยู่แล้ว |
| **Git** | 2.x | สำหรับ Clone โปรเจกต์ |
| **OpenAI API Key** | – | ต้องมีสำหรับส่วน LLM Interpretation |
| **Kaggle Account** | – | สำหรับดาวน์โหลด Dataset |

---

## 2. Clone โปรเจกต์

```bash
git clone https://github.com/<your-username>/CNN_Meow.git
cd CNN_Meow
```

---

## 3. ตั้งค่า Environment Variables

สร้างไฟล์ `.env` ที่ root ของโปรเจกต์:

```bash
cp .env.example .env
```

แก้ไขค่าภายใน `.env`:

```env
# OpenAI
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Kaggle (สำหรับดาวน์โหลด dataset)
KAGGLE_USERNAME=your_kaggle_username
KAGGLE_KEY=your_kaggle_api_key
```

---

## 4. ดาวน์โหลด Dataset

```bash
# ติดตั้ง dependency สำหรับดาวน์โหลด
pip install kagglehub pandas

# รันสคริปต์ดาวน์โหลด
python data/download_dataset.py
```

Dataset จะถูกเก็บไว้ในโฟลเดอร์ `data/`

---

## 5. Train Model (Optional)

> ข้ามข้อนี้ได้ถ้ามีไฟล์ weights พร้อมแล้วในโฟลเดอร์ `backend/weights/`

### 5.1 Train YOLOv8 (Cat Face Detection)

```bash
cd backend
pip install -r requirements.txt
python -m train.train_yolo
```

ไฟล์ weights จะถูกบันทึกที่ `backend/weights/yolo_cat_face.pt`

### 5.2 Generate Heuristic Labels (FGS)

> **สำคัญ:** ต้องรันที่ **root ของโปรเจกต์** (ไม่ใช่ใน `backend/`)

```bash
# ต้องอยู่ที่ CNN_Meow/ (project root)
cd CNN_Meow
source venv/bin/activate
python data/generate_heuristic_labels.py
```

ไฟล์ labels จะถูกบันทึกที่ `data/processed/labels.csv`

### 5.3 Train EfficientNet-B2 (FGS Multi-head Scoring)

```bash
cd backend
python -m train.train_efficientnet --epochs 60
```

**Training pipeline:**
- Phase 1 (Epoch 1-5): Heads only (backbone frozen)
- Phase 2 (Epoch 6-45): Full fine-tuning (backbone unfrozen)
- Phase 3 (Epoch 46-60): SWA (Stochastic Weight Averaging)
- EMA (Exponential Moving Average) tracked throughout

ไฟล์ weights จะถูกบันทึกที่ `backend/weights/efficientnet_fgs.pt`

### 5.4 Evaluate Model

```bash
cd backend
python -m train.evaluate
```

จะได้ผลลัพธ์:
- F1-Score (Primary Metric)
- Weighted Kappa Score (ความสอดคล้องของคะแนน)
- Confusion Matrix per Feature (Ears, Eyes, Muzzle, Whiskers, Head)

---

## 6. รันด้วย Docker Compose (แนะนำ)

### 6.1 Build & Start ทุก Service

```bash
docker compose up --build
```

### 6.2 ตรวจสอบสถานะ

```bash
docker compose ps
```

### 6.3 เข้าใช้งาน

| Service | URL |
|---|---|
| **Frontend (Streamlit)** | http://localhost:8501 |
| **Backend API (FastAPI)** | http://localhost:8000 |
| **API Docs (Swagger)** | http://localhost:8000/docs |

### 6.4 หยุดระบบ

```bash
docker compose down
```

---

## 7. รันแบบ Manual (ไม่ใช้ Docker)

### 7.1 Backend

```bash
cd backend
pip install -r requirements.txt
mkdir -p weights uploads
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 7.2 Frontend (เปิด Terminal ใหม่)

```bash
cd frontend
pip install -r requirements.txt
streamlit run app.py --server.port 8501
```

---

## 8. โครงสร้างโปรเจกต์

```
CNN_Meow/
├── .env                          # Environment variables (ไม่ commit)
├── docker-compose.yml            # Orchestrate backend + frontend
├── README.md
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── weights/                  # YOLO + EfficientNet weights
│   ├── uploads/                  # Uploaded images (runtime)
│   ├── app/
│   │   ├── main.py               # FastAPI entry point
│   │   ├── config.py             # Settings & environment vars
│   │   ├── models/
│   │   │   ├── yolo_detector.py      # YOLOv8 Cat Face Detection
│   │   │   ├── efficientnet_scorer.py # EfficientNet FGS 5-head Scoring
│   │   │   └── llm_advisor.py        # GPT-4o Interpretation
│   │   ├── routers/
│   │   │   └── predict.py            # /predict endpoint
│   │   ├── schemas/
│   │   │   └── prediction.py         # Pydantic request/response models
│   │   └── services/
│   │       ├── pipeline.py           # Sequential pipeline orchestration
│   │       └── preprocessing.py      # Image preprocessing & alignment
│   └── train/
│       ├── dataset.py                # Dataset loader
│       ├── train_yolo.py             # YOLOv8 training script
│       ├── train_efficientnet.py     # EfficientNet training script
│       └── evaluate.py              # F1, Kappa, Confusion Matrix
│
├── data/
│   ├── download_dataset.py       # Kaggle dataset downloader
│   └── generate_heuristic_labels.py  # FGS label generator (v3 — CLAHE + multi-scale)
│
└── frontend/
    ├── Dockerfile
    ├── requirements.txt
    └── app.py                    # Streamlit UI (Upload → Processing → Results)
```

---

## 9. API Endpoints

| Method | Path | คำอธิบาย |
|---|---|---|
| `POST` | `/predict` | อัปโหลดรูปแมว → รับผลวิเคราะห์ FGS + คำแนะนำ |
| `GET` | `/health` | Health check สำหรับ Docker |

### ตัวอย่าง Request

```bash
curl -X POST http://localhost:8000/predict \
  -F "file=@cat_photo.jpg"
```

### ตัวอย่าง Response

```json
{
  "scores": {
    "ears": 2,
    "eyes": 2,
    "muzzle": 1,
    "whiskers": 1,
    "head_position": 1
  },
  "total_score": 7,
  "pain_level": "Action Required",
  "advice": "น้องแมวมีอาการหรี่ตาและหูลู่ชัดเจน ซึ่งเป็นสัญญาณความเจ็บปวดระดับ 7/10 แนะนำให้พาไปหาหมอโดยด่วน",
  "bbox": [120, 80, 340, 310],
  "cropped_face_base64": "..."
}
```

---

## 10. Tech Stack

| Layer | เทคโนโลยี |
|---|---|
| **AI – Detection** | YOLOv8 (Ultralytics) |
| **AI – Scoring** | EfficientNet-B2 (PyTorch + timm) |
| **AI – Interpretation** | GPT-4o (OpenAI API) + LangChain |
| **Backend** | FastAPI + Uvicorn + Pydantic |
| **Frontend** | Streamlit + Plotly |
| **Image Processing** | OpenCV + Pillow |
| **DevOps** | Docker + Docker Compose |
| **Data** | Kaggle (Cat Dataset) |

---

## Pipeline Flow

```
📷 รูปภาพแมว
    │
    ▼
🔍 YOLOv8 (Cat Face Detection)
    │  ตรวจจับใบหน้า → Auto-Crop + Alignment
    ▼
🧠 EfficientNet-B2 (Multi-head FGS Scoring)
    │  ให้คะแนน 5 จุด: Ears, Eyes, Muzzle, Whiskers, Head (0-2 ต่อจุด)
    │  + TTA (Test-Time Augmentation: flip + overcrop)
    ▼
📊 Score Aggregation (0-10)
    │  0-3: ปกติ/เฝ้าระวัง | 4+: Action Required
    ▼
💬 GPT-4o (LLM Interpretation)
    │  แปลผลเป็นคำแนะนำภาษาคน
    ▼
📱 Streamlit UI (Pain Meter + Radar Chart + คำแนะนำ)
```