# Jump Analyzer Service

Flask + MediaPipe service that analyzes jump height from an uploaded video.

## Endpoints

### `GET /healthz`
Returns service status.

### `POST /analyze`
Accepts `multipart/form-data` with a `video` field. Returns JSON with the estimated jump height in centimeters and additional analysis metadata.

**Example:**
```bash
curl -X POST -F "video=@jump.mp4" http://localhost:5000/analyze
```

**Response:**
```json
{
  "jumpHeightCm": 38.21,
  "jumpHeightMeters": 0.3821,
  "baselineHipY": 0.7421,
  "apexHipY": 0.5532,
  "apexFrame": 47,
  "apexTimeSeconds": 1.567,
  "framesAnalyzed": 142,
  "fps": 30.0,
  "totalFrames": 150,
  "filename": "jump.mp4"
}
```

## How the height is estimated

1. Each frame is run through MediaPipe Pose to extract hip and ankle landmarks.
2. The vertical trajectory of the hip (in normalized image coordinates) is smoothed.
3. The difference between standing baseline (90th percentile of hip-y) and apex (min hip-y) gives the displacement in normalized units.
4. The median hip-to-ankle distance is used as a real-world ruler (~0.85 m for an average adult) to convert the displacement into meters/centimeters.

This is an estimation. Best results come from a side-on view, the full body in frame, and the camera held still.
