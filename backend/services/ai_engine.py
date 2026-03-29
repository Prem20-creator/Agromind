"""
services/ai_engine.py
Calls Claude API to generate structured agricultural advisory reasoning.
Returns structured steps + recommendation text for rule-engine validation.
"""

import json
import logging
import os
import re
import time
from typing import Dict, Any, List, Tuple
from typing import Optional
import anthropic

from models.advisory_model import FarmerInput, ReasoningStep

logger = logging.getLogger(__name__)

# ── Anthropic client (lazy) ────────────────────────────────────────────────
_client: Optional[anthropic.Anthropic] = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        api_key = os.getenv("ANTHROPIC_API_KEY", "")
        _client = anthropic.Anthropic(api_key=api_key)
    return _client


# ─────────────────────────────────────────────────────────────────────────────
#  SYSTEM PROMPT
# ─────────────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are AgroMind, a domain-specialized agricultural AI agent for Indian smallholder farmers.

You operate under STRICT compliance guardrails:
- ICAR crop science protocols
- CIB&RC pesticide registration rules (Pesticide Act 1968)
- FSSAI food safety / MRL standards
- Government scheme policies (PM-KISAN, PMFBY, PKVY, RKVY, KCC)
- Water regulations (CGWB, state water acts)
- NPOP organic certification

YOUR RESPONSE MUST BE A VALID JSON OBJECT with this exact structure:
{
  "reasoning_steps": [
    {"step_type": "DATA", "label": "Data Collection", "content": "...", "source": "ICAR-2024"},
    {"step_type": "RULE_CHECK", "label": "Regulatory Review", "content": "...", "source": "CIB&RC"},
    {"step_type": "ANALYSIS", "label": "Problem Analysis", "content": "...", "source": null},
    {"step_type": "GUARDRAIL", "label": "Safety Check", "content": "...", "triggered": false},
    {"step_type": "ACTION", "label": "Recommendation", "content": "...", "source": "ICAR"}
  ],
  "recommendation": "Full detailed recommendation text here...",
  "immediate_actions": ["Action 1", "Action 2", "Action 3"],
  "avoid_actions": ["Do NOT do X", "Do NOT do Y"],
  "risk_level": "Low",
  "confidence_score": 0.87,
  "relevant_schemes": ["PM-KISAN", "PMFBY"],
  "needs_clarification": false,
  "clarification_questions": []
}

