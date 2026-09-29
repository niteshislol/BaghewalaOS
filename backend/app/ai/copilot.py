"""
BaghewalaOS — Gemini AI Copilot (Physics-Grounded)
Combines WagheraOS domain LLM + well-twin-sih orchestrator pattern.

Key differentiator: Physics Grounding Gate — checks if the question can be
answered from live twin state BEFORE calling Gemini. Makes the AI trustworthy.
"""
from __future__ import annotations
import json
import re
from typing import Any
try:
    import google.generativeai as genai
except ImportError:  # Optional provider dependency; physics-only mode remains available.
    genai = None
from pydantic import BaseModel, Field

from ..core.config import settings

# ── Configure Gemini when the optional SDK is installed ───────────────────────
if genai is not None:
    genai.configure(api_key=settings.GEMINI_API_KEY)


# ── Data models ──────────────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    role: str   # 'user' | 'assistant'
    content: str


class ActionRecommendation(BaseModel):
    param_key: str
    param_name: str
    current_value: Any
    recommended_value: Any
    unit: str
    rationale: str


class CopilotRequest(BaseModel):
    well_id: str = "BGW-01"
    message: str
    history: list[ChatMessage] = Field(default_factory=list)
    role: str = "field_engineer"     # field_engineer | reservoir_expert | executive
    current_page: str = ""
    twin_context: dict = Field(default_factory=dict)  # live twin snapshot


class CopilotResponse(BaseModel):
    reply: str
    model_used: str
    suggested_actions: list[ActionRecommendation] = Field(default_factory=list)
    quick_prompts: list[str] = Field(default_factory=list)
    physics_answered: bool = False   # True = answered from physics alone (no LLM call)


# ── System prompts by role ────────────────────────────────────────────────────
SYSTEM_PROMPTS = {
    "field_engineer": """You are BaghewalaOS AI Copilot — a real-time petroleum engineering assistant
for the Baghewala Heavy Oil Field, Rajasthan, operated by Oil India Limited.

You have access to live digital twin telemetry. Your job:
1. Diagnose operational issues (rod float, pump unseating, high viscosity)
2. Recommend immediate SPM/VFD adjustments with safety reasoning
3. Explain what the physics tell us in plain language
4. Flag when to call for field intervention

Baghewala Field Facts:
- Heavy crude: 17.5° API, ~3200 cP at 47°C reservoir temp
- Jodhpur Sandstone formation, ~1100m depth
- CSS (Cyclic Steam Stimulation) + SRP (Sucker Rod Pump) operations
- Critical problem: rod floating when CSS heat front decays — viscosity at rod string
  is governed by TUBING temperature (cold top), NOT reservoir temperature

Always ground your answers in the physics context provided.
Be concise, actionable, and safety-first. Use bullet points.""",

    "reservoir_expert": """You are BaghewalaOS Reservoir Engineering AI for Baghewala Field (OIL India).

You specialize in:
- CSS cycle design (steam volume, injection rate, pressure, soak time, cutoff)
- Thermal EOR physics (Marx-Langenheim steam zone, Andrade viscosity)
- SOR optimization and steam-oil economics
- Near-well heated zone material balance

Provide technical depth. Use engineering notation. Reference API RP 11L where applicable.
Always cite which physics model drives your recommendation.""",

    "executive": """You are BaghewalaOS Executive Dashboard AI for Oil India Limited field management.

Focus on:
- Field-level KPIs: total BOPD, average SOR, field NPV, equipment health score
- Risk summary: predicted failures in next 30 days
- Resource allocation recommendations across wells
- Cost/barrel and steam efficiency comparisons

Keep language non-technical. Use metrics tables. Focus on business impact."""
}


# ── Physics Grounding Gate ────────────────────────────────────────────────────
PHYSICS_KEYWORDS = {
    "current spm": "spm", "current speed": "spm", "rod float": "rod_float_risk",
    "float risk": "rod_float_risk", "viscosity": "in_situ_viscosity",
    "temperature": "reservoir_temperature", "production rate": "production_rate_bopd",
    "oil rate": "production_rate_bopd", "sor": "sor", "steam oil ratio": "sor",
    "rod stress": "rod_stress", "pump fillage": "pump_fillage",
    "failure probability": "failure_probability", "equipment health": "equipment_health",
    "phase": "phase", "cycle day": "cycle_day", "npv": "net_operating_value"
}

def _physics_gate(message: str, twin: dict) -> str | None:
    """Return a physics-only answer if the question is directly answerable from twin state."""
    if not twin:
        return None
    msg_lower = message.lower()
    direct_answers = []
    for kw, field in PHYSICS_KEYWORDS.items():
        if kw in msg_lower:
            val = twin.get(field) or (twin.get("economics", {}) or {}).get(field) or (twin.get("srp", {}) or {}).get("pump_fillage")
            if val is not None:
                direct_answers.append(f"**{field.replace('_', ' ').title()}**: {val}")
    if len(direct_answers) >= 1 and ("what is" in msg_lower or "current" in msg_lower or "show" in msg_lower or "status" in msg_lower):
        return "From live twin state:\n" + "\n".join(f"• {a}" for a in direct_answers)
    return None


