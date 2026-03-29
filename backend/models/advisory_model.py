"""
models/advisory_model.py — Data models for advisory requests and responses
"""

from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid


# ─────────────────────────────────────────────
#  REQUEST
# ─────────────────────────────────────────────

@dataclass
class FarmerInput:
    crop_type:       str
    soil_condition:  str
    weather:         str
    farmer_query:    str
    region:          Optional[str] = "india"
    land_size_acres: Optional[float] = None
    farmer_name:     Optional[str] = "Farmer"
    season:          Optional[str] = "kharif"
    irrigation_type: Optional[str] = None
    previous_crops:  Optional[str] = None
    session_id:      str = field(default_factory=lambda: str(uuid.uuid4()))

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "FarmerInput":
        known = {k: v for k, v in data.items() if k in cls.__dataclass_fields__}
        return cls(**known)

    def missing_fields(self) -> List[str]:
        required = ["crop_type", "soil_condition", "weather", "farmer_query"]
        return [f for f in required if not getattr(self, f, "").strip()]


# ─────────────────────────────────────────────
#  REASONING STEP
# ─────────────────────────────────────────────

@dataclass
class ReasoningStep:
    step_type:   str          # DATA | RULE_CHECK | GUARDRAIL | ANALYSIS | ACTION
    label:       str
    content:     str
    source:      Optional[str] = None
    triggered:   bool = False  # True when a guardrail fires

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# ─────────────────────────────────────────────
#  COMPLIANCE RESULT
# ─────────────────────────────────────────────

@dataclass
class ComplianceResult:
    status:     str                   # "Approved" | "Blocked" | "Modified"
    violations: List[str] = field(default_factory=list)
    warnings:   List[str] = field(default_factory=list)
    rules_checked: List[str] = field(default_factory=list)
    modified_recommendation: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# ─────────────────────────────────────────────
#  ADVISORY RESPONSE
# ─────────────────────────────────────────────

@dataclass
class AdvisoryResponse:
    session_id:        str
    recommendation:    str
    risk_level:        str            # Low | Medium | High | Critical
    compliance_status: str            # Approved | Blocked | Modified
    violations:        List[str]
    warnings:          List[str]
    reasoning:         List[Dict]
    confidence_score:  float          # 0.0 – 1.0
    immediate_actions: List[str]
    avoid_actions:     List[str]
    relevant_schemes:  List[str]
    timestamp:         str = field(default_factory=lambda: datetime.utcnow().isoformat())
    farmer_name:       str = "Farmer"
    crop_type:         str = ""
    needs_clarification: bool = False
    clarification_questions: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# ─────────────────────────────────────────────
#  AUDIT LOG DOCUMENT
# ─────────────────────────────────────────────

@dataclass
class AuditLogDocument:
    session_id:        str
    timestamp:         str
    farmer_input:      Dict[str, Any]
    reasoning_steps:   List[Dict]
    rules_triggered:   List[str]
    compliance_status: str
    violations:        List[str]
    final_recommendation: str
    risk_level:        str
    confidence_score:  float
    raw_ai_response:   Optional[str] = None
    processing_time_ms: Optional[int] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
