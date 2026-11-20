# Security & Privacy Policy

## 🔒 Privacy Invariants

SteadyGate is architected around strict privacy-by-design principles:

1. **Zero Raw Video Egress:** MediaPipe perception executes entirely in-memory within the local browser WebAssembly runtime. Raw camera pixel frames and video streams are **never stored on disk or transmitted over the network**.
2. **Landmark-Only Telemetry:** Only 21 normalized coordinate points (`Float32Array[21 * 2/3]`), derived biomechanical angles, and scalar optical telemetry (luminance, contrast, SNR) are processed.
3. **No Cloud Dependencies:** The core application operates entirely on local hardware with zero external third-party API dependencies.

---

## 🛡️ Reporting a Vulnerability

If you discover a potential security or privacy vulnerability in SteadyGate, please report it responsibly:

1. **Do not** report security vulnerabilities through public GitHub issues.
2. Email security disclosures to the maintainers or use GitHub's Private Vulnerability Reporting feature under the **Security** tab.
3. Please include:
   - Description of the vulnerability.
   - Steps to reproduce.
   - Potential impact assessment.
   - Proposed mitigation (if available).

We take privacy and security seriously and will acknowledge reports promptly.