RULES FOR YOUR RESPONSE:
1. reasoning_steps: Always include 4-6 steps covering DATA → RULE_CHECK → ANALYSIS → GUARDRAIL → ACTION
2. recommendation: 2-4 paragraphs, practical, farmer-friendly language
3. risk_level: exactly "Low", "Medium", "High", or "Critical"
4. confidence_score: float 0.0-1.0 (use lower values when inputs are incomplete)
5. If inputs are missing/ambiguous: set needs_clarification=true and list specific questions
6. NEVER recommend banned pesticides (endosulfan, monocrotophos, methyl_parathion, etc.)
7. NEVER exceed dosage limits (urea max 50 kg/acre/application)
8. Always cite regulations and government schemes
9. Be honest about risks — never mislead farmers
10. Return ONLY the JSON object — no markdown, no preamble"""


# ─────────────────────────────────────────────────────────────────────────────
#  PUBLIC API
# ─────────────────────────────────────────────────────────────────────────────

def generate_advisory(
    farmer_input: FarmerInput,
) -> Tuple[str, List[ReasoningStep], float, bool, List[str]]:
    """
    Call Claude API and parse structured response.

    Returns:
        recommendation_text   (str)
        reasoning_steps       (List[ReasoningStep])
        confidence_score      (float)
        needs_clarification   (bool)
        clarification_questions (List[str])
    """
    start = time.time()

    # Build user message
    user_message = _build_user_message(farmer_input)

    try:
        client = _get_client()
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )

        raw_text = response.content[0].text
        logger.info("Claude responded in %.2fs", time.time() - start)

        parsed = _parse_response(raw_text)

        # Extract fields
        recommendation = parsed.get("recommendation", "")
        confidence = float(parsed.get("confidence_score", 0.7))
        needs_clarification = bool(parsed.get("needs_clarification", False))
        clarification_questions = parsed.get("clarification_questions", [])

        # Build ReasoningStep objects
        steps: List[ReasoningStep] = []
        for s in parsed.get("reasoning_steps", []):
            steps.append(ReasoningStep(
                step_type=s.get("step_type", "ANALYSIS"),
                label=s.get("label", "Step"),
                content=s.get("content", ""),
                source=s.get("source"),
                triggered=bool(s.get("triggered", False)),
            ))

        # Store extra fields in recommendation for downstream use
        extra = {
            "immediate_actions": parsed.get("immediate_actions", []),
            "avoid_actions": parsed.get("avoid_actions", []),
            "risk_level": parsed.get("risk_level", "Medium"),
            "relevant_schemes": parsed.get("relevant_schemes", []),
        }
        # Encode extra metadata as JSON comment at end of recommendation
        recommendation = recommendation + "\n\n__META__" + json.dumps(extra)

        return recommendation, steps, confidence, needs_clarification, clarification_questions

    except anthropic.APIError as exc:
        logger.error("Anthropic API error: %s", exc)
        return _fallback_response(farmer_input, str(exc))

    except Exception as exc:
        logger.exception("Unexpected error in ai_engine: %s", exc)
        return _fallback_response(farmer_input, str(exc))


# ─────────────────────────────────────────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _build_user_message(fi: FarmerInput) -> str:
    parts = [
        f"FARMER ADVISORY REQUEST",
        f"========================",
        f"Farmer Name   : {fi.farmer_name}",
        f"Region        : {fi.region}",
        f"Season        : {fi.season}",
        f"Crop Type     : {fi.crop_type}",
        f"Land Size     : {fi.land_size_acres or 'not specified'} acres",
        f"Soil Condition: {fi.soil_condition}",
        f"Weather       : {fi.weather}",
        f"Irrigation    : {fi.irrigation_type or 'not specified'}",
        f"Previous Crops: {fi.previous_crops or 'not specified'}",
        f"",
        f"FARMER QUERY:",
        f"{fi.farmer_query}",
        f"",
        f"Session ID: {fi.session_id}",
    ]
    return "\n".join(parts)


def _parse_response(raw: str) -> Dict[str, Any]:
    """Extract JSON from Claude's response (handles markdown fences)."""
    # Strip markdown code blocks if present
    text = raw.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to extract first JSON object
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
        logger.warning("Could not parse Claude JSON — returning raw as recommendation")
        return {
            "recommendation": raw,
            "reasoning_steps": [
                {"step_type": "ACTION", "label": "AI Response", "content": raw}
            ],
            "confidence_score": 0.5,
            "risk_level": "Medium",
            "needs_clarification": False,
            "clarification_questions": [],
            "immediate_actions": [],
            "avoid_actions": [],
            "relevant_schemes": [],
        }


def _fallback_response(fi: FarmerInput, error: str):
    """Return a safe fallback when Claude is unavailable."""
    steps = [
        ReasoningStep(
            step_type="ACTION",
            label="System Notice",
            content=(
                f"AI engine temporarily unavailable ({error}). "
                "Please consult your local KVK (Krishi Vigyan Kendra) or "
                "call Kisan Call Centre: 1800-180-1551 (toll-free)."
            ),
            source="AgroMind System",
        )
    ]
    rec = (
        "We're unable to process your query at this moment due to a technical issue. "
        "Please try again shortly or contact the Kisan Call Centre (1800-180-1551) for immediate help."
        "\n\n__META__" + json.dumps({
            "immediate_actions": ["Call Kisan Call Centre: 1800-180-1551"],
            "avoid_actions": [],
            "risk_level": "Low",
            "relevant_schemes": ["Kisan Call Centre"],
        })
    )
    return rec, steps, 0.0, False, []
