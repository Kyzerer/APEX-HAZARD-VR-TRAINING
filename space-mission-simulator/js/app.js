/**
 * app.js — Main application orchestrator
 * Manages all pages, navigation, simulation loop, and module integration
 */

import * as THREE from 'three';
import { SpaceScene }       from './scene.js';
import { PlayerControls }   from './controls.js';
import { TelemetrySystem }  from './telemetry.js';
import { InteractionSystem} from './interactions.js';
import { QuizSystem }       from './quiz.js';
import { ProgressManager }  from './progress.js';
import { UIManager }        from './ui.js';
import { AudioEngine }      from './audio.js';
import { Leaderboard }      from './leaderboard.js';
import { CertificateSystem} from './certificate.js';
import { getScenario }      from './scenarios.js';
import Storage              from './storage.js';

// ─────────────────────────────────────────────────────────────────
// Application State
// ─────────────────────────────────────────────────────────────────

const AppState = {
  currentPage: 'loading',    // 'loading' | 'landing' | 'dashboard' | 'simulation'
  currentScenario: null,
  isRunning: false,
  isPaused: false,
  missionTimer: 0,
  missionTimerInterval: null,
  missionStartTime: 0,
  score: 0,
  landingScene: null,        // Landing page Three.js scene
};

// Module instances
let audio, progress, ui, leaderboard, certificate;
let spaceScene, controls, telemetry, interactions, quiz;

// ─────────────────────────────────────────────────────────────────
// Initialization
// ─────────────────────────────────────────────────────────────────

async function init() {
  // Init audio first (requires user gesture later)
  audio = new AudioEngine();

  // Load progress from storage
  progress = new ProgressManager();

  // Supporting systems
  leaderboard  = new Leaderboard();
  certificate  = new CertificateSystem();

  // UI (dashboard)
  ui = new UIManager(progress, leaderboard, certificate, audio);
  ui.onMissionLaunch = (id) => launchMission(id);
  ui.onSettingsSave  = (settings) => applySettings(settings);

  // Simulate loading progress
  await simulateLoading();

  // Show landing page
  showLandingPage();
}

// ─────────────────────────────────────────────────────────────────
// Loading Screen
// ─────────────────────────────────────────────────────────────────

function simulateLoading() {
  return new Promise(resolve => {
    const bar  = document.getElementById('loading-bar');
    const pct  = document.getElementById('loading-percentage');
    const stat = document.getElementById('loading-status');

    const steps = [
      [10, 'Loading spacecraft systems...'],
      [25, 'Initializing telemetry...'],
      [40, 'Building space environment...'],
      [58, 'Calibrating orbital mechanics...'],
      [72, 'Loading emergency protocols...'],
      [85, 'Preparing mission briefings...'],
      [95, 'Running diagnostics...'],
      [100, 'All systems nominal.'],
    ];

    let i = 0;
    const next = () => {
      if (i >= steps.length) {
        setTimeout(resolve, 400);
        return;
      }
      const [p, s] = steps[i++];
      if (bar) bar.style.width = `${p}%`;
      if (pct) pct.textContent = `${p}%`;
      if (stat) stat.textContent = s;
      setTimeout(next, 200 + Math.random() * 200);
    };
    next();
  });
}

// ─────────────────────────────────────────────────────────────────
// Page Navigation
// ─────────────────────────────────────────────────────────────────

function showPage(pageId) {
  document.querySelectorAll('.page, #loading-screen').forEach(p => {
    p.classList.add('hidden');
  });
  const page = document.getElementById(pageId);
  if (page) page.classList.remove('hidden');
  AppState.currentPage = pageId;
}

function showLandingPage() {
  showPage('landing-page');
  initLandingCanvas();
  setupLandingEvents();
  animateCounters();
  document.getElementById('loading-screen').classList.add('hidden');
}

function showDashboard() {
  showPage('dashboard-page');
  if (AppState.landingScene) {
    AppState.landingScene.stop?.();
    AppState.landingScene = null;
  }
  ui.init();
  setupDashboardEvents();
}

// ─────────────────────────────────────────────────────────────────
// Landing Page Three.js Canvas
// ─────────────────────────────────────────────────────────────────

