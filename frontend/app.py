"""CNN_Meow — Streamlit Frontend · Premium 3D Glassmorphism Neo"""

import os, streamlit as st, requests, base64, io, math
from PIL import Image

API_URL = os.environ.get("BACKEND_URL", "http://localhost:8000")

st.set_page_config(
    page_title="CNN_Meow",
    page_icon="🐱",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# ═══════════════════════════════════════
# CSS : PREMIUM 3D GLASSMORPHISM (LARGER & SPACIOUS)
# ═══════════════════════════════════════
CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');

:root {
  /* Colors */
  --bg:           #090B0A;
  --bg-2:         #0F1311;
  --panel-l:      linear-gradient(145deg, #0C100E, #070908);
  --surface:      linear-gradient(145deg, #131815, #0E1210);
  --surface-glass: rgba(16, 20, 18, 0.75);
  
  --border:       rgba(255, 255, 255, 0.05);
  --border-2:     rgba(255, 255, 255, 0.08);
  --border-hi:    rgba(255, 255, 255, 0.18);
  
  --shadow-drop:  0 20px 40px rgba(0, 0, 0, 0.6);
  --shadow-inner: inset 0 1px 2px rgba(255, 255, 255, 0.06);

  --neo:          #00E676;
  --neo-grad:     linear-gradient(135deg, #00F260, #0575E6);
  --neo-dim:      rgba(0, 230, 118, 0.15);
  --neo-glow:     rgba(0, 230, 118, 0.45);

  --amber:        #F5A623;
  --amber-grad:   linear-gradient(135deg, #F5A623, #F76B1C);
  --red:          #FF4B4B;
  --red-grad:     linear-gradient(135deg, #FF4B4B, #B90000);

  --text-h:       #FFFFFF;
  --text-b:       #B5C7BC;
  --text-m:       #8A9E92;
  --text-l:       #5C6E64;

  --mono: 'JetBrains Mono', monospace;
  --sans: 'Prompt', sans-serif;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body, [class*="css"] {
  font-family: var(--sans) !important;
  background: var(--bg) !important;
  color: var(--text-b) !important;
  /* ขยาย Base Font Size ทำให้สัดส่วน rem ทุกตัวใหญ่ขึ้น */
  font-size: 16px !important; 
  -webkit-font-smoothing: antialiased;
}

#MainMenu, footer, header,
[data-testid="stToolbar"], [data-testid="stDecoration"],
[data-testid="stStatusWidget"], [data-testid="stSidebarCollapseButton"] {
  visibility: hidden !important; display: none !important;
}

.stApp { background: var(--bg) !important; }
.block-container { padding: 0 !important; max-width: 100% !important; margin: 0 !important; }

/* ══ TOPBAR ══ */
.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 4rem; height: 80px;
  background: var(--surface-glass);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border);
  box-shadow: 0 4px 30px rgba(0,0,0,0.4);
  position: sticky; top: 0; z-index: 200;
}
.brand { display: flex; align-items: center; gap: 18px; }
.brand-mark {
  width: 40px; height: 40px; border-radius: 12px;
  background: var(--neo-grad);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 5px 20px var(--neo-glow), var(--shadow-inner);
}
.brand-mark-inner {
  width: 12px; height: 12px; background: var(--bg); border-radius: 50%;
  animation: breathe 2.5s ease-in-out infinite;
}
@keyframes breathe { 0%,100%{transform:scale(1); opacity:1;} 50%{transform:scale(0.6); opacity:0.5;} }
.brand-name { font-family: var(--mono); font-size: 1.1rem; letter-spacing: 0.15em; color: var(--text-h); font-weight: 700; text-transform: uppercase; }
.brand-slash { color: var(--text-l); margin: 0 6px; font-size: 1.1rem; }
.brand-sub { font-family: var(--mono); font-size: 0.8rem; letter-spacing: 0.1em; color: var(--text-m); }
.topbar-right { display: flex; align-items: center; gap: 24px; }
.online-tag {
  display: flex; align-items: center; gap: 10px;
  font-family: var(--mono); font-size: 0.8rem; font-weight: 600; letter-spacing: 0.1em;
  color: var(--neo); background: var(--neo-dim);
  padding: 8px 18px; border-radius: 30px;
  box-shadow: var(--shadow-inner), inset 0 0 15px rgba(0,230,118,0.1);
  border: 1px solid rgba(0,230,118,0.25);
}
.online-dot { width: 8px; height: 8px; background: var(--neo); border-radius: 50%; box-shadow: 0 0 10px var(--neo); animation: breathe 2.5s ease-in-out infinite; }
.ver-tag { font-family: var(--mono); font-size: 0.8rem; color: var(--text-l); }

/* ══ COLUMNS ══ */
[data-testid="stHorizontalBlock"] { gap: 0 !important; }
[data-testid="stHorizontalBlock"] > [data-testid="column"]:nth-child(1),
[data-testid="stHorizontalBlock"] > [data-testid="column"]:nth-child(1) > [data-testid="stVerticalBlockBorderWrapper"],
[data-testid="stHorizontalBlock"] > [data-testid="column"]:nth-child(1) > [data-testid="stVerticalBlockBorderWrapper"] > div {
  background: var(--panel-l) !important;
}
[data-testid="stHorizontalBlock"] > [data-testid="column"]:nth-child(2),
[data-testid="stHorizontalBlock"] > [data-testid="column"]:nth-child(2) > [data-testid="stVerticalBlockBorderWrapper"],
[data-testid="stHorizontalBlock"] > [data-testid="column"]:nth-child(2) > [data-testid="stVerticalBlockBorderWrapper"] > div {
  background: var(--bg-2) !important;
}
/* Right panel inner padding — generous breathing room */
[data-testid="stHorizontalBlock"] > [data-testid="column"]:nth-child(2) > [data-testid="stVerticalBlockBorderWrapper"] > div {
  padding: 3.5rem 4.5rem !important;
}
/* Constrain content width for elegant readability on wide screens */
[data-testid="stHorizontalBlock"] > [data-testid="column"]:nth-child(2) > [data-testid="stVerticalBlockBorderWrapper"] > div > [data-testid="stVerticalBlock"] {
  max-width: 1060px;
  margin-left: auto;
  margin-right: auto;
  width: 100%;
}
/* Right panel subtle left border to separate from panel-left */
[data-testid="stHorizontalBlock"] > [data-testid="column"]:nth-child(2) {
  border-left: 1px solid var(--border) !important;
}

/* ══ LEFT PANEL ══ */
/* เพิ่ม Padding ฝั่งซ้าย */
.panel-left {
  padding: 4.5rem 3.5rem; height: calc(100vh - 80px);
  overflow-y: auto; position: sticky; top: 80px;
  border-right: 1px solid var(--border);
  box-shadow: 10px 0 40px rgba(0,0,0,0.5);
}
.pl-eyebrow { font-family: var(--mono); font-size: 0.75rem; letter-spacing: 0.25em; text-transform: uppercase; color: var(--text-l); margin-bottom: 1.5rem; display: flex; align-items: center; gap: 12px; }
.pl-eyebrow::before { content: '//'; color: var(--neo); font-weight: bold;}
.pl-eyebrow::after  { content: ''; flex:1; height:1px; background: var(--border-2); }
.pl-title { font-size: 3.2rem; font-weight: 700; line-height: 1.15; color: var(--text-h); margin-bottom: 1.5rem; letter-spacing: -0.01em;}
.pl-title em { font-style: normal; background: var(--neo-grad); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.pl-desc { font-size: 1.1rem; color: var(--text-m); line-height: 1.8; margin-bottom: 3.5rem; }
.pl-rule { height: 1px; background: var(--border-2); margin: 3rem 0; box-shadow: 0 1px 0 rgba(255,255,255,0.02); }
.pl-lbl { font-family: var(--mono); font-size: 0.75rem; letter-spacing: 0.15em; text-transform: uppercase; color: var(--text-l); display: block; margin-bottom: 1.2rem; }

.step-row { display: flex; align-items: flex-start; gap: 20px; padding: 1.2rem 0; border-bottom: 1px solid var(--border); }
.step-row:last-child { border-bottom: none; }
.step-num { width: 44px; height: 44px; border-radius: 14px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-family: var(--mono); font-size: 1rem; font-weight: 700; transition: all 0.3s; box-shadow: var(--shadow-inner); }
.step-num.idle   { background: var(--bg-2); border: 1px solid var(--border-2); color: var(--text-l); }
.step-num.active { background: var(--neo-grad); color: var(--bg); box-shadow: 0 8px 25px var(--neo-glow), var(--shadow-inner); }
.step-num.done   { background: var(--surface); border: 2px solid var(--neo); color: var(--neo); }
.step-info { padding-top: 6px; }
.step-title { font-size: 1.15rem; font-weight: 600; color: var(--text-h); margin-bottom: 4px; }
.step-title.dim { color: var(--text-l); font-weight: 400; }
.step-sub { font-family: var(--mono); font-size: 0.8rem; color: var(--text-m); }

.pipe-tbl { background: var(--surface); border-radius: 16px; border: 1px solid var(--border); box-shadow: var(--shadow-drop); overflow: hidden; }
.pipe-row { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--border); font-size: 1rem; }
.pipe-row:last-child { border-bottom: none; }
.pipe-name { color: var(--text-b); font-weight: 500; }
.pipe-tag  { font-family: var(--mono); font-size: 0.7rem; letter-spacing: 0.1em; color: var(--text-l); background: rgba(255,255,255,0.04); padding: 6px 12px; border-radius: 8px; font-weight: 600;}

/* ══ RIGHT ELEMENTS ══ */
.r-eyebrow { font-family: var(--mono); font-size: 0.8rem; letter-spacing: 0.25em; text-transform: uppercase; color: var(--text-l); margin-bottom: 1rem; display: flex; align-items: center; gap: 12px; font-weight: 600;}
.r-eyebrow::before { content: '//'; color: var(--neo); }
.r-eyebrow::after  { content: ''; flex:1; height:1px; background: var(--border-2); }
.r-heading { font-size: 3rem; font-weight: 700; line-height: 1.15; color: var(--text-h); margin-bottom: 0.8rem; letter-spacing: -0.02em; }
.r-heading em { font-style: normal; background: var(--neo-grad); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.r-sub { font-size: 1.1rem; color: var(--text-m); line-height: 1.7; margin-bottom: 2.5rem; font-weight: 400;}
.r-rule { height: 1px; background: var(--border-2); margin: 2.5rem 0; box-shadow: 0 1px 0 rgba(255,255,255,0.02); }

.tip { display: flex; align-items: flex-start; gap: 16px; background: var(--surface); border-radius: 20px; border: 1px solid var(--border); border-left: 4px solid var(--neo); padding: 1.5rem 1.8rem; margin-bottom: 2.5rem; box-shadow: var(--shadow-drop), var(--shadow-inner); font-size: 1rem; color: var(--text-b); line-height: 1.7; }
.tip-ic { color: var(--neo); flex-shrink: 0; font-size: 1.4rem; margin-top: 2px; }

.sec-lbl { font-family: var(--mono); font-size: 0.75rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--text-l); display: block; margin-bottom: 1.2rem; font-weight: 600;}
.sec-lbl.neo { color: var(--neo); }

/* File uploader 3D */
[data-testid="stFileUploader"] {
  background: var(--surface) !important;
  border: 2px dashed var(--border-hi) !important;
  border-radius: 24px !important;
  padding: 1.2rem !important;
  box-shadow: var(--shadow-drop), var(--shadow-inner) !important;
  margin-bottom: 2rem !important;
  transition: all 0.3s ease !important;
}
[data-testid="stFileUploader"]:hover {
  border-color: var(--neo) !important;
  transform: translateY(-3px);
  box-shadow: 0 16px 36px rgba(0, 230, 118, 0.12), var(--shadow-inner) !important;
}
[data-testid="stFileUploader"] section { padding: 3rem 2rem !important; text-align: center !important; background: transparent !important; }
[data-testid="stFileUploaderDropzoneInstructions"] { display: flex !important; flex-direction: column !important; align-items: center !important; }
[data-testid="stFileUploaderDropzoneInstructions"] svg,
[data-testid="stFileUploaderDropzoneInstructions"] span:first-child,
[data-testid="stFileUploaderDropzoneInstructions"] small { display: none !important; }
[data-testid="stFileUploader"] section::before {
  content: "+"; font-size: 3rem; color: var(--neo); display: block;
  margin-bottom: 0.8rem; line-height: 1; text-shadow: 0 0 20px var(--neo-glow); font-weight: 300;
}
[data-testid="stFileUploader"] section::after {
  content: "JPG  ·  PNG  ·  MAX 10 MB"; font-family: var(--mono);
  font-size: 0.8rem; color: var(--text-l); letter-spacing: 0.2em; display: block; margin-top: 0.8rem; font-weight: 600;
}
[data-testid="stFileUploader"] button {
  background: var(--surface-glass) !important; color: var(--neo) !important;
  border: 1px solid var(--neo) !important; border-radius: 12px !important;
  font-family: var(--sans) !important; font-size: 0.95rem !important; font-weight: 600 !important;
  padding: 0.7rem 2rem !important; box-shadow: 0 0 15px var(--neo-dim) !important; margin-top: 1rem !important; transition: all 0.3s !important;
}
[data-testid="stFileUploader"] button:hover { background: var(--neo-grad) !important; color: var(--bg) !important; box-shadow: 0 0 25px var(--neo-glow) !important; border-color: transparent !important;}

/* Info table */
.f-tbl { background: var(--surface); border: 1px solid var(--border); border-radius: 20px; box-shadow: var(--shadow-drop), var(--shadow-inner); overflow: hidden; }
.f-row { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid var(--border); font-size: 0.95rem; color: var(--text-m); }
.f-row:last-child { border-bottom: none; }
.f-val { font-family: var(--mono); font-size: 0.95rem; color: var(--text-h); font-weight: 500; }

/* 3D Buttons */
.stButton > button {
  font-family: var(--sans) !important; font-size: 1.15rem !important; font-weight: 600 !important;
  background: var(--surface) !important; color: var(--text-h) !important;
  border: 1px solid var(--border-hi) !important; border-radius: 16px !important;
  box-shadow: var(--shadow-drop), var(--shadow-inner) !important; padding: 1.2rem 3.5rem !important; transition: all 0.3s ease !important;
}
.stButton > button:hover {
  background: var(--neo-grad) !important; color: var(--bg) !important;
  border-color: transparent !important; box-shadow: 0 12px 35px var(--neo-glow) !important; transform: translateY(-3px);
}

/* Processing */
.proc-card { background: var(--surface); border-radius: 20px; border: 1px solid var(--border); border-left: 4px solid var(--neo); padding: 1.5rem 2rem; margin-bottom: 1.2rem; display: flex; align-items: center; gap: 1.2rem; box-shadow: var(--shadow-drop), var(--shadow-inner); }
.proc-lbl { font-family: var(--mono); font-size: 0.7rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--text-l); margin-bottom: 4px; font-weight: 600; }
.proc-txt { font-size: 1.1rem; color: var(--text-h); font-weight: 600; }
.prog-track { background: #000; height: 8px; border-radius: 10px; overflow: hidden; margin: 1.2rem 0 0; box-shadow: inset 0 3px 6px rgba(0,0,0,0.6); }
.prog-fill  { height: 100%; background: var(--neo-grad); box-shadow: 0 0 20px var(--neo-glow); border-radius: 10px; transition: width 0.4s ease; }

/* Pain hero 3D */
.pain-hero { background: var(--surface); border-radius: 24px; border: 1px solid var(--border); padding: 2.5rem 3rem; margin-bottom: 2.5rem; display: flex; align-items: center; gap: 3rem; box-shadow: var(--shadow-drop), var(--shadow-inner); }
.pain-num-wrap { text-align: center; flex-shrink: 0; min-width: 120px; }
.pain-num { font-family: var(--mono); font-size: 6rem; font-weight: 700; line-height: 1; letter-spacing: -3px; }
.pain-num.low  { background: var(--neo-grad); -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 0 25px var(--neo-glow)); }
.pain-num.mid  { background: var(--amber-grad); -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 0 25px rgba(245,166,35,0.3)); }
.pain-num.high { background: var(--red-grad); -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 0 25px rgba(255,75,75,0.3)); }
.pain-denom { font-family: var(--mono); font-size: 0.75rem; letter-spacing: 0.2em; color: var(--text-l); margin-top: 10px; font-weight: 600; }
.pain-vr { width: 1px; height: 110px; background: var(--border-2); flex-shrink: 0; }
.pain-info { flex: 1; }
.pain-lbl2 { font-family: var(--mono); font-size: 0.7rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--text-l); margin-bottom: 0.6rem; font-weight: 600; }
.pain-status { font-size: 1.5rem; font-weight: 600; color: var(--text-h); margin-bottom: 1.2rem; display: flex; align-items: center; gap: 12px; }
.pain-bar { width: 100%; height: 7px; background: #000; border-radius: 10px; box-shadow: inset 0 2px 5px rgba(0,0,0,0.6); overflow: hidden; }
.pain-bar-fill { height: 100%; border-radius: 10px; transition: width 0.6s ease; }
.pain-bar-fill.low  { background: var(--neo-grad); box-shadow: 0 0 20px var(--neo-glow); }
.pain-bar-fill.mid  { background: var(--amber-grad); }
.pain-bar-fill.high { background: var(--red-grad); }
.pain-bar-val { font-family: var(--mono); font-size: 0.8rem; color: var(--text-m); margin-top: 10px; font-weight: 500; }

/* FGS grid */
.fgs-wrap { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; margin-bottom: 2.5rem; }
.fgs-card { background: var(--surface); border-radius: 20px; border: 1px solid var(--border); padding: 1.8rem 1.2rem; text-align: center; box-shadow: var(--shadow-drop), var(--shadow-inner); transition: all 0.3s; min-height: 160px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.fgs-card:hover { transform: translateY(-4px); border-color: var(--border-hi); box-shadow: 0 12px 28px rgba(0,0,0,0.7); }
.fgs-e   { font-size: 1.8rem; display: block; margin-bottom: 10px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.6)); }
.fgs-lbl2 { font-family: var(--mono); font-size: 0.65rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-l); display: block; margin-bottom: 10px; font-weight: 600; }
.fgs-v { font-family: var(--mono); font-size: 2.2rem; font-weight: 700; line-height: 1; }
.fgs-v.v0 { color: var(--neo); text-shadow: 0 0 20px var(--neo-glow); }
.fgs-v.v1 { color: var(--amber); }
.fgs-v.v2 { color: var(--red); }

