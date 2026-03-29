"""
utils/helpers.py  —  Input validation, response formatting, misc helpers
"""

import json
import re
import time
from typing import Dict, Any, List, Tuple, Optional


# ─────────────────────────────────────────────────────────────────────────────
#  INPUT VALIDATION
# ─────────────────────────────────────────────────────────────────────────────

REQUIRED_FIELDS = ["crop_type", "soil_condition", "weather", "farmer_query"]

MAX_LENGTHS = {
    "crop_type":      100,
    "soil_condition": 500,
    "weather":        500,
    "farmer_query":   2000,
    "farmer_name":    100,
    "region":         100,
}


def validate_input(data: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """
    Validates raw request JSON.
    Returns (is_valid, list_of_error_messages).
    """
    errors: List[str] = []

    if not isinstance(data, dict):
        return False, ["Request body must be a JSON object."]

    # Required fields
    for field in REQUIRED_FIELDS:
        val = data.get(field, "")
        if not val or not str(val).strip():
            errors.append(f"'{field}' is required and cannot be empty.")

    # Length limits
    for field, max_len in MAX_LENGTHS.items():
        val = data.get(field, "")
        if val and len(str(val)) > max_len:
            errors.append(f"'{field}' exceeds maximum length of {max_len} characters.")

    # Numeric validation
    land = data.get("land_size_acres")
    if land is not None:
        try:
            f = float(land)
            if f <= 0 or f > 10000:
                errors.append("'land_size_acres' must be between 0 and 10,000.")
        except (TypeError, ValueError):
            errors.append("'land_size_acres' must be a number.")

    return len(errors) == 0, errors


# ─────────────────────────────────────────────────────────────────────────────
#  RESPONSE BUILDER
# ─────────────────────────────────────────────────────────────────────────────

def success_response(data: Dict[str, Any], status: int = 200) -> Tuple[Dict, int]:
    return {"success": True, "data": data}, status


def error_response(message: str, errors: Optional[List[str]] = None, status: int = 400) -> Tuple[Dict, int]:
    body: Dict[str, Any] = {"success": False, "error": message}
    if errors:
        body["errors"] = errors
    return body, status


# ─────────────────────────────────────────────────────────────────────────────
#  META EXTRACTION
# ─────────────────────────────────────────────────────────────────────────────

def extract_meta(recommendation: str) -> Tuple[str, Dict[str, Any]]:
    """
    The ai_engine appends __META__{json} to the recommendation text.
    Split it out and return (clean_text, meta_dict).
    """
    marker = "__META__"
    if marker in recommendation:
        parts = recommendation.split(marker, 1)
        clean_text = parts[0].strip()
        try:
            meta = json.loads(parts[1].strip())
        except (json.JSONDecodeError, IndexError):
            meta = {}
        return clean_text, meta
    return recommendation, {}


# ─────────────────────────────────────────────────────────────────────────────
#  RISK LEVEL
# ─────────────────────────────────────────────────────────────────────────────

def determine_risk_level(
    violations: List[str],
    warnings: List[str],
    confidence: float,
    ai_risk: str = "Medium",
) -> str:
    """Compute final risk level from compliance + confidence."""
    if violations:
        return "Critical" if len(violations) >= 2 else "High"
    if warnings and confidence < 0.6:
        return "High"
    if warnings:
        return "Medium"
    if confidence < 0.65:
        return "Medium"
    # Use AI's own assessment if clean
    return ai_risk if ai_risk in ("Low", "Medium", "High", "Critical") else "Medium"


# ─────────────────────────────────────────────────────────────────────────────
#  TIMER
# ─────────────────────────────────────────────────────────────────────────────

class Timer:
    def __init__(self):
        self._start = time.time()

    def elapsed_ms(self) -> int:
        return int((time.time() - self._start) * 1000)
