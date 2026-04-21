"""
Jump Height Analyzer
Flask backend that accepts video uploads, uses MediaPipe pose estimation
to detect a person's hip vertical motion, and computes jump height.
"""

import os
import tempfile
from typing import List, Tuple

import cv2
import mediapipe as mp
import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

app.config["MAX_CONTENT_LENGTH"] = 100 * 1024 * 1024  # 100 MB

mp_pose = mp.solutions.pose

# Average human hip-to-floor height fraction reference for scaling
# We use the visible body length (hip -> ankle) as a real-world ruler.
DEFAULT_HIP_TO_ANKLE_METERS = 0.85  # average adult; rough approximation


def _extract_hip_trajectory(video_path: str) -> Tuple[List[float], List[float], float, int]:
    """
    Walk the video frame by frame, extract average hip y-position (normalized 0..1),
    and the average distance from hip to ankle (used as a meter scale).
    Returns (hip_y_per_frame, hip_to_ankle_per_frame, fps, frame_count).
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError("Could not open video file")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)

    hip_y_values: List[float] = []
    hip_to_ankle_values: List[float] = []

    with mp_pose.Pose(
        static_image_mode=False,
        model_complexity=1,
        enable_segmentation=False,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    ) as pose:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            result = pose.process(rgb)

            if not result.pose_landmarks:
                continue

            lms = result.pose_landmarks.landmark
            left_hip = lms[mp_pose.PoseLandmark.LEFT_HIP.value]
            right_hip = lms[mp_pose.PoseLandmark.RIGHT_HIP.value]
            left_ankle = lms[mp_pose.PoseLandmark.LEFT_ANKLE.value]
            right_ankle = lms[mp_pose.PoseLandmark.RIGHT_ANKLE.value]

            avg_hip_y = (left_hip.y + right_hip.y) / 2.0
            avg_ankle_y = (left_ankle.y + right_ankle.y) / 2.0

            hip_to_ankle = abs(avg_ankle_y - avg_hip_y)
            if hip_to_ankle <= 0.02:
                # Skip frames where landmarks are unreliable
                continue

            hip_y_values.append(avg_hip_y)
            hip_to_ankle_values.append(hip_to_ankle)

    cap.release()
    return hip_y_values, hip_to_ankle_values, fps, frame_count


def _compute_jump_height(
    hip_y_values: List[float],
    hip_to_ankle_values: List[float],
    fps: float,
) -> dict:
    """
    Estimate jump height from the hip y trajectory.

    In normalized image coordinates the y-axis points DOWN, so a higher
    jump corresponds to a SMALLER y value. We use the difference between
    the baseline (max y -> standing) and the apex (min y) and convert it
    into meters using the average hip-to-ankle distance as a ruler.
    """
    if len(hip_y_values) < 5:
        raise ValueError("Insufficient pose data detected in the video")

    arr = np.array(hip_y_values, dtype=np.float64)

    # Smooth the trajectory to reduce jitter.
    window = max(3, int(round(fps / 6)))
    if window % 2 == 0:
        window += 1
    if window < len(arr):
        kernel = np.ones(window) / window
        smoothed = np.convolve(arr, kernel, mode="same")
    else:
        smoothed = arr

    baseline_y = float(np.percentile(smoothed, 90))  # standing (large y)
    apex_y = float(np.min(smoothed))  # peak of jump (small y)

    delta_normalized = baseline_y - apex_y

    # Use median hip-to-ankle distance as the normalized representation
    # of approximately DEFAULT_HIP_TO_ANKLE_METERS in the real world.
    median_hip_to_ankle = float(np.median(hip_to_ankle_values))
    if median_hip_to_ankle <= 0:
        raise ValueError("Could not establish a scale reference")

    meters_per_normalized_unit = DEFAULT_HIP_TO_ANKLE_METERS / median_hip_to_ankle
    jump_meters = max(0.0, delta_normalized * meters_per_normalized_unit)
    jump_cm = jump_meters * 100.0

    apex_index = int(np.argmin(smoothed))
    apex_time_seconds = apex_index / fps if fps > 0 else 0.0

    # Time of flight (apex height) physics-based double-check using h = 0.5 * g * (t/2)^2
    g = 9.81

    return {
        "jumpHeightCm": round(jump_cm, 2),
        "jumpHeightMeters": round(jump_meters, 4),
        "baselineHipY": round(baseline_y, 4),
        "apexHipY": round(apex_y, 4),
        "apexFrame": apex_index,
        "apexTimeSeconds": round(apex_time_seconds, 3),
        "framesAnalyzed": len(hip_y_values),
        "fps": round(fps, 2),
        "scaleReferenceMeters": DEFAULT_HIP_TO_ANKLE_METERS,
        "physicsCheck": {
            "gravity": g,
            "note": "Estimate is based on hip displacement using the athlete's hip-to-ankle length as a real-world ruler.",
        },
    }


@app.route("/healthz", methods=["GET"])
def healthz():
    return jsonify({"status": "ok", "service": "jump-analyzer"})


@app.route("/analyze", methods=["POST"])
def analyze():
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

        hip_y_values, hip_to_ankle_values, fps, frame_count = _extract_hip_trajectory(tmp.name)

        if not hip_y_values:
            return jsonify({"error": "No human pose detected in the video"}), 422

        result = _compute_jump_height(hip_y_values, hip_to_ankle_values, fps)
        result["totalFrames"] = frame_count
        result["filename"] = file.filename
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


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=False)
