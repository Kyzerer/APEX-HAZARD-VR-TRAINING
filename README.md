# 🛡️ Apex Hazard VR Training Simulator

> An immersive, dual-simulation training platform built with modern web technologies. Experience critical safety operations across two distinct emergency workspaces: a high-voltage **Electrical Safety Laboratory** and an astronaut **Spacecraft Cockpit**.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![A-Frame](https://img.shields.io/badge/A--Frame-EF2D5E?style=for-the-badge&logo=aframe&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=three.js&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)

---

## 🎮 The Training Workspaces

Apex Hazard VR unites two custom-developed simulators under a single, unified landing portal:

### 1. ⚡ Electrical Safety Laboratory (A-Frame / WebXR)
An interactive 3D engineering workshop where students and electricians practice electrical safety rules under safe simulation conditions.
*   **Safety Overview (Module 1):** Interactive courses detailing shock thresholds (mA), arc flash potentials, and grounding physics.
*   **PPE Selection Table (Module 2):** Hands-on task to identify and equip the 5 required safety items (Hard Hat, Insulated Gloves, Face Shield, Dielectric Boots, and Voltage Tester) while avoiding conductive leather/steel alternatives.
*   **Procedural WebXR Controls:** Fully compatible with desktop keyboard/mouse or standalone VR headset gaze-cursors/laser controllers.
*   **Dynamically Synthesized Audio:** Employs the native Web Audio API to procedurally generate industrial electrical hums, emergency sirens, and success/danger chime feedback.

### 2. 🚀 Space Mission Failure Cockpit (Three.js / WebGL)
A futuristic spacecraft command desk that puts pilots in the middle of critical space systems emergencies.
*   **15 Scenarios:** Tackle cabin pressure drops, oxygen leaks, orbital debris strikes, cooling system failure, and solar radiation storms.
*   **Systems Telemetry:** Real-time gauges monitoring $O_2$ levels, heart rates, suit battery, temperature, CO₂ build-up, and hull integrity.
*   **Mission Debrief Quiz:** Post-emergency quizzes that evaluate safety protocol comprehension.
*   **Graduation Certificate:** Auto-generates a unique, print-ready Flight Readiness Certificate once all scenarios are passed.

---

## 📂 Project Structure

```text
apex-hazard-vr-training-simulator/
├── index.html                   # Unified simulator portal landing page
├── css/
│   └── portal.css               # Portal styling & layout (glassmorphism)
│
├── electrical-safety/           # Electrical Safety Simulator (A-Frame)
│   ├── index.html               # Main menu UI overlay
│   ├── css/style.css            # Lab panel styling
│   ├── js/                      # App logic, Web Audio synthesizers, scoring, game loop
│   └── scenes/room.html         # 3D A-Frame Lab scene layout
│
└── space-mission-simulator/     # Space Mission Simulator (Three.js / WebGL)
    ├── index.html               # Cockpit HUD dashboards, registration & quiz
    ├── style.css                # Sci-Fi dashboards stylesheet
    ├── js/                      # Telemetry, scene builders, controls, and script managers
    └── README.md                # AegisSim detailed documentation
```

---

## 🚀 Getting Started

No heavy installations or compile chains are required. Since the space simulator relies on ES modules, they must be served through a web server (rather than opened directly via `file://`).

### 1. Serve Locally
Run a lightweight local server from the root directory:

**Using Python:**
```bash
python -m http.server 8000
```

**Using Node.js:**
```bash
npx http-server -p 8000
```

### 2. Launch
Open your web browser and navigate to:
```text
http://localhost:8000
```

---

## 🎨 Technology Highlights
*   **Interactive Cursor Lighting:** The portal cards track mouse coordinates to render real-time glowing radial reflections.
*   **Zero-Dependency Audio:** Custom sound engines synthesize sine, triangle, and sawtooth waves on the fly using Web Audio oscillators—saving bandwidth by eliminating external audio assets.
*   **Local Storage Integration:** Persists training XP scores, accessibility settings (High Contrast, Master Volume), and completed modules across browser sessions.
