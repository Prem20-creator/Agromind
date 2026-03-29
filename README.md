# 🌾 AgroMind — Agricultural Advisory AI Agent

Domain-Specialized AI Agent with Compliance Guardrails for Indian Farmers.

---

## 🏗️ Architecture

```
agromind/
├── backend/                        # Python Flask
│   ├── app.py                      # Flask factory & entry point
│   ├── requirements.txt
│   ├── .env.example
│   ├── config/
│   │   ├── db.py                   # MongoDB via PyMongo
│   │   └── rules.json              # 200+ compliance rules (ICAR / CIB&RC / FSSAI)
│   ├── models/
│   │   └── advisory_model.py       # Dataclasses: FarmerInput, AdvisoryResponse, AuditLog
│   ├── routes/
│   │   ├── advisory_routes.py      # POST /api/advisory, GET /api/advisory/demo/:id
│   │   ├── audit_routes.py         # GET /api/audit/logs, /stats
│   │   └── health_routes.py        # GET /api/health, /rules
│   ├── services/
│   │   ├── ai_engine.py            # Claude API — structured reasoning
│   │   ├── rule_engine.py          # JSON rule validation — banned/dosage/region
│   │   └── audit_logger.py         # MongoDB writer + in-memory fallback
│   └── utils/
│       └── helpers.py              # Validation, response builders, timer
│
└── frontend/                       # React + Tailwind CSS
    ├── src/
    │   ├── App.jsx
    │   ├── main.jsx
    │   ├── index.css               # Ocean theme + animations
    │   ├── pages/
    │   │   ├── HomePage.jsx
    │   │   ├── AdvisoryPage.jsx
    │   │   └── AuditPage.jsx
    │   ├── components/
    │   │   ├── Layout.jsx          # Ocean bg, waves, bubbles, nav
    │   │   ├── AdvisoryForm.jsx    # Farmer input form
    │   │   ├── AdvisoryResult.jsx  # Full result display
    │   │   ├── StatsCards.jsx      # Audit dashboard stats
    │   │   └── AuditTable.jsx      # Expandable audit log table
    │   └── services/
    │       └── api.js              # Axios API layer
    ├── tailwind.config.js
    └── vite.config.js
```

---

## ⚙️ Setup Instructions

### Prerequisites
- Python 3.11+
- Node.js 18+
- MongoDB (local or Atlas)
- Anthropic API key

### 1. Clone & Setup Backend

```bash
cd backend
cp .env.example .env
# Edit .env: add ANTHROPIC_API_KEY and MONGO_URI

pip install -r requirements.txt
python app.py
# → Flask runs on http://localhost:5000
```

### 2. Setup Frontend

```bash
cd frontend
npm install
npm run dev
# → Vite runs on http://localhost:3000
```

### 3. MongoDB
- Local: `mongod --dbpath /data/db`
- Atlas: Set `MONGO_URI=mongodb+srv://...` in `.env`
- **No MongoDB? No problem** — the app falls back to in-memory storage automatically.

---

## 🚀 API Reference

### POST /api/advisory

```json
{
  "farmer_name": "Ramesh Kumar",
  "crop_type": "Cotton (Bt)",
  "soil_condition": "Black cotton soil, pH 7.8, EC 1.6, low nitrogen",
  "weather": "34°C, 65% humidity, last rain 8 days ago",
  "farmer_query": "Cotton leaves yellowing at edges, what to do?",
  "region": "maharashtra",
  "land_size_acres": 3.2,
  "season": "kharif",
  "irrigation_type": "bore-well"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "session_id": "uuid",
    "recommendation": "...",
    "risk_level": "Low",
    "compliance_status": "Approved",
    "violations": [],
    "warnings": [],
    "reasoning": [
      { "step_type": "DATA", "label": "Data Collection", "content": "..." },
      { "step_type": "RULE_CHECK", "label": "Regulatory Review", "content": "..." },
      { "step_type": "ANALYSIS", "label": "Problem Analysis", "content": "..." },
      { "step_type": "GUARDRAIL", "label": "Compliance Validation", "content": "..." },
      { "step_type": "ACTION", "label": "Recommendation", "content": "..." }
    ],
    "confidence_score": 0.87,
    "immediate_actions": ["..."],
    "avoid_actions": ["..."],
    "relevant_schemes": ["PM-KISAN", "PMFBY"]
  }
}
```

### GET /api/advisory/demo/safe
### GET /api/advisory/demo/blocked
### GET /api/advisory/demo/clarification

### GET /api/audit/logs?limit=20&skip=0&compliance_status=Blocked
### GET /api/audit/stats
### GET /api/health

---

## 🧪 Demo Scenarios

| Scenario | Description | Expected Result |
|----------|-------------|-----------------|
| `safe` | Cotton with yellowing leaves | `Approved`, Low risk, fertilizer + IPM advice |
| `blocked` | Request to use endosulfan + monocrotophos | `Blocked`, Critical risk, pesticides redacted |
| `clarification` | Empty crop type and soil condition | 422 with clarification questions |

---

## 🛡️ Compliance Rules (config/rules.json)

- **14 banned pesticides**: endosulfan, monocrotophos, methyl parathion, DDT…
- **4 restricted pesticides** with dose limits and crop restrictions
- **7 fertilizer dosage limits** (urea max 50 kg/acre)
- **Crop-specific rules** for cotton, paddy, wheat, vegetables, groundnut
- **Region constraints** for Maharashtra, Punjab, Gujarat, AP
- **MSP data** for 8 crops (Kharif 2024–25)
- **6 government schemes** with benefit amounts

---

## 📊 MongoDB Collections

### audit_logs
```
session_id, timestamp, farmer_input, reasoning_steps,
rules_triggered, compliance_status, violations,
final_recommendation, risk_level, confidence_score,
processing_time_ms
```

---

## 🔑 Environment Variables

```env
ANTHROPIC_API_KEY=sk-ant-...
MONGO_URI=mongodb://localhost:27017/agromind
FLASK_DEBUG=true
```
