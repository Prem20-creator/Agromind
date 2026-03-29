"""
routes/advisory_routes.py
POST /api/advisory  —  Main farmer advisory endpoint
"""

import logging
from flask import Blueprint, request, jsonify, current_app

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

    # ── 4. Extract metadata embedded by ai_engine ───────────────────────────
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

    # Append rule-engine guardrail step
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

    # ── 6. Determine final values ────────────────────────────────────────────
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

    # Low-confidence warning
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

    # ── 8. Build Response ────────────────────────────────────────────────────
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

    logger.info(
        "Advisory complete — session: %s risk: %s compliance: %s time: %dms",
        farmer.session_id, risk_level, compliance_result.status, timer.elapsed_ms(),
    )
    return jsonify(success_response(response.to_dict())[0]), 200


# ─────────────────────────────────────────────────────────────────────────────
#  GET /api/advisory/demo  —  Demo scenarios
# ─────────────────────────────────────────────────────────────────────────────

@advisory_bp.route("/advisory/demo/<scenario>", methods=["GET"])
def demo_scenario(scenario: str):
    """Return pre-built demo inputs to populate the frontend form."""
    demos = {
        "safe": {
            "farmer_name": "Ramesh Kumar",
            "crop_type": "Cotton (Bt)",
            "soil_condition": "Black cotton soil, pH 7.8, EC 1.6 dS/m, low nitrogen, adequate potassium",
            "weather": "Temperature 34°C, humidity 65%, last rain 8 days ago, forecast rain in 5 days",
            "farmer_query": "My cotton is at 65 days old vegetative stage. Leaves are yellowing at edges. What fertilizer and pest management should I do?",
            "region": "maharashtra",
            "land_size_acres": 3.2,
            "season": "kharif",
            "irrigation_type": "bore-well",
        },
        "blocked": {
            "farmer_name": "Suresh Patil",
            "crop_type": "Cotton",
            "soil_condition": "Red laterite soil, pH 6.5, moderate fertility",
            "weather": "Hot and dry, 38°C, no rain for 15 days",
            "farmer_query": "I have severe bollworm attack on my cotton. My neighbour suggested spraying endosulfan and monocrotophos together for better results. Can I do this?",
            "region": "telangana",
            "land_size_acres": 5.0,
            "season": "kharif",
        },
        "clarification": {
            "farmer_name": "Meena Devi",
            "crop_type": "",
            "soil_condition": "",
            "weather": "Normal monsoon",
            "farmer_query": "What fertilizer should I use?",
            "region": "rajasthan",
        },
    }
    if scenario not in demos:
        return jsonify(error_response(
            f"Unknown demo scenario '{scenario}'. Available: safe, blocked, clarification"
        )[0]), 404
    return jsonify({"success": True, "demo_input": demos[scenario]}), 200
