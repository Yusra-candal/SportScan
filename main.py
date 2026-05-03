"""
Frontend web server that serves the Spor Karne React app built in artifacts/spor-karne/dist/public
"""
import os
import subprocess
from pathlib import Path
from flask import Flask, send_from_directory

app = Flask(__name__, static_folder=None)

# Path to the built frontend
FRONTEND_DIR = Path(__file__).parent / "artifacts" / "spor-karne" / "dist" / "public"

# Build frontend if it doesn't exist
if not FRONTEND_DIR.exists():
    print(f"Frontend build not found at {FRONTEND_DIR}. Building now...")
    try:
        result = subprocess.run(
            ["pnpm", "run", "build"],
            cwd=Path(__file__).parent / "artifacts" / "spor-karne",
            env={**os.environ, "PORT": "10000", "BASE_PATH": "/"},
            capture_output=True,
            text=True,
            timeout=300
        )
        if result.returncode != 0:
            print(f"Build failed:\n{result.stderr}")
            raise RuntimeError(f"Frontend build failed: {result.stderr}")
        print("Frontend build completed successfully.")
    except subprocess.TimeoutExpired:
        raise RuntimeError("Frontend build timed out after 300 seconds")
    except Exception as e:
        raise RuntimeError(f"Failed to build frontend: {e}")

if not FRONTEND_DIR.exists():
    raise RuntimeError(f"Frontend directory not found at {FRONTEND_DIR}")


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
