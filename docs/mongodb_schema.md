# AgroMind — MongoDB Schema Reference

## Database: `agromind`

---

## Collection: `audit_logs`

Every advisory session is stored here — immutable, append-only.

### Full Document Schema

```json
{
  "_id": "ObjectId (auto)",

  "session_id": "string — UUID v4, unique per request",
  "timestamp":  "string — ISO 8601 UTC e.g. 2024-10-15T08:23:11.000Z",

  "farmer_input": {
    "farmer_name":     "string",
    "crop_type":       "string",
    "soil_condition":  "string",
    "weather":         "string",
    "farmer_query":    "string",
    "region":          "string — lowercase e.g. maharashtra",
    "land_size_acres": "float | null",
    "season":          "string — kharif | rabi | zaid",
    "irrigation_type": "string | null",
    "previous_crops":  "string | null",
    "session_id":      "string — same as top-level"
  },

  "reasoning_steps": [
    {
      "step_type": "string — DATA | RULE_CHECK | ANALYSIS | GUARDRAIL | ACTION",
      "label":     "string — human-readable step name",
      "content":   "string — step detail",
      "source":    "string | null — e.g. ICAR-CICR 2024",
      "triggered": "boolean — true when a guardrail fires"
    }
  ],

  "rules_triggered":  ["string — list of violation/warning messages"],
  "compliance_status": "string — Approved | Blocked | Modified",
  "violations":       ["string — detailed violation descriptions"],

  "final_recommendation": "string — the text shown to farmer",
  "risk_level":           "string — Low | Medium | High | Critical",
  "confidence_score":     "float — 0.0 to 1.0",
  "processing_time_ms":   "integer — end-to-end latency",

  "raw_ai_response":  "string | null — raw Claude output (internal, not exposed in API)",
  "_created_at":      "Date — MongoDB server timestamp"
}
```

### Indexes

```javascript
db.audit_logs.createIndex({ "session_id": 1 })       // unique lookup
db.audit_logs.createIndex({ "timestamp": -1 })        // pagination (newest first)
db.audit_logs.createIndex({ "compliance_status": 1 }) // filter by status
```

### Example Queries

```javascript
// All blocked sessions today
db.audit_logs.find({
  compliance_status: "Blocked",
  timestamp: { $gte: new Date().toISOString().slice(0,10) }
}).sort({ timestamp: -1 })

// Aggregate stats
db.audit_logs.aggregate([
  { $group: {
    _id: "$compliance_status",
    count: { $sum: 1 },
    avg_confidence: { $avg: "$confidence_score" }
  }}
])

// Sessions with violations containing banned pesticide
db.audit_logs.find({
  violations: { $regex: "BANNED PESTICIDE", $options: "i" }
})

// High-risk advisories for cotton
db.audit_logs.find({
  "farmer_input.crop_type": { $regex: "cotton", $options: "i" },
  risk_level: { $in: ["High", "Critical"] }
})
```
