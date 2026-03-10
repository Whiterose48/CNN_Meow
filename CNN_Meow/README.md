# 🐾 Pet Insight 360 — AI Pet Emotion & Breed Analyzer

> ระบบวิเคราะห์อารมณ์ สายพันธุ์ และให้คำแนะนำสุขภาพสัตว์เลี้ยงด้วย AI แบบครบวงจร  
> **Custom CNN (MobileNetV2)** → Emotion Detection | **ImageNet + LangChain GPT-4o Vision** → Breed ID | **LangGraph** → Pipeline Orchestration

---

## 📑 สารบัญ (Table of Contents)

1. [ภาพรวมโปรเจกต์ (Project Overview)](#1-ภาพรวมโปรเจกต์-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Tech Stack & Tools](#3-tech-stack--tools)
4. [AI/ML Techniques ที่ใช้](#4-aiml-techniques-ที่ใช้)
5. [Pipeline Flow — การทำงานทั้งระบบ](#5-pipeline-flow--การทำงานทั้งระบบ)
6. [โครงสร้างโปรเจกต์ (Project Structure)](#6-โครงสร้างโปรเจกต์-project-structure)
7. [อธิบายโค้ดแบบละเอียด (Code Walkthrough)](#7-อธิบายโค้ดแบบละเอียด-code-walkthrough)
   - 7.1 [Backend — `app.py`](#71-backend--apppy)
   - 7.2 [Backend — `mlflow_tracking.py`](#72-backend--mlflow_trackingpy)
   - 7.3 [Frontend — `App.jsx` (Main Router)](#73-frontend--appjsx-main-router)
   - 7.4 [Frontend — `Analyze.jsx` (หน้า Upload & วิเคราะห์)](#74-frontend--analyzejsx-หน้า-upload--วิเคราะห์)
   - 7.5 [Frontend — `Dashboard.jsx` (Analytics)](#75-frontend--dashboardjsx-analytics)
   - 7.6 [Frontend — `Home.jsx` (Landing Page)](#76-frontend--homejsx-landing-page)
   - 7.7 [Frontend — Context (AuthContext & AnalysisContext)](#77-frontend--context-authcontext--analysiscontext)
   - 7.8 [Frontend — Components (Nav, Footer, Loading)](#78-frontend--components-nav-footer-loading)
8. [API Endpoints](#8-api-endpoints)
9. [การติดตั้งและรัน (Setup & Run)](#9-การติดตั้งและรัน-setup--run)
10. [Deployment](#10-deployment)

---

## 1. ภาพรวมโปรเจกต์ (Project Overview)

**Pet Insight 360** คือ Web Application ที่ใช้ AI วิเคราะห์ภาพสัตว์เลี้ยง (และสัตว์ทุกชนิด) แบบครบวงจร โดยรวม 3 ขั้นตอนหลัก:

| ขั้นตอน | สิ่งที่ทำ | เทคนิค AI |
|---------|-----------|-----------|
| **1. Emotion Detection** | ตรวจจับอารมณ์สัตว์ 4 กลุ่ม (Happy, Sad, Angry, Other) | Custom CNN — MobileNetV2 (Transfer Learning) |
| **2. Breed Identification** | ระบุสายพันธุ์สัตว์ 150+ ชนิด พร้อมคำอธิบายภาษาไทย | ImageNet MobileNetV2 + GPT-4o Vision (Zero-shot) |
| **3. Veterinary Advice** | ให้คำแนะนำสุขภาพเฉพาะสายพันธุ์ + อารมณ์ที่ตรวจพบ | LangChain Persona Prompting + GPT-4o LLM |

### แผนการใช้งาน (Plans)

| Feature | Free Plan | Premium Plan |
|---------|-----------|-------------|
| Emotion Detection (CNN) | ✅ | ✅ |
| Breed ID (ImageNet) | ✅ | ✅ |
| Breed ID (GPT-4o Vision) | ❌ | ✅ |
| Vet Advice (Rule-based) | ✅ | — |
| Vet Advice (GPT-4o AI) | ❌ | ✅ |
| LangGraph Pipeline | ❌ | ✅ |

### สิ่งที่ระบบรองรับ
- รองรับ **สัตว์ทุกชนิด**: สุนัข, แมว, นก, ปลา, สัตว์เลื้อยคลาน, แมลง, สัตว์ทะเล และอื่นๆ 150+ สายพันธุ์
- **Google Authentication** ผ่าน Firebase
- **Dashboard** แสดงสถิติและประวัติการวิเคราะห์ (เก็บใน localStorage)
- **MLflow** บันทึก Training & Inference logs
- **Docker** พร้อม deploy ได้ทันที

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CLIENT (Browser)                                   │
│  ┌───────────┐  ┌──────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐ │
│  │  Home.jsx │  │Plans.jsx │  │Analyze.jsx│  │Dashboard  │  │Personal   │ │
│  │  (3D Hero)│  │(Plan UI) │  │(Upload+AI)│  │(Analytics)│  │(Team Page)│ │
│  └─────┬─────┘  └────┬─────┘  └─────┬─────┘  └─────┬─────┘  └───────────┘ │
│        │              │              │              │                       │
│  ┌─────┴──────────────┴──────────────┴──────────────┴─────────────────────┐ │
│  │  App.jsx (Hash Router) + AuthContext + AnalysisContext                 │ │
│  │  Firebase Auth (Google Sign-in) | localStorage (History)              │ │
│  └───────────────────────────────┬───────────────────────────────────────┘ │
└──────────────────────────────────┼───────────────────────────────────────────┘
                                   │ HTTP POST /analyze
                                   │ (FormData: image + plan)
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       BACKEND (FastAPI + Python)                            │
│                                                                             │
│  ┌─────────────────────────── LangGraph Pipeline ─────────────────────────┐ │
│  │                                                                         │ │
│  │   ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐  │ │
│  │   │ Node 1:          │    │ Node 2:          │    │ Node 3:          │  │ │
│  │   │ Emotion Detector │───▶│ Breed Identifier │───▶│ Vet Advisor      │  │ │
│  │   │ (Custom CNN)     │    │ (ImageNet/GPT-4o)│    │ (LangChain/GPT)  │  │ │
│  │   └──────────────────┘    └──────────────────┘    └──────────────────┘  │ │
│  │         MobileNetV2              MobileNetV2           ChatOpenAI       │ │
│  │       (Fine-tuned 4cls)        (ImageNet 1000)       (GPT-4o LLM)      │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌───────────────┐                                                          │
│  │ MLflow Tracker │  ← บันทึก metrics, params, artifacts ทุก inference     │
│  └───────────────┘                                                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  EXTERNAL SERVICES                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                      │
│  │ Firebase Auth │  │ OpenAI API   │  │ MLflow       │                      │
│  │ (Google SSO)  │  │ (GPT-4o)     │  │ (Experiment  │                      │
│  │               │  │              │  │  Tracking)   │                      │
│  └──────────────┘  └──────────────┘  └──────────────┘                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Tech Stack & Tools

### Backend

| เทคโนโลยี | เวอร์ชัน | หน้าที่ |
|-----------|---------|--------|
| **Python** | 3.11 | Runtime หลัก |
| **FastAPI** | 0.115+ | Web API Framework — async, auto-docs |
| **PyTorch** | 2.6+ | Deep Learning Framework (CNN) |
| **TorchVision** | 0.21+ | Pre-trained MobileNetV2 + Image Transforms |
| **LangChain** | 0.3+ | LLM Orchestration (Prompt Template, Chain, Output Parser) |
| **LangChain-OpenAI** | 0.3+ | ChatOpenAI wrapper for GPT-4o |
| **LangGraph** | 0.2+ | Stateful Graph Pipeline (StateGraph) |
| **OpenAI** | 1.58+ | GPT-4o Vision + Text API |
| **MLflow** | 3.10+ | Experiment Tracking, Model Registry |
| **OpenCV** | 4.10+ | Image processing (headless) |
| **Pillow** | 11+ | Image I/O |
| **Uvicorn** | 0.34+ | ASGI Server |

### Frontend

| เทคโนโลยี | เวอร์ชัน | หน้าที่ |
|-----------|---------|--------|
| **React** | 19 | UI Framework (Functional Components + Hooks) |
| **Vite** | 7+ | Build Tool + Dev Server (HMR) |
| **Tailwind CSS** | v4 | Utility-first CSS (Vite plugin) |
| **Three.js** | 0.183 | 3D WebGL Graphics |
| **@react-three/fiber** | 9.5 | React renderer สำหรับ Three.js |
| **@react-three/drei** | 10.7 | Helper components (Float, Stars, Sphere, ...) |
| **Framer Motion** | 12+ | Animation Library (page transitions, scroll) |
| **Firebase** | 12.9 | Google Authentication |
| **Lucide React** | 0.575 | Icon Library |

### DevOps & Deployment

| เทคโนโลยี | หน้าที่ |
|-----------|--------|
| **Docker** | Containerization (multi-stage build) |
| **Docker Compose** | Orchestrate backend + frontend |
| **Nginx** | Serve static frontend (production) |
| **Netlify** | Frontend hosting (SPA redirect, CDN) |

---

## 4. AI/ML Techniques ที่ใช้

### 4.1 Transfer Learning — MobileNetV2

```
ImageNet Pre-trained MobileNetV2 (1000 classes)
         │
         ▼
   ตัด Classifier head ออก
         │
         ▼
   เพิ่ม Custom Classifier:
   ┌─────────────────────────┐
   │ Dropout(0.4)            │
   │ Linear(1280 → 256)      │
   │ ReLU                    │
   │ Dropout(0.2)            │
   │ Linear(256 → 4)         │  ← 4 classes: happy, sad, angry, other
   └─────────────────────────┘
         │
         ▼
   Fine-tune on pet emotion dataset
```

- **ทำไมใช้ MobileNetV2**: เบา, เร็ว, เหมาะกับ deployment บน CPU
- **Backbone**: `features` ของ MobileNetV2 (Inverted Residual Blocks)
- **Pooling**: AdaptiveAvgPool2d(1) → ลดมิติเป็น 1x1
- **Input Size**: 224×224 px, Normalized ด้วย ImageNet mean/std

### 4.2 Zero-shot Classification — GPT-4o Vision

- ส่งภาพเป็น Base64 ไปยัง GPT-4o Vision ผ่าน LangChain `ChatOpenAI`
- Prompt สั่งให้ระบุ species + breed + confidence + traits
- Response: JSON structured output
- **Fallback**: ถ้า LLM ไม่พร้อม → ใช้ ImageNet MobileNetV2 (1000 classes) แทน

### 4.3 Persona Prompting — Veterinary Advisor

- ใช้ `ChatPromptTemplate` สร้าง System Prompt ให้ GPT-4o เป็น "Expert Veterinary Behaviorist"
- ส่งข้อมูล species, breed, emotion, confidence เข้า Prompt
- สั่งให้ตอบ 3 หัวข้อ: Healthcare, Lifestyle, Safety
- **Constraint**: ต้อง breed-specific ห้ามตอบแบบ generic
- **Fallback**: Rule-based advice (Python dict) แยกตามสายพันธุ์

### 4.4 LangGraph — StateGraph Pipeline

- ใช้ `StateGraph` จาก LangGraph สร้าง Directed Graph
- 3 Nodes: `emotion_detector` → `breed_identifier` → `vet_advisor` → END
- State เป็น TypedDict ส่งต่อระหว่าง Node
- Compile เป็น Executable Graph ด้วย `workflow.compile()`

### 4.5 MLflow — Experiment Tracking

- **Training Experiment**: บันทึก loss, accuracy, learning rate ทุก epoch
- **Inference Experiment**: บันทึก emotion, confidence, breed, plan, elapsed_ms ทุก request
- **Model Registry**: บันทึก model weights + PyTorch model object
- Tracking URI: SQLite (local) — สามารถ scale เป็น remote server ได้

---

## 5. Pipeline Flow — การทำงานทั้งระบบ

### 5.1 User Flow (Frontend)

```
ผู้ใช้เข้าเว็บ → Loading Screen (3D Gyroscope + progress bar)
       │
       ▼
   Home Page (3D Hero + Features + Deep Analysis Showcase)
       │
       ├── กด "Start Scan" หรือ "Explore Plan"
       │
       ▼
   Plans Page → เลือก Free หรือ Premium
       │
       ▼
   Analyze Page
       │
       ├── [ถ้ายังไม่ Login] → แสดง Auth Required → Google Sign-in popup
       │
       ├── [Login แล้ว] → แสดง Upload Zone
       │                    │
       │                    ▼
       │              เลือกรูปภาพ → Preview
       │                    │
       │                    ▼
       │              กด "Initialize" → Scanning Animation
       │                    │
       │                    ▼
       │              POST /analyze (FormData: image + plan)
       │                    │
       │                    ▼
       │              แสดง Report:
       │              ├── Emotion (emoji + confidence bar)
       │              ├── Breed (species + traits + top predictions)
       │              └── Vet Advice (Typewriter effect)
       │
       ▼
   Dashboard Page → สถิติ + ประวัติ + Charts
```

### 5.2 Backend Pipeline (API: POST /analyze)

```
รับรูปภาพ (UploadFile)
       │
       ▼
   Validate: ต้องเป็น image, ≤ 20MB
       │
       ▼
   แปลงเป็น PIL Image (RGB)
       │
       ▼
   ย่อเป็น thumbnail 600×600 → Base64
       │
       ├── [Free Plan] ──────────────────────────────────┐
       │   │                                              │
       │   ├── predict_emotion(CNN) → emotion, conf       │
       │   ├── _classify_breed_imagenet() → breed_info    │
       │   ├── _fallback_advice() → advice text           │
       │   └── Return JSON                                │
       │                                                  │
       ├── [Premium Plan + LLM Ready] ──────────────────┐ │
       │   │                                              │ │
       │   ▼ LangGraph Pipeline:                          │ │
       │   ┌──────────────────────────────────────────┐   │ │
       │   │ emotion_detector (CNN)                    │   │ │
       │   │   → emotion, confidence, scores           │   │ │
       │   │                                            │   │ │
       │   │ breed_identifier (GPT-4o Vision/ImageNet)  │   │ │
       │   │   → species, breed, traits                 │   │ │
       │   │                                            │   │ │
       │   │ vet_advisor (LangChain GPT-4o/Fallback)    │   │ │
       │   │   → structured advice text                 │   │ │
       │   └──────────────────────────────────────────┘   │ │
       │   └── Return JSON with llm_used=true             │ │
       │                                                    │
       ▼                                                    │
   MLflow: log_inference(emotion, breed, plan, elapsed_ms)  │
       │                                                    │
       ▼                                                    │
   Return JSON Response ◀──────────────────────────────────┘
```

---

## 6. โครงสร้างโปรเจกต์ (Project Structure)

```
CNN_Meow/
├── docker-compose.yml              # Docker Compose: backend + frontend
├── README.md                       # เอกสารนี้
│
├── backend/                        # ── FastAPI Backend ──
│   ├── Dockerfile                  # Python 3.11-slim + OpenCV deps
│   ├── requirements.txt            # Python dependencies (17 packages)
│   ├── .env.example                # ตัวอย่าง environment variables
│   ├── app.py                      # ⭐ Main API (1000+ lines) — CNN + LangChain + LangGraph
│   ├── mlflow_tracking.py          # MLflow wrapper class
│   ├── train_emotion_model.ipynb   # Jupyter notebook สำหรับ train CNN
│   └── weights/
│       └── pet_emotion.pth         # MobileNetV2 weights (4 emotions)
│
├── frontend_app/                   # ── React + Vite Frontend ──
│   ├── Dockerfile                  # Multi-stage: Node build → Nginx serve
│   ├── package.json                # Dependencies (React 19, Three.js, Firebase)
│   ├── vite.config.js              # Vite config: port 3000, chunk splitting
│   ├── netlify.toml                # Netlify SPA config
│   ├── index.html                  # HTML entry point
│   ├── .env.example                # Firebase + API URL config template
│   ├── public/
│   │   └── _redirects              # Netlify SPA fallback rule
│   └── src/
│       ├── main.jsx                # React entry point (StrictMode)
│       ├── App.jsx                 # ⭐ Main Router (hash-based) + Layout
│       ├── index.css               # Tailwind v4 + custom CSS design system
│       ├── firebase.js             # Firebase config + Google Auth provider
│       │
│       ├── context/                # ── React Context (Global State) ──
│       │   ├── AuthContext.jsx     # Firebase Google Auth state
│       │   └── AnalysisContext.jsx # Analysis history + stats (localStorage)
│       │
│       ├── components/             # ── Shared Components ──
│       │   ├── Nav.jsx             # Animated navbar + clock + mobile drawer
│       │   ├── Footer.jsx          # Team member cards + animated border
│       │   ├── Loading.jsx         # 3D Gyroscope loading screen
│       │   ├── Sidebar.jsx         # Workflow pipeline sidebar
│       │   ├── ThreeHero.jsx       # Raw Three.js particle background
│       │   └── ErrorBoundary.jsx   # React Error Boundary
│       │
│       └── pages/                  # ── Page Components ──
│           ├── Home.jsx            # Landing page (3D hero + features + CTA)
│           ├── Plans.jsx           # Free vs Premium plan selector
│           ├── Analyze.jsx         # ⭐ Image upload → AI analysis → report
│           ├── Dashboard.jsx       # Analytics: charts, history, stats
│           └── Personal.jsx        # Team member detail (per-member 3D core)
│
└── mlruns/                         # MLflow experiment data (auto-generated)
```

---

## 7. อธิบายโค้ดแบบละเอียด (Code Walkthrough)

### 7.1 Backend — `app.py`

ไฟล์หลักของ Backend มีความยาวกว่า 1000 บรรทัด แบ่งเป็น 4 ส่วนหลัก:

#### ส่วนที่ 1: Custom CNN — Emotion Detection (บรรทัด ~95–155)

```python
class PetEmotionNet(nn.Module):
    def __init__(self, num_classes=4):
        super().__init__()
        backbone = models.mobilenet_v2(weights=None)
        self.features   = backbone.features        # ใช้ feature extractor ของ MobileNetV2
        self.pool       = nn.AdaptiveAvgPool2d(1)   # Global Average Pooling
        in_features     = backbone.last_channel     # 1280 features
        self.classifier = nn.Sequential(
            nn.Dropout(0.4),                        # ป้องกัน overfitting
            nn.Linear(in_features, 256),            # ลดมิติจาก 1280 → 256
            nn.ReLU(inplace=True),
            nn.Dropout(0.2),
            nn.Linear(256, num_classes),             # Output 4 classes
        )
```

**อธิบาย:**
- `PetEmotionNet` คือ CNN ที่ใช้ MobileNetV2 เป็น backbone (Transfer Learning)
- ตัด classifier head เดิมออก → ใส่ custom classifier ของเราแทน
- Dropout 0.4 + 0.2 → ป้องกัน overfitting เพราะ dataset สัตว์มีจำนวนจำกัด
- Output 4 classes: `happy`, `sad`, `angry`, `other`
- `load_model()` โหลด weights จาก `weights/pet_emotion.pth` ถ้ามี ถ้าไม่มีจะรันในโหมด demo

**`predict_emotion()`** รับ PIL Image → Transform (Resize, ToTensor, Normalize) → Forward pass → Softmax → Return emotion + confidence

#### ส่วนที่ 2: ImageNet Universal Animal Classifier (บรรทัด ~165–490)

```python
_imagenet_model = models.mobilenet_v2(weights=MobileNet_V2_Weights.IMAGENET1K_V1)
```

**อธิบาย:**
- โหลด MobileNetV2 อีกตัว แต่คราวนี้ใช้ **ImageNet weights เดิม** (1000 classes)
- กำหนด Index Groups สำหรับสัตว์ 20+ กลุ่ม: สุนัข (151-268), แมว (281-285), นก, ปลา, สัตว์เลื้อยคลาน, แมลง ฯลฯ
- **`_BREED_TH` dict**: แปล ImageNet label → (species ภาษาไทย, breed ภาษาไทย, traits คำอธิบาย)
  - ครอบคลุม 100+ สายพันธุ์ เช่น `"golden retriever"` → `"Dog (สุนัข)"`, `"Golden Retriever (โกลเด้น รีทรีฟเวอร์)"`, `"ขนยาวสีทอง นิสัยเป็นมิตร ..."`
- **`_classify_breed_imagenet()`**: จำแนก species/breed ด้วย ImageNet top-10 predictions → หา prediction ที่ตรงกับ animal index group → แปลเป็นภาษาไทย

#### ส่วนที่ 3: LangChain — Breed ID & Vet Advisor (บรรทัด ~495–720)

```python
# GPT-4o Vision สำหรับระบุสายพันธุ์ (Zero-shot)
llm_vision = ChatOpenAI(model="gpt-4o", temperature=0.3, max_tokens=200)

# GPT-4o Text สำหรับคำแนะนำสัตวแพทย์ (Persona Prompting)
llm = ChatOpenAI(model="gpt-4o", temperature=0.7, max_tokens=800)
```

**`identify_breed()`** — ระบุสายพันธุ์:
1. ลอง LLM ก่อน: ส่งภาพ Base64 + Prompt → GPT-4o Vision → JSON response
2. ถ้า LLM ล้มเหลวหรือไม่มี API Key → fallback ไป `_classify_breed_imagenet()`

**`vet_prompt`** — ChatPromptTemplate:
```python
vet_prompt = ChatPromptTemplate.from_messages([
    ("system", "Act as an expert Veterinary Behaviorist..."),
    ("human", "Analyze: Species={species}, Breed={breed}, Emotion={emotion}...")
])
```
- สร้าง chain: `vet_prompt | llm | StrOutputParser()`
- ส่ง species, breed, emotion, confidence → ได้คำแนะนำ 3 ด้าน
- **Fallback advice**: ถ้า LLM ไม่พร้อม → ใช้ Python dict ที่เขียนคำแนะนำเฉพาะ สุนัข/แมว/สัตว์ทั่วไป × 4 อารมณ์

#### ส่วนที่ 4: LangGraph Pipeline + FastAPI (บรรทัด ~720–1015)

```python
# สร้าง StateGraph
workflow = StateGraph(PipelineState)
workflow.add_node("emotion_detector", emotion_node)
workflow.add_node("breed_identifier", breed_node)
workflow.add_node("vet_advisor", advisor_node)
workflow.set_entry_point("emotion_detector")
workflow.add_edge("emotion_detector", "breed_identifier")
workflow.add_edge("breed_identifier", "vet_advisor")
workflow.add_edge("vet_advisor", END)
analysis_pipeline = workflow.compile()
```

**อธิบาย:**
- `PipelineState` เป็น TypedDict กำหนด shape ของ state ทั้งหมด
- แต่ละ Node (function) รับ state → return partial dict → merge เข้า state
- Premium plan เรียก `analysis_pipeline.invoke(initial_state)` → ได้ผลครบทั้ง 3 ขั้นตอน
- Free plan เรียกแต่ละ function แยก → ไม่ผ่าน LangGraph → ไม่ใช้ LLM

**FastAPI Endpoints:**
- `GET /health` → status ของ model, LLM, MLflow
- `POST /analyze` → รับ image + plan → switch Free/Premium → return JSON
- `GET /` → API info

---

### 7.2 Backend — `mlflow_tracking.py`

```python
class PetMLflow:
    def __init__(self, tracking_uri=None):
        mlflow.set_tracking_uri(uri)
    
    # === Training (ใช้ใน Notebook) ===
    def start_training_run(run_name, params)   # เริ่ม run + log params
    def log_epoch(epoch, loss, acc, ...)        # log metrics ทุก epoch
    def log_best_model(model, best_acc, path)   # log model artifact
    def log_evaluation(cm_fig, report, ...)     # log confusion matrix, report
    def log_training_curves(fig)                # log training curves
    def end_run()                               # ปิด run
    
    # === Inference (ใช้ใน app.py) ===
    def log_inference(emotion, confidence, breed, species, plan, elapsed_ms, llm_used)
        # สร้าง run ใหม่ทุกครั้ง → log params + metrics + tags
    
    # === Model Registry ===
    def register_model(run_id, model_name)      # register model version
```

**อธิบาย:**
- Wrapper class สำหรับ MLflow ทำให้ใช้งานง่ายจากทั้ง notebook (training) และ app.py (inference)
- Tracking URI default: SQLite file ที่ `backend/mlruns.db`
- มี safety check: ปิด active run ก่อนเริ่ม run ใหม่ → กัน error ตอน re-run notebook

---

### 7.3 Frontend — `App.jsx` (Main Router)

```jsx
export default function App() {
    const [page, setPageState] = useState(getPageFromHash)  // hash-based routing
    const [plan, setPlan] = useState(null)                   // Free/Premium
    const [isLoading, setIsLoading] = useState(true)         // Loading screen

    // ฟัง browser Back/Forward ด้วย popstate event
    useEffect(() => {
        window.addEventListener('popstate', handlePopState)
        window.history.replaceState(...)  // ตั้ง initial state
    }, [])
}
```

**อธิบาย:**
- ใช้ **Hash-based routing** (`#home`, `#analyze`, `#dashboard`) แทน react-router
- ทำไม: ง่ายต่อ deploy บน static hosting (Netlify/Nginx) ไม่ต้อง config server-side
- `setPage()` → `pushState` + เปลี่ยน hash → รองรับ browser back/forward
- Wrap ด้วย `<AuthProvider>` + `<AnalysisProvider>` → global state
- `validPages`: `['home', 'plans', 'analyze', 'dashboard', 'phruk', 'poom', 'boss', 'nut']`
- Loading screen แสดง 2.8 วินาที → เพื่อให้ 3D scene โหลดเสร็จ
- Auto scroll to top เมื่อเปลี่ยนหน้า

**Layout:**
```
<AuthProvider>
  <AnalysisProvider>
    <Loading />           ← Overlay loading screen
    <div>
      <Nav />             ← Fixed navbar
      <main>
        {page === 'home' && <Home />}
        {page === 'plans' && <Plans />}
        {page === 'analyze' && <Analyze />}
        {page === 'dashboard' && <Dashboard />}
        {teamMembers.includes(page) && <Personal />}
      </main>
      {page === 'home' && <Footer />}
    </div>
  </AnalysisProvider>
</AuthProvider>
```

---

### 7.4 Frontend — `Analyze.jsx` (หน้า Upload & วิเคราะห์)

ไฟล์สำคัญที่สุดของ Frontend — เชื่อมกับ Backend API

#### โครงสร้าง 4 Phase:

| Phase | Step | สิ่งที่แสดง |
|-------|------|-----------|
| **INPUT** | step = -1 | Upload zone หรือ Auth Required |
| **SYNC** | step = 0 | กำลังส่งรูปไป server |
| **ANALYSIS** | step = 1 | Scanning animation + scan line |
| **REPORT** | step = 3 | ผลวิเคราะห์ครบทุกส่วน |

#### กระบวนการทำงาน:

```jsx
const runAnalysis = async () => {
    const fd = new FormData()
    fd.append('file', file)
    
    // เรียก Backend API
    const res = await fetch(`${api}/analyze?plan=${plan}`, {
        method: 'POST',
        body: fd
    })
    const data = await res.json()
    
    // บันทึกผลลง AnalysisContext (localStorage)
    addResult(data, preview)
}
```

**เชื่อมต่อกับ:**
- `AuthContext` → ตรวจสอบ login ก่อนใช้งาน
- `AnalysisContext` → บันทึกผลวิเคราะห์ลง history
- Backend API → `POST /analyze`
- `EMO_MAP` → map emotion label เป็น emoji, gradient, สี, คำอธิบาย

#### Report Section (step=3):

```
┌──────────────────────────────────────────────┐
│  1. Visual Capture Cell         │  2. Emotion Neural Hub           │
│  - รูปภาพ preview               │  - Emoji + Label ใหญ่            │
│  - Status: Verified             │  - Confidence % (ตัวเลขใหญ่)     │
│  - Plan badge                   │  - All scores (progress bars)    │
├──────────────────────────────────────────────┤
│  3. Genomic Signature (PREMIUM ONLY)                               │
│  - Breed name (ใหญ่)  - Species  - Traits (คำอธิบาย)             │
│  - Top 3 predictions (🥇🥈🥉)  - Match Confidence (HIGH/MED/LOW) │
├──────────────────────────────────────────────┤
│  4. Advisory Terminal                                               │
│  - Vet advice (Typewriter animation)                               │
│  - ปุ่ม Upgrade to Premium (ถ้า Free)                               │
└──────────────────────────────────────────────┘
```

**3D Background**: `AnalysisBackground` component ใช้ Three.js:
- `DataParticles`: 800 จุด floating + rotating
- `Stars`: ดาวพื้นหลัง
- `Grid`: ตาราง 3D ที่พื้น

---

### 7.5 Frontend — `Dashboard.jsx` (Analytics)

แสดงสถิติและประวัติการวิเคราะห์จาก `AnalysisContext` (localStorage)

#### ส่วนประกอบ:

| Section | Data Source | สิ่งที่แสดง |
|---------|------------|-----------|
| **Stats Cards** | `stats.totalDiagnostics`, `stats.uniqueBreeds` | จำนวน scan + จำนวน breed ที่เจอ |
| **Activity Chart** | `last7DaysActivity` | Bar chart 7 วันล่าสุด (animated) |
| **Emotion Confidence** | `emotionConfidence` | Per-emotion average confidence bars |
| **Dominant Emotion** | `emotionCounts` | อารมณ์ที่พบบ่อยที่สุด |
| **Recent Diagnostics** | `history.slice(0, 9)` | Card grid + expandable detail |

**เชื่อมต่อกับ:**
- `AnalysisContext` → `history`, `stats`, `emotionCounts`, `emotionConfidence`, `last7DaysActivity`
- `AuthContext` → ต้อง login ก่อน (Auth Gate)

**3D Background**: `GrandNeuralCore` — Sphere + Torus rings + Sparkles + Stars

#### การจัดการข้อมูล:
- `deleteEntry(id)` → ลบรายการเฉพาะ
- `clearHistory()` → ลบทั้งหมด
- `formatTime(iso)` → "Just now", "5m ago", "2h ago", "Yesterday", "3d ago"
- Card กด expand → แสดง top_predictions, emotion_scores, advice

---

### 7.6 Frontend — `Home.jsx` (Landing Page)

หน้าแรกของเว็บ — ดีไซน์ 3D immersive + scroll animations

#### ส่วนประกอบ:

| Section | Animation | คำอธิบาย |
|---------|-----------|---------|
| **Hero** | Parallax (scrollY) + 3D perspective | "BETTER HEALTH" + CTA buttons |
| **Stats** | TiltCard (mouse follow) | 99.8% Accuracy, <3.0s, 150+ Breeds |
| **Core Engine** | ScrollReveal3D (rotateX + scale) | Feature cards: Emotion AI, Breed ID, Vet Advisor |
| **Deep Analysis** | Scroll-driven rotation + TiltCard | ตัวอย่างผลวิเคราะห์ (French Bulldog) |
| **CTA Footer** | Spinning rings + shimmer | "READY TO Analyze?" + LAUNCH button |

**3D Background**: `HealthBackground` ใช้ Three.js:
- `OrganicCells`: MeshDistortMaterial + MeshWobbleMaterial spheres
- Floating particles + Sparkles + Stars
- แยกจาก `AnalysisBackground` ของ Analyze page

**Custom Animations:**
- `ScrollReveal3D`: เข้ามาจากด้านล่าง + หมุน X-axis
- `TiltCard`: เอียงตาม mouse position (rotateX/Y)
- `animate-gradient-x`: gradient background เลื่อน
- `animate-shimmer-fast`: เส้นแสงวิ่งผ่าน button
- `animate-spin-border`: conic-gradient วิ่งรอบขอบ card

---

### 7.7 Frontend — Context (AuthContext & AnalysisContext)

#### AuthContext.jsx — จัดการ Authentication

```jsx
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    
    // ฟัง Firebase auth state ตลอดเวลา
    useEffect(() => {
        onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser ? { uid, name, email, image } : null)
        })
    }, [])
    
    // Google Sign-in popup + error handling
    const loginWithGoogle = () => signInWithPopup(auth, provider)
    
    // Logout
    const logout = () => signOut(auth)
}
```

**เชื่อมต่อกับ:**
- `firebase.js` → Firebase config + GoogleAuthProvider
- ทุก page ที่ต้องการ auth check: `Analyze.jsx`, `Dashboard.jsx`
- `Nav.jsx` → แสดง user avatar หรือ Login button

**Error Handling:**
- `auth/popup-closed-by-user` → log เฉยๆ
- `auth/popup-blocked` → alert แนะนำ
- `auth/unauthorized-domain` → alert แนะนำเพิ่ม domain ใน Firebase Console
- `auth/configuration-not-found` → alert แนะนำเปิด Google provider

#### AnalysisContext.jsx — จัดการ Analysis History

```jsx
export function AnalysisProvider({ children }) {
    const [history, setHistory] = useState(() => localStorage.getItem(STORAGE_KEY))
    
    // Compress image เป็น thumbnail 128×128 JPEG 50% ก่อนเก็บ
    const addResult = async (result, imagePreview) => {
        const thumb = await compressImage(imagePreview)
        const entry = { id: Date.now(), timestamp, image: thumb, emotion, breed, advice }
        setHistory(prev => [entry, ...prev].slice(0, 30))  // จำกัด 30 รายการ
    }
    
    // Computed values:
    // - stats: { totalDiagnostics, uniqueBreeds }
    // - emotionCounts: { happy: 5, sad: 2, ... }
    // - emotionConfidence: { happy: 85, sad: 72, ... }  (average %)
    // - last7DaysActivity: [{ day: 'MON', count: 3 }, ...]
}
```

**เชื่อมต่อกับ:**
- `Analyze.jsx` → `addResult()` หลังได้ผลจาก API
- `Dashboard.jsx` → อ่าน history, stats, emotionCounts, last7DaysActivity

**Safety Features:**
- `compressImage()` → ย่อรูปก่อนเก็บ localStorage (ไม่เก็บรูปเต็ม)
- `safeSave()` → catch `QuotaExceededError` → trim history → ถ้ายังเต็มก็ clear
- Max 30 entries

---

### 7.8 Frontend — Components (Nav, Footer, Loading)

#### Nav.jsx — Animated Navigation Bar

```
┌──────────────────────────────────────────────────────────┐
│  [Logo] PetInsight   │ HOME PLANS ANALYZE DASHBOARD │ Clock │ [User/Login] │
│                      │ (animated pill indicator)     │ UTC+7 │              │
└──────────────────────────────────────────────────────────┘
```

- **Position**: Fixed, top-6, centered, max-w-6xl
- **Border**: `conic-gradient` rotating animation (multi-color rainbow)
- **Active Pill**: `motion.div` with `layoutId="active-pill"` → smooth animation ระหว่างแท็บ
- **แต่ละแท็บมีสีเฉพาะ**: Home=teal, Plans=amber, Analyze=blue, Dashboard=fuchsia
- **Clock**: `RealtimeClock` component — Bangkok UTC+7 format, update ทุก 1 วินาที
- **Mobile**: Hamburger → slide-in drawer จากขวา
- **Auth**: แสดง avatar + name ถ้า login, คลิก avatar → logout

#### Footer.jsx — Team Cards

- แสดง 4 สมาชิกทีม: Phruk (AI ENG), Poom (Frontend), Boss (Backend), Nut (Data Sci)
- คลิกที่ card → ไปหน้า Personal ของคนนั้น
- **Animation**: Running border beam (conic-gradient spin), hover card glow, bottom light strip

#### Loading.jsx — 3D Gyroscope Loading Screen

- แสดงตอนเข้าเว็บครั้งแรก (2.8 วินาที)
- **3D**: Gyroscope ที่หมุน 3 แกน (Torus) + Energy Ball (MeshDistortMaterial)
- **Progress Bar**: ขึ้นจาก 0-100% (สุ่มความเร็ว — เร็วช่วงแรก ช้าช่วงหลัง)
- **UI**: System Initializing text + icons (Zap, Database, ShieldCheck)
- `AnimatePresence` → fade out เมื่อ loading เสร็จ

---

## 8. API Endpoints

| Method | Path | คำอธิบาย |
|--------|------|---------|
| `GET` | `/` | API info + version |
| `GET` | `/health` | Health check: model/LLM/MLflow/GPU status |
| `POST` | `/analyze` | วิเคราะห์รูปสัตว์เลี้ยง |

### POST /analyze

**Parameters:**
- `file` (form-data): รูปภาพ (JPEG/PNG, max 20MB)
- `plan` (query): `free` หรือ `premium`

**Example Request:**
```bash
# Free plan
curl -X POST http://localhost:8000/analyze \
  -F "file=@cat.jpg" \
  -F "plan=free"

# Premium plan
curl -X POST http://localhost:8000/analyze \
  -F "file=@cat.jpg" \
  -F "plan=premium"
```

**Example Response:**
```json
{
  "success": true,
  "plan": "free",
  "emotion": {
    "label": "happy",
    "confidence": 0.87,
    "all_scores": { "angry": "4%", "happy": "87%", "other": "5%", "sad": "4%" }
  },
  "breed": {
    "species": "Cat (แมว)",
    "breed": "Tabby (แมวลายสลิด)",
    "confidence": "high",
    "traits": "ขนลายทาง กระฉับกระเฉง ฉลาด ชอบล่าเหยื่อ เป็นมิตรกับคน",
    "imagenet_score": "78%",
    "top_predictions": ["tabby (78%)", "tiger cat (12%)", "Egyptian cat (5%)"]
  },
  "advice": "🏥 รายงานสุขภาพ Cat (แมว) สายพันธุ์ Tabby ...",
  "image_base64": "/9j/4AAQ...",
  "elapsed_ms": 245,
  "pipeline": "CNN emotion_detector + ImageNet breed_classifier (Free plan)",
  "llm_used": false
}
```

---

## 9. การติดตั้งและรัน (Setup & Run)

### Prerequisites

| ซอฟต์แวร์ | เวอร์ชันขั้นต่ำ | หมายเหตุ |
|-----------|---------------|---------|
| **Docker** | 24+ | สำหรับ Docker Compose deployment |
| **Docker Compose** | v2+ | มากับ Docker Desktop |
| **Git** | 2.x | Clone โปรเจกต์ |
| **OpenAI API Key** | — | ต้องมีสำหรับ Premium plan (GPT-4o) |
| **Firebase Project** | — | ต้องมีสำหรับ Google Sign-in |

> **รันแบบ Manual** ต้องเพิ่ม: Python 3.11+, Node.js 20+, pnpm

### Quick Start (Docker Compose)

```bash
# 1. Clone
git clone https://github.com/<your-username>/CNN_Meow.git
cd CNN_Meow

# 2. ตั้งค่า env
cp backend/.env.example backend/.env
# แก้ไข backend/.env → ใส่ OPENAI_API_KEY

cp frontend_app/.env.example frontend_app/.env
# แก้ไข frontend_app/.env → ใส่ Firebase config + VITE_API_URL

# 3. Build & Run
docker compose up --build -d

# 4. เปิดเว็บ
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Manual Run (ไม่ใช้ Docker)

**Terminal 1 — Backend:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 — Frontend:**
```bash
cd frontend_app
corepack enable && pnpm install
pnpm dev
```

### ตรวจสอบ

```bash
# Health Check
curl http://localhost:8000/health

# Docker Logs
docker compose logs -f

# หยุดระบบ
docker compose down
```

---

## 10. Deployment

### Frontend → Netlify

1. Push code ขึ้น GitHub
2. เชื่อม Netlify กับ GitHub repo
3. ตั้งค่า Build:
   - **Base directory**: `frontend_app`
   - **Build command**: `pnpm build`
   - **Publish directory**: `frontend_app/dist`
4. ตั้งค่า Environment Variables ใน Netlify:
   ```
   VITE_API_URL=https://your-backend-url.com
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   VITE_FIREBASE_MEASUREMENT_ID=...
   ```
5. เพิ่ม Netlify URL ใน Firebase Console → Authentication → Authorized domains

> **สำคัญ:** ไฟล์ `netlify.toml` + `public/_redirects` จะ handle SPA redirect ให้อัตโนมัติ

### Backend → Docker (Any Cloud)

```bash
# Build image
docker build -t pet-insight-backend ./backend

# Run
docker run -d -p 8000:8000 \
  -e OPENAI_API_KEY=sk-xxx \
  -v ./weights:/app/weights \
  pet-insight-backend
```

> รองรับ: Railway, Render, AWS ECS, Google Cloud Run, Azure Container Instances

### Docker Compose (Full Stack)

```bash
# ตั้งค่า env ใน .env ที่ root หรือ export ก่อน
export VITE_API_URL=http://your-server:8000
export VITE_FIREBASE_API_KEY=...

docker compose up --build -d
```

---

## 👥 ทีมพัฒนา (Development Team)

| ชื่อ | ตำแหน่ง | หน้าที่หลัก |
|------|---------|------------|
| **Phruk** | AI Lead & Architect | CNN Model, Vision API, PyTorch, Pipeline Design |
| **Poom** | UI/UX & Frontend Lead | React, Three.js, Motion Design, User Experience |
| **Boss** | Infrastructure & Security | Cloud, Docker, API, Database, Security |
| **Nut** | Chief Data Scientist | Data Pipeline, MLOps, Statistics, Analysis |

---

## 📄 License

© 2026 Pet Insight 360 — All Rights Reserved