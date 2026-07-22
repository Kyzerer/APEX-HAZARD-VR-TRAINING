/**
 * VR Electrical Safety Simulator - Progress & Scoring System
 */

const SCORING_KEY = 'vr_electrical_safety_score_v1';
const SETTINGS_KEY = 'vr_electrical_safety_settings_v1';

const ScoringSystem = {
  // Default State
  state: {
    xp: 0,
    modulesCompleted: {}, // { 'module1': true, 'module2': false }
    perfectSequences: 0,
    hazardousActions: 0,
    totalTimeSpent: 0, // in seconds
    grade: 'Needs Improvement'
  },

  // Default Settings
  settings: {
    volume: 0.5,
    sfxVolume: 0.7,
    ambientVolume: 0.3,
    difficulty: 'standard',
    accessibilityHighContrast: false
  },

  // Load progress from Local Storage
  loadProgress() {
    try {
      const stored = localStorage.getItem(SCORING_KEY);
      if (stored) {
        this.state = { ...this.state, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error("Error loading progress:", e);
    }
    return this.state;
  },

  // Save progress to Local Storage
  saveProgress() {
    try {
      localStorage.setItem(SCORING_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error("Error saving progress:", e);
    }
  },

  // Load settings from Local Storage
  loadSettings() {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        this.settings = { ...this.settings, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error("Error loading settings:", e);
    }
    return this.settings;
  },

  // Save settings to Local Storage
  saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.error("Error saving settings:", e);
    }
  },

  // Modify XP and clamp to positive values
  addXP(amount) {
    this.state.xp = Math.max(0, this.state.xp + amount);
    this.saveProgress();
    return this.state.xp;
  },

  deductXP(amount) {
    this.state.xp = Math.max(0, this.state.xp - amount);
    this.saveProgress();
    return this.state.xp;
  },

  // Record a completed module
  completeModule(moduleId) {
    this.state.modulesCompleted[moduleId] = true;
    this.saveProgress();
  },

  // Reset all state to defaults
  resetProgress() {
    this.state = {
      xp: 0,
      modulesCompleted: {},
      perfectSequences: 0,
      hazardousActions: 0,
      totalTimeSpent: 0,
      grade: 'Needs Improvement'
    };
    this.saveProgress();
  },

  // Calculate overall performance grade based on current modules and score
  calculateGrade() {
    const xp = this.state.xp;
    
    if (xp >= 150) {
      this.state.grade = 'Excellent';
    } else if (xp >= 100) {
      this.state.grade = 'Good';
    } else if (xp >= 50) {
      this.state.grade = 'Average';
    } else {
      this.state.grade = 'Needs Improvement';
    }
    
    this.saveProgress();
    return this.state.grade;
  }
};

// Initialize on script load
ScoringSystem.loadProgress();
ScoringSystem.loadSettings();

// Export global variable
window.ScoringSystem = ScoringSystem;