function initLandingCanvas() {
  const canvas = document.getElementById('landing-canvas');
  if (!canvas || AppState.landingScene) return;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(0, 0, 10);

  // Ambient
  scene.add(new THREE.AmbientLight(0x111827, 1));
  const sun = new THREE.DirectionalLight(0xFFF8E0, 3);
  sun.position.set(80, 50, 30);
  scene.add(sun);

  // Stars
  const starCount = 5000;
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const r = 300 + Math.random() * 200;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    starPos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    starPos[i * 3 + 2] = r * Math.cos(phi);
    const b = 0.6 + Math.random() * 0.4;
    starColors[i * 3] = b; starColors[i * 3 + 1] = b; starColors[i * 3 + 2] = b;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
    size: 0.8, vertexColors: true, transparent: true, opacity: 0.9,
  }));
  scene.add(stars);

  // Earth
  const earthGeo = new THREE.SphereGeometry(5, 48, 48);
  const earthMat = new THREE.MeshPhongMaterial({ color: 0x1B6BAA, shininess: 40 });
  // Procedural vertex colors
  const vColors = [];
  const ePos = earthGeo.attributes.position;
  for (let i = 0; i < ePos.count; i++) {
    const y = ePos.getY(i);
    const n = Math.sin(ePos.getX(i) * 3 + 0.5) * Math.cos(ePos.getZ(i) * 3 + 0.8);
    if (Math.abs(y) > 4.3) { vColors.push(0.95, 0.98, 1); }
    else if (n > 0.2) { vColors.push(0.1, 0.45, 0.15); }
    else { vColors.push(0.05, 0.22, 0.62); }
  }
  earthGeo.setAttribute('color', new THREE.Float32BufferAttribute(vColors, 3));
  earthMat.vertexColors = true;
  const earth = new THREE.Mesh(earthGeo, earthMat);
  earth.position.set(-8, -6, -5);
  scene.add(earth);

  // Atmosphere
  const atmoGeo = new THREE.SphereGeometry(5.2, 32, 32);
  const atmoMat = new THREE.MeshBasicMaterial({
    color: 0x4488FF, transparent: true, opacity: 0.08, side: THREE.FrontSide,
  });
  earth.add(new THREE.Mesh(atmoGeo, atmoMat));

  // Nebula (large translucent sphere)
  const nebulaGeo = new THREE.SphereGeometry(120, 16, 16);
  const nebulaMat = new THREE.MeshBasicMaterial({
    color: 0x110033, transparent: true, opacity: 0.4,
    side: THREE.BackSide,
  });
  scene.add(new THREE.Mesh(nebulaGeo, nebulaMat));

  // Second nebula layer
  const nebula2 = new THREE.Mesh(
    new THREE.SphereGeometry(100, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0x001122, transparent: true, opacity: 0.35, side: THREE.BackSide })
  );
  scene.add(nebula2);

  // Orbiting satellites
  const satGroup = new THREE.Group();
  scene.add(satGroup);
  const satMat = new THREE.MeshPhongMaterial({ color: 0xC8C8C8 });

  for (let s = 0; s < 3; s++) {
    const sat = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.08, 0.08), satMat);
    sat.add(body);
    // Solar panels
    const panelMat2 = new THREE.MeshPhongMaterial({ color: 0x1A3A6E });
    [-0.25, 0.25].forEach(x => {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.004, 0.1), panelMat2);
      panel.position.x = x;
      sat.add(panel);
    });
    const angle = (s / 3) * Math.PI * 2;
    sat.position.set(
      8 * Math.cos(angle), (Math.random() - 0.5) * 3, 8 * Math.sin(angle)
    );
    sat.userData = { angle, speed: 0.003 + Math.random() * 0.002, radius: 8 };
    satGroup.add(sat);
  }

  // ISS silhouette
  const issGroup = new THREE.Group();
  const issMat = new THREE.MeshPhongMaterial({ color: 0xE0E0E0, shininess: 80 });
  const issBody = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.2, 12), issMat);
  issBody.rotation.z = Math.PI / 2;
  issGroup.add(issBody);
  const issPanel = new THREE.Mesh(new THREE.BoxGeometry(3, 0.005, 0.18),
    new THREE.MeshPhongMaterial({ color: 0x1A3A6E }));
  issGroup.add(issPanel);
  issGroup.position.set(5, 3, -4);
  issGroup.rotation.z = 0.2;
  scene.add(issGroup);

  // Particle nebula cloud
  const cloudGeo = new THREE.BufferGeometry();
  const cloudPos = new Float32Array(800 * 3);
  const cloudColors = new Float32Array(800 * 3);
  for (let i = 0; i < 800; i++) {
    cloudPos[i * 3]     = (Math.random() - 0.5) * 60;
    cloudPos[i * 3 + 1] = (Math.random() - 0.5) * 40;
    cloudPos[i * 3 + 2] = -30 + (Math.random() - 0.5) * 20;
    // Purple/blue nebula colors
    const t = Math.random();
    cloudColors[i * 3]     = t * 0.4;
    cloudColors[i * 3 + 1] = t * 0.2;
    cloudColors[i * 3 + 2] = 0.4 + t * 0.6;
  }
  cloudGeo.setAttribute('position', new THREE.BufferAttribute(cloudPos, 3));
  cloudGeo.setAttribute('color', new THREE.BufferAttribute(cloudColors, 3));
  scene.add(new THREE.Points(cloudGeo, new THREE.PointsMaterial({
    size: 0.4, vertexColors: true, transparent: true, opacity: 0.25,
  })));

  let animId;
  const clock = new THREE.Clock();
  const animate = () => {
    animId = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    earth.rotation.y += 0.0008;
    stars.rotation.y  += 0.00003;
    nebula2.rotation.y += 0.00005;
    issGroup.position.x = 5 + Math.sin(t * 0.15) * 0.5;
    issGroup.position.y = 3 + Math.cos(t * 0.1) * 0.3;
    issGroup.rotation.z = 0.2 + Math.sin(t * 0.2) * 0.05;

    satGroup.children.forEach(sat => {
      sat.userData.angle += sat.userData.speed;
      const a = sat.userData.angle;
      const r = sat.userData.radius;
      sat.position.set(r * Math.cos(a), sat.position.y, r * Math.sin(a));
      sat.rotation.y += 0.02;
    });

    // Subtle camera drift
    camera.position.x = Math.sin(t * 0.08) * 0.5;
    camera.position.y = Math.cos(t * 0.06) * 0.3;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  };
  animate();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  AppState.landingScene = {
    stop: () => { cancelAnimationFrame(animId); renderer.dispose(); }
  };
}

