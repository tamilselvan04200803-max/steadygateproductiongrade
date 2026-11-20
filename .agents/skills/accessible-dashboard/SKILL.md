---
name: accessible-dashboard
description: Activate when working on UI redesigns, responsive layouts, accessible controls, dwell rings, guided training screens, or Playwright accessibility tests.
---

# Accessible Dashboard & Motor-Inclusive UI Engineering Skill

## Overview
SteadyGate's dashboard is designed specifically for individuals with severe motor tremors, bradykinesia, and joint contractures. The user interface must be ultra-accessible (WCAG AAA contrast, massive click targets, tremor-tolerant dwell mechanics, and non-distracting visual cues) and comply with strict React 19 compiler immutability rules.

---

## 1. Accessibility & Motor-Inclusive Design Principles

### Target Sizing & Spacing
- **Minimum Click/Touch Target**: $\ge 64 \times 64\text{ px}$ (exceeds WCAG $44\text{ px}$ to accommodate motor tremors and accidental mis-clicks).
- **Adequate Padding**: $\ge 16\text{ px}$ spacing between interactive elements to prevent adjacent accidental activations.

### Visual Ergonomics & High Contrast (WCAG AAA)
- **Contrast Ratio**: $\ge 7:1$ for normal text, $\ge 4.5:1$ for large text and icons against dark themes.
- **Color Invariance**: Never convey status using color alone (pair green/amber/red indicators with distinct icons and clear text labels).
- **Reduced Motion**: Respect `prefers-reduced-motion` media query; avoid rapid animations or strobing that could trigger photosensitive seizures.

---

## 2. Core Dashboard Components (`src/components/`)

### Live Camera Stream & HUD (`src/components/LiveCameraStream.tsx`)
- Displays real-time WebRTC camera feed with low-latency HTML5 canvas overlay.
- Renders 21-point hand skeleton with color-coded confidence:
  - Green: Stable intentional tracking.
  - Amber: High tremor / dyskinesia detected (filtering active).
  - Blue: Contact taxonomy engaged (holding object / touching person).
- Provides camera flip and environmental exposure warnings.

### Dwell Ring Controller (`src/components/DwellRingController.tsx`)
- Visual radial progress indicator visualizing the SPRT log-likelihood accumulation toward Wald commit threshold $A = 4.5$.
- Features smooth dampening so tremor vibrations do not cause the dwell ring to flicker or jitter rapidly.
- Displays active gesture hypothesis with textual confirmation.

### 5-Second Cancellable Undo HUD
- Any appliance action committed by gesture triggers a persistent 5-second floating countdown banner.
- Users can cancel the activation via one large tap, keyboard spacebar, or `THUMBS_DOWN` gesture.

### 60-Second Guided Enrollment Modal (`src/components/EnrolmentModal.tsx`)
- Step-by-step visual coach displaying animated reference poses.
- Audible countdown chimes and high-visibility countdown timer.
- Live feedback on ambient lighting and hand position within the tracking bounding box.

---

## 3. React 19 Compiler Hygiene & State Rules

SteadyGate enforces React 19 Compiler strictness. To prevent cascading re-renders and compiler rejections:
1. **Never update state synchronously inside `useEffect` bodies**:
   - Derive state during rendering or wrap initialization in user actions or asynchronous IIFEs.
2. **Preserve ref immutability**:
   - Never mutate `ref.current` during render sweeps.
3. **Hoist callbacks before reference**:
   - In components like `LiveCameraStream.tsx`, declare `renderFrame` before passing to `requestAnimationFrame`.
4. **Zero `eslint-disable` additions**:
   - All components must pass `npm run lint` cleanly without suppressing hook warnings.

---

## 4. End-to-End & Smoke Testing with Playwright

### Fake Camera Stream Smoke Test (`tests/fake-camera-smoke.test.ts`)
Validates that the dashboard, WebRTC feed, and HUD initialize properly without physical camera hardware:

```bash
# Run the Playwright fake-camera smoke test
npx playwright test tests/fake-camera-smoke.test.ts
```

### Browser Flags for Headless CI:
```typescript
launchOptions: {
  args: [
    '--use-fake-device-for-media-stream',
    '--use-fake-ui-for-media-stream',
    '--no-sandbox',
  ]
}
```

---

## 5. UI Verification Workflow

Before submitting UI or dashboard modifications:
```bash
# 1. Typecheck
npm run typecheck

# 2. Lint (Strict React 19 Compiler checks)
npm run lint

# 3. Build verification
npm run build

# 4. Playwright camera smoke test
npx playwright test tests/fake-camera-smoke.test.ts
```
