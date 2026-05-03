"""
Frontend web server that serves the Spor Karne static HTML
"""
import os
from pathlib import Path
from flask import Flask, send_from_directory, render_template_string

app = Flask(__name__, static_folder="static", static_url_path="/static")

# Path to static assets
STATIC_DIR = Path(__file__).parent / "static"


@app.route("/healthz")
def healthz():
    return {"status": "ok", "service": "spor-karne-web"}, 200


@app.route("/")
def serve_index():
    return send_from_directory(STATIC_DIR, "index.html")


@app.route("/<path:path>")
def serve_static(path):
    full_path = STATIC_DIR / path
    if full_path.exists() and full_path.is_file():
        return send_from_directory(STATIC_DIR, path)
    # Fallback to index.html for any non-existent routes
    return send_from_directory(STATIC_DIR, "index.html")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "10000"))
    app.run(host="0.0.0.0", port=port, debug=False)