// ─────────────────────────────────────────────────────────────────
// Counter Animation (Hero Stats)
// ─────────────────────────────────────────────────────────────────

function animateCounters() {
  document.querySelectorAll('[data-target]').forEach(el => {
    const target = parseInt(el.dataset.target) || 0;
    el.textContent = '0';
    let current = 0;
    const step = Math.max(1, target / 60);
    const timer = setInterval(() => {
      current = Math.min(target, current + step);
      el.textContent = Math.round(current);
      if (current >= target) {
        el.textContent = target;
        clearInterval(timer);
      }
    }, 25);
  });
}

// ─────────────────────────────────────────────────────────────────
// Landing Page Events
// ─────────────────────────────────────────────────────────────────

function setupLandingEvents() {
  document.getElementById('start-simulation-btn')?.addEventListener('click', () => {
    audio.init();
    audio.resume();
    audio.click();
    const saved = progress.astronautName;
    if (saved && saved !== 'Commander') {
      showDashboard();
    } else {
      showNameModal();
    }
  });

  document.getElementById('learn-more-btn')?.addEventListener('click', () => {
    audio.click();
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('nav-login-btn')?.addEventListener('click', () => {
    audio.click();
    const saved = progress.astronautName;
    if (saved && saved !== 'Commander') {
      showDashboard();
    } else {
      showNameModal();
    }
  });

  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.dataset.target;
      document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' });
    });
  });
}

// ─────────────────────────────────────────────────────────────────
// Astronaut Name Modal
// ─────────────────────────────────────────────────────────────────

function showNameModal() {
  const modal = document.getElementById('name-modal');
  if (modal) modal.classList.remove('hidden');

  const input = document.getElementById('astronaut-name');
  if (input) {
    input.value = progress.astronautName !== 'Commander' ? progress.astronautName : '';
    setTimeout(() => input.focus(), 100);
  }

  document.getElementById('modal-confirm-btn')?.addEventListener('click', confirmName, { once: true });
  document.getElementById('modal-cancel-btn')?.addEventListener('click', () => {
    modal.classList.add('hidden');
  }, { once: true });

  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmName();
  });
}

function confirmName() {
  const input = document.getElementById('astronaut-name');
  const name = input?.value?.trim() || 'Commander';
  progress.astronautName = name || 'Commander';
  document.getElementById('name-modal')?.classList.add('hidden');
  audio.success();
  showDashboard();
}

// ─────────────────────────────────────────────────────────────────
// Dashboard Events
// ─────────────────────────────────────────────────────────────────

function setupDashboardEvents() {
  document.getElementById('sidebar-back-btn')?.addEventListener('click', () => {
    audio.click();
    showLandingPage();
    initLandingCanvas();
  });

  document.getElementById('topbar-theme-btn')?.addEventListener('click', () => {
    audio.click();
    ui.toggleTheme();
  });

  document.getElementById('topbar-mute-btn')?.addEventListener('click', () => {
    ui.toggleMute();
  });

  document.getElementById('cert-print-btn')?.addEventListener('click', () => {
    certificate.print();
  });
}

// ─────────────────────────────────────────────────────────────────
// Mission Launch
// ─────────────────────────────────────────────────────────────────

function launchMission(scenarioId) {
  const scenario = getScenario(scenarioId);
  if (!scenario) return;

  AppState.currentScenario = scenario;
  showPage('simulation-page');
  showBriefing(scenario);
}

function showBriefing(scenario) {
  // Show briefing, hide HUD
  const briefing = document.getElementById('briefing-overlay');
  const hud = document.getElementById('game-hud');
  if (briefing) briefing.style.display = 'flex';
  if (hud) hud.classList.add('hidden');

  // Fill briefing content
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  set('briefing-tag', scenario.tag);
  set('briefing-title', scenario.title);
  set('briefing-duration', `${scenario.duration} min`);
  set('briefing-diff', scenario.difficulty.toUpperCase());
  set('briefing-max-score', scenario.maxScore);
  set('briefing-situation', scenario.situation);

  const diffEl = document.getElementById('briefing-difficulty');
  if (diffEl) {
    diffEl.className = `briefing-difficulty ${scenario.difficulty}`;
    diffEl.innerHTML = `<span class="diff-dot"></span> ${scenario.difficulty.toUpperCase()}`;
  }

  const objList = document.getElementById('briefing-objectives');
  if (objList) {
    objList.innerHTML = scenario.objectives.map(o => `<li>${o}</li>`).join('');
  }

  // Initialize scene (but don't start yet)
  initSimulationScene(scenario);

  document.getElementById('briefing-start-btn')?.addEventListener('click', () => {
    audio.buttonClick();
    startSimulation(scenario);
  }, { once: true });

  document.getElementById('briefing-back-btn')?.addEventListener('click', () => {
    audio.click();
    cleanupSimulation();
    showDashboard();
  }, { once: true });
}

