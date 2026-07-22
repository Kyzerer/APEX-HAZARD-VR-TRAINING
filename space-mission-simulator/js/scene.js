/**
 * scene.js — Three.js 3D spacecraft environment
 * Full interior + exterior spacecraft with ISS-style structure,
 * Earth, stars, particle effects, emergency VFX
 */

import * as THREE from 'three';

export class SpaceScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.clock = new THREE.Clock();
    this.animationId = null;

    // Scene objects
    this.earth = null;
    this.moon = null;
    this.stars = null;
    this.station = null;
    this.solarPanels = [];
    this.particles = [];
    this.fireParticles = null;
    this.smokeParticles = null;
    this.leakParticles = null;
    this.interactables = [];
    this.lights = {};

    // Environment state
    this.scenario = null;
    this.isExterior = false;
    this.emergencyActive = false;
    this.strobeLights = [];
    this.strobeTimer = 0;

    // Player state (used by controls.js)
    this.playerPos = new THREE.Vector3(0, 1.6, 3);
    this.playerVelocity = new THREE.Vector3();

    // Callbacks
    this.onInteractableFound = null;
    this.onInteractableLeft = null;
    this.nearInteractable = null;

    this.onReady = null;
    this.useBloom = true;
    this.useParticles = true;
  }

  init() {
    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000306);
    this.scene.fog = new THREE.FogExp2(0x000306, 0.015);

    // Camera
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 2000);
    this.camera.position.copy(this.playerPos);

    // Resize
    window.addEventListener('resize', () => this._onResize());

    this._buildLights();
    this._buildStars();
    this._buildEarth();
    this._buildMoon();
    this._buildSpaceStation();
    this._buildInterior();
  }

  _onResize() {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  _buildLights() {
    // Ambient
    const ambient = new THREE.AmbientLight(0x111827, 0.4);
    this.scene.add(ambient);
    this.lights.ambient = ambient;

    // Sun (directional)
    const sun = new THREE.DirectionalLight(0xFFF5E0, 2.5);
    sun.position.set(100, 80, 50);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 500;
    sun.shadow.camera.left = -30;
    sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 30;
    sun.shadow.camera.bottom = -30;
    this.scene.add(sun);
    this.lights.sun = sun;

    // Interior fill lights
    const fillA = new THREE.PointLight(0x9EC5FE, 0.8, 20);
    fillA.position.set(0, 4, 0);
    this.scene.add(fillA);
    this.lights.fillA = fillA;

    const fillB = new THREE.PointLight(0x6EE7B7, 0.5, 15);
    fillB.position.set(-3, 3, -4);
    this.scene.add(fillB);
    this.lights.fillB = fillB;

    // Emergency red strobe
    const strobe1 = new THREE.PointLight(0xFF0000, 0, 12);
    strobe1.position.set(2, 3.5, 0);
    this.scene.add(strobe1);
    this.lights.strobe1 = strobe1;

    const strobe2 = new THREE.PointLight(0xFF4400, 0, 12);
    strobe2.position.set(-4, 3.5, -6);
    this.scene.add(strobe2);
    this.lights.strobe2 = strobe2;
    this.strobeLights = [strobe1, strobe2];
  }

  _buildStars() {
    const count = 8000;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const r = 800 + Math.random() * 200;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const brightness = 0.6 + Math.random() * 0.4;
      // Star colors: white, blue-white, yellow-white
      const colorType = Math.random();
      if (colorType > 0.85) {
        colors[i * 3] = brightness * 0.7; colors[i * 3 + 1] = brightness * 0.85; colors[i * 3 + 2] = brightness;
      } else if (colorType > 0.7) {
        colors[i * 3] = brightness; colors[i * 3 + 1] = brightness * 0.95; colors[i * 3 + 2] = brightness * 0.7;
      } else {
        colors[i * 3] = brightness; colors[i * 3 + 1] = brightness; colors[i * 3 + 2] = brightness;
      }
      sizes[i] = Math.random() * 2 + 0.5;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
      size: 1.2, sizeAttenuation: true,
      vertexColors: true, transparent: true, opacity: 0.95,
    });

    this.stars = new THREE.Points(geo, mat);
    this.scene.add(this.stars);
  }

  _buildEarth() {
    const geo = new THREE.SphereGeometry(120, 48, 48);
    const mat = new THREE.MeshPhongMaterial({
      color: 0x1A6EBF,
      emissive: 0x0A2040,
      emissiveIntensity: 0.15,
      shininess: 60,
      specular: 0x3399FF,
    });

    // Procedural Earth-like appearance with vertex colors
    const positions = geo.attributes.position;
    const colors = [];
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
      const lat = Math.asin(y / 120) / Math.PI; // -0.5 to 0.5
      const lon = Math.atan2(z, x) / Math.PI;   // -1 to 1

      // Noise for continents
      const n1 = Math.sin(lat * 8 + 1.2) * Math.cos(lon * 12 + 0.8);
      const n2 = Math.sin(lat * 5 + 2.5) * Math.cos(lon * 7 - 1.1);
      const land = n1 * 0.5 + n2 * 0.5;

      // Poles
      const polar = Math.abs(lat) > 0.35 ? 1 : 0;

      if (polar) { colors.push(0.95, 0.97, 1); }
      else if (land > 0.1) { colors.push(0.15, 0.5, 0.18); } // land green
      else { colors.push(0.05, 0.25, 0.65); }                 // ocean blue
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    mat.vertexColors = true;

    this.earth = new THREE.Mesh(geo, mat);
    this.earth.position.set(0, -160, -300);
    this.earth.castShadow = false;
    this.earth.receiveShadow = false;
    this.scene.add(this.earth);

    // Atmosphere glow
    const atmoGeo = new THREE.SphereGeometry(124, 32, 32);
    const atmoMat = new THREE.MeshBasicMaterial({
      color: 0x4488FF,
      transparent: true, opacity: 0.08,
      side: THREE.FrontSide,
    });
    const atmo = new THREE.Mesh(atmoGeo, atmoMat);
    this.earth.add(atmo);
  }

  _buildMoon() {
    const geo = new THREE.SphereGeometry(30, 32, 32);
    const mat = new THREE.MeshPhongMaterial({
      color: 0x888888, emissive: 0x222222, shininess: 5,
    });
    this.moon = new THREE.Mesh(geo, mat);
    this.moon.position.set(300, 80, -400);
    this.scene.add(this.moon);
  }

  _buildSpaceStation() {
    const group = new THREE.Group();
    this.station = group;

    const metalMat = new THREE.MeshPhongMaterial({
      color: 0xC8C8C8, shininess: 80, specular: 0x888888,
    });

    // Main truss
    const trussGeo = new THREE.BoxGeometry(80, 1.2, 1.2);
    const truss = new THREE.Mesh(trussGeo, metalMat);
    group.add(truss);

    // Central modules
    const moduleMat = new THREE.MeshPhongMaterial({
      color: 0xE0D8C0, shininess: 40,
    });
    const modulePositions = [
      [0, 0, 0], [8, 0, 0], [-8, 0, 0],
      [0, 0, 6], [0, 0, -6], [0, 4, 0],
    ];
    modulePositions.forEach(([x, y, z]) => {
      const geo = new THREE.CylinderGeometry(1.8, 1.8, 7, 16);
      const mesh = new THREE.Mesh(geo, moduleMat);
      mesh.position.set(x, y, z);
      mesh.rotation.x = z !== 0 ? Math.PI / 2 : 0;
      mesh.rotation.z = x !== 0 ? Math.PI / 2 : 0;
      group.add(mesh);
    });

    // Solar panels
    const panelMat = new THREE.MeshPhongMaterial({
      color: 0x1A3A6E, emissive: 0x0D1F3C, emissiveIntensity: 0.3,
      shininess: 120, specular: 0x4488CC,
      transparent: true, opacity: 0.92,
    });

    const panelPositions = [
      [20, 1, 0], [20, -1, 0], [-20, 1, 0], [-20, -1, 0],
      [36, 1, 0], [36, -1, 0], [-36, 1, 0], [-36, -1, 0],
    ];

    panelPositions.forEach(([x, y, z], i) => {
      const geo = new THREE.BoxGeometry(14, 0.08, 3.5);
      const panel = new THREE.Mesh(geo, panelMat);
      panel.position.set(x, y, z);
      panel.castShadow = false;
      group.add(panel);
      this.solarPanels.push(panel);

      // Panel frame
      const frameGeo = new THREE.BoxGeometry(14.2, 0.12, 3.7);
      const frameMat = new THREE.MeshPhongMaterial({ color: 0x666666 });
      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.position.set(x, y, z);
      group.add(frame);
    });

    // Radiators
    const radMat = new THREE.MeshPhongMaterial({ color: 0xD0D0D0 });
    [-10, 10].forEach(x => {
      const geo = new THREE.BoxGeometry(8, 0.05, 2.5);
      const rad = new THREE.Mesh(geo, radMat);
      rad.position.set(x, 2, 3);
      group.add(rad);
    });

    group.position.set(0, 8, -30);
    group.rotation.y = Math.PI * 0.1;
    this.scene.add(group);
  }

  _buildInterior() {
    const walls = new THREE.Group();
    this.interiorGroup = walls;

    // Materials
    const wallMat = new THREE.MeshPhongMaterial({ color: 0xD8DCE0, shininess: 20 });
    const floorMat = new THREE.MeshPhongMaterial({ color: 0xB0B5BC });
    const panelMat = new THREE.MeshPhongMaterial({ color: 0x2A3A4A, shininess: 60, specular: 0x444455 });
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x0A2040 });
    const glowMat  = new THREE.MeshBasicMaterial({ color: 0x00AAFF });

    // Floor
    const floor = new THREE.Mesh(new THREE.BoxGeometry(12, 0.2, 16), floorMat);
    floor.position.set(0, 0, 0);
    floor.receiveShadow = true;
    walls.add(floor);

    // Ceiling
    const ceil = new THREE.Mesh(new THREE.BoxGeometry(12, 0.2, 16), wallMat);
    ceil.position.set(0, 4, 0);
    walls.add(ceil);

    // Side walls
    const wallL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4, 16), wallMat);
    wallL.position.set(-6, 2, 0);
    wallL.receiveShadow = true;
    walls.add(wallL);

    const wallR = wallL.clone();
    wallR.position.set(6, 2, 0);
    walls.add(wallR);

    // Back wall
    const wallB = new THREE.Mesh(new THREE.BoxGeometry(12, 4, 0.2), wallMat);
    wallB.position.set(0, 2, -8);
    walls.add(wallB);

    // Front wall (with viewport opening)
    const wallF = new THREE.Mesh(new THREE.BoxGeometry(12, 4, 0.2), wallMat);
    wallF.position.set(0, 2, 8);
    walls.add(wallF);

    // ==== CONTROL CONSOLE ====
    const consoleBase = new THREE.Mesh(new THREE.BoxGeometry(8, 1, 2), panelMat);
    consoleBase.position.set(0, 0.7, -6.5);
    consoleBase.castShadow = true;
    walls.add(consoleBase);

    // Console screens
    for (let i = -3; i <= 3; i += 1.5) {
      const screen = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.05), screenMat);
      screen.position.set(i, 1.5, -7.3);
      screen.rotation.x = -0.3;
      walls.add(screen);

      // Screen glow outline
      const glowEdge = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.85, 0.01), glowMat);
      glowEdge.position.set(i, 1.5, -7.28);
      glowEdge.rotation.x = -0.3;
      walls.add(glowEdge);
    }

    // ==== EQUIPMENT RACKS (left wall) ====
    const rackMat = new THREE.MeshPhongMaterial({ color: 0x3A4A5A });
    for (let z = -6; z <= 4; z += 4) {
      const rack = new THREE.Mesh(new THREE.BoxGeometry(0.8, 3.5, 3), rackMat);
      rack.position.set(-5.6, 1.9, z);
      walls.add(rack);
    }

    // ==== OXYGEN TANK (right wall) ====
    const tankMat = new THREE.MeshPhongMaterial({ color: 0xCCCCCC, shininess: 100, specular: 0xFFFFFF });
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 2, 16), tankMat);
    tank.position.set(5.5, 1.5, -3);
    tank.rotation.z = Math.PI / 2;
    walls.add(tank);

    // Tank label
    const labelGeo = new THREE.BoxGeometry(0.02, 0.3, 0.8);
    const labelMat = new THREE.MeshBasicMaterial({ color: 0x00AAFF });
    const label = new THREE.Mesh(labelGeo, labelMat);
    label.position.set(5.1, 1.5, -3);
    walls.add(label);

    // ==== FIRE EXTINGUISHER ====
    const extMat = new THREE.MeshPhongMaterial({ color: 0xCC0000 });
    const ext = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.6, 12), extMat);
    ext.position.set(5.5, 1.4, 2);
    walls.add(ext);
    this._makeInteractable(ext, 'Fire Extinguisher', '🧯 Use fire extinguisher', 'use_extinguisher');

    // ==== EMERGENCY LOCKER ====
    const lockerMat = new THREE.MeshPhongMaterial({ color: 0xFF8800 });
    const locker = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.4), lockerMat);
    locker.position.set(-5.6, 1.8, 2);
    walls.add(locker);
    this._makeInteractable(locker, 'Emergency Locker', '📦 Open emergency locker', 'open_locker');

    // ==== PRESSURE GAUGE PANEL ====
    const gaugePanel = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1, 0.1), panelMat);
    gaugePanel.position.set(5.5, 2.5, -6);
    walls.add(gaugePanel);
    this._makeInteractable(gaugePanel, 'Pressure Panel', '🔧 Check pressure systems', 'check_pressure');

    // ==== REPAIR PANEL ====
    const repairPanel = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 0.1), panelMat);
    repairPanel.position.set(0, 2.5, -7.85);
    walls.add(repairPanel);
    this._makeInteractable(repairPanel, 'Main Control Panel', '⚙️ Access system controls', 'system_control');

    // ==== LEAK POINT (visual) ====
    const leakGeo = new THREE.BoxGeometry(0.3, 0.3, 0.05);
    const leakMat = new THREE.MeshBasicMaterial({ color: 0xFF4400 });
    this.leakPoint = new THREE.Mesh(leakGeo, leakMat);
    this.leakPoint.position.set(-5.6, 2.5, 0);
    this.leakPoint.visible = false;
    walls.add(this.leakPoint);
    this._makeInteractable(this.leakPoint, 'Hull Breach', '🔧 Seal the hull breach', 'seal_leak');

    // ==== SLEEPING PODS (back section) ====
    const podMat = new THREE.MeshPhongMaterial({ color: 0x556677 });
    [-3.5, 0, 3.5].forEach(x => {
      const pod = new THREE.Mesh(new THREE.BoxGeometry(2, 1.2, 1.5), podMat);
      pod.position.set(x, 0.7, 6.5);
      walls.add(pod);
    });

    // ==== OBSERVATION WINDOW ====
    const glassMat = new THREE.MeshPhongMaterial({
      color: 0x3388CC, transparent: true, opacity: 0.35,
      shininess: 120, specular: 0xFFFFFF,
    });
    const glass = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.5, 0.08), glassMat);
    glass.position.set(0, 2.5, 7.96);
    walls.add(glass);

    // ==== AIRLOCK DOOR ====
    const airlockMat = new THREE.MeshPhongMaterial({ color: 0x4466AA, shininess: 80 });
    const airlock = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.2, 0.15), airlockMat);
    airlock.position.set(-4, 1.3, 7.9);
    walls.add(airlock);
    this._makeInteractable(airlock, 'Airlock', '🚪 Open/Close Airlock', 'airlock');

    // ==== STROBE LIGHT FIXTURES ====
    const strobeMeshMat = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
    [2, -4].forEach(x => {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), strobeMeshMat);
      s.position.set(x, 3.8, 0);
      walls.add(s);
    });

    // ==== CEILING LIGHTS ====
    const ceilLightMat = new THREE.MeshBasicMaterial({ color: 0xCCEEFF });
    [-4, 0, 4].forEach(x => {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.4), ceilLightMat);
      l.position.set(x, 3.95, 0);
      walls.add(l);

      const pl = new THREE.PointLight(0xBBDDFF, 0.6, 8);
      pl.position.set(x, 3.8, 0);
      walls.add(pl);
    });

    // ==== HANDRAILS ====
    const railMat = new THREE.MeshPhongMaterial({ color: 0xFFCC44 });
    [-5.5, 5.5].forEach(x => {
      for (let z = -6; z <= 6; z += 2) {
        const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 6), railMat);
        rail.position.set(x, 1.8, z);
        rail.rotation.x = Math.PI / 2;
        walls.add(rail);
      }
    });

    this.scene.add(walls);

    // ==== EXTERIOR ENVIRONMENT (for EVA scenarios) ====
    this._buildExteriorDebris();
  }

  _makeInteractable(mesh, name, prompt, action) {
    mesh.userData = { interactable: true, name, prompt, action };
    this.interactables.push(mesh);
  }

  _buildExteriorDebris() {
    const debrisGroup = new THREE.Group();
    debrisGroup.visible = false;
    this.exteriorDebris = debrisGroup;

    const debrisMat = new THREE.MeshPhongMaterial({ color: 0x888888, shininess: 40 });
    const count = 15;
    for (let i = 0; i < count; i++) {
      const size = Math.random() * 0.3 + 0.05;
      const geo = new THREE.DodecahedronGeometry(size);
      const mesh = new THREE.Mesh(geo, debrisMat);
      mesh.position.set(
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 60,
      );
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      mesh.userData = {
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02,
        ),
        driftSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.005,
          (Math.random() - 0.5) * 0.005,
          (Math.random() - 0.5) * 0.005,
        ),
      };
      debrisGroup.add(mesh);
    }

    this.scene.add(debrisGroup);
  }

  // ── Scenario Setup ─────────────────────────────────────────────

  setupScenario(scenario) {
    this.scenario = scenario;
    this.emergencyActive = false;

    // Reset interactable visibility
    if (this.leakPoint) this.leakPoint.visible = false;

    if (scenario.envType === 'exterior') {
      this._switchToExterior();
    } else {
      this._switchToInterior();
    }

    // Scenario-specific setup
    if (scenario.id === 'oxygen_leak' || scenario.id === 'pressure_loss') {
      this._setupLeakScenario();
    } else if (scenario.id === 'spacecraft_fire') {
      this._setupFireScenario();
    } else if (scenario.id === 'debris_strike') {
      this._setupDebrisScenario();
    }
  }

  _switchToInterior() {
    this.isExterior = false;
    if (this.interiorGroup) this.interiorGroup.visible = true;
    if (this.exteriorDebris) this.exteriorDebris.visible = false;
    this.camera.position.set(0, 1.6, 3);
    this.playerPos.set(0, 1.6, 3);
    this.scene.fog = new THREE.FogExp2(0x000306, 0.025);
  }

  _switchToExterior() {
    this.isExterior = true;
    if (this.interiorGroup) this.interiorGroup.visible = false;
    if (this.exteriorDebris) this.exteriorDebris.visible = true;
    this.camera.position.set(0, 1.6, -20);
    this.playerPos.set(0, 1.6, -20);
    this.scene.fog = null;
  }

  _setupLeakScenario() {
    if (this.leakPoint) this.leakPoint.visible = true;
    this.startLeakParticles();
  }

  _setupFireScenario() {
    this.startFireParticles();
  }

  _setupDebrisScenario() {
    if (this.exteriorDebris) this.exteriorDebris.visible = true;
  }

  // ── Particle Systems ───────────────────────────────────────────

  startLeakParticles() {
    if (!this.useParticles) return;
    this._removeParticles('leak');

    const count = 200;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = -5.6 + (Math.random() - 0.5) * 0.3;
      pos[i * 3 + 1] = 2.5 + Math.random() * 0.5;
      pos[i * 3 + 2] = 0 + (Math.random() - 0.5) * 0.3;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0xAACCFF, size: 0.04, transparent: true, opacity: 0.7 });
    this.leakParticles = new THREE.Points(geo, mat);
    this.leakParticles.userData = { type: 'leak', velocities: Array.from({length: count}, () => ({ vx: (Math.random()-0.5)*0.002, vy: Math.random()*0.01, vz: (Math.random()-0.5)*0.002, life: Math.random() })) };
    this.scene.add(this.leakParticles);
  }

  startFireParticles() {
    if (!this.useParticles) return;
    this._removeParticles('fire');

    const count = 300;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = 3 + (Math.random() - 0.5) * 0.8;
      pos[i * 3 + 1] = 1.2 + Math.random() * 1.5;
      pos[i * 3 + 2] = -4 + (Math.random() - 0.5) * 0.8;
      // Fire colors: red → orange → yellow
      const t = Math.random();
      colors[i * 3]     = 1;
      colors[i * 3 + 1] = t * 0.5;
      colors[i * 3 + 2] = 0;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({ size: 0.12, vertexColors: true, transparent: true, opacity: 0.85 });
    this.fireParticles = new THREE.Points(geo, mat);
    this.fireParticles.userData = { type: 'fire', baseY: 1.2, baseX: 3, baseZ: -4 };
    this.scene.add(this.fireParticles);

    // Smoke
    const smokeGeo = new THREE.BufferGeometry();
    const smokePos = new Float32Array(100 * 3);
    for (let i = 0; i < 100; i++) {
      smokePos[i * 3] = 3 + (Math.random() - 0.5) * 2;
      smokePos[i * 3 + 1] = 2 + Math.random() * 2;
      smokePos[i * 3 + 2] = -4 + (Math.random() - 0.5) * 2;
    }
    smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
    const smokeMat = new THREE.PointsMaterial({
      color: 0x444444, size: 0.35, transparent: true, opacity: 0.35,
    });
    this.smokeParticles = new THREE.Points(smokeGeo, smokeMat);
    this.scene.add(this.smokeParticles);

    // Fire light
    const fireLight = new THREE.PointLight(0xFF4400, 2, 8);
    fireLight.position.set(3, 2, -4);
    this.scene.add(fireLight);
    this.lights.fire = fireLight;
  }

  stopFireParticles() {
    this._removeParticles('fire');
    if (this.smokeParticles) {
      this.scene.remove(this.smokeParticles);
      this.smokeParticles = null;
    }
    if (this.lights.fire) {
      this.scene.remove(this.lights.fire);
      delete this.lights.fire;
    }
  }

  stopLeakParticles() { this._removeParticles('leak'); }

  _removeParticles(type) {
    const targets = type === 'fire' ? [this.fireParticles] : [this.leakParticles];
    targets.forEach(p => { if (p) this.scene.remove(p); });
    if (type === 'fire') this.fireParticles = null;
    else this.leakParticles = null;
  }

  activateEmergency() {
    this.emergencyActive = true;
  }

  deactivateEmergency() {
    this.emergencyActive = false;
    this.strobeLights.forEach(l => { l.intensity = 0; });
  }

  // ── Animation Loop ─────────────────────────────────────────────

  start() {
    this._animate();
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  _animate() {
    this.animationId = requestAnimationFrame(() => this._animate());
    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    // Rotate earth
    if (this.earth) this.earth.rotation.y += 0.0002;

    // Rotate moon
    if (this.moon) {
      this.moon.position.x = 300 * Math.cos(elapsed * 0.02);
      this.moon.position.z = -400 + 300 * Math.sin(elapsed * 0.02);
    }

    // Rotate solar panels slightly
    this.solarPanels.forEach((p, i) => {
      p.rotation.y = Math.sin(elapsed * 0.1 + i) * 0.02;
    });

    // Strobe lights during emergency
    if (this.emergencyActive) {
      this.strobeTimer += delta;
      const strobeOn = Math.sin(this.strobeTimer * 4) > 0;
      this.strobeLights[0].intensity = strobeOn ? 3 : 0;
      this.strobeLights[1].intensity = strobeOn ? 0 : 3;
    }

    // Animate fire particles
    if (this.fireParticles) {
      const pos = this.fireParticles.geometry.attributes.position;
      const { baseY, baseX, baseZ } = this.fireParticles.userData;
      for (let i = 0; i < pos.count; i++) {
        pos.setY(i, pos.getY(i) + 0.02 + Math.random() * 0.02);
        pos.setX(i, pos.getX(i) + (Math.random() - 0.5) * 0.01);
        if (pos.getY(i) > baseY + 2) {
          pos.setY(i, baseY);
          pos.setX(i, baseX + (Math.random() - 0.5) * 0.8);
          pos.setZ(i, baseZ + (Math.random() - 0.5) * 0.8);
        }
      }
      pos.needsUpdate = true;
      if (this.lights.fire) {
        this.lights.fire.intensity = 1.5 + Math.sin(elapsed * 12) * 0.5;
      }
    }

    // Animate smoke
    if (this.smokeParticles) {
      const pos = this.smokeParticles.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        pos.setY(i, pos.getY(i) + 0.008 + Math.random() * 0.005);
        pos.setX(i, pos.getX(i) + (Math.random() - 0.5) * 0.008);
        if (pos.getY(i) > 4.5) {
          pos.setY(i, 2);
          pos.setX(i, 3 + (Math.random() - 0.5) * 2);
          pos.setZ(i, -4 + (Math.random() - 0.5) * 2);
        }
      }
      pos.needsUpdate = true;
    }

    // Animate leak particles
    if (this.leakParticles) {
      const pos = this.leakParticles.geometry.attributes.position;
      const vels = this.leakParticles.userData.velocities;
      for (let i = 0; i < pos.count; i++) {
        pos.setX(i, pos.getX(i) + vels[i].vx);
        pos.setY(i, pos.getY(i) + vels[i].vy);
        pos.setZ(i, pos.getZ(i) + vels[i].vz);
        vels[i].life += 0.01;
        if (vels[i].life > 1) {
          vels[i].life = 0;
          pos.setX(i, -5.6 + (Math.random() - 0.5) * 0.3);
          pos.setY(i, 2.5);
          pos.setZ(i, (Math.random() - 0.5) * 0.3);
        }
      }
      pos.needsUpdate = true;
    }

    // Animate exterior debris
    if (this.exteriorDebris && this.exteriorDebris.visible) {
      this.exteriorDebris.children.forEach(d => {
        if (d.userData.rotSpeed) {
          d.rotation.x += d.userData.rotSpeed.x;
          d.rotation.y += d.userData.rotSpeed.y;
          d.rotation.z += d.userData.rotSpeed.z;
        }
        if (d.userData.driftSpeed) {
          d.position.add(d.userData.driftSpeed);
        }
      });
    }

    // Station gentle rotation
    if (this.station) {
      this.station.rotation.y += 0.0001;
    }

    // Ceiling light flicker during electrical emergency
    if (this.scenario && (this.scenario.id === 'electrical_failure') && this.emergencyActive) {
      if (this.lights.fillA) {
        this.lights.fillA.intensity = 0.5 + Math.abs(Math.sin(elapsed * 8 + Math.random())) * 0.4;
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  // ── Raycasting for interaction ─────────────────────────────────

  checkInteractions() {
    const raycaster = new THREE.Raycaster();
    const center = new THREE.Vector2(0, 0);
    raycaster.setFromCamera(center, this.camera);

    const hits = raycaster.intersectObjects(this.interactables, true);
    if (hits.length > 0 && hits[0].distance < 4) {
      const obj = this._findInteractable(hits[0].object);
      if (obj && obj !== this.nearInteractable) {
        this.nearInteractable = obj;
        if (this.onInteractableFound) {
          this.onInteractableFound(obj.userData);
        }
      }
    } else {
      if (this.nearInteractable) {
        this.nearInteractable = null;
        if (this.onInteractableLeft) this.onInteractableLeft();
      }
    }
    return this.nearInteractable;
  }

  _findInteractable(mesh) {
    let obj = mesh;
    while (obj) {
      if (obj.userData && obj.userData.interactable) return obj;
      obj = obj.parent;
    }
    return null;
  }

  interact() {
    if (this.nearInteractable) {
      return this.nearInteractable.userData.action;
    }
    return null;
  }

  highlightInteractable(mesh, on) {
    if (!mesh) return;
    if (on) {
      mesh.userData._origColor = mesh.material.color?.getHex?.();
      if (mesh.material.color) mesh.material.color.setHex(0x00AAFF);
    } else {
      if (mesh.material.color && mesh.userData._origColor !== undefined) {
        mesh.material.color.setHex(mesh.userData._origColor);
      }
    }
  }

  destroy() {
    this.stop();
    if (this.renderer) this.renderer.dispose();
  }
}

export default SpaceScene;