/* Radar & Advice */
.radar-card { background: var(--surface); border-radius: 24px; border: 1px solid var(--border); padding: 2rem 2.5rem; box-shadow: var(--shadow-drop), var(--shadow-inner); height: 100%; display: flex; flex-direction: column; }
.legend-row { display: flex; justify-content: center; gap: 20px; margin-top: 20px; flex-wrap: wrap; }
.leg-item { display: inline-flex; align-items: center; gap: 8px; font-family: var(--mono); font-size: 0.75rem; color: var(--text-m); font-weight: 500; }
.leg-dot  { width: 8px; height: 8px; border-radius: 50%; display: inline-block; box-shadow: inset 0 1px 3px rgba(255,255,255,0.4); }

.meta-strip { display: flex; gap: 14px; margin-bottom: 2rem; flex-wrap: wrap; }
.meta-card { flex: 1; min-width: 0; background: var(--surface); border-radius: 16px; border: 1px solid var(--border); padding: 16px 20px; box-shadow: var(--shadow-drop), var(--shadow-inner); }
.meta-k { font-family: var(--mono); font-size: 0.65rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--text-l); display: block; margin-bottom: 5px; font-weight: 600; }
.meta-v { font-family: var(--mono); font-size: 1.3rem; font-weight: 700; color: var(--text-h); }