// ─────────────────────────────────────────────────────────────────
// Simulation Initialization
// ─────────────────────────────────────────────────────────────────

function initSimulationScene(scenario) {
  const canvas = document.getElementById('sim-canvas');
  if (!canvas) return;

  // Cleanup previous
  if (spaceScene) { spaceScene.destroy(); }

  spaceScene = new SpaceScene(canvas);
  spaceScene.init();
  spaceScene.setupScenario(scenario);
  spaceScene.start();

  controls = new PlayerControls(spaceScene.camera, spaceScene.scene);
  if (scenario.envType === 'exterior') {
    controls.setExteriorBounds();
    controls.setZeroG(true);
  }

  telemetry = new TelemetrySystem();
  interactions = new InteractionSystem(spaceScene, telemetry, audio);
  quiz = new QuizSystem();

  // Interaction callbacks
  spaceScene.onInteractableFound = (data) => {
    const prompt = document.getElementById('interaction-prompt');
    const text = document.getElementById('ip-text');
    if (prompt) prompt.classList.remove('hidden');
    if (text) text.textContent = data.prompt;
  };

  spaceScene.onInteractableLeft = () => {
    document.getElementById('interaction-prompt')?.classList.add('hidden');
  };

  // Apply settings
  const settings = Storage.get('settings', {});
  spaceScene.useBloom = settings.bloom !== false;
  spaceScene.useParticles = settings.particles !== false;
  if (controls) {
    controls.setSpeed(settings.speed || 5);
    controls.setSensitivity(settings.sensitivity || 5);
    controls.setInvertY(settings.invertY || false);
  }
}

// ─────────────────────────────────────────────────────────────────
// Simulation Start
// ─────────────────────────────────────────────────────────────────

function startSimulation(scenario) {
  // Hide briefing, show HUD
  const briefing = document.getElementById('briefing-overlay');
  const hud = document.getElementById('game-hud');
  if (briefing) briefing.style.display = 'none';
  if (hud) hud.classList.remove('hidden');

  AppState.isRunning = true;
  AppState.isPaused = false;
  AppState.missionTimer = scenario.duration * 60; // seconds
  AppState.missionStartTime = Date.now();
  AppState.score = 0;

  // Setup telemetry
  interactions.setScenario(scenario);
  telemetry.start(scenario);
  quiz.load(scenario);

  // Update HUD
  document.getElementById('hud-mission-name').textContent = scenario.title;
  document.getElementById('hud-mission-phase').textContent = 'PHASE 1: ASSESSMENT';
  document.getElementById('hud-score').textContent = '0';

  // Build objectives list
  buildObjectivesList(scenario);

  // Enable emergency effects
  spaceScene.activateEmergency();

  // Enable controls
  controls.enable(document.getElementById('sim-canvas'));
  controls.onInteract  = () => handleInteraction();
  controls.onEscape    = () => togglePause();
  controls.onInventory = () => toggleInventory();
  controls.onSlotSelect = (i) => interactions.selectSlot(i);

  // Start mission timer
  startMissionTimer(scenario);

  // Start telemetry updates
  telemetry.onUpdate(updateTelemetryHUD);
  telemetry.onAlarm(handleAlarms);

  // Start audio ambience
  audio.startAmbience();

  // Start raycasting loop
  startInteractionLoop();

  // AI Introduction message
  setTimeout(() => {
    addAIMessage('system', `Mission: ${scenario.title} initiated. ${scenario.situation}`);
    if (scenario.id === 'oxygen_leak') addAIMessage('hint', '💡 Tip: Check the pressure telemetry on the right panel first.');
    if (scenario.id === 'spacecraft_fire') addAIMessage('warning', '⚠️ Smoke spreading. Shut off ventilation immediately!');
    if (scenario.id === 'eva_emergency') addAIMessage('warning', '⚠️ Tether failure confirmed. SAFER jetpack is in inventory slot 1.');
  }, 2000);

  // Scenario-specific alarm sounds
  if (scenario.id === 'oxygen_leak' || scenario.id === 'pressure_loss') {
    audio.alarm();
    setTimeout(() => audio.stopAlarm(), 4000);
  }
  if (scenario.id === 'spacecraft_fire') {
    audio.alarm();
    setTimeout(() => audio.stopAlarm(), 5000);
    showSmoke(true);
  }

  // Setup simulation event listeners
  setupSimulationEvents();
}

// ─────────────────────────────────────────────────────────────────
// Mission Timer
// ─────────────────────────────────────────────────────────────────

