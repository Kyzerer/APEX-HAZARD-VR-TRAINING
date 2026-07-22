/**
 * interactions.js — In-simulation object interaction and mission logic
 */

export class InteractionSystem {
  constructor(scene, telemetry, audio) {
    this.scene = scene;
    this.telemetry = telemetry;
    this.audio = audio;

    this.inventory = [null, null, null, null, null];
    this.activeSlot = 0;
    this.objectivesComplete = [];
    this.scenario = null;
    this.onObjectiveComplete = null;
    this.onScoreChange = null;
    this.score = 0;
    this.interactions = 0;
    this.wrongInteractions = 0;
  }

  setScenario(scenario) {
    this.scenario = scenario;
    this.objectivesComplete = new Array(scenario.objectives.length).fill(false);
    this.score = 0;
    this.interactions = 0;
    this.wrongInteractions = 0;
    this._setupInventoryForScenario(scenario);
  }

  _setupInventoryForScenario(scenario) {
    // Pre-populate relevant items
    const itemMap = {
      'Patch Kit':          '🔧',
      'Oxygen Mask':        '😷',
      'O₂ Tank':            '🫧',
      'Extinguisher':       '🧯',
      'Repair Panel':       '🔌',
      'SAFER Jetpack':      '🚀',
      'Tether':             '🔗',
      'Repair Kit':         '🛠️',
      'Circuit Board':      '💾',
      'Multi-tool':         '🔩',
      'EVA Suit':           '👨‍🚀',
      'Star Chart':         '⭐',
      'Navigation Computer':'🖥️',
      'Backup Radio':       '📻',
      'Fuse Kit':           '⚡',
      'Oxygen Tank':        '🫧',
      'Pressure Suit':      '🧑‍🚀',
      'Emergency Patch':    '🔧',
      'O₂ Reserve':         '💨',
    };

    this.inventory = [null, null, null, null, null];
    if (scenario.items) {
      scenario.items.slice(0, 5).forEach((item, i) => {
        this.inventory[i] = { name: item, icon: itemMap[item] || '📦' };
      });
    }
    this._updateInventoryUI();
  }

  _updateInventoryUI() {
    for (let i = 0; i < 5; i++) {
      const el = document.getElementById(`inv-${i}`);
      if (el) el.textContent = this.inventory[i]?.icon || '—';
    }
  }

  interact(action) {
    if (!this.scenario) return;

    this.interactions++;
    const result = this._handleAction(action);

    if (result.success) {
      this.audio.interactSuccess();
      this._addScore(result.points || 100);
      if (result.objectiveIndex !== undefined) {
        this._completeObjective(result.objectiveIndex, result.improvement);
      }
    } else {
      this.audio.warning();
      this.wrongInteractions++;
      this._addScore(-20);
    }

    return result;
  }

  _handleAction(action) {
    const id = this.scenario.id;

    // Universal interaction mappings
    const actionMap = {
      'seal_leak': {
        success: true, points: 200,
        message: '✅ Hull breach sealed! Pressure loss slowing...',
        objectiveIndex: 3, improvement: 'seal_leak',
        requires: ['Patch Kit'],
      },
      'open_locker': {
        success: true, points: 50,
        message: '📦 Emergency kit retrieved!',
        objectiveIndex: 2,
      },
      'check_pressure': {
        success: true, points: 80,
        message: '📊 Telemetry confirmed: Pressure anomaly detected!',
        objectiveIndex: 0,
      },
      'system_control': {
        success: true, points: 150,
        message: '⚙️ System controls accessed. Running diagnostics...',
        objectiveIndex: this._getControlObjective(id),
        improvement: this._getControlImprovement(id),
      },
      'use_extinguisher': {
        success: true, points: 250,
        message: '🧯 Fire suppressed! Monitoring for re-ignition...',
        objectiveIndex: 3, improvement: 'extinguish',
        requires: ['Extinguisher'],
      },
      'airlock': {
        success: true, points: 100,
        message: '🚪 Airlock sealed. Module isolated.',
        objectiveIndex: 2,
      },
    };

    const def = actionMap[action];
    if (!def) return { success: false, message: '⚠️ No valid action' };

    // Check inventory requirement
    if (def.requires) {
      const hasItem = def.requires.some(req =>
        this.inventory.some(item => item && item.name === req)
      );
      if (!hasItem) {
        return {
          success: false,
          message: `❌ Need ${def.requires[0]} to perform this action`,
        };
      }
    }

    if (def.improvement) {
      this.telemetry.improve(def.improvement, 25);
    }

    return def;
  }

  _getControlObjective(id) {
    const map = {
      oxygen_leak: 1,
      spacecraft_fire: 1,
      equipment_failure: 4,
      electrical_failure: 5,
      navigation_failure: 1,
      comm_blackout: 1,
    };
    return map[id] ?? 4;
  }

  _getControlImprovement(id) {
    const map = {
      equipment_failure: 'restore_power',
      electrical_failure: 'restore_power',
    };
    return map[id] || null;
  }

  _completeObjective(index, improvement) {
    if (!this.scenario || this.objectivesComplete[index]) return;
    this.objectivesComplete[index] = true;

    if (this.onObjectiveComplete) {
      this.onObjectiveComplete(index, this.scenario.objectives[index]);
    }
  }

  _addScore(points) {
    this.score = Math.max(0, this.score + points);
    if (this.onScoreChange) this.onScoreChange(this.score);
    const el = document.getElementById('hud-score');
    if (el) {
      el.textContent = this.score;
      el.style.transform = 'scale(1.3)';
      setTimeout(() => { el.style.transform = ''; }, 200);
    }
  }

  selectSlot(index) {
    if (index < 0 || index > 4) return;
    this.activeSlot = index;
    document.querySelectorAll('.inv-slot').forEach((el, i) => {
      el.classList.toggle('active', i === index);
    });
    this.audio.buttonClick();
  }

  getActiveItem() { return this.inventory[this.activeSlot]; }

  getCompletedCount() {
    return this.objectivesComplete.filter(Boolean).length;
  }

  getAllComplete() {
    return this.objectivesComplete.every(Boolean);
  }

  getAccuracy() {
    if (this.interactions === 0) return 100;
    return Math.round(((this.interactions - this.wrongInteractions) / this.interactions) * 100);
  }

  getFinalScore(timeTaken, maxTime) {
    const timeBonus = Math.max(0, Math.round(200 * (1 - timeTaken / (maxTime * 60))));
    const objBonus = this.getCompletedCount() * 100;
    const accuracyBonus = Math.round(this.getAccuracy() * 2);
    return Math.min(this.scenario?.maxScore || 1000,
      this.score + timeBonus + objBonus + accuracyBonus);
  }

  addAIHint(msg) {
    const container = document.getElementById('ai-messages');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'ai-msg ai-msg-hint';
    div.innerHTML = `<span>${msg}</span>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  addAIWarning(msg) {
    const container = document.getElementById('ai-messages');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'ai-msg ai-msg-warning';
    div.innerHTML = `<span>⚠️ ${msg}</span>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }
}

export default InteractionSystem;
