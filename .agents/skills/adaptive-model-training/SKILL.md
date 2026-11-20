---
name: adaptive-model-training
description: Activate when conducting feature engineering, training Random Forest or TCN models, personalization, uncertainty sampling, and model calibration comparison.
---

# Adaptive Model Training & Calibration Engineering Skill

## Overview
This skill outlines the methodologies for kinematic feature engineering, model training, user-specific calibration, and conformal uncertainty quantification in SteadyGate. Because SteadyGate serves users with pathological motor profiles, models must decouple involuntary movement from intentional gestures with high calibration certainty.

---

## 1. Biomechanical Feature Engineering

### Kinematic & Joint Features
- **Coupled DIP/PIP Ratios**: For each finger $i \in \{\text{Index, Middle, Ring, Pinky}\}$, compute:
  $$\rho_i = \frac{\theta_{\text{DIP}, i}}{\theta_{\text{PIP}, i}}$$
  Normal hands exhibit $\rho_i \approx 0.67\text{–}0.75$. Arthritic hands present lower slopes requiring contracture normalization.
- **Palm Planar Normal**: Cross-product of vectors $\vec{v}_{\text{wrist}\to\text{index\_mcp}}$ and $\vec{v}_{\text{wrist}\to\text{pinky\_mcp}}$ to evaluate 3D hand orientation relative to the camera optical axis.
- **Span Ratio & Fist Curvature**: Sum of Euclidean distances from fingertip to palm center normalized by wrist-to-middle-MCP bone length.

### Dynamic Frequency Features (`src/lib/signal-processing.ts`)
- **Harmonic Spectra via BMFLC**: 22 harmonic bins capturing fundamental tremor frequency $f_0 \in [3.0, 12.0\text{ Hz}]$ and higher harmonics $2f_0, 3f_0$.
- **Tremor Power Ratio**:
  $$\text{TPR} = \frac{\int_{3.5}^{14.0} S(f)\,df}{\int_{0}^{2.0} S(f)\,df + \epsilon}$$
- **Dyskinesia Index**: High-amplitude, irregular non-harmonic spectral entropy in the $1.0\text{–}3.0\text{ Hz}$ band.

---

## 2. Personalization & Disjoint Calibration

### Out-of-Sample Calibration Runner (`scripts/fit-v6-calibration.ts`)
SteadyGate uses a 50/50 disjoint split with artificial $3.5^\circ$ angular Gaussian noise injection to prevent overfitting to laboratory hand poses:

```bash
# Run the complete calibration audit
npm run calibrate
```

### Calibration Targets:
- **Held-Out ROC AUC**: Must achieve $\ge 0.950$ (v6.0 baseline: $0.9542$).
- **Brier Calibration Score**: $\le 0.045$.
- **Expected Calibration Error (ECE)**: $< 0.035$ across 10 confidence bins.

### Personalization Pipeline:
1. Extract 60-second baseline enrollment profile (`storage/enrollments/*.json`).
2. Fit user-specific joint constraint matrix:
   $$c_{\text{user}} = \operatorname{median}\left(\frac{\theta_{\text{DIP}}}{\theta_{\text{PIP}}}\right)$$
3. Calibrate spatial anchor radius:
   $$R_{\text{anchor}} = \max\left(35\text{ mm}, 2.5 \cdot \sigma_{\text{rest}}\right)$$
4. Store calibrated profile parameters in `src/config/steadygate.config.ts`.

---

## 3. Conformal Prediction & Uncertainty Sampling

### Mondrian Split Conformal Prediction (`src/lib/policy/intentionality-gate.ts`)
SteadyGate employs class-conditional split conformal prediction to output prediction sets $C_\alpha(x)$ rather than point estimates:
- **Significance Level**: $\alpha = 0.02$ (guarantees $\ge 98\%$ statistical coverage).
- **Non-Conformity Measure**:
  $$s_i = 1 - \hat{P}(y_i \mid x_i)$$
- **Ambiguity Pause Rule**:
  $$\text{If } |C_\alpha(x)| \ge 2 \implies \text{HALT SPRT accumulator}$$
  If the model is uncertain between two gestures (e.g., `PINCH` vs `POINTING_UP`), it suspends actuation until further sensory evidence resolves the ambiguity.
- **Empty Set Handling**: If $|C_\alpha(x)| = \emptyset$, sample falls outside the conformal support $\implies$ immediate reset to idle.

---

## 4. Offline Model Training & Comparison

### Training Scripts (`steadygate/`)
- Train Python offline models:
  ```bash
  py -m steadygate.twin --train
  ```
- Evaluate confusion matrices across standard gesture classes (`OPEN_PALM`, `POINTING_UP`, `VICTORY`, `PINCH`, `THUMBS_UP`, `THUMBS_DOWN`, `FIST`).
- Compare candidate models (Random Forest vs TCN vs Lightweight Linear SVM):
  - Model footprint must be small enough for pure client-side TypeScript execution or fast Python twin inference.
  - Zero matrix allocation in hot per-frame inference loops to avoid GC spikes.

---

## 5. Verification Gate
Whenever retraining models or adjusting kinematic thresholds:
```bash
npm run typecheck
npm run calibrate
npm run test:challenger:1
npm run test:challenger:2
```
Ensure all verification assertions pass without regression.
