"""
services/rule_engine.py
Validates AI-generated recommendations against ICAR / CIB&RC / FSSAI rules.
Returns safe/unsafe verdict with detailed violation list.
"""

import json
import logging
import os
import re
from typing import List, Dict, Any, Tuple

from models.advisory_model import ComplianceResult

logger = logging.getLogger(__name__)

# ── Load rules JSON once at import time ──────────────────────────────────────
_RULES_PATH = os.path.join(os.path.dirname(__file__), "..", "config", "rules.json")

with open(_RULES_PATH, "r") as f:
    RULES: Dict[str, Any] = json.load(f)


# ─────────────────────────────────────────────────────────────────────────────
#  PUBLIC ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────

def validate(
    ai_text: str,
    farmer_input: Dict[str, Any],
    reasoning_steps: List[Dict],
) -> ComplianceResult:
    """
    Full compliance pass over the AI text + context.
    Returns a ComplianceResult with status Approved | Modified | Blocked.
    """
    violations: List[str] = []
    warnings:   List[str] = []
    rules_checked: List[str] = []
    modified_text: str = ai_text

    text_lower = ai_text.lower()
    crop = farmer_input.get("crop_type", "").lower()
    region = farmer_input.get("region", "india").lower()

    # ── 1. Banned Pesticides ─────────────────────────────────────────────────
    rules_checked.append("banned_pesticides")
    for pest in RULES.get("banned_pesticides", []):
        if pest.replace("_", " ") in text_lower or pest in text_lower:
            violations.append(
                f"BANNED PESTICIDE DETECTED: '{pest}' is prohibited under CIB&RC / Pesticide Act 1968."
            )
            modified_text = _redact_and_replace(modified_text, pest)

    # ── 2. Restricted Pesticides ─────────────────────────────────────────────
    rules_checked.append("restricted_pesticides")
    for pest, rules in RULES.get("restricted_pesticides", {}).items():
        if pest.replace("_", " ") in text_lower or pest in text_lower:
            prohibited_crops = rules.get("prohibited_crops", [])
            if any(pc in crop for pc in prohibited_crops):
                violations.append(
                    f"RESTRICTED USE VIOLATION: '{pest}' is prohibited on {crop}. "
                    f"Note: {rules.get('note', '')}"
                )
            elif rules.get("requires_license"):
                warnings.append(
                    f"LICENSE REQUIRED: '{pest}' needs a licensed applicator. {rules.get('note', '')}"
                )
            else:
                warnings.append(
                    f"RESTRICTED PESTICIDE: '{pest}' — check dose limits. {rules.get('note', '')}"
                )

    # ── 3. Fertilizer Dosage ─────────────────────────────────────────────────
    rules_checked.append("fertilizer_dosage")
    fert_limits = RULES.get("fertilizer_dosage_limits_kg_per_acre", {})
    for fert, limit_info in fert_limits.items():
        fert_display = fert.replace("_", " ")
        # Look for patterns like "100 kg urea" or "urea 100 kg"
        pattern = rf"(\d+)\s*kg[/\s]*(?:per\s*)?(?:acre\s*)?{re.escape(fert_display)}"
        matches = re.findall(pattern, text_lower)
        pattern2 = rf"{re.escape(fert_display)}[^.]*?(\d+)\s*kg"
        matches += re.findall(pattern2, text_lower)
        for m in matches:
            try:
                dose = int(m)
                if dose > limit_info["max"]:
                    violations.append(
                        f"DOSAGE VIOLATION: {fert_display} recommended at {dose} kg/acre "
                        f"exceeds limit of {limit_info['max']} kg/acre per application."
                    )
            except ValueError:
                pass

    # ── 4. Crop-specific Rules ───────────────────────────────────────────────
    rules_checked.append("crop_specific_rules")
    crop_rules = RULES.get("crop_specific_rules", {})
    for crop_key, crules in crop_rules.items():
        if crop_key in crop:
            # Extra banned for this crop
            for extra_banned in crules.get("banned_pesticides_extra", []):
                if extra_banned.replace("_", " ") in text_lower:
                    violations.append(
                        f"CROP-SPECIFIC BAN: '{extra_banned}' is banned for {crop_key}. "
                        f"{crules.get('note', '')}"
                    )
            # Prohibited actions
            for prohibited in crules.get("prohibited", []):
                if prohibited.replace("_", " ") in text_lower:
                    violations.append(
                        f"PROHIBITED PRACTICE: '{prohibited}' is not allowed for {crop_key}. "
                        f"{crules.get('note', '')}"
                    )
            # Nitrogen limit warning
            max_n = crules.get("max_nitrogen_kg_per_acre")
            if max_n:
                n_matches = re.findall(r"(\d+)\s*kg[/\s]*(?:per\s*)?acre[^.]*nitrogen", text_lower)
                for nm in n_matches:
                    if int(nm) > max_n:
                        violations.append(
                            f"NITROGEN LIMIT EXCEEDED: {nm} kg/acre recommended but max is {max_n} kg/acre for {crop_key}."
                        )

    # ── 5. Region-specific ──────────────────────────────────────────────────
    rules_checked.append("region_constraints")
    region_rules = RULES.get("region_specific_constraints", {})
    for r_key, r_rules in region_rules.items():
        if r_key in region:
            if r_rules.get("msw_prohibited_burning") and "burn" in text_lower:
                warnings.append(
                    f"STUBBLE BURNING WARNING: Burning is banned in {r_key}. Fine ₹2,500 per incident."
                )

    # ── 6. Water Usage ──────────────────────────────────────────────────────
    rules_checked.append("water_limits")
    water_rules = RULES.get("water_usage_limits", {})
    if "sugarcane" in crop:
        flood_matches = re.findall(r"(\d{3,4})\s*mm", text_lower)
        for wm in flood_matches:
            if int(wm) > water_rules.get("sugarcane_flood_mm_per_year_max", 9999):
                warnings.append(
                    f"WATER USAGE WARNING: {wm}mm exceeds sustainable limit for sugarcane "
                    f"({water_rules['sugarcane_flood_mm_per_year_max']}mm/year)."
                )

    # ── 7. Organic Certification Integrity ──────────────────────────────────
    rules_checked.append("organic_rules")
    organic_rules = RULES.get("organic_certification_rules", {})
    if "organic" in text_lower:
        for prohibited_input in organic_rules.get("prohibited_inputs", []):
            pi_display = prohibited_input.replace("_", " ")
            if pi_display in text_lower and "not" not in text_lower[
                max(0, text_lower.find(pi_display) - 20):text_lower.find(pi_display)
            ]:
                warnings.append(
                    f"ORGANIC INTEGRITY WARNING: '{pi_display}' cannot be used if organic certification is claimed."
                )

    # ── 8. Confidence / Quality Check ────────────────────────────────────────
    rules_checked.append("quality_check")
    uncertain_phrases = [
        "i am not sure", "i don't know", "unclear", "cannot determine",
        "no information", "i'm unsure"
    ]
    if any(p in text_lower for p in uncertain_phrases):
        warnings.append("LOW CONFIDENCE: AI response contains uncertainty markers.")

    # ── Determine Final Status ────────────────────────────────────────────────
    if violations:
        status = "Blocked"
        # Add explicit block note to modified text
        modified_text = (
            f"⚠️ COMPLIANCE BLOCK: This recommendation has been blocked due to regulatory violations.\n"
            f"Violations:\n" + "\n".join(f"• {v}" for v in violations) + "\n\n"
            f"Please consult your local KVK (Krishi Vigyan Kendra) or district agriculture officer "
            f"for a compliant alternative.\n\n"
            f"Partial safe guidance (non-blocked portions):\n{modified_text}"
        )
    elif warnings:
        status = "Modified"
    else:
        status = "Approved"

    logger.info(
        "RuleEngine: status=%s violations=%d warnings=%d",
        status, len(violations), len(warnings)
    )

    return ComplianceResult(
        status=status,
        violations=violations,
        warnings=warnings,
        rules_checked=rules_checked,
        modified_recommendation=modified_text if status != "Approved" else None,
    )


