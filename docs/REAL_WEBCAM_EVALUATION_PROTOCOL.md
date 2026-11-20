# SteadyGate — Guided Real-Webcam Evaluation Protocol

> **Document:** `docs/REAL_WEBCAM_EVALUATION_PROTOCOL.md`  
> **Status:** Research Protocol Specification (Post-Checkpoint Evaluation)  
> **Target:** In-Situ Empirical Comparison: Baseline vs. Personalized Gesture Recognition  
> **Critical Constraint:** **Strict Freeze Mandate:** No further classifier threshold adjustments, tuning, or prototype re-weighting may be performed using the evaluation session samples.

---

## 1. Objective & Scope

This protocol establishes a standardized, reproducible methodology for evaluating SteadyGate's gesture recognition on **live webcam video** across independent sessions. The primary goal is to quantitatively measure the performance delta between:

1. **Variant A (Baseline Prototype):** Standard canonical geometric prototypes derived from the 17,213-sample HaGRID dataset with fixed decision boundaries.
2. **Variant B (Personalized Prototype):** Individualized biomechanical prototypes enrolled via the 60-second calibration routine, incorporating user-specific resting flexion centroids, passive ROM scaling, and tremor notch filtering.

### Non-Clinical Research Disclaimer
This protocol is designed solely for technical evaluation of human-computer interface algorithms. It does not constitute a clinical trial, medical diagnostic evaluation, or patient assessment under FDA/EMA regulations.

---

## 2. Experimental Design: Independent Session Separation

To prevent overfitting and test leakage, evaluation **must** be conducted across strictly separated sessions:

```
┌──────────────────────────────────────────────────────────┐
│ SESSION 1: ENROLLMENT & CALIBRATION (Day 1 / Time T0)    │
│  - 60s guided resting tremor & baseline hand capture    │
│  - Generation of personalized prototype vector            │
│  - Prototype parameters locked into local profile        │
└────────────────────────────┬─────────────────────────────┘
                             │
            [ Mandatory 15+ Min Interval / Reset ]
            [ Camera re-positioned, ambient light shift ]
                             │
┌────────────────────────────▼─────────────────────────────┐
│ SESSION 2: INDEPENDENT EVALUATION (Time T0 + ΔT)         │
│  - Zero threshold adjustments permitted                   │
│  - Phase 1: Evaluate Variant A (Baseline Prototype)       │
│  - Phase 2: Evaluate Variant B (Personalized Prototype)   │
│  - Logging to isolated evaluation ledger                 │
└──────────────────────────────────────────────────────────┘
```

### Participant Profiles to Test
1. **Profile Norm (Control):** Unimpaired participant with full range of motion.
2. **Profile Tremor-Rest:** Participant exhibiting or simulating resting tremor ($4\text{--}6\text{ Hz}$, pill-rolling amplitude).
3. **Profile Tremor-Kinetic:** Participant exhibiting or simulating kinetic/action tremor ($5\text{--}10\text{ Hz}$ during voluntary posture hold).
4. **Profile Contracture-ROM:** Participant exhibiting or simulating limited finger extension ($\text{ROM} \approx 0.50\text{--}0.70$, adducted thumb).
5. **Profile Slow-Sweep:** Participant exhibiting bradykinesia / slow voluntary transitions ($0.5\text{--}1.5\text{ Hz}$).

---

## 3. Standardized Setup & Environment

| Parameter | Specification | Verification Method |
| :--- | :--- | :--- |
| **Camera Hardware** | Standard USB or integrated 720p/1080p webcam at 30 FPS | Verify 30 FPS in Stream Telemetry HUD |
| **Working Distance** | $0.45\text{ m} \pm 0.10\text{ m}$ ($45\text{--}55\text{ cm}$) from camera | Palm scale indicator reads $0.18\text{--}0.24$ |
| **Illuminance** | $150\text{--}400\text{ lux}$ diffuse frontal/ambient lighting | Mean Luminance $\ge 0.25$, SNR $\ge 18\text{ dB}$ |
| **Background** | Typical domestic environment (neutral wall, furniture) | Avoid direct window backlighting behind head |
| **Field of View** | Upper torso and hand clearly visible within frame | Ensure hand is centered in active tracking box |

---

## 4. Test Battery & Gesture Repertoire

Each evaluation session consists of two distinct testing blocks:

### Block 1: Discrete Intentional Command Battery (10 trials $\times$ 5 gestures = 50 trials)
The operator or on-screen prompt instructs the user to produce and hold each gesture until confirmed or timed out (max 3.0 seconds per trial):

| Trial ID | Target Gesture | Intended Command | Target Posture Description |
| :---: | :--- | :--- | :--- |
| **G1** | `OPEN_PALM` | Hall Light Toggle | Full extension of 5 fingers, palm facing camera |
| **G2** | `FIST` | Security Lock / Emergency Off | All fingers flexed into palm, thumb tucked over index |
| **G3** | `VICTORY` | Media Play / Next Track | Index & middle extended in V-shape, ring/pinky flexed |
| **G4** | `POINTING_UP` | Volume / Fan Speed Step | Index extended vertically, other fingers folded |
| **G5** | `THUMBS_UP` | Heating Toggle / Confirm | Fist with thumb extended vertically upright |

### Block 2: Casual Inactive & Negative Object Hold Battery (120 seconds total)
To verify Midas-Touch immunity and false-activation rejection:
1. **Conversational Idle (60 seconds):** Participant speaks, moves head, and performs natural non-control hand gestures (scratching, resting hands on desk, adjusting glasses).
2. **Object Grasp Negative Holds (60 seconds):**
   - 15s holding a coffee mug/cup in front of camera
   - 15s holding a smartphone as if reading/texting
   - 15s holding a book by its spine or open cover
   - 15s resting resting hand edge-on or occluded

