"""
Frontend web server that serves the Spor Karne static HTML.
Handles POST /video-api/analyze (jump height) and POST /run-api/analyze (sprint time)
by calling the analyzer service directly — no Express proxy needed on Render.
"""
import os
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
from pathlib import Path
from typing import Optional

import cv2
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "services", "jump-analyzer"))
from app import _run_analysis, _run_sprint_analysis  # noqa: E402

app = Flask(__name__, static_folder="static", static_url_path="/static")
CORS(app)

STATIC_DIR = Path(__file__).parent / "static"
ANALYSIS_TIMEOUT = 30


def _save_upload(file) -> str:
    """Save an uploaded video to a temp file and return its path."""
    suffix = os.path.splitext(file.filename)[1] or ".mp4"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    file.save(tmp.name)
    tmp.close()
    return tmp.name


def _run_with_timeout(fn, *args):
    """Run fn(*args) in a thread with ANALYSIS_TIMEOUT seconds."""
    with ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(fn, *args)
        return future.result(timeout=ANALYSIS_TIMEOUT)


@app.route("/healthz")
def healthz():
    return {"status": "ok", "service": "spor-karne-web"}, 200


@app.route("/video-api/analyze", methods=["POST"])
def video_analyze():
    if "video" not in request.files:
        return jsonify({"error": "Missing 'video' file in multipart form-data"}), 400
    file = request.files["video"]
    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    height_cm: Optional[float] = None
    raw = request.form.get("height_cm")
    if raw:
        try:
            height_cm = float(raw)
        except ValueError:
            pass

    tmp_path = _save_upload(file)
    try:
        frame_count = int(cv2.VideoCapture(tmp_path).get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        result = _run_with_timeout(_run_analysis, tmp_path, file.filename, frame_count, height_cm)
        return jsonify(result)
    except FuturesTimeoutError:
        return jsonify({"error": f"Analysis timed out after {ANALYSIS_TIMEOUT} seconds. Try a shorter video (under 15 seconds)."}), 504
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": "Analysis failed", "detail": str(e)}), 500
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


@app.route("/run-api/analyze", methods=["POST"])
def run_analyze():
    if "video" not in request.files:
        return jsonify({"error": "Missing 'video' file in multipart form-data"}), 400
    file = request.files["video"]
    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    tmp_path = _save_upload(file)
    try:
        distance_meters = 20.0
        raw_dist = request.form.get("distance_meters")
        if raw_dist:
            try:
                distance_meters = float(raw_dist)
            except ValueError:
                pass

        result = _run_with_timeout(_run_sprint_analysis, tmp_path, file.filename, distance_meters)
        return jsonify(result)
    except FuturesTimeoutError:
        return jsonify({"error": f"Analysis timed out after {ANALYSIS_TIMEOUT} seconds. Try a shorter video."}), 504
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": "Analysis failed", "detail": str(e)}), 500
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


@app.route("/")
def serve_index():
    return send_from_directory(STATIC_DIR, "index.html")


@app.route("/<path:path>")
def serve_static(path):
    full_path = STATIC_DIR / path
    if full_path.exists() and full_path.is_file():
        return send_from_directory(STATIC_DIR, path)
    return send_from_directory(STATIC_DIR, "index.html")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "10000"))
    app.run(host="0.0.0.0", port=port, debug=False)
