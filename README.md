<div align="center">

```text
 ⬡========================================================================⬡
     ___   ___  ___ __  __  _  _   __   ____   __   ____  ___  
    / _ \ | _ \| __|\ \/ / | || | / _` |[_  /  / _` |[_  / |   \ 
   / ___ \|  _/| _|  >  <  | __ || (_| | / /_ | (_| | / /_ | |) |
  /_/   \_\_|  |___|/_/\_\ |_||_| \__,_|/___/  \__,_|/___/ |___/ 
                       V I R T U A L   T R A I N I N G
 ⬡========================================================================⬡
```

[![A AegisSim](https://img.shields.io/badge/System-Nominal-00ffcc?style=flat-square&logo=visual-studio-code&logoColor=black)](#)
[![WebXR Ready](https://img.shields.io/badge/Platform-WebXR%20Ready-00f0ff?style=flat-square)](#)
[![Three.js Active](https://img.shields.io/badge/Core-Three.js--WebGL-ff7e00?style=flat-square)](#)
[![A-Frame Engine](https://img.shields.io/badge/VR%20Engine-A--Frame%20v1.4.2-ef2d5e?style=flat-square)](#)

<p align="center">
  <b>A state-of-the-art dual-simulation cockpit and laboratory matrix. Built using standard web standards (HTML5/CSS3/ES6) and procedural Web Audio synthesis for absolute high-fidelity performance.</b>
</p>

---
</div>

## 🌐 Navigation Core

The project is structured around a central launcher portal at the root directory that redirects user telemetry into one of the specialized simulator subgrids:

<table align="center" style="border-collapse: collapse; border: 1px solid rgba(255,255,255,0.05); width: 100%;">
  <tr style="background: rgba(255,255,255,0.01);">
    <th width="50%" style="border: 1px solid rgba(255,255,255,0.05); padding: 12px; text-align: left; color: #00f0ff;">⚡ ELECTRICAL SAFETY LAB</th>
    <th width="50%" style="border: 1px solid rgba(255,255,255,0.05); padding: 12px; text-align: left; color: #ff7e00;">🚀 SPACE COCKPIT SHIELD</th>
  </tr>
  <tr>
    <td style="border: 1px solid rgba(255,255,255,0.05); padding: 16px; vertical-align: top; line-height: 1.6;">
      <b>Subgrid:</b> <a href="file:///d:/vr%20system/electrical-safety"><code>/electrical-safety</code></a><br><br>
      An immersive WebXR workshop mimicking real laboratory environments. Users interact with high-voltage hardware to isolate currents.
      <br><br>
      <b>Active Modules:</b><br>
      ⬡ <i>Module 1: Safety Overview</i> (Interactive Lesson Matrix)<br>
      ⬡ <i>Module 2: PPE Selection Table</i> (Insulated gear checks)<br>
      ⬡ <i>Modules 3-7: LOTO & Cardiac Shock Rescue</i> (In development)
    </td>
    <td style="border: 1px solid rgba(255,255,255,0.05); padding: 16px; vertical-align: top; line-height: 1.6;">
      <b>Subgrid:</b> <a href="file:///d:/vr%20system/space-mission-simulator"><code>/space-mission-simulator</code></a><br><br>
      A WebGL spacecraft cockpit simulation checking critical telemetry failures during spaceflight emergency scenarios.
      <br><br>
      <b>Active Modules:</b><br>
      ⬡ <i>15 Active Scenarios</i> (Oxygen leaks, avionic fire, pressure loss, asteroid debris hits)<br>
      ⬡ <i>Interactive Debriefing Quiz</i> (Certification check)<br>
      ⬡ <i>Flight Readiness SVG Certification</i> (Print ready)
    </td>
  </tr>
</table>

---

## ⚡ Technical Blueprint

```text
 ⬡  apex-hazard-vr-training-simulator/
    ├── index.html                   <-- Unified Portal Landing Gateway
    │                                    [Tracks Cursor Coordinate Reflection]
    ├── css/
    │   └── portal.css               <-- Glassmorphic Grid Animations
    │
    ├── electrical-safety/           <-- WebXR Laboratory Subgrid (A-Frame)
    │   ├── index.html               <-- Lab Menu HUD
    │   ├── css/style.css            <-- Neomorphic styling
    │   ├── js/                      
    │   │   ├── app.js               <-- 50Hz Hum & Siren Wave Oscillator Synth
    │   │   ├── game.js              <-- PPE verification & checklist logic
    │   │   └── scoring.js           <-- LocalStorage telemetry serialization
    │   └── scenes/room.html         <-- 3D A-Frame Lab Scene mesh
    │
    └── space-mission-simulator/     <-- WebGL Command Cockpit (Three.js)
        ├── index.html               <-- Space Cockpit telemetry viewports
        ├── style.css                <-- Sci-Fi cockpit dashboard stylings
        └── js/                      
            ├── app.js               <-- Three.js requestAnimationFrame Loop
            ├── scenarios.js         <-- 15-Failure step-by-step checklist DB
            └── audio.js             <-- Sound alarm Engine
```

---

## 🦾 Key Cybernetic Features

*   🌌 **Light Reflection Interactivity:** Gateway cards utilize cursor coordination metrics to project neon glow reflections (`--mouse-x`, `--mouse-y`) following the user's cursor.
*   🔊 **Synthesized Procedural Audio:** Custom audio classes synthesize triangle/sine frequencies directly from the browser's `AudioContext` — generating humming frequencies and siren warning pitch sweeps without downloading external file formats.
*   🔋 **Adaptive Accessibility Matrix:** Supports master audio volume slider adjustments and high-contrast styling filters injected dynamically via local configuration states.
*   💻 **Universal WebGL Integration:** Standardizes keyboard, mouse look, A-Frame gaze cursors, and mobile touches to run smoothly across standalone devices or desktops.

---

## 🛠️ Boot Sequence (Local Launch)

Due to ES module security settings, launching the simulator directly via standard `file://` protocols is blocked by browser CORS restrictions. Please initiate a local server.

```bash
# Step 1: Open Terminal in the root directory
cd apex-hazard-vr-training-simulator

# Step 2: Boot server (Python)
python -m http.server 8000

# Step 3: Boot server (Node.js Alternative)
npx http-server -p 8000
```

Once running, navigate to:
```text
http://localhost:8000
```

---

<div align="center">
  <sub>APEX HAZARD VR &middot; SYSTEM STANDARDS NOMINAL &middot; SECURE SYSTEM</sub>
</div>