# ─────────────────────────────────────────────────────────────────────────────
#  HELPER
# ─────────────────────────────────────────────────────────────────────────────

def _redact_and_replace(text: str, pesticide: str) -> str:
    """Replace banned pesticide name with a blocked indicator."""
    display = pesticide.replace("_", " ")
    pattern = re.compile(re.escape(display), re.IGNORECASE)
    return pattern.sub(f"[BLOCKED: {display.upper()}]", text)


def get_rules_summary() -> Dict[str, Any]:
    """Return a summary of loaded rules for health/info endpoints."""
    return {
        "version": RULES.get("version"),
        "banned_count": len(RULES.get("banned_pesticides", [])),
        "restricted_count": len(RULES.get("restricted_pesticides", {})),
        "crop_rules_count": len(RULES.get("crop_specific_rules", {})),
        "msp_crops": list(RULES.get("msp_crops_2024_25", {}).keys()),
        "schemes": list(RULES.get("government_schemes", {}).keys()),
    }


def get_msp(crop: str) -> Dict[str, Any]:
    """Look up MSP for a given crop."""
    msp_data = RULES.get("msp_crops_2024_25", {})
    crop_lower = crop.lower().replace(" ", "_")
    for key, val in msp_data.items():
        if crop_lower in key or key in crop_lower:
            return {"crop": key, **val}
    return {}
