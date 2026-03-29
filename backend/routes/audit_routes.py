"""
routes/audit_routes.py
GET /api/audit/logs      — paginated log list
GET /api/audit/logs/:id  — single session detail
GET /api/audit/stats     — dashboard statistics
"""

import logging
from flask import Blueprint, request, jsonify

from services import audit_logger
from utils.helpers import success_response, error_response

logger = logging.getLogger(__name__)
audit_bp = Blueprint("audit", __name__)


@audit_bp.route("/audit/logs", methods=["GET"])
def list_logs():
    try:
        limit  = min(int(request.args.get("limit",  50)), 200)
        skip   = max(int(request.args.get("skip",    0)), 0)
        status = request.args.get("compliance_status")   # optional filter

        logs = audit_logger.get_all_logs(limit=limit, skip=skip, compliance_filter=status)
        return jsonify(success_response({"logs": logs, "count": len(logs)})[0]), 200
    except Exception as exc:
        logger.error("audit list error: %s", exc)
        return jsonify(error_response("Failed to retrieve logs.", status=500)[0]), 500


@audit_bp.route("/audit/logs/<session_id>", methods=["GET"])
def get_log(session_id: str):
    doc = audit_logger.get_log_by_session(session_id)
    if not doc:
        return jsonify(error_response(f"No log found for session '{session_id}'.", status=404)[0]), 404
    return jsonify(success_response(doc)[0]), 200


@audit_bp.route("/audit/stats", methods=["GET"])
def get_stats():
    stats = audit_logger.get_stats()
    return jsonify(success_response(stats)[0]), 200