.advice-card { background: var(--surface); border-radius: 24px; border: 1px solid var(--border); padding: 2.5rem; margin-bottom: 2rem; box-shadow: var(--shadow-drop), var(--shadow-inner); position: relative; overflow: hidden; }
.advice-card::before { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 4px; background: var(--neo-grad); }
.advice-body { font-size: 1.05rem; line-height: 1.85; color: var(--text-h); margin-top: 1.2rem; }

[data-testid="stImage"] img { border-radius: 20px; border: 1px solid var(--border-2); box-shadow: var(--shadow-drop); }
.stAlert { border-radius: 16px !important; border: 1px solid var(--border-2) !important; background: var(--surface) !important; font-size: 1rem !important; }
.no-crop { border: 2px dashed var(--border-hi); border-radius: 20px; background: var(--surface-glass); padding: 4rem 2rem; text-align: center; font-family: var(--mono); font-size: 0.8rem; letter-spacing: 0.2em; color: var(--text-l); font-weight: 600; box-shadow: var(--shadow-inner); }

/* Face crop card — same height as radar */
.crop-card { background: var(--surface); border-radius: 24px; border: 1px solid var(--border); padding: 2rem 2.5rem; box-shadow: var(--shadow-drop), var(--shadow-inner); height: 100%; display: flex; flex-direction: column; }
.crop-card .sec-lbl { margin-bottom: 1rem; }

