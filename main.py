"""
Frontend web server that serves the Spor Karne static HTML
Also handles POST /video-api/analyze by calling the jump analyzer directly.
"""
import os
import sys
import tempfile
from pathlib import Path
from flask import Flask, send_from_directory, jsonify, request
from flask_cors import CORS

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "services", "jump-analyzer"))
from app import _run_analysis  # noqa: E402

app = Flask(__name__, static_folder="static", static_url_path="/static")
CORS(app)

STATIC_DIR = Path(__file__).parent / "static"


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

    suffix = os.path.splitext(file.filename)[1] or ".mp4"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        file.save(tmp.name)
        tmp.close()

        import cv2
        frame_count = int(cv2.VideoCapture(tmp.name).get(cv2.CAP_PROP_FRAME_COUNT) or 0)

        from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
        TIMEOUT = 30
        with ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(_run_analysis, tmp.name, file.filename, frame_count)
            try:
                result = future.result(timeout=TIMEOUT)
            except FuturesTimeoutError:
                return jsonify({
                    "error": f"Analysis timed out after {TIMEOUT} seconds. Try a shorter video (under 15 seconds)."
                }), 504

        return jsonify(result)
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": "Analysis failed", "detail": str(e)}), 500
    finally:
        try:
            os.unlink(tmp.name)
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
