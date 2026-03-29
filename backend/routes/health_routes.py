"""
routes/health_routes.py
GET /api/health   — system health check
GET /api/rules    — rules summary
"""

import logging
from flask import Blueprint, jsonify

from config.db import get_db
from services.rule_engine import get_rules_summary
from utils.helpers import success_response

logger = logging.getLogger(__name__)
health_bp = Blueprint("health", __name__)


@health_bp.route("/health", methods=["GET"])
def health():
    db_ok = get_db() is not None
    return jsonify(success_response({
        "status": "healthy",
        "database": "mongodb" if db_ok else "memory_fallback",
        "ai_engine": "claude-sonnet-4-20250514",
        "version": "2.0.0",
    })[0]), 200


@health_bp.route("/rules", methods=["GET"])
def rules_info():
    return jsonify(success_response(get_rules_summary())[0]), 200