/* ═════════ RIGHT PANEL SECTION RHYTHM ═════════ */
.r-section-header { margin-bottom: 2.5rem; }
.r-section { margin-bottom: 2.5rem; }
.r-section:last-child { margin-bottom: 0; }
.r-divider { height: 1px; background: linear-gradient(90deg, transparent, var(--border-2), transparent); margin: 2.5rem 0; }

/* ═════════ EQUAL-HEIGHT RESULT COLUMNS ═════════ */

/* Make Streamlit inner columns equal height */
[data-testid="stHorizontalBlock"] { align-items: stretch !important; }
[data-testid="stHorizontalBlock"] > [data-testid="column"] > [data-testid="stVerticalBlockBorderWrapper"] {
  height: 100%;
}
[data-testid="stHorizontalBlock"] > [data-testid="column"] > [data-testid="stVerticalBlockBorderWrapper"] > div {
  height: 100%;
  display: flex;
  flex-direction: column;
}

@media(max-width:1200px){
  .fgs-wrap { grid-template-columns: repeat(3, 1fr); }
  .pain-hero { flex-direction: column; gap: 2rem; text-align: center; }
  .pain-vr { width: 80px; height: 1px; }
}

@media(max-width:900px) {
  .panel-left { height: auto; position: relative; top: 0; border-right: none; border-bottom: 1px solid var(--border); }
  [data-testid="stHorizontalBlock"] > [data-testid="column"]:nth-child(2) > [data-testid="stVerticalBlockBorderWrapper"] > div {
    padding: 2.5rem 2rem !important;
  }
  .fgs-wrap { grid-template-columns: repeat(2, 1fr); }
  .r-heading { font-size: 2.2rem; }
  .r-section-header { margin-bottom: 2rem; }
  .r-section { margin-bottom: 2rem; }
  .pain-hero { padding: 2rem; gap: 2rem; }
}
</style>
"""
st.markdown(CSS, unsafe_allow_html=True)

# ═══════════════════════════════════════
# DATA
# ═══════════════════════════════════════
FEATURES = [
    ("🐱", "หู",    "ears"),
    ("👁",  "ตา",    "eyes"),
    ("👄", "ปาก",   "muzzle"),
    ("〰", "หนวด",  "whiskers"),
    ("📐", "ศีรษะ", "head_position"),
]
# ปรับสีให้เข้ากับ 3D Theme
SCORE_COLOR = {
    0: ("#00E676", "ปกติ"),
    1: ("#F5A623", "ปานกลาง"),
    2: ("#FF4B4B", "รุนแรง"),
}
def _tier(n):
    if n <= 3: return "low"
    if n <= 6: return "mid"
    return "high"
PAIN_META = {
    "low":  ("😺", "ไม่พบอาการเจ็บปวด"),
    "mid":  ("😿", "เฝ้าระวัง — สังเกตอาการ"),
    "high": ("🙀", "ควรพาพบสัตวแพทย์ด่วน"),
}
DEMO_RESULT = {
    "success": True,
    "bounding_box": {"x1":100,"y1":100,"x2":400,"y2":400,"confidence":0.95},
    "fgs_scores": {"ears":2,"eyes":2,"muzzle":1,"whiskers":1,"head_position":1},
    "pain_level": {"total_score":7,"level":"ACTION_REQUIRED","description":"พบสัญญาณความเจ็บปวด"},
    "llm_advice": (
        "🔴 น้องแมวมีอาการหรี่ตาและหูลู่ชัดเจน ซึ่งเป็นสัญญาณความเจ็บปวดระดับ 7/10\n\n"
        "🏥 แนะนำให้พาไปหาหมอโดยด่วนที่สุด\n\n"
        "สิ่งที่ทำได้ตอนนี้:\n"
        "• หลีกเลี่ยงการจับบริเวณที่น้องอาจเจ็บ\n"
        "• จัดที่นอนนุ่มๆ ในที่เงียบและอบอุ่น\n"
        "• งดอาหารหากมีแผนพาไปหาหมอ\n\n"
        "⚠️ การประเมินนี้เป็นเบื้องต้นด้วย AI ไม่สามารถแทนการตรวจจากสัตวแพทย์ได้"
    ),
    "cropped_face_base64": None,
}
for k, v in [("result", None), ("page", "upload"), ("source_img", None)]:
    if k not in st.session_state: st.session_state[k] = v

# ═══════════════════════════════════════
# TOPBAR
# ═══════════════════════════════════════
st.markdown("""
<div class="topbar">
  <div class="brand">
    <div class="brand-mark"><div class="brand-mark-inner"></div></div>
    <span class="brand-name">CNN_Meow</span>
    <span class="brand-slash">/</span>
    <span class="brand-sub">Feline Pain Assessment</span>
  </div>
  <div class="topbar-right">
    <div class="online-tag"><span class="online-dot"></span>System Online</div>
    <span class="ver-tag">v3.0</span>
  </div>