function startMissionTimer(scenario) {
  let remaining = scenario.duration * 60;

  AppState.missionTimerInterval = setInterval(() => {
    if (AppState.isPaused) return;
    remaining--;
    AppState.missionTimer = remaining;

    // Update timer display
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    const timerEl = document.getElementById('hud-timer');
    if (timerEl) {
      timerEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      // Color coding
      if (remaining < 60) timerEl.style.color = '#EF4444';
      else if (remaining < 120) timerEl.style.color = '#F59E0B';
      else timerEl.style.color = '';
    }

    // Countdown beep last 10 seconds
    if (remaining <= 10 && remaining > 0) audio.countdownBeep();

    // Time up
    if (remaining <= 0) {
      clearInterval(AppState.missionTimerInterval);
      missionFailed('Time expired. Mission terminated.');
    }
  }, 1000);
}

// ─────────────────────────────────────────────────────────────────
// Interaction Loop (raycasting)
// ─────────────────────────────────────────────────────────────────

let interactionLoopId;
function startInteractionLoop() {
  const loop = () => {
    if (!AppState.isRunning || AppState.isPaused) {
      interactionLoopId = requestAnimationFrame(loop);
      return;
    }
    if (spaceScene && controls) {
      const delta = 0.016;
      controls.update(delta);
      spaceScene.checkInteractions();
    }
    interactionLoopId = requestAnimationFrame(loop);
  };
  interactionLoopId = requestAnimationFrame(loop);
}

// ─────────────────────────────────────────────────────────────────
// Player Interaction
// ─────────────────────────────────────────────────────────────────

