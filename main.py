"""
Frontend web server that serves the Spor Karne React app built in artifacts/spor-karne/dist/public
"""
import os
from pathlib import Path
from flask import Flask, send_from_directory

app = Flask(__name__, static_folder=None)

# Path to the built frontend
FRONTEND_DIR = Path(__file__).parent / "artifacts" / "spor-karne" / "dist" / "public"

if not FRONTEND_DIR.exists():
    raise RuntimeError(f"Frontend directory not found: {FRONTEND_DIR}")


@app.route("/healthz")
def healthz():
    return {"status": "ok", "service": "spor-karne-web"}, 200


@app.route("/")
def serve_index():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/<path:path>")
def serve_static(path):
    full_path = FRONTEND_DIR / path
    if full_path.exists() and full_path.is_file():
        return send_from_directory(FRONTEND_DIR, path)
    # SPA fallback: serve index.html for any non-existent routes
    return send_from_directory(FRONTEND_DIR, "index.html")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "10000"))
    app.run(host="0.0.0.0", port=port, debug=False)