---

## 5. Step-by-Step Execution Procedure

### Phase 1: Environment & Profile Initialization
1. Launch SteadyGate web application:
   ```bash
   npm run dev:3001
   ```
2. Navigate to `http://localhost:3001` in Chrome or Edge.
3. Open the **Diagnostics** tab and verify:
   - Camera FPS $\approx 30.0$
   - Background SQI $> 0.50$
   - Scene SNR $\ge 18.0\text{ dB}$
4. Ensure the application is operating under frozen evaluation mode (no live threshold auto-tuning).

### Phase 2: Variant A (Baseline) Evaluation
1. In the Header profile dropdown, select **Default Baseline** (un-enrolled canonical model).
2. Execute **Block 1** (50 intentional trials):
   - For each trial, record:
     - `Confirmed` (Yes / No / Wrong Gesture)
     - `First-Attempt Success` (Confirmed within 1.5s of posture formation)
     - `Time-to-Confirm` (ms, from hand entry to dwell ring completion)
3. Execute **Block 2** (120s idle & negative holds):
   - Record any false activations (`N_FA`).
   - Record whether object holds were successfully blocked.

### Phase 3: Transition & Independent Calibration
1. Allow a 15-minute rest period.
2. If testing a personalized profile, launch the **Enrolment Modal**:
   - Complete the 60-second guided resting calibration.
   - Note down the generated parameters (e.g. resting flexion centroid, measured tremor frequency $f_0$).
3. Close the modal and select the newly enrolled profile in the Header dropdown.
4. Slightly adjust participant seat distance or ambient lighting to ensure session independence.

### Phase 4: Variant B (Personalized) Evaluation
1. With the enrolled profile active, execute the identical **Block 1** (50 intentional trials).
2. Execute the identical **Block 2** (120s idle & negative holds).
3. Record all results in the evaluation ledger.

---

## 6. Standard Evaluation Ledger Format

Record results using the following structured table:

```markdown
### Real-Webcam Evaluation Session Log

**Session Date/Time:** [YYYY-MM-DD HH:MM]  
**Participant ID:** [e.g. P01-Parkinsons]  
**Ambient Lighting:** [e.g. 280 lux diffuse]  
**Camera:** [e.g. Logitech C920 1080p @ 30fps]  

| Block | Trial / Gesture | Variant A (Baseline) Result | Variant A Latency (ms) | Variant B (Personalized) Result | Variant B Latency (ms) | Notes |
|:---:|:---|:---:|:---:|:---:|:---:|:---|
| 1 | `OPEN_PALM` [1..10] | [Pass/Fail/Confused] | [e.g. 620ms] | [Pass/Fail/Confused] | [e.g. 480ms] | [e.g. thumb adducted] |
| 1 | `FIST` [1..10] | [Pass/Fail/Confused] | [e.g. 510ms] | [Pass/Fail/Confused] | [e.g. 500ms] | |
| 1 | `VICTORY` [1..10] | [Pass/Fail/Confused] | [e.g. 580ms] | [Pass/Fail/Confused] | [e.g. 520ms] | |
| 1 | `POINTING_UP` [1..10] | [Pass/Fail/Confused] | [e.g. 650ms] | [Pass/Fail/Confused] | [e.g. 490ms] | |
| 1 | `THUMBS_UP` [1..10] | [Pass/Fail/Confused] | [e.g. 710ms] | [Pass/Fail/Confused] | [e.g. 530ms] | |
| 2 | Idle Conversational (60s) | [0 FA / N FA] | N/A | [0 FA / N FA] | N/A | |
| 2 | Mug Grasp Hold (15s) | [BLOCKED / FA] | N/A | [BLOCKED / FA] | N/A | |
| 2 | Phone Grasp Hold (15s) | [BLOCKED / FA] | N/A | [BLOCKED / FA] | N/A | |
| 2 | Book Spine Hold (15s) | [BLOCKED / FA] | N/A | [BLOCKED / FA] | N/A | |
```

---

## 7. Comparative Analysis Metrics

Compute the following quantitative comparative metrics from the completed ledger:

1. **First-Attempt Confirmation Rate ($S_1$):**
   $$S_1 = \frac{N_{\text{confirmed\_first\_try}}}{N_{\text{total\_intentional\_trials}}} \times 100\%$$
   - *Target:* Personalized $S_1 \ge 90\%$ (and $\ge$ Baseline $S_1 + 15\%$ on contracture/tremor profiles).

2. **Macro F1-Score Across 5 Gestures:**
   $$F_1 = \frac{1}{5} \sum_{g=1}^{5} \frac{2 \cdot \text{Precision}_g \cdot \text{Recall}_g}{\text{Precision}_g + \text{Recall}_g}$$

3. **Confirmation Latency Reduction:**
   $$\Delta T = \text{Median}(T_{\text{baseline}}) - \text{Median}(T_{\text{personalized}})$$

4. **False Activation Rate ($N_{\text{FA}}$):**
   - Must remain **$0$** across both Variant A and Variant B during Block 2 idle and object-grasp testing.

---

## 8. Data Privacy & Compliance Safeguards

1. **Zero Video Egress:** All image processing occurs strictly inside the local browser process via MediaPipe WebAssembly. No camera pixels or video streams are saved to disk or transmitted to any server.
2. **Right to Erasure (DPDP):** Immediately following the evaluation, the participant or operator may delete the personalized profile by clicking **Delete Profile** in the interface, triggering atomic tombstoning with the unique 32-byte erase token.
