"""
services/audit_logger.py
Stores every advisory session in MongoDB with full immutable audit trail.
Falls back to in-memory list if MongoDB is unavailable.
"""

import logging
from datetime import datetime
from typing import Dict, Any, List, Optional

from config.db import get_db
from models.advisory_model import AuditLogDocument

logger = logging.getLogger(__name__)

# ── In-memory fallback ────────────────────────────────────────────────────────
_memory_store: List[Dict[str, Any]] = []
MAX_MEMORY = 500


# ─────────────────────────────────────────────────────────────────────────────
#  WRITE
# ─────────────────────────────────────────────────────────────────────────────

def log_advisory(doc: AuditLogDocument) -> str:
    """
    Persist advisory to MongoDB (or memory).
    Returns the inserted/stored id.
    """
    data = doc.to_dict()
    data["_created_at"] = datetime.utcnow()

    db = get_db()
    if db is not None:
        try:
            result = db.audit_logs.insert_one(data)
            _id = str(result.inserted_id)
            logger.info("Audit saved to MongoDB — session: %s", doc.session_id)
            return _id
        except Exception as exc:
            logger.error("MongoDB write failed (%s) — falling back to memory", exc)

    # Memory fallback
    data["_id"] = f"mem_{len(_memory_store)}"
    _memory_store.append(data)
    if len(_memory_store) > MAX_MEMORY:
        _memory_store.pop(0)   # FIFO eviction
    logger.info("Audit saved to memory — session: %s", doc.session_id)
    return data["_id"]


# ─────────────────────────────────────────────────────────────────────────────
#  READ
# ─────────────────────────────────────────────────────────────────────────────

def get_all_logs(
    limit: int = 50,
    skip: int = 0,
    compliance_filter: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Return recent audit logs, newest first."""
    db = get_db()
    if db is not None:
        try:
            query: Dict[str, Any] = {}
            if compliance_filter:
                query["compliance_status"] = compliance_filter

            cursor = (
                db.audit_logs
                .find(query, {"_id": 0, "raw_ai_response": 0})
                .sort("timestamp", -1)
                .skip(skip)
                .limit(limit)
            )
            return list(cursor)
        except Exception as exc:
            logger.error("MongoDB read failed: %s", exc)

    # Memory fallback
    logs = _memory_store[:]
    if compliance_filter:
        logs = [l for l in logs if l.get("compliance_status") == compliance_filter]
    logs.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    # Strip internal fields
    return [
        {k: v for k, v in l.items() if k not in ("_id", "_created_at", "raw_ai_response")}
        for l in logs[skip: skip + limit]
    ]


def get_log_by_session(session_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve a single log by session_id."""
    db = get_db()
    if db is not None:
        try:
            doc = db.audit_logs.find_one(
                {"session_id": session_id}, {"_id": 0}
            )
            return doc
        except Exception as exc:
            logger.error("MongoDB lookup failed: %s", exc)

    # Memory
    for l in reversed(_memory_store):
        if l.get("session_id") == session_id:
            return {k: v for k, v in l.items() if k not in ("_id", "_created_at")}
    return None


def get_stats() -> Dict[str, Any]:
    """Return aggregate statistics for the dashboard."""
    db = get_db()
    if db is not None:
        try:
            total = db.audit_logs.count_documents({})
            approved = db.audit_logs.count_documents({"compliance_status": "Approved"})
            blocked  = db.audit_logs.count_documents({"compliance_status": "Blocked"})
            modified = db.audit_logs.count_documents({"compliance_status": "Modified"})
            high_risk = db.audit_logs.count_documents({"risk_level": {"$in": ["High", "Critical"]}})
            return {
                "total": total,
                "approved": approved,
                "blocked": blocked,
                "modified": modified,
                "high_risk": high_risk,
                "storage": "mongodb",
            }
        except Exception as exc:
            logger.error("Stats query failed: %s", exc)

    # Memory
    total    = len(_memory_store)
    approved = sum(1 for l in _memory_store if l.get("compliance_status") == "Approved")
    blocked  = sum(1 for l in _memory_store if l.get("compliance_status") == "Blocked")
    modified = sum(1 for l in _memory_store if l.get("compliance_status") == "Modified")
    high_risk = sum(1 for l in _memory_store if l.get("risk_level") in ("High", "Critical"))
    return {
        "total": total,
        "approved": approved,
        "blocked": blocked,
        "modified": modified,
        "high_risk": high_risk,
        "storage": "memory",
    }
