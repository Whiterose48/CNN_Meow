# filepath: /Users/iam.pxk/Desktop/CNN_Meow/backend/app/models/llm_advisor.py
import logging
from typing import Optional

from openai import OpenAI

logger = logging.getLogger(__name__)


class LLMAdvisor:
    """
    GPT-4o powered advisor that translates FGS scores
    into human-friendly veterinary advice.
    """

    SYSTEM_PROMPT = """คุณเป็นสัตวแพทย์ผู้เชี่ยวชาญด้านพฤติกรรมแมวและการประเมินความเจ็บปวด 
คุณใช้ Feline Grimace Scale (FGS) ในการวิเคราะห์ โดยแต่ละหมวดมีคะแนน 0-2:
- 0 = ปกติ
- 1 = ปานกลาง (มีการเปลี่ยนแปลงเล็กน้อย)
- 2 = รุนแรง (มีการเปลี่ยนแปลงชัดเจน)

หมวดการให้คะแนน:
- Ears (หู): 0=ตั้งชี้ไปข้างหน้า, 1=เอียงเล็กน้อย, 2=ลู่แนบศีรษะ
- Eyes (ตา): 0=เปิดกว้าง, 1=หรี่เล็กน้อย, 2=หรี่แคบมาก
- Muzzle (ปาก): 0=ผ่อนคลาย, 1=ตึงเล็กน้อย, 2=เกร็งชัดเจน
- Whiskers (หนวด): 0=ผ่อนคลายชี้ลง, 1=ตรงขึ้นเล็กน้อย, 2=ตั้งตรงและเกร็ง
- Head Position (ตำแหน่งหัว): 0=อยู่ระดับปกติ, 1=ก้มเล็กน้อย, 2=ก้มต่ำมาก

กฎ:
1. ตอบเป็นภาษาไทยเสมอ
2. ใช้โทนอ่อนโยน เข้าอกเข้าใจเจ้าของแมว
3. อธิบายว่าเห็นอาการอะไรจากคะแนนแต่ละจุด
4. ให้คำแนะนำที่ทำได้ทันที
5. ถ้าคะแนนรวม >= 4 ให้แนะนำพาไปพบสัตวแพทย์อย่างชัดเจน
6. ย้ำเสมอว่านี่เป็นการประเมินเบื้องต้นด้วย AI ไม่สามารถแทนการตรวจจากสัตวแพทย์ได้
7. ตอบกระชับ ไม่เกิน 200 คำ"""

    def __init__(self, api_key: str):
        self.client = None
        if api_key:
            self.client = OpenAI(api_key=api_key)
            logger.info("LLM Advisor initialized with OpenAI API.")
        else:
            logger.warning(
                "No OpenAI API key provided. LLM Advisor will return templated responses."
            )

    def get_advice(
        self,
        scores: dict[str, int],
        total_score: int,
        pain_level: str,
    ) -> str:
        """
        Generate human-friendly advice from FGS scores.
        
        Args:
            scores: dict of feature -> score (0-2)
            total_score: sum of all scores (0-10)
            pain_level: "normal", "monitor", or "action_required"
            
        Returns:
            Thai language advice string
        """
        user_message = (
            f"จงแปลผลคะแนน FGS ต่อไปนี้ให้เป็นคำแนะนำ:\n"
            f"- Ears (หู): {scores.get('ears', 0)}\n"
            f"- Eyes (ตา): {scores.get('eyes', 0)}\n"
            f"- Muzzle (ปาก): {scores.get('muzzle', 0)}\n"
            f"- Whiskers (หนวด): {scores.get('whiskers', 0)}\n"
            f"- Head Position (ตำแหน่งหัว): {scores.get('head_position', 0)}\n"
            f"\nคะแนนรวม: {total_score}/10\n"
            f"ระดับความเจ็บปวด: {pain_level}\n"
            f"\nกรุณาให้คำแนะนำที่เข้าอกเข้าใจเจ้าของแมว"
        )

        if self.client is None:
            return self._get_fallback_advice(scores, total_score, pain_level)

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": self.SYSTEM_PROMPT},
                    {"role": "user", "content": user_message},
                ],
                temperature=0.7,
                max_tokens=500,
            )
            advice = response.choices[0].message.content
            logger.info("LLM advice generated successfully.")
            return advice

        except Exception as e:
            logger.error(f"LLM API error: {e}")
            return self._get_fallback_advice(scores, total_score, pain_level)

    def _get_fallback_advice(
        self,
        scores: dict[str, int],
        total_score: int,
        pain_level: str,
    ) -> str:
        """Fallback advice when LLM is unavailable."""
        if total_score <= 1:
            return (
                f"🟢 ผลการวิเคราะห์: น้องแมวดูสบายดีค่ะ (คะแนน {total_score}/10)\n\n"
                "ไม่พบสัญญาณความเจ็บปวดที่ชัดเจน แต่ควรสังเกตพฤติกรรมต่อเนื่อง "
                "หากมีอาการผิดปกติ สามารถถ่ายรูปมาตรวจซ้ำได้ค่ะ\n\n"
                "⚠️ การประเมินนี้เป็นเบื้องต้นด้วย AI ไม่สามารถแทนการตรวจจากสัตวแพทย์ได้"
            )
        elif total_score <= 3:
            return (
                f"🟡 ผลการวิเคราะห์: พบสัญญาณเล็กน้อย (คะแนน {total_score}/10)\n\n"
                "น้องแมวมีอาการที่ควรเฝ้าระวัง แนะนำให้:\n"
                "• สังเกตพฤติกรรมอย่างใกล้ชิดในอีก 2-4 ชั่วโมง\n"
                "• จัดสภาพแวดล้อมให้สงบ\n"
                "• ถ่ายรูปมาเปรียบเทียบอีกครั้ง\n\n"
                "⚠️ การประเมินนี้เป็นเบื้องต้นด้วย AI ไม่สามารถแทนการตรวจจากสัตวแพทย์ได้"
            )
        else:
            high_features = [k for k, v in scores.items() if v == 2]
            features_thai = {
                "ears": "หูลู่",
                "eyes": "หรี่ตา",
                "muzzle": "ปากเกร็ง",
                "whiskers": "หนวดตั้ง",
                "head_position": "ก้มหัว",
            }
            symptoms = ", ".join(
                features_thai.get(f, f) for f in high_features
            )
            return (
                f"🔴 ผลการวิเคราะห์: พบสัญญาณความเจ็บปวด (คะแนน {total_score}/10)\n\n"
                f"อาการที่พบชัดเจน: {symptoms if symptoms else 'หลายจุดรวมกัน'}\n\n"
                "🏥 แนะนำให้พาน้องแมวไปพบสัตวแพทย์โดยเร็วค่ะ\n\n"
                "สิ่งที่ทำได้ตอนนี้:\n"
                "• หลีกเลี่ยงการจับหรือสัมผัสบริเวณที่อาจเจ็บ\n"
                "• จัดที่นอนนุ่มๆ ในที่เงียบสงบ\n"
                "• อย่าให้ยาแก้ปวดของคนกับแมวเด็ดขาด\n\n"
                "⚠️ การประเมินนี้เป็นเบื้องต้นด้วย AI ไม่สามารถแทนการตรวจจากสัตวแพทย์ได้"
            )