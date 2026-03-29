"""
routes/advisory_routes.py
POST /api/advisory  —  Main farmer advisory endpoint
"""

import logging
from flask import Blueprint, request, jsonify

from models.advisory_model import (
    FarmerInput, AdvisoryResponse, AuditLogDocument, ReasoningStep,
)
from services import ai_engine, rule_engine, audit_logger
from utils.helpers import (
    validate_input, success_response, error_response,
    extract_meta, determine_risk_level, Timer,
)

logger = logging.getLogger(__name__)
advisory_bp = Blueprint("advisory", __name__)


# ─────────────────────────────────────────────────────────────────────────────
#  POST /api/advisory
# ─────────────────────────────────────────────────────────────────────────────

@advisory_bp.route("/advisory", methods=["POST"])
def get_advisory():
    timer = Timer()
    data = request.get_json(silent=True) or {}

    # ── 1. Validate input ────────────────────────────────────────────────────
    is_valid, errors = validate_input(data)
    if not is_valid:
        return jsonify(error_response(
            "Invalid input. Please correct the errors below.", errors
        )[0]), 400

    farmer = FarmerInput.from_dict(data)

    # ─────────────────────────────────────────────────────────────────────
    # ✅ DEMO MODE (FIXED + AUDIT LOGGING)
    # ─────────────────────────────────────────────────────────────────────
    if is_demo_input(data):
        demo = demo_response()

        audit_doc = AuditLogDocument(
            session_id=farmer.session_id,
            timestamp=__import__("datetime").datetime.utcnow().isoformat(),
            farmer_input=farmer.to_dict(),
            reasoning_steps=demo["reasoning_steps"],
            rules_triggered=["DEMO MODE"],
            compliance_status=demo["compliance_status"],
            violations=[],
            final_recommendation=demo["final_recommendation"],
            risk_level=demo["risk_level"],
            confidence_score=demo["confidence_score"],
            raw_ai_response="DEMO_RESPONSE",
            processing_time_ms=timer.elapsed_ms(),
        )

        audit_logger.log_advisory(audit_doc)

        return jsonify({
            "success": True,
            "data": {
                "recommendation": demo["final_recommendation"],
                "risk_level": demo["risk_level"],
                "compliance_status": demo["compliance_status"],
                "violations": [],
                "warnings": [],
                "reasoning": demo["reasoning_steps"],
                "confidence_score": demo["confidence_score"],
                "immediate_actions": [
                    "Apply urea in split doses (20-25 kg/acre)",
                    "Ensure proper irrigation after fertilizer application"
                ],
                "avoid_actions": [
                    "Avoid overuse of nitrogen fertilizer",
                    "Do not apply fertilizer without irrigation"
                ],
                "relevant_schemes": ["PM-KISAN", "Soil Health Card"],
                "farmer_name": farmer.farmer_name,
                "crop_type": farmer.crop_type,
                "needs_clarification": False,
                "clarification_questions": []
            }
        }), 200

    # ── 2. Missing-field clarification guard ─────────────────────────────────
    missing = farmer.missing_fields()
    if missing:
        return jsonify({
            "success": False,
            "needs_clarification": True,
            "clarification_questions": [
                f"Please provide: {f.replace('_', ' ').title()}" for f in missing
            ],
            "error": "Some required fields are missing.",
        }), 422

    # ── 3. AI Reasoning ──────────────────────────────────────────────────────
    logger.info("Advisory request — session: %s crop: %s", farmer.session_id, farmer.crop_type)

    (
        recommendation_raw,
        reasoning_steps,
        confidence,
        needs_clarification,
        clarification_questions,
    ) = ai_engine.generate_advisory(farmer)

    # ── 4. Extract metadata ──────────────────────────────────────────────────
    recommendation_text, meta = extract_meta(recommendation_raw)
    immediate_actions = meta.get("immediate_actions", [])
    avoid_actions     = meta.get("avoid_actions", [])
    ai_risk_level     = meta.get("risk_level", "Medium")
    relevant_schemes  = meta.get("relevant_schemes", [])

    # ── 5. Rule Engine Validation ────────────────────────────────────────────
    compliance_result = rule_engine.validate(
        ai_text=recommendation_text,
        farmer_input=farmer.to_dict(),
        reasoning_steps=[s.to_dict() for s in reasoning_steps],
    )

    reasoning_steps.append(ReasoningStep(
        step_type="GUARDRAIL",
        label="Compliance Validation",
        content=(
            f"Rule engine checked {len(compliance_result.rules_checked)} rule sets. "
            f"Status: {compliance_result.status}. "
            f"Violations: {len(compliance_result.violations)}. "
            f"Warnings: {len(compliance_result.warnings)}."
        ),
        source="AgroMind RuleEngine v2024",
        triggered=compliance_result.status == "Blocked",
    ))

    # ── 6. Final values ──────────────────────────────────────────────────────
    final_recommendation = (
        compliance_result.modified_recommendation
        if compliance_result.modified_recommendation
        else recommendation_text
    )

    risk_level = determine_risk_level(
        compliance_result.violations,
        compliance_result.warnings,
        confidence,
        ai_risk_level,
    )

    if confidence < 0.65 and not needs_clarification:
        compliance_result.warnings.append(
            f"LOW CONFIDENCE: Advisory confidence is {confidence:.0%}. "
            "Cross-check with your local KVK or agriculture officer."
        )

    # ── 7. Audit Log ─────────────────────────────────────────────────────────
    audit_doc = AuditLogDocument(
        session_id=farmer.session_id,
        timestamp=__import__("datetime").datetime.utcnow().isoformat(),
        farmer_input=farmer.to_dict(),
        reasoning_steps=[s.to_dict() for s in reasoning_steps],
        rules_triggered=compliance_result.violations + compliance_result.warnings,
        compliance_status=compliance_result.status,
        violations=compliance_result.violations,
        final_recommendation=final_recommendation,
        risk_level=risk_level,
        confidence_score=confidence,
        raw_ai_response=recommendation_raw,
        processing_time_ms=timer.elapsed_ms(),
    )

    audit_logger.log_advisory(audit_doc)

    # ── 8. Response ──────────────────────────────────────────────────────────
    response = AdvisoryResponse(
        session_id=farmer.session_id,
        recommendation=final_recommendation,
        risk_level=risk_level,
        compliance_status=compliance_result.status,
        violations=compliance_result.violations,
        warnings=compliance_result.warnings,
        reasoning=[s.to_dict() for s in reasoning_steps],
        confidence_score=confidence,
        immediate_actions=immediate_actions,
        avoid_actions=avoid_actions,
        relevant_schemes=relevant_schemes,
        farmer_name=farmer.farmer_name,
        crop_type=farmer.crop_type,
        needs_clarification=needs_clarification,
        clarification_questions=clarification_questions,
    )

    return jsonify(success_response(response.to_dict())[0]), 200


# ─────────────────────────────────────────────────────────────────────────────
#  DEMO HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def is_demo_input(data):
    return (
        "wheat" in data.get("crop_type", "").lower() and
        "punjab" in data.get("region", "").lower() and
        "yellow" in data.get("farmer_query", "").lower()
    )


def demo_response():
    return {
        "final_recommendation": (
            "The yellowing of wheat leaves is likely due to nitrogen deficiency. "
            "Apply urea in split doses (20-25 kg/acre) and ensure proper irrigation."
        ),
        "risk_level": "Low",
        "confidence_score": 0.92,
        "compliance_status": "Approved",
        "violations": [],
        "reasoning_steps": [
            {"step_type": "DATA", "label": "Input Analysis", "content": "Wheat + yellowing"},
            {"step_type": "ANALYSIS", "label": "Diagnosis", "content": "Nitrogen deficiency"},
            {"step_type": "RULE_CHECK", "label": "Compliance", "content": "Safe dosage"},
            {"step_type": "ACTION", "label": "Recommendation", "content": "Apply urea"}
        ]
    }