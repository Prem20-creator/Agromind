"""
AgroMind - Agricultural Advisory AI Agent
Flask Application Entry Point
"""

from flask import Flask
from flask_cors import CORS
from config.db import init_db
from routes.advisory_routes import advisory_bp
from routes.audit_routes import audit_bp
from routes.health_routes import health_bp
import os
from dotenv import load_dotenv

load_dotenv()


def create_app():
    app = Flask(__name__)

    # ── CORS ──────────────────────────────────────────────────────────────────
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # ── Config ────────────────────────────────────────────────────────────────
    app.config["ANTHROPIC_API_KEY"] = os.getenv("ANTHROPIC_API_KEY", "")
    app.config["MONGO_URI"] = os.getenv(
        "MONGO_URI", "mongodb://localhost:27017/agromind"
    )
    app.config["DEBUG"] = os.getenv("FLASK_DEBUG", "false").lower() == "true"

    # ── Database ──────────────────────────────────────────────────────────────
    init_db(app)

    # ── Blueprints ────────────────────────────────────────────────────────────
    app.register_blueprint(advisory_bp, url_prefix="/api")
    app.register_blueprint(audit_bp,    url_prefix="/api")
    app.register_blueprint(health_bp,   url_prefix="/api")

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=app.config["DEBUG"])