# ── Main Copilot class ────────────────────────────────────────────────────────
class BaghewalaAICopilot:
    def __init__(self):
        self.flash_model = None
        self.pro_model = None
        if genai is not None:
            self.flash_model = genai.GenerativeModel(settings.GEMINI_FLASH_MODEL)
            self.pro_model = genai.GenerativeModel(settings.GEMINI_MODEL)

    def _build_twin_context_str(self, twin: dict) -> str:
        if not twin:
            return ""
        lines = [
            f"Well: {twin.get('well_id','?')} | Phase: {twin.get('phase','?')} | Cycle Day: {twin.get('cycle_day','?')}",
            f"Reservoir Temp: {twin.get('reservoir_temperature','?')}°C | In-situ Viscosity: {twin.get('in_situ_viscosity','?')} cP",
            f"Oil Rate: {twin.get('production_rate_bopd','?')} BOPD | SOR: {twin.get('sor','?')}",
            f"Rod Float Risk: {twin.get('rod_float_risk','?')} | Rod Stress: {twin.get('rod_stress','?')} MPa",
            f"SPM: {twin.get('spm','?')} | VFD: {twin.get('vfd_frequency','?')}%",
            f"Equipment Health: {twin.get('equipment_health','?')} | Failure Prob: {twin.get('failure_probability','?')}",
            f"Pump Fillage: {(twin.get('srp') or {}).get('pump_fillage','?')}%",
            f"NPV (30d): ₹{(twin.get('economics') or {}).get('net_operating_value','?')}",
        ]
        return "\n".join(lines)

    def _extract_actions(self, reply: str, twin: dict) -> list[ActionRecommendation]:
        """Parse LLM reply to extract structured action recommendations."""
        actions = []
        spm_match = re.search(r"SPM.{0,20}(\d+\.?\d*)", reply, re.IGNORECASE)
        if spm_match and twin.get("spm"):
            new_spm = float(spm_match.group(1))
            if abs(new_spm - twin["spm"]) > 0.2:
                actions.append(ActionRecommendation(
                    param_key="spm", param_name="Strokes Per Minute",
                    current_value=twin["spm"], recommended_value=new_spm, unit="spm",
                    rationale="AI Copilot recommendation based on current operating conditions."
                ))
        steam_match = re.search(r"steam.{0,30}(\d{3,4})\s*(tonnes|m3)", reply, re.IGNORECASE)
        if steam_match:
            new_steam = float(steam_match.group(1))
            actions.append(ActionRecommendation(
                param_key="steam_volume", param_name="Steam Volume",
                current_value=twin.get("steam_injected", "?"),
                recommended_value=new_steam, unit=steam_match.group(2),
                rationale="AI Copilot CSS cycle design recommendation."
            ))
        return actions

    def _quick_prompts(self, twin: dict, role: str) -> list[str]:
        base = [
            "What is the rod float risk right now?",
            "Should I reduce SPM? Show reasoning.",
            "When should we start the next CSS cycle?",
            "What's the SOR and how to improve it?",
        ]
        if twin.get("rod_float_risk", 0) > 0.35:
            base.insert(0, "🚨 Rod float risk is high — what should I do immediately?")
        if twin.get("failure_probability", 0) > 0.35:
            base.insert(0, "⚠️ High failure probability — show maintenance plan")
        if role == "executive":
            return [
                "Show field-level production summary",
                "Which well needs attention most urgently?",
                "What is the projected NPV for next 30 days?",
                "Show steam cost vs oil revenue breakdown"
            ]
        return base[:4]

    async def chat(self, request: CopilotRequest) -> CopilotResponse:
        twin = request.twin_context

        # 1. Physics grounding gate — answer without LLM if possible
        physics_answer = _physics_gate(request.message, twin)
        if physics_answer:
            return CopilotResponse(
                reply=physics_answer,
                model_used="physics_twin_direct",
                quick_prompts=self._quick_prompts(twin, request.role),
                physics_answered=True
            )

        # 2. Build system prompt + twin context
        system = SYSTEM_PROMPTS.get(request.role, SYSTEM_PROMPTS["field_engineer"])
        twin_ctx = self._build_twin_context_str(twin)
        if twin_ctx:
            system += f"\n\n--- LIVE TWIN STATE ---\n{twin_ctx}"

        # 3. Build conversation history for Gemini
        gemini_history = []
        for msg in request.history[-6:]:    # last 6 messages
            role_map = {"user": "user", "assistant": "model"}
            gemini_history.append({
                "role": role_map.get(msg.role, "user"),
                "parts": [msg.content]
            })

        # 4. Choose model — use flash for simple, pro for complex
        is_complex = any(kw in request.message.lower() for kw in [
            "optimize", "pareto", "simulate", "horizon", "explain", "design css", "what if"
        ])
        model = self.pro_model if is_complex else self.flash_model

        if model is None:
            return CopilotResponse(
                reply=(
                    "⚙️ Gemini SDK is not installed, so Copilot is running in physics-only fallback mode.\n\n"
                    f"**Current Well State:**\n{self._build_twin_context_str(twin) or 'No twin data available.'}\n\n"
                    "Install the optional `google-generativeai` dependency to enable LLM responses."
                ),
                model_used="physics_fallback_dependency_missing",
                suggested_actions=[],
                quick_prompts=self._quick_prompts(twin, request.role),
                physics_answered=False,
            )

        try:
            chat = model.start_chat(history=gemini_history)
            full_prompt = f"{system}\n\nUser: {request.message}"
            response = await chat.send_message_async(full_prompt)
            reply_text = response.text
            model_name = settings.GEMINI_MODEL if is_complex else settings.GEMINI_FLASH_MODEL
        except Exception as e:
            # Graceful fallback to physics-based response
            reply_text = (
                f"⚙️ AI Copilot is using physics-only mode (API error: {str(e)[:60]}).\n\n"
                f"**Current Well State:**\n{self._build_twin_context_str(twin) or 'No twin data available.'}\n\n"
                "Please check your network connection or API key."
            )
            model_name = "physics_fallback"

        actions = self._extract_actions(reply_text, twin)
        return CopilotResponse(
            reply=reply_text,
            model_used=model_name,
            suggested_actions=actions,
            quick_prompts=self._quick_prompts(twin, request.role),
            physics_answered=False
        )


# Singleton instance
copilot = BaghewalaAICopilot()
