/**
 * VR Electrical Safety Simulator - Core Gameplay & Module Coordinator
 */

const GameCoordinator = {
  currentModule: 0, // 0: Not started, 1-6: Modules, 7: Assessment
  currentStep: 0,
  moduleScores: {}, 
  isVR: false,
  
  // Module 2 state variables
  selectedPPE: new Set(),
  correctPPE: new Set([
    'ppe-item-hat', 
    'ppe-item-gloves-ins', 
    'ppe-item-shield', 
    'ppe-item-boots-die', 
    'ppe-item-tester'
  ]),

  // Active objectives checklist
  objectives: [],

  init() {
    console.log("Game Coordinator Initializing...");
    
    // Bind UI buttons
    this.bindControls();
    
    // Start ambient sounds
    if (window.AudioSynth) {
      setTimeout(() => {
        window.AudioSynth.resumeContext();
        window.AudioSynth.startElectricalHum();
      }, 1000);
    }

    // Read URL or LocalStorage to set starting module
    const savedModule = localStorage.getItem('active_training_module') || 1;
    this.setModule(parseInt(savedModule, 10));

    // Listen to VR enter/exit events
    const scene = document.querySelector('a-scene');
    if (scene) {
      scene.addEventListener('enter-vr', () => {
        this.isVR = true;
        document.getElementById('gaze-cursor').setAttribute('visible', 'true');
      });
      scene.addEventListener('exit-vr', () => {
        this.isVR = false;
      });
      scene.addEventListener('controllerconnected', (e) => {
        const gazeCursor = document.getElementById('gaze-cursor');
        if (gazeCursor) {
          gazeCursor.setAttribute('visible', 'false');
        }
      });

      // Bind click events on 3D elements using event delegation
      scene.addEventListener('click', (e) => {
        const clickedEntity = e.target.closest('.clickable');
        if (clickedEntity) {
          this.handle3DClick(clickedEntity.id, clickedEntity);
        }
      });
    }

    this.updateHUD();
  },

  bindControls() {
    // Back to Menu
    const backBtn = document.getElementById('btn-back-menu');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (window.AudioSynth) {
          window.AudioSynth.stopElectricalHum();
          window.AudioSynth.stopAlarm();
          window.AudioSynth.stopFireCrackle();
        }
        document.body.style.transition = 'opacity 0.4s ease';
        document.body.style.opacity = '0';
        setTimeout(() => {
          window.location.href = '../index.html';
        }, 400);
      });
    }

    // Reset module
    const resetBtn = document.getElementById('btn-reset-module');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetCurrentModule();
      });
    }

    // Instruction Dialog Button
    const nextInstBtn = document.getElementById('btn-instruction-next');
    if (nextInstBtn) {
      nextInstBtn.addEventListener('click', () => {
        this.advanceStep();
      });
    }

    // Danger Alert/Completion Feedback Dialog Button
    const retryFeedbackBtn = document.getElementById('btn-feedback-retry');
    if (retryFeedbackBtn) {
      retryFeedbackBtn.addEventListener('click', () => {
        this.hideFeedback();
        if (this.feedbackIsDanger) {
          if (window.ScoringSystem) {
            window.ScoringSystem.deductXP(5); // Small penalty for danger
            window.ScoringSystem.state.hazardousActions++;
            window.ScoringSystem.saveProgress();
          }
          this.resetCurrentModule();
        } else {
          this.advanceToNextModule();
        }
      });
    }
  },

  updateHUD() {
    if (window.ScoringSystem) {
      const xp = window.ScoringSystem.state.xp;
      document.getElementById('hud-xp').textContent = xp;
    }
    
    const titles = {
      1: "Module 1: Safety Introduction",
      2: "Module 2: PPE Selection",
      3: "Module 3: Hazard Inspection",
      4: "Module 4: Lockout Tagout (LOTO)",
      5: "Module 5: Electrical Fire",
      6: "Module 6: Shock Rescue",
      7: "Module 7: Final Assessment"
    };
    
    document.getElementById('hud-module-title').textContent = titles[this.currentModule] || "Simulator";
    this.renderObjectives();
  },

  // Set current module and load scene layout
  setModule(moduleIdx) {
    this.currentModule = moduleIdx;
    localStorage.setItem('active_training_module', moduleIdx);
    this.currentStep = 0;
    this.updateHUD();

    // Clean up sounds
    if (window.AudioSynth) {
      window.AudioSynth.stopAlarm();
      window.AudioSynth.stopFireCrackle();
    }

    this.setupModuleScene(moduleIdx);
  },

  // Hide/Show items based on current active module
  setupModuleScene(moduleIdx) {
    console.log(`Setting up 3D environment for Module ${moduleIdx}`);
    
    // Default visibility states
    const npc = document.getElementById('npc-worker');
    if (npc) npc.setAttribute('visible', 'false');

    const beacon = document.getElementById('warning-beacon');
    if (beacon) beacon.setAttribute('visible', 'false');

    const ppeGroup = document.getElementById('ppe-items-group');
    if (ppeGroup) ppeGroup.setAttribute('visible', 'false');

    // Run custom builders
    switch (moduleIdx) {
      case 1: this.setupModule1(); break;
      case 2: this.setupModule2(); break;
      case 3: this.setupModule3(); break;
      case 4: this.setupModule4(); break;
      case 5: this.setupModule5(); break;
      case 6: this.setupModule6(); break;
      case 7: this.setupModule7(); break;
    }
  },

  resetCurrentModule() {
    if (window.AudioSynth) window.AudioSynth.playClick();
    this.setModule(this.currentModule);
  },

  renderObjectives() {
    const list = document.getElementById('objective-list');
    if (!list) return;
    list.innerHTML = '';
    
    if (this.objectives.length === 0) {
      list.innerHTML = '<li class="done">✓ No active tasks</li>';
      return;
    }

    this.objectives.forEach(obj => {
      const li = document.createElement('li');
      if (obj.state === 'completed') {
        li.className = 'done';
        li.textContent = obj.text;
      } else if (obj.state === 'active') {
        li.className = 'active';
        li.textContent = obj.text;
      } else {
        li.textContent = obj.text;
      }
      list.appendChild(li);
    });
  },

  updateObjective(id, state) {
    const obj = this.objectives.find(o => o.id === id);
    if (obj) {
      obj.state = state;
      this.renderObjectives();
    }
  },

  showInstructions(title, text) {
    const board = document.getElementById('instruction-board');
    const titleEl = document.getElementById('instruction-title');
    const textEl = document.getElementById('instruction-text');
    
    titleEl.textContent = title;
    textEl.textContent = text;
    board.style.display = 'block';
  },

  hideInstructions() {
    document.getElementById('instruction-board').style.display = 'none';
  },

  showFeedback(title, description, isDanger = true) {
    this.feedbackIsDanger = isDanger;

    if (window.AudioSynth && isDanger) {
      window.AudioSynth.playDanger();
    } else if (window.AudioSynth && !isDanger) {
      window.AudioSynth.playSuccess();
    }
    
    const card = document.getElementById('feedback-card-type');
    card.className = isDanger ? 'feedback-card danger' : 'feedback-card success';
    
    document.getElementById('feedback-title').textContent = title;
    document.getElementById('feedback-desc').textContent = description;
    
    const retryBtn = document.getElementById('btn-feedback-retry');
    retryBtn.textContent = isDanger ? "Retry Scenario" : "Continue Training";

    document.getElementById('feedback-overlay-card').classList.add('active');
    this.updateHUD();
  },

  hideFeedback() {
    document.getElementById('feedback-overlay-card').classList.remove('active');
  },

  advanceToNextModule() {
    if (this.currentModule < 7) {
      if (window.ScoringSystem) {
        window.ScoringSystem.completeModule(`module${this.currentModule}`);
      }
      this.setModule(this.currentModule + 1);
    } else {
      document.body.style.transition = 'opacity 0.4s ease';
      document.body.style.opacity = '0';
      setTimeout(() => {
        window.location.href = '../index.html';
      }, 400);
    }
  },

  // -------------------------------------------------------------
  // MODULE 1: Safety Introduction Flow
  // -------------------------------------------------------------
  setupModule1() {
    this.objectives = [
      { id: 'm1_intro', text: 'Complete introductory course steps', state: 'active' }
    ];
    this.currentStep = 0;
    this.showInstructions(
      "Module 1: Safety Overview",
      "Welcome. Engineering labs house dangerous electrical potentials. Before entering or performing maintenance, it is vital to master core electrical concepts. Click 'Continue' to start the tutorial."
    );
  },

  advanceModule1() {
    const steps = {
      1: {
        title: "Electrical Hazards",
        text: "Dangerous hazards include: 1) Shock - current pathway through body; 2) Electrocution - fatal shock; 3) Burns - heat from current or arc; 4) Arc Flash - explosion of superheated gas caused by phase short circuits."
      },
      2: {
        title: "Voltage vs Current",
        text: "Voltage (Volts) represents electrical pressure. Current (Amps) represents the electron flow rate. Current is what harms tissue: as little as 50mA to 100mA can stop cardiac rhythm. High voltage increases current delivery."
      },
      3: {
        title: "Arc Flash & Grounding",
        text: "Arc Flash events generate heat up to 35,000°F (melting equipment). Grounding provides a safe, low-resistance return path to the Earth, causing breakers to trip immediately during insulation faults."
      },
      4: {
        title: "Personal Protective Equipment",
        text: "To safely work, you must equip standard PPE: hard hats, dielectric footwear to isolate your body, high-voltage insulated gloves for hand contact, and face shields to block intense arc-flash radiation. Click 'Continue' to proceed to module completion."
      }
    };

    if (steps[this.currentStep]) {
      this.showInstructions(steps[this.currentStep].title, steps[this.currentStep].text);
    } else {
      this.hideInstructions();
      this.updateObjective('m1_intro', 'completed');
      if (window.ScoringSystem) window.ScoringSystem.addXP(10);
      this.showFeedback(
        "Module 1 Completed!",
        "You have completed the Safety Introduction course! You gained +10 XP. Next, let's learn how to choose appropriate protective equipment on the laboratory table.",
        false
      );
    }
  },

  // -------------------------------------------------------------
  // MODULE 2: PPE Selection Table
  // -------------------------------------------------------------
  setupModule2() {
    this.objectives = [
      { id: 'select_ppe', text: 'Equip proper safety gear from the table', state: 'active' }
    ];
    
    // Display PPE group items
    const ppeGroup = document.getElementById('ppe-items-group');
    if (ppeGroup) {
      ppeGroup.setAttribute('visible', 'true');
      
      // Reset selected states and emissive highlights
      this.selectedPPE.clear();
      this.correctPPE.forEach(id => {
        const item = document.getElementById(id);
        if (item) {
          item.setAttribute('scale', '1 1 1');
          this.setEntityGlow(item, false);
        }
      });
      // Also reset incorrect ones
      ['ppe-item-gloves-std', 'ppe-item-shoes-std'].forEach(id => {
        const item = document.getElementById(id);
        if (item) {
          item.setAttribute('scale', '1 1 1');
          this.setEntityGlow(item, false);
        }
      });
    }

    this.showInstructions(
      "Module 2: PPE Selection",
      "Maintenance is scheduled on the control panels. You must equip yourself with correct insulating gear before proceeding. Walk to the table and select your tools."
    );
  },

  handlePPEToggle(id, entity) {
    // Check if correct PPE vs incorrect PPE
    if (id === 'ppe-item-gloves-std') {
      this.showFeedback(
        "HAZARDOUS MATERIAL CHOSEN",
        "Leather Gloves do not offer dielectric insulation. Working on high voltage circuits with leather gloves can cause lethal shock if contact occurs. Always wear high-voltage rated rubber insulated gloves."
      );
      return;
    }
    if (id === 'ppe-item-shoes-std') {
      this.showFeedback(
        "HAZARDOUS MATERIAL CHOSEN",
        "Standard leather shoes or steel-capped work shoes do not prevent grounding. Dielectric rubber boots are required to isolate your feet from ground loops, preventing electric shock from passing through your body."
      );
      return;
    }

    // Toggle correct PPE selection
    if (this.selectedPPE.has(id)) {
      this.selectedPPE.delete(id);
      entity.setAttribute('scale', '1 1 1');
      this.setEntityGlow(entity, false);
    } else {
      this.selectedPPE.add(id);
      entity.setAttribute('scale', '1.15 1.15 1.15');
      this.setEntityGlow(entity, true);
    }
    
    if (window.AudioSynth) window.AudioSynth.playClick();
  },

  setEntityGlow(entity, enable) {
    // Find visual children shapes to apply color highlight
    const children = entity.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child.tagName === 'A-SPHERE' || child.tagName === 'A-BOX' || child.tagName === 'A-CYLINDER' || child.tagName === 'A-TORUS') {
        if (enable) {
          child.setAttribute('material', 'emissive: #00f0ff; emissiveIntensity: 0.6;');
        } else {
          // Reset to default material setting
          child.removeAttribute('material');
        }
      }
    }
  },

  confirmPPE() {
    // Check if user selected exactly the 5 correct safety items
    let hasAll = true;
    this.correctPPE.forEach(item => {
      if (!this.selectedPPE.has(item)) {
        hasAll = false;
      }
    });

    if (hasAll && this.selectedPPE.size === this.correctPPE.size) {
      this.updateObjective('select_ppe', 'completed');
      
      // Hide PPE group items
      const ppeGroup = document.getElementById('ppe-items-group');
      if (ppeGroup) ppeGroup.setAttribute('visible', 'false');

      if (window.ScoringSystem) window.ScoringSystem.addXP(10);
      this.showFeedback(
        "PPE Selection Confirmed!",
        "Excellent! You have successfully equipped all required protective equipment: Hard Hat, Insulated Gloves, Face Shield, Dielectric Boots, and Voltage Tester. You earned +10 XP.",
        false
      );
    } else {
      // Incomplete gear selection
      if (window.AudioSynth) window.AudioSynth.playDanger();
      alert("Incomplete Equipment: You are missing required safety tools or gear. Ensure you are insulated from head to toe, and carry a voltage verifier.");
    }
  },

  // -------------------------------------------------------------
  // MODULES 3 TO 7 (STUBS to be built in subsequent phases)
  // -------------------------------------------------------------
  setupModule3() {
    this.objectives = [{ id: 'find_hazards', text: 'Inspect the room and identify 3 electrical hazards', state: 'active' }];
  },
  setupModule4() {
    this.objectives = [{ id: 'perform_loto', text: 'Complete LOTO safety procedure on main panel', state: 'active' }];
  },
  setupModule5() {
    this.objectives = [{ id: 'extinguish_fire', text: 'Safely extinguish the active electrical fire', state: 'active' }];
  },
  setupModule6() {
    this.objectives = [{ id: 'shock_rescue', text: 'Perform shock rescue on the shocked operator', state: 'active' }];
  },
  setupModule7() {
    this.objectives = [{ id: 'final_exam', text: 'Complete final assessments under test conditions', state: 'active' }];
  },

  // -------------------------------------------------------------
  // CORE 3D ACTION DELEGATION
  // -------------------------------------------------------------
  handle3DClick(id, entity) {
    console.log(`Clicked 3D object: ${id}`);
    
    // Handle PPE interactions in Module 2
    if (this.currentModule === 2) {
      if (id.startsWith('ppe-item-')) {
        this.handlePPEToggle(id, entity);
      } else if (id === 'ppe-confirm-btn') {
        this.confirmPPE();
      }
    }
  },

  // Advance state step on 'Continue'
  advanceStep() {
    this.hideInstructions();
    if (this.currentModule === 1) {
      this.currentStep++;
      this.advanceModule1();
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const scene = document.querySelector('a-scene');
  if (scene.hasLoaded) {
    GameCoordinator.init();
  } else {
    scene.addEventListener('loaded', () => GameCoordinator.init());
  }
});

window.GameCoordinator = GameCoordinator;