</div>
""", unsafe_allow_html=True)

# ═══════════════════════════════════════
# LAYOUT
# ═══════════════════════════════════════
page = st.session_state.page
def _steps(p):
    if p == "upload":     return ("active","idle","idle")
    if p == "processing": return ("done","active","idle")
    return ("done","done","done")
s1, s2, s3 = _steps(page)
sn = lambda s, n: "✓" if s == "done" else n
sd = lambda s: "dim" if s == "idle" else ""

col_l, col_r = st.columns([3, 7])

# ── LEFT ──────────────────────────────────────────
with col_l:
    st.markdown(f"""
    <div class="panel-left">
      <div class="pl-eyebrow">System</div>
      <div class="pl-title">Feline<br>Pain <em>Detection</em></div>
      <p class="pl-desc">ประเมินความเจ็บปวดในแมวจากภาพใบหน้าด้วย Feline Grimace Scale (FGS) อย่างแม่นยำ</p>
      <span class="pl-lbl">Workflow</span>
      <div>
        <div class="step-row">
          <div class="step-num {s1}">{sn(s1,'01')}</div>
          <div class="step-info"><div class="step-title">อัปโหลดรูปแมว</div><div class="step-sub">JPG / PNG · max 10 MB</div></div>
        </div>
        <div class="step-row">
          <div class="step-num {s2}">{sn(s2,'02')}</div>
          <div class="step-info"><div class="step-title {sd(s2)}">AI วิเคราะห์</div><div class="step-sub">YOLO + EfficientNet</div></div>
        </div>
        <div class="step-row">
          <div class="step-num {s3}">{sn(s3,'03')}</div>
          <div class="step-info"><div class="step-title {sd(s3)}">แสดงผลลัพธ์</div><div class="step-sub">FGS Score + LLM Advice</div></div>
        </div>
      </div>
      <div class="pl-rule"></div>
      <span class="pl-lbl">AI Pipeline</span>
      <div class="pipe-tbl">
        <div class="pipe-row"><span class="pipe-name">YOLOv8</span><span class="pipe-tag">DETECT</span></div>
        <div class="pipe-row"><span class="pipe-name">EfficientNet</span><span class="pipe-tag">CLASSIFY</span></div>
        <div class="pipe-row"><span class="pipe-name">GPT-4o</span><span class="pipe-tag">ADVISE</span></div>
      </div>
    </div>
    """, unsafe_allow_html=True)

# ── RIGHT ──────────────────────────────────────────
with col_r:

    # UPLOAD
    if page == "upload":
        st.markdown("""
        <div class="r-section-header">
          <div class="r-eyebrow">Step 01</div>
          <div class="r-heading">Upload <em>Image</em></div>
          <div class="r-sub">เลือกภาพใบหน้าแมวเพื่อเริ่มการวิเคราะห์ด้วยระบบ Feline Grimace Scale</div>
        </div>
        <div class="r-section">
          <div class="tip"><span class="tip-ic">◈</span><span>ถ่ายหน้าแมวตรงๆ ในที่สว่าง ไม่เบลอ และเห็นใบหน้าชัด จะได้ผลประเมินที่แม่นยำที่สุด</span></div>
        </div>
        """, unsafe_allow_html=True)

        uf = st.file_uploader("file", type=["jpg","jpeg","png"], label_visibility="collapsed")
        if uf:
            img  = Image.open(uf)
            w, h = img.size
            kb   = uf.size // 1024
            ci, cm = st.columns([3, 2])
            with ci: st.image(img, caption="", width="stretch")
            with cm:
                st.markdown(f"""
                <span class="sec-lbl" style="margin-top:.4rem;">File Info</span>
                <div class="f-tbl">
                  <div class="f-row"><span>ชื่อไฟล์</span><span class="f-val">{uf.name[:12]}..</span></div>
                  <div class="f-row"><span>ขนาด</span><span class="f-val">{kb} KB</span></div>
                  <div class="f-row"><span>Resolution</span><span class="f-val">{w}×{h}</span></div>
                  <div class="f-row"><span>Format</span><span class="f-val">{uf.type.split("/")[1].upper()}</span></div>
                </div>
                """, unsafe_allow_html=True)
            st.markdown('<div class="r-rule"></div>', unsafe_allow_html=True)
            if st.button("→  เริ่มวิเคราะห์ระบบ"):
                uf.seek(0)
                st.session_state.source_img = {"name": uf.name, "type": uf.type, "bytes": uf.getvalue()}
                st.session_state.page = "processing"
                st.rerun()

    # PROCESSING
    elif page == "processing":
        if not st.session_state.source_img:
            st.error("ไม่พบข้อมูลภาพ")
            if st.button("กลับ"): st.session_state.page = "upload"; st.rerun()
        else:
            d   = st.session_state.source_img
            img = Image.open(io.BytesIO(d["bytes"]))
            st.markdown("""
            <div class="r-section-header">
              <div class="r-eyebrow">Step 02</div>
              <div class="r-heading">Analyzing<em>…</em></div>
              <div class="r-sub">AI กำลังประมวลผลภาพใบหน้าแมวผ่าน Pipeline</div>
            </div>
            """, unsafe_allow_html=True)
            ci2, cp2 = st.columns([2, 3])
            with ci2: st.image(img, width="stretch")
            s_ph = cp2.empty(); p_ph = cp2.empty(); l_ph = cp2.empty()
            try:
                rows = []
                for txt, pct, tag in [
                    ("ตรวจจับใบหน้าด้วย YOLOv8",         30, "DETECT"),
                    ("วิเคราะห์ FGS ด้วย EfficientNet",   62, "CLASSIFY"),
                    ("สร้างคำแนะนำด้วย GPT-4o",           85, "ADVISE"),
                ]:
                    rows.append(f'<div class="f-row"><span class="f-val" style="font-size:.75rem; color:var(--neo);">[{tag}]</span><span style="color:var(--text-l);font-family:var(--mono);font-size:.8rem;">running…</span></div>')
                    s_ph.markdown(f'<div class="proc-card"><div><div class="proc-lbl">Processing Pipeline</div><div class="proc-txt">{txt}</div></div></div>', unsafe_allow_html=True)
                    p_ph.markdown(f'<div class="prog-track"><div class="prog-fill" style="width:{pct}%"></div></div>', unsafe_allow_html=True)
                    l_ph.markdown(f'<div class="f-tbl">{"".join(rows)}</div>', unsafe_allow_html=True)

                files = {"file": (d["name"], d["bytes"], d["type"])}
                resp  = requests.post(f"{API_URL}/api/v1/predict", files=files, timeout=60)
                if resp.status_code == 200:
                    s_ph.markdown('<div class="proc-card"><div><div class="proc-lbl">Status</div><div class="proc-txt" style="color:var(--neo);">✓ วิเคราะห์เสร็จสิ้นสมบูรณ์</div></div></div>', unsafe_allow_html=True)
                    p_ph.markdown('<div class="prog-track"><div class="prog-fill" style="width:100%"></div></div>', unsafe_allow_html=True)
                    st.session_state.result = resp.json(); st.session_state.page = "result"; st.rerun()
                else:
                    st.error(f"API Error: {resp.json().get('detail', resp.text)}")
                    if st.button("ลองใหม่"): st.session_state.page = "upload"; st.rerun()
            except requests.exceptions.ConnectionError:
                st.error("ไม่สามารถเชื่อมต่อ Backend ได้")
                st.markdown('<div class="proc-card" style="border-left-color:var(--red);"><div><div class="proc-lbl">Offline</div><div class="proc-txt">ไม่พบ Backend Server</div></div></div>', unsafe_allow_html=True)
                if st.button("▶  ดูผลตัวอย่าง (Demo Mode)"):
                    st.session_state.result = DEMO_RESULT; st.session_state.page = "result"; st.rerun()
            except Exception as e:
                st.error(f"เกิดข้อผิดพลาด: {e}")
                if st.button("ลองใหม่"): st.session_state.page = "upload"; st.rerun()

    # RESULT
    elif page == "result":
        result = st.session_state.result
        if result and result.get("success"):
            scores = result["fgs_scores"]
            pain   = result["pain_level"]
            total  = pain["total_score"]
            tier   = _tier(total)
            emoji, status_txt = PAIN_META[tier]
            pct = int(total / 10 * 100)

            st.markdown("""
            <div class="r-section-header">
              <div class="r-eyebrow">Step 03</div>
              <div class="r-heading">Analysis <em>Result</em></div>
              <div class="r-sub">ผลการประเมินความเจ็บปวดอ้างอิงจากระบบ Feline Grimace Scale</div>
            </div>
            """, unsafe_allow_html=True)

            st.markdown(f"""
            <div class="pain-hero">
              <div class="pain-num-wrap">
                <div class="pain-num {tier}">{total}</div>
                <div class="pain-denom">OUT OF 10</div>
              </div>
              <div class="pain-vr"></div>
              <div class="pain-info">
                <div class="pain-lbl2">Pain Assessment Score</div>
                <div class="pain-status">{emoji} {status_txt}</div>
                <div class="pain-bar"><div class="pain-bar-fill {tier}" style="width:{pct}%"></div></div>
                <div class="pain-bar-val">{total}.0 / 10.0 POINTS</div>
              </div>
            </div>
            """, unsafe_allow_html=True)

            g = '<div class="r-section"><span class="sec-lbl">FGS Breakdown Analysis</span><div class="fgs-wrap">'
            for icon, name, key in FEATURES:
                v = max(0, min(2, int(round(scores.get(key, 0)))))
                g += f'<div class="fgs-card"><span class="fgs-e">{icon}</span><span class="fgs-lbl2">{name}</span><span class="fgs-v v{v}">{v}</span></div>'
            g += "</div></div>"
            st.markdown(g, unsafe_allow_html=True)

            cl, cr = st.columns([1, 1])
            with cl:
                bbox = result.get("bounding_box", {})
                crop_b64 = result.get("cropped_face_base64", "")
                if crop_b64:
                    crop_img_html = f'<img src="data:image/jpeg;base64,{crop_b64}" style="width:100%;border-radius:16px;border:1px solid var(--border-2);box-shadow:var(--shadow-drop);margin-bottom:0.5rem;">'
                else:
                    crop_img_html = '<div class="no-crop">NO FACE CROP AVAILABLE</div>'
                st.markdown(f"""
                <div class="crop-card">
                  <span class="sec-lbl">Detected Face Crop</span>
                  {crop_img_html}
                  <div class="meta-strip" style="margin-top:1.5rem;">
                    <div class="meta-card"><span class="meta-k">Confidence</span><span class="meta-v">{bbox.get("confidence",0):.1%}</span></div>
                    <div class="meta-card"><span class="meta-k">Pain Level</span><span class="meta-v" style="font-size:1rem;">{pain.get("level","—").replace("_"," ").title()}</span></div>
                  </div>
                </div>
                """, unsafe_allow_html=True)

            with cr:
                vals  = [max(0, min(2, int(round(scores.get(k, 0))))) for _,_,k in FEATURES]
                labs  = [th for _,th,_ in FEATURES]
                icons = [ic for ic,_,_ in FEATURES]
                n  = len(vals)
                
                # ปรับสเกล SVG ให้ใหญ่ขึ้นและมีสเปซมากขึ้น
                cx, cy, R = 150, 150, 100
                aoff = -math.pi / 2
                def pt(i, f):
                    a = aoff + 2*math.pi*i/n
                    return cx+R*f*math.cos(a), cy+R*f*math.sin(a)
                gsvg = ""
                
                for ring in [0.33, 0.66, 1.0]:
                    pts = " ".join(f"{pt(i,ring)[0]:.1f},{pt(i,ring)[1]:.1f}" for i in range(n))
                    op  = "0.4" if ring == 1.0 else "0.15"
                    gsvg += f'<polygon points="{pts}" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1.2" opacity="{op}"/>'
                for i in range(n):
                    x, y = pt(i, 1.0)
                    gsvg += f'<line x1="{cx}" y1="{cy}" x2="{x:.1f}" y2="{y:.1f}" stroke="rgba(255,255,255,0.2)" stroke-width="1" opacity="0.4"/>'
                
                dpts = [pt(i, max(v/2, 0.08)) for i, v in enumerate(vals)]
                poly = " ".join(f"{x:.1f},{y:.1f}" for x, y in dpts)
                dots = lbls = ""
                for i, (lbl, v, icon) in enumerate(zip(labs, vals, icons)):
                    c = SCORE_COLOR[v][0]
                    dx, dy = dpts[i]
                    dots += f'<circle cx="{dx:.1f}" cy="{dy:.1f}" r="5" fill="{c}" stroke="#111613" stroke-width="2" filter="url(#glow)"/>'
                    lx, ly = pt(i, 1.45) # ปรับตำแหน่ง label ให้สมดุลกับกราฟที่ใหญ่ขึ้น
                    anchor = "middle"
                    if lx < cx-10: anchor = "end"
                    elif lx > cx+10: anchor = "start"
                    lbls += (
                        f'<text x="{lx:.1f}" y="{ly:.1f}" text-anchor="{anchor}" font-family="Prompt, sans-serif" font-size="12" font-weight="500" fill="#B5C7BC">{icon} {lbl}</text>'
                        f'<text x="{lx:.1f}" y="{ly+16:.1f}" text-anchor="{anchor}" font-family="JetBrains Mono, monospace" font-size="13" font-weight="700" fill="{c}">{v}/2</text>'
                    )
                legend = '<div class="legend-row">' + "".join(
                    f'<span class="leg-item"><span class="leg-dot" style="background:{c}"></span>{s} = {l}</span>'
                    for s, (c, l) in SCORE_COLOR.items()
                ) + "</div>"

                st.markdown(f"""
                <div class="radar-card">
                  <span class="sec-lbl">Radar Geometry · FGS</span>
                  <svg viewBox="0 0 300 300" width="100%" style="max-width:300px;margin:0 auto;display:block;overflow:visible;">
                    <defs>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="cb"/>
                        <feMerge><feMergeNode in="cb"/><feMergeNode in="SourceGraphic"/></feMerge>
                      </filter>
                      <linearGradient id="polyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="rgba(0, 230, 118, 0.25)" />
                        <stop offset="100%" stop-color="rgba(5, 117, 230, 0.08)" />
                      </linearGradient>
                    </defs>
                    {gsvg}
                    <polygon points="{poly}" fill="url(#polyGrad)" stroke="#00E676" stroke-width="2" stroke-linejoin="round" opacity="0.9"/>
                    {dots}{lbls}
                  </svg>
                  {legend}
                </div>
                """, unsafe_allow_html=True)

            if result.get("llm_advice"):
                body = result["llm_advice"].replace("\n","<br>")
                st.markdown(f"""
                <div class="r-section">
                  <div class="advice-card">
                    <span class="sec-lbl neo">AI Veterinary Advice / GPT-4o</span>
                    <div class="advice-body">{body}</div>
                  </div>
                </div>
                """, unsafe_allow_html=True)
        else:
            err = result.get("error","เกิดข้อผิดพลาด") if result else "ไม่พบข้อมูล"
            st.error(f"❌ {err}")

        st.markdown('<div class="r-rule"></div>', unsafe_allow_html=True)
        if st.button("←  วิเคราะห์รูปใหม่"):
            st.session_state.result = st.session_state.source_img = None
            st.session_state.page = "upload"
            st.rerun()