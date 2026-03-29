"""
config/db.py  —  MongoDB connection via PyMongo
"""

from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
import logging

logger = logging.getLogger(__name__)

_client = None
_db = None


def init_db(app):
    global _client, _db
    try:
        _client = MongoClient(app.config["MONGO_URI"], serverSelectionTimeoutMS=5000)
        _client.admin.command("ping")           # verify connection
        _db = _client.get_default_database()

        # ── Indexes ───────────────────────────────────────────────────────────
        _db.audit_logs.create_index("session_id")
        _db.audit_logs.create_index("timestamp")
        _db.audit_logs.create_index("compliance_status")

        logger.info("✅ MongoDB connected: %s", app.config["MONGO_URI"])
    except ConnectionFailure as exc:
        logger.warning("⚠️  MongoDB unavailable (%s) — using in-memory fallback", exc)
        _db = None


def get_db():
    return _db


def get_client():
    return _client