function handleInteraction() {
  if (!AppState.isRunning || AppState.isPaused) return;
  const action = spaceScene.interact();
  if (!action) return;

  audio.buttonClick();
  const result = interactions.interact(action);

  if (result) {
    // Show toast
    showToast(result.message, result.success ? 'success' : 'error');

    if (result.success && result.objectiveIndex !== undefined) {
      completeObjective(result.objectiveIndex);
    }

    // Check if all objectives done
    if (interactions.getAllComplete()) {
      setTimeout(() => missionSuccess(), 1000);
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// Objectives
// ─────────────────────────────────────────────────────────────────

function buildObjectivesList(scenario) {
  const list = document.getElementById('objectives-list');
  if (!list) return;
  list.innerHTML = scenario.objectives.map((obj, i) => `
    <li id="obj-${i}" class="${i === 0 ? 'active' : ''}">
      <div class="obj-icon"></div>
      <span>${obj}</span>
    </li>
  `).join('');
}

function completeObjective(index) {
  const li = document.getElementById(`obj-${index}`);
  if (li) {
    li.classList.remove('active');
    li.classList.add('done');
  }

  // Activate next
  const next = document.getElementById(`obj-${index + 1}`);
  if (next) next.classList.add('active');

  audio.success();
  showScreenFlash('success');

  // Update phase
  const phases = ['ASSESSMENT', 'RESPONSE', 'CONTAINMENT', 'RECOVERY', 'VERIFICATION'];
  const phaseEl = document.getElementById('hud-mission-phase');
  if (phaseEl) {
    phaseEl.textContent = `PHASE ${index + 2}: ${phases[Math.min(index + 1, phases.length - 1)]}`;
  }

  // AI hints after objective
  const hints = [
    '✅ Good work! Continue to the next objective.',
    '✅ Excellent protocol execution! Proceed.',
    '✅ System responding. Maintain focus.',
    '✅ Well done. Almost there!',
  ];
  setTimeout(() => addAIMessage('hint', hints[Math.min(index, hints.length - 1)]), 500);
}

// ─────────────────────────────────────────────────────────────────
// Telemetry HUD Updates
// ─────────────────────────────────────────────────────────────────

function updateTelemetryHUD(values) {
  const keys = ['o2', 'pressure', 'co2', 'temp', 'hull', 'battery', 'hr', 'suit'];
  keys.forEach(key => {
    const barEl = document.querySelector(`.telem-bar-${key}`);
    const valEl = document.getElementById(`tval-${key}`);
    const itemEl = document.getElementById(`telem-${key}`);

    const barPct = telemetry.getBar(key);
    const display = telemetry.getDisplay(key);
    const status  = telemetry.getStatusClass(key);

    if (barEl) barEl.style.width = `${barPct}%`;
    if (valEl) valEl.textContent = display;

    if (itemEl) {
      itemEl.className = `telem-item ${status !== 'ok' ? status : ''}`;
    }

    // Color the bar based on status
    if (barEl) {
      if (status === 'critical') barEl.style.background = '#EF4444';
      else if (status === 'warning') barEl.style.background = '#F59E0B';
      else barEl.style.background = '';
    }
  });
}

function handleAlarms(alarms) {
  if (alarms.length === 0) {
    hideBanner();
    return;
  }

  const critical = alarms.find(a => a.type === 'critical');
  const alarm = critical || alarms[0];

  showBanner(alarm.msg);

  if (critical) {
    showScreenShake();
    addAIMessage('warning', `CRITICAL: ${alarm.msg}`);
  }

  // Check for mission fail condition
  if (telemetry.isCritical()) {
    setTimeout(() => {
      if (AppState.isRunning && telemetry.isCritical()) {
        missionFailed('Critical system failure — life support compromised');
      }
    }, 5000);
  }
}

// ─────────────────────────────────────────────────────────────────
// Screen Effects
// ─────────────────────────────────────────────────────────────────

function showScreenFlash(type) {
  const flash = document.getElementById('screen-flash');
  if (!flash) return;
  flash.style.background = type === 'success'
    ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.3)';
  flash.classList.remove('hidden');
  setTimeout(() => flash.classList.add('hidden'), 300);
}

function showScreenShake() {
  document.getElementById('game-hud')?.classList.add('shake');
  setTimeout(() => document.getElementById('game-hud')?.classList.remove('shake'), 500);
}

function showSmoke(on) {
  const overlay = document.getElementById('smoke-overlay');
  if (overlay) overlay.classList.toggle('hidden', !on);
}

function showBanner(msg) {
  const banner = document.getElementById('alert-banner');
  const text   = document.getElementById('alert-text');
  if (banner) banner.classList.remove('hidden');
  if (text)   text.textContent = msg;
}

function hideBanner() {
  document.getElementById('alert-banner')?.classList.add('hidden');
}

// ─────────────────────────────────────────────────────────────────
// Toast Notifications
// ─────────────────────────────────────────────────────────────────

function showToast(msg, type = 'info') {
  // Reuse alert banner briefly
  const banner = document.getElementById('alert-banner');
  const text   = document.getElementById('alert-text');
  if (!banner || !text) return;

  const colors = { success: '#10B981', error: '#EF4444', info: '#0EA5E9' };
  banner.style.borderColor = `${colors[type]}66`;
  banner.style.background  = `${colors[type]}22`;
  banner.style.color = colors[type];
  text.textContent = msg;
  banner.classList.remove('hidden');
  setTimeout(() => {
    banner.style.borderColor = '';
    banner.style.background = '';
    banner.style.color = '';
    banner.classList.add('hidden');
  }, 2500);
}

// ─────────────────────────────────────────────────────────────────
// AI Assistant
// ─────────────────────────────────────────────────────────────────

function addAIMessage(type, text) {
  const container = document.getElementById('ai-messages');
  if (!container) return;

  const classMap = { system: 'ai-msg-system', hint: 'ai-msg-hint', warning: 'ai-msg-warning' };
  const div = document.createElement('div');
  div.className = `ai-msg ${classMap[type] || 'ai-msg-system'}`;
  div.innerHTML = `<span>${text}</span>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

// ─────────────────────────────────────────────────────────────────
// Pause Menu
// ─────────────────────────────────────────────────────────────────

function togglePause() {
  if (!AppState.isRunning) return;
  AppState.isPaused = !AppState.isPaused;

  const pauseMenu = document.getElementById('pause-menu');
  const pauseInfo = document.getElementById('pause-info');

  if (AppState.isPaused) {
    if (pauseMenu) pauseMenu.classList.remove('hidden');
    if (pauseInfo) pauseInfo.textContent = `Mission: ${AppState.currentScenario?.title}`;
    if (document.pointerLockElement) document.exitPointerLock();
  } else {
    if (pauseMenu) pauseMenu.classList.add('hidden');
  }
}

function toggleInventory() {
  // Future: toggle inventory modal
}

// ─────────────────────────────────────────────────────────────────
// Simulation Events
// ─────────────────────────────────────────────────────────────────

function setupSimulationEvents() {
  // Pause
  document.getElementById('hud-pause-btn')?.addEventListener('click', togglePause);
  document.getElementById('resume-btn')?.addEventListener('click', () => {
    audio.click();
    togglePause();
  });
  document.getElementById('restart-btn')?.addEventListener('click', () => {
    audio.click();
    cleanupSimulation();
    launchMission(AppState.currentScenario.id);
  });
  document.getElementById('quit-btn')?.addEventListener('click', () => {
    audio.click();
    cleanupSimulation();
    showDashboard();
  });

  // AI Assistant
  document.getElementById('hud-ai-btn')?.addEventListener('click', () => {
    audio.click();
    document.getElementById('ai-panel')?.classList.toggle('hidden');
  });
  document.getElementById('ai-close-btn')?.addEventListener('click', () => {
    document.getElementById('ai-panel')?.classList.add('hidden');
  });

  // Mission complete
  document.getElementById('replay-btn')?.addEventListener('click', () => {
    audio.click();
    cleanupSimulation();
    launchMission(AppState.currentScenario.id);
  });
  document.getElementById('quiz-btn')?.addEventListener('click', () => {
    audio.click();
    document.getElementById('mission-complete')?.classList.add('hidden');
    showQuiz();
  });
  document.getElementById('next-mission-btn')?.addEventListener('click', () => {
    audio.click();
    cleanupSimulation();
    showDashboard();
  });

  // Mission failed
  document.getElementById('failed-retry-btn')?.addEventListener('click', () => {
    audio.click();
    cleanupSimulation();
    launchMission(AppState.currentScenario.id);
  });
  document.getElementById('failed-quit-btn')?.addEventListener('click', () => {
    audio.click();
    cleanupSimulation();
    showDashboard();
  });

  // Inventory slots
  document.querySelectorAll('.inv-slot').forEach(slot => {
    slot.addEventListener('click', () => {
      interactions.selectSlot(parseInt(slot.dataset.slot));
    });
  });
}

// ─────────────────────────────────────────────────────────────────
// Mission Complete
// ─────────────────────────────────────────────────────────────────

function missionSuccess() {
  if (!AppState.isRunning) return;
  AppState.isRunning = false;

  clearInterval(AppState.missionTimerInterval);
  audio.success();
  audio.stopAmbience();
  spaceScene.deactivateEmergency();
  controls.disable();
  telemetry.stop();

  const scenario = AppState.currentScenario;
  const timeTaken = Math.floor((Date.now() - AppState.missionStartTime) / 1000);
  const finalScore = interactions.getFinalScore(timeTaken, scenario.duration);
  const objCount = interactions.getCompletedCount();
  const accuracy = interactions.getAccuracy();

  const grade = getGrade(finalScore, scenario.maxScore);

  // Save progress
  progress.completeMission(scenario.id, finalScore, timeTaken);
  progress.addPlayTime(timeTaken);
  if (scenario.difficulty === 'critical') progress.addCriticalSurvived();
  if (objCount === scenario.objectives.length) progress.addPerfectObjectives();

  // Show complete overlay
  const overlay = document.getElementById('mission-complete');
  if (overlay) overlay.classList.remove('hidden');

  const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  set('complete-grade', grade);
  set('cs-score', finalScore);
  set('cs-time', formatTime(timeTaken));
  set('cs-objectives', `${objCount}/${scenario.objectives.length}`);
  set('cs-accuracy', `${accuracy}%`);

  const badgeEl = document.getElementById('complete-badge');
  if (badgeEl) {
    const badges = { 'A+': '🏆', 'A': '🥇', 'B': '🥈', 'C': '🥉', 'D': '📋', 'F': '❌' };
    badgeEl.textContent = badges[grade] || '🏅';
  }

  // Score breakdown
  const breakdown = document.getElementById('complete-breakdown');
  if (breakdown) {
    breakdown.innerHTML = `
      <div style="font-family:'Orbitron',monospace;font-size:0.68rem;color:#64748B;margin-bottom:8px;letter-spacing:2px">SCORE BREAKDOWN</div>
      <div style="display:flex;justify-content:space-between;font-size:0.78rem;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
        <span>Base Score</span><span style="color:#0EA5E9">${interactions.score}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:0.78rem;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
        <span>Objectives (×100)</span><span style="color:#10B981">+${objCount * 100}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:0.78rem;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
        <span>Accuracy Bonus</span><span style="color:#10B981">+${Math.round(accuracy * 2)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:0.78rem;padding:6px 0">
        <span>Time Bonus</span><span style="color:#F59E0B">+${Math.max(0, Math.round(200 * (1 - timeTaken / (scenario.duration * 60))))}</span>
      </div>
    `;
  }
}

// ─────────────────────────────────────────────────────────────────
// Mission Failed
// ─────────────────────────────────────────────────────────────────

function missionFailed(reason) {
  if (!AppState.isRunning) return;
  AppState.isRunning = false;

  clearInterval(AppState.missionTimerInterval);
  audio.failure();
  audio.stopAmbience();
  controls?.disable();
  telemetry?.stop();

  document.getElementById('failed-reason').textContent = reason;
  document.getElementById('failed-score').textContent = `Score: ${interactions?.score || 0}`;
  document.getElementById('mission-failed')?.classList.remove('hidden');

  showScreenFlash('error');
}

// ─────────────────────────────────────────────────────────────────
// Quiz System
// ─────────────────────────────────────────────────────────────────

function showQuiz() {
  const overlay = document.getElementById('quiz-overlay');
  if (overlay) overlay.classList.remove('hidden');
  renderQuestion();
}

function renderQuestion() {
  const q = quiz.getCurrentQuestion();
  if (!q) {
    showQuizResults();
    return;
  }

  const progress_data = quiz.getProgress();

  // Progress bar
  const fill = document.getElementById('quiz-progress-fill');
  const text = document.getElementById('quiz-progress-text');
  if (fill) fill.style.width = `${progress_data.pct}%`;
  if (text) text.textContent = `Question ${progress_data.current} of ${progress_data.total}`;

  // Question
  const qEl = document.getElementById('quiz-question');
  if (qEl) qEl.textContent = q.q;

  // Options
  const opts = document.getElementById('quiz-options');
  if (opts) {
    opts.innerHTML = q.options.map((opt, i) => `
      <button class="quiz-option" data-index="${i}">${opt}</button>
    `).join('');

    opts.querySelectorAll('.quiz-option').forEach(btn => {
      btn.addEventListener('click', () => answerQuestion(parseInt(btn.dataset.index)));
    });
  }

  // Hide feedback
  const fb = document.getElementById('quiz-feedback');
  if (fb) fb.style.display = 'none';

  // Disable next
  const nextBtn = document.getElementById('quiz-next-btn');
  if (nextBtn) nextBtn.disabled = true;

  document.getElementById('quiz-current-score').textContent =
    `${quiz.score}/${quiz.currentIndex}`;
}

function answerQuestion(index) {
  const result = quiz.answer(index);
  if (!result) return;

  // Disable all options
  document.querySelectorAll('.quiz-option').forEach((btn, i) => {
    btn.disabled = true;
    if (i === result.correct) btn.classList.add('correct');
    else if (i === index && !result.isCorrect) btn.classList.add('wrong');
  });

  // Show feedback
  const fb = document.getElementById('quiz-feedback');
  if (fb) {
    fb.style.display = 'block';
    fb.innerHTML = `<strong>${result.isCorrect ? '✅ Correct!' : '❌ Incorrect.'}</strong> ${result.explanation}`;
    fb.style.borderLeft = `3px solid ${result.isCorrect ? '#10B981' : '#EF4444'}`;
  }

  audio[result.isCorrect ? 'success' : 'warning']();

  const nextBtn = document.getElementById('quiz-next-btn');
  if (nextBtn) nextBtn.disabled = false;

  document.getElementById('quiz-current-score').textContent =
    `${quiz.score}/${quiz.currentIndex + 1}`;
}

// Next question
document.addEventListener('click', (e) => {
  if (e.target.id === 'quiz-next-btn') {
    quiz.next();
    if (quiz.isDone()) {
      document.getElementById('quiz-overlay')?.classList.add('hidden');
      showQuizResults();
    } else {
      renderQuestion();
    }
  }
});

function showQuizResults() {
  const results = quiz.getResults();

  // Check perfect quiz
  if (results.isPerfect) progress.addPerfectQuiz();

  const overlay = document.getElementById('quiz-results');
  if (overlay) overlay.classList.remove('hidden');

  const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  set('qr-grade', results.grade);
  set('qr-score', `${results.correct} / ${results.total} Correct`);

  const icon = document.getElementById('qr-icon');
  if (icon) {
    const icons = { 'A+': '🎓', 'A': '🏆', 'B': '🥈', 'C': '📋', 'D': '📝', 'F': '❌' };
    icon.textContent = icons[results.grade] || '📋';
  }

  // Breakdown
  const breakdown = document.getElementById('qr-breakdown');
  if (breakdown) {
    breakdown.innerHTML = results.answers.map((a, i) => `
      <div style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:0.78rem">
        <span>${a.isCorrect ? '✅' : '❌'}</span>
        <span style="color:#94A3B8">${a.question}</span>
      </div>
    `).join('');
  }

  document.getElementById('qr-dashboard-btn')?.addEventListener('click', () => {
    audio.click();
    document.getElementById('quiz-results')?.classList.add('hidden');
    cleanupSimulation();
    showDashboard();
  }, { once: true });

  document.getElementById('qr-next-btn')?.addEventListener('click', () => {
    audio.click();
    document.getElementById('quiz-results')?.classList.add('hidden');
    cleanupSimulation();
    showDashboard();
  }, { once: true });
}

// ─────────────────────────────────────────────────────────────────
// Cleanup
// ─────────────────────────────────────────────────────────────────

function cleanupSimulation() {
  AppState.isRunning = false;
  clearInterval(AppState.missionTimerInterval);
  cancelAnimationFrame(interactionLoopId);

  controls?.disable();
  telemetry?.stop();
  audio?.stopAmbience();
  audio?.stopAlarm();
  spaceScene?.stop();

  // Hide all overlays
  ['briefing-overlay', 'game-hud', 'pause-menu', 'ai-panel',
   'mission-complete', 'mission-failed', 'quiz-overlay', 'quiz-results'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('hidden');
      el.style.display = '';
    }
  });
}

// ─────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────

function getGrade(score, max) {
  const pct = score / max;
  if (pct >= 0.95) return 'A+';
  if (pct >= 0.85) return 'A';
  if (pct >= 0.75) return 'B';
  if (pct >= 0.65) return 'C';
  if (pct >= 0.50) return 'D';
  return 'F';
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function applySettings(settings) {
  if (controls) {
    controls.setSpeed(settings.speed);
    controls.setSensitivity(settings.sensitivity);
    controls.setInvertY(settings.invertY);
  }
  if (audio) {
    audio.setMasterVolume(settings.masterVol / 100);
    audio.setSFXVolume(settings.sfxVol / 100);
    if (!settings.audio) audio.mute();
    else audio.unmute();
  }
  if (spaceScene) {
    spaceScene.useBloom = settings.bloom;
    spaceScene.useParticles = settings.particles;
  }
}

// CSS for screen shake (injected dynamically)
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
  .shake {
    animation: hudShake 0.4s ease !important;
  }
  @keyframes hudShake {
    0%, 100% { transform: translate(0, 0); }
    20% { transform: translate(-4px, 2px); }
    40% { transform: translate(4px, -2px); }
    60% { transform: translate(-3px, 3px); }
    80% { transform: translate(3px, -1px); }
  }
`;
document.head.appendChild(shakeStyle);

// ─────────────────────────────────────────────────────────────────
// Boot
// ─────────────────────────────────────────────────────────────────

init().catch(console.error);
