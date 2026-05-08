"""
Jump Height Analyzer
Flask backend that accepts video uploads, uses MediaPipe pose estimation
to detect a person's hip vertical motion, and computes jump height.
"""

import os
import tempfile
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
from typing import List, Optional, Tuple

import cv2
import mediapipe as mp
import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

app.config["MAX_CONTENT_LENGTH"] = 100 * 1024 * 1024  # 100 MB

mp_pose = mp.solutions.pose

# Fallback when no height_cm is provided: assumed hip-to-ankle length in metres.
DEFAULT_HIP_TO_ANKLE_METERS = 0.85

# Nose landmark sits roughly 7 % below the top of the head, so
# nose-to-ankle ≈ 93 % of total standing height.
NOSE_TO_ANKLE_FRACTION = 0.93

# Process every Nth frame to reduce CPU time on slow hardware.
FRAME_SKIP = 5

# Maximum seconds allowed for the full analysis before returning a timeout error.
ANALYSIS_TIMEOUT_SECONDS = 30


def _extract_hip_trajectory(
    video_path: str,
) -> Tuple[List[float], List[float], List[float], float, int]:
    """
    Walk the video frame by frame (every FRAME_SKIP-th frame).

    Returns:
        hip_y_values         – normalised hip y position per sampled frame
        hip_to_ankle_values  – hip-to-ankle span (normalised) per frame (fallback scale)
        body_span_values     – nose-to-ankle span (normalised) per frame (preferred scale)
        fps                  – original video fps
        total_frame_count    – total frames in the file
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError("Could not open video file")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)

    hip_y_values: List[float] = []
    hip_to_ankle_values: List[float] = []
    body_span_values: List[float] = []
    frame_num = 0

    with mp_pose.Pose(
        static_image_mode=False,
        model_complexity=1,
        enable_segmentation=False,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    ) as pose:
        while True:
            # Use grab() for skipped frames — avoids full decode, much faster.
            if frame_num % FRAME_SKIP != 0:
                ok = cap.grab()
                if not ok:
                    break
                frame_num += 1
                continue

            ok, frame = cap.read()
            if not ok:
                break
            frame_num += 1

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            result = pose.process(rgb)

            if not result.pose_landmarks:
                continue

            lms = result.pose_landmarks.landmark
            left_hip   = lms[mp_pose.PoseLandmark.LEFT_HIP.value]
            right_hip  = lms[mp_pose.PoseLandmark.RIGHT_HIP.value]
            left_ankle = lms[mp_pose.PoseLandmark.LEFT_ANKLE.value]
            right_ankle = lms[mp_pose.PoseLandmark.RIGHT_ANKLE.value]
            nose        = lms[mp_pose.PoseLandmark.NOSE.value]

            avg_hip_y   = (left_hip.y   + right_hip.y)   / 2.0
            avg_ankle_y = (left_ankle.y + right_ankle.y) / 2.0

            hip_to_ankle = abs(avg_ankle_y - avg_hip_y)
            if hip_to_ankle <= 0.02:
                # Landmarks unreliable; skip.
                continue

            # nose_y < avg_ankle_y (y increases downward), so span is positive.
            body_span = avg_ankle_y - nose.y

            hip_y_values.append(avg_hip_y)
            hip_to_ankle_values.append(hip_to_ankle)
            body_span_values.append(max(body_span, 0.01))

    cap.release()
    return hip_y_values, hip_to_ankle_values, body_span_values, fps, frame_count


def _compute_jump_height(
    hip_y_values: List[float],
    hip_to_ankle_values: List[float],
    body_span_values: List[float],
    fps: float,
    height_cm: Optional[float] = None,
) -> dict:
    """
    Estimate jump height from the hip y trajectory.

    Calibration priority:
    1. If height_cm is provided: use median nose-to-ankle span (normalised) as
       the real-world ruler — (height_cm * NOSE_TO_ANKLE_FRACTION / 100) metres.
    2. Otherwise: fall back to hip-to-ankle span with DEFAULT_HIP_TO_ANKLE_METERS.

    Baseline: 75th percentile of standing hip positions (avoids inflating the
    delta by including deep-squat frames that push y toward 90th percentile).
    """
    if len(hip_y_values) < 5:
        raise ValueError("Insufficient pose data detected in the video")

    arr = np.array(hip_y_values, dtype=np.float64)

    # Smooth the trajectory to reduce jitter.
    # fps here is effective sample rate (original fps / FRAME_SKIP).
    window = max(3, int(round(fps / 6)))
    if window % 2 == 0:
        window += 1
    if window < len(arr):
        kernel = np.ones(window) / window
        smoothed = np.convolve(arr, kernel, mode="same")
    else:
        smoothed = arr

    # 75th percentile = normal standing, not including squat windup frames.
    baseline_y = float(np.percentile(smoothed, 75))
    apex_y     = float(np.min(smoothed))

    delta_normalized = max(0.0, baseline_y - apex_y)

    # --- Calibration ---
    if height_cm and height_cm > 0:
        # Use full-body span (nose to ankle) scaled by real height.
        median_body_span = float(np.median(body_span_values))
        if median_body_span <= 0:
            raise ValueError("Could not establish a body-span scale reference")
        real_nose_to_ankle_m = (height_cm * NOSE_TO_ANKLE_FRACTION) / 100.0
        meters_per_unit = real_nose_to_ankle_m / median_body_span
        calibration_method = "body_span_with_height"
    else:
        # Fallback: hip-to-ankle with assumed adult length.
        median_hip_to_ankle = float(np.median(hip_to_ankle_values))
        if median_hip_to_ankle <= 0:
            raise ValueError("Could not establish a hip-to-ankle scale reference")
        meters_per_unit = DEFAULT_HIP_TO_ANKLE_METERS / median_hip_to_ankle
        calibration_method = "hip_to_ankle_default"

    jump_meters = delta_normalized * meters_per_unit
    jump_cm     = jump_meters * 100.0

    apex_index        = int(np.argmin(smoothed))
    apex_time_seconds = apex_index / fps if fps > 0 else 0.0

    return {
        "jumpHeightCm":       round(jump_cm, 2),
        "jumpHeightMeters":   round(jump_meters, 4),
        "baselineHipY":       round(baseline_y, 4),
        "apexHipY":           round(apex_y, 4),
        "apexFrame":          apex_index * FRAME_SKIP,
        "apexTimeSeconds":    round(apex_time_seconds, 3),
        "framesAnalyzed":     len(hip_y_values),
        "frameSkip":          FRAME_SKIP,
        "fps":                round(fps * FRAME_SKIP, 2),
        "calibrationMethod":  calibration_method,
        "heightCmUsed":       height_cm,
        "scaleReferenceMeters": DEFAULT_HIP_TO_ANKLE_METERS,
        "physicsCheck": {
            "gravity": 9.81,
            "note": "Estimate based on hip displacement; calibrated using full body span when height_cm is supplied.",
        },
    }


def _run_analysis(
    video_path: str,
    filename: str,
    frame_count: int,
    height_cm: Optional[float] = None,
) -> dict:
    hip_y, hip_to_ankle, body_span, fps, _ = _extract_hip_trajectory(video_path)

    if not hip_y:
        raise ValueError("No human pose detected in the video")

    effective_fps = fps / FRAME_SKIP
    result = _compute_jump_height(hip_y, hip_to_ankle, body_span, effective_fps, height_cm)
    result["totalFrames"] = frame_count
    result["filename"]    = filename
    return result


@app.route("/healthz", methods=["GET"])
def healthz():
    return jsonify({"status": "ok", "service": "jump-analyzer"})


@app.route("/analyze", methods=["POST"])
@app.route("/video-api/analyze", methods=["POST"])
def analyze():
    if "video" not in request.files:
        return jsonify({"error": "Missing 'video' file in multipart form-data"}), 400

    file = request.files["video"]
    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    height_cm: Optional[float] = None
    raw_height = request.form.get("height_cm")
    if raw_height:
        try:
            height_cm = float(raw_height)
        except ValueError:
            pass

    suffix = os.path.splitext(file.filename)[1] or ".mp4"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        file.save(tmp.name)
        tmp.close()

        frame_count = int(
            cv2.VideoCapture(tmp.name).get(cv2.CAP_PROP_FRAME_COUNT) or 0
        )

        with ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(
                _run_analysis, tmp.name, file.filename, frame_count, height_cm
            )
            try:
                result = future.result(timeout=ANALYSIS_TIMEOUT_SECONDS)
            except FuturesTimeoutError:
                return jsonify({
                    "error": (
                        f"Analysis timed out after {ANALYSIS_TIMEOUT_SECONDS} seconds. "
                        "Try a shorter video (under 15 seconds)."
                    )
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


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=False)
