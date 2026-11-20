---
name: gesture-data-collection
description: Activate when working on webcam sampling, feature extraction, environmental monitoring, dataset creation, 60s enrollment, and human labeling.
---

# Gesture Data Collection & Privacy Flight Recording Skill

## Overview
This skill guides data acquisition, environmental compensation, feature extraction, user enrollment, and privacy-preserving flight recording for SteadyGate. All data pipelines must adhere to DPDP standards and HL7 FHIR R4 telemetry compliance with **zero raw video pixel storage**.

---

## 1. Webcam Sampling & Vision Runtime

### Stream Acquisition (`src/lib/vision-runtime.ts`, `src/components/LiveCameraStream.tsx`)
- Capture standard $30\text{ FPS}$ RGB video ($640 \times 480$ or $1280 \times 720$) using WebRTC `getUserMedia`.
- Query `getCapabilities()` to lock hardware exposure/shutter speed to $1/100\text{ s}$ ($50\text{ Hz}$ power) or $1/120\text{ s}$ ($60\text{ Hz}$ power).
- Handle frame-rate drops gracefully: calculate variable $\Delta t_k$ and pass timestamps down to downstream filters.

### MediaPipe 21-Point Landmark Extraction
- Model file: `public/models/hand_landmarker.task` loaded locally via `@mediapipe/tasks-vision`.
- Outputs 21 3D landmarks $(x, y, z)$ in normalized screen coordinates and metric camera coordinates.
- Ensure bounding box jitter is stabilized before passing coordinates to Stage 2 IK.

---

## 2. 60-Second Guided Enrollment Pipeline

### Enrollment Protocol (`src/components/EnrolmentModal.tsx`, `config.yaml`)
- Total frames: 1,800 frames at $30\text{ FPS}$ ($60\text{ seconds}$).
- **Phase Breakdown**:
  1. **Rest Tremor Baseline ($0\text{–}15\text{ s}$)**: Hand resting in lap or table. Captures baseline involuntary tremor frequency $f_0$ ($3\text{–}7\text{ Hz}$) and resting RMS amplitude $A_0$.
  2. **Active Pointing & Hover ($15\text{–}30\text{ s}$)**: Measures kinetic/action tremor, drift velocity, and spatial anchor stability.
  3. **Range-of-Motion Flexion ($30\text{–}45\text{ s}$)**: Full extension $\to$ full fist curl. Extracts user-specific DIP/PIP coupling ratio $c_{\text{user}}$ and joint ROM limits for contracture exemption.
  4. **Pinch & Precision Detent ($45\text{–}60\text{ s}$)**: Index-thumb pinch hold. Calibrates release throw velocity and lookback buffer requirements.
- Output file: Stored under `storage/enrollment_<userId>_<timestamp>.json` with user consent verification.

---

## 3. Environmental Monitoring & Adaptation

### Dynamic Vision Calibration (`src/lib/vision/`)
- **Illuminance Tracking**: Calculate mean luma $Y = 0.299R + 0.587G + 0.114B$. Trigger adaptive gamma correction if $Y < 40$ (low light) or $Y > 220$ (backlit).
- **Skin Chromaticity Calibration**: Compute normalized $Cb/Cr$ color coordinates. Maintain chromaticity stability ($\Delta\text{CbCr} \le 1.5$) under color temperature shifts ($2700\text{ K}\text{–}6500\text{ K}$).
- **Flicker Sensor**: Continuously sample 16 image scanlines through Goertzel bandpass filter. If $50/60\text{ Hz}$ flicker index $> 0.15$, boost row-mean compensation.

---

## 4. Privacy-Preserving Flight Recorder

### Zero-Pixel Persistence Invariant (`steadygate/recorder.py`)
> [!CAUTION]
> **RAW VIDEO PIXELS MUST NEVER BE WRITTEN TO DISK.**
> Only abstract kinematic landmarks, filter states, SPRT likelihood ratios, and hardware actuation events may be logged.

- **Record Schema (`storage/*.jsonl`)**:
  ```json
  {
    "timestamp_ms": 1700000000123,
    "delta_t_ms": 33.3,
    "landmarks_21": [[x0, y0, z0], "..."],
    "tremor_features": {
      "f0_hz": 5.4,
      "rms_amp_px": 8.2,
      "dyskinesia_score": 0.12
    },
    "sprt_state": {
      "active_hypothesis": "OPEN_PALM",
      "llr": 3.85,
      "conformal_set_size": 1
    },
    "action_dispatched": null
  }
  ```
- Complies with HL7 FHIR R4 specification under `category="activity"` and `status="preliminary"`.

---

## 5. Dataset Structuring & Benchmarks

### Directory Layout
```
storage/
├── benchmarks/
│   ├── hagrid_500_stratified.json    # Real human test set across Fitzpatrick skin types I-VI
│   └── synthetic_tremor_matrix.json  # Calibrated Parkinsonian & LID profiles
├── enrollments/                      # User-specific kinematic calibration files
└── flight_logs/                      # Anonymized kinematic telemetry logs (.jsonl)
```

### Validation & Verification
Before adding new training or benchmark datasets:
1. Verify landmark normalization: All $x, y \in [0.0, 1.0]$.
2. Run format and integrity verification:
   ```bash
   npm run test:gesture
   ```
3. Test recording and replay compatibility:
   ```bash
   npm run test:py
   ```
