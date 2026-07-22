/**
 * VR Electrical Safety Simulator - UI Overlay & Menu Controller
 */

const UIController = {
  init() {
    this.bindMenuButtons();
    this.bindSettings();
    this.loadProgressStats();
    
    // Bind global page-level audio click listeners to capture dynamic additions
    document.addEventListener('click', (e) => {
      if (e.target.closest('button') || e.target.closest('.btn')) {
        if (window.AudioSynth) {
          window.AudioSynth.resumeContext();
          window.AudioSynth.playClick();
        }
      }
    });

    // Check accessibility mode from settings
    this.applyAccessibilityMode();
  },

  // Toggle Overlay screens (About, Instructions, Settings, Progress)
  showOverlay(id) {
    const overlay = document.getElementById(id);
    if (overlay) {
      overlay.classList.add('active');
      if (id === 'progress-overlay') {
        this.loadProgressStats();
      }
    }
  },

  closeAllOverlays() {
    document.querySelectorAll('.overlay').forEach(overlay => {
      overlay.classList.remove('active');
    });
  },

  bindMenuButtons() {
    // Menu buttons navigation
    const overlayTriggers = {
      'btn-instructions': 'instructions-overlay',
      'btn-about': 'about-overlay',
      'btn-progress': 'progress-overlay',
      'btn-settings': 'settings-overlay'
    };

    Object.entries(overlayTriggers).forEach(([btnId, overlayId]) => {
      const btn = document.getElementById(btnId);
      if (btn) {
        btn.addEventListener('click', () => this.showOverlay(overlayId));
      }
    });

    // Close buttons on overlays
    document.querySelectorAll('.close-btn').forEach(btn => {
      btn.addEventListener('click', () => this.closeAllOverlays());
    });

    // Close on overlay clicking background
    document.querySelectorAll('.overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.closeAllOverlays();
        }
      });
    });

    // Start training navigation
    const startBtn = document.getElementById('btn-start');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        // Fade transition effect
        document.body.style.transition = 'opacity 0.6s ease';
        document.body.style.opacity = '0';
        setTimeout(() => {
          window.location.href = 'scenes/room.html';
        }, 600);
      });
    }

    // Reset progress action
    const resetBtn = document.getElementById('btn-reset-progress');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm("Are you sure you want to reset all training progress? This cannot be undone.")) {
          if (window.ScoringSystem) {
            window.ScoringSystem.resetProgress();
            this.loadProgressStats();
            alert("Progress has been reset.");
          }
        }
      });
    }
  },

  bindSettings() {
    if (!window.ScoringSystem) return;

    const settings = window.ScoringSystem.settings;

    // Master volume slider
    const volSlider = document.getElementById('setting-master-vol');
    if (volSlider) {
      volSlider.value = settings.volume * 100;
      volSlider.addEventListener('input', (e) => {
        settings.volume = e.target.value / 100;
        window.ScoringSystem.saveSettings();
        if (window.AudioSynth) window.AudioSynth.updateVolumes();
      });
    }

    // SFX slider
    const sfxSlider = document.getElementById('setting-sfx-vol');
    if (sfxSlider) {
      sfxSlider.value = settings.sfxVolume * 100;
      sfxSlider.addEventListener('input', (e) => {
        settings.sfxVolume = e.target.value / 100;
        window.ScoringSystem.saveSettings();
        if (window.AudioSynth) window.AudioSynth.updateVolumes();
      });
    }

    // Ambient slider
    const ambSlider = document.getElementById('setting-ambient-vol');
    if (ambSlider) {
      ambSlider.value = settings.ambientVolume * 100;
      ambSlider.addEventListener('input', (e) => {
        settings.ambientVolume = e.target.value / 100;
        window.ScoringSystem.saveSettings();
        if (window.AudioSynth) window.AudioSynth.updateVolumes();
      });
    }

    // Accessibility high contrast toggle
    const accessibilityToggle = document.getElementById('setting-high-contrast');
    if (accessibilityToggle) {
      accessibilityToggle.checked = settings.accessibilityHighContrast;
      accessibilityToggle.addEventListener('change', (e) => {
        settings.accessibilityHighContrast = e.target.checked;
        window.ScoringSystem.saveSettings();
        this.applyAccessibilityMode();
      });
    }
  },

  applyAccessibilityMode() {
    if (!window.ScoringSystem) return;
    const isHighContrast = window.ScoringSystem.settings.accessibilityHighContrast;
    if (isHighContrast) {
      document.documentElement.classList.add('accessibility-mode');
      document.body.style.filter = 'contrast(1.2)';
    } else {
      document.documentElement.classList.remove('accessibility-mode');
      document.body.style.filter = 'none';
    }
  },

  loadProgressStats() {
    if (!window.ScoringSystem) return;

    const state = window.ScoringSystem.state;
    window.ScoringSystem.calculateGrade(); // Refresh grade calculation

    // Populate UI elements
    const xpVal = document.getElementById('stat-xp');
    if (xpVal) xpVal.textContent = state.xp;

    const gradeVal = document.getElementById('stat-grade');
    if (gradeVal) {
      gradeVal.textContent = state.grade;
      // Change color based on grade
      if (state.grade === 'Excellent') gradeVal.style.color = 'var(--accent-green)';
      else if (state.grade === 'Good') gradeVal.style.color = 'var(--accent-cyan)';
      else if (state.grade === 'Average') gradeVal.style.color = 'var(--accent-blue)';
      else gradeVal.style.color = 'var(--accent-red)';
    }

    // Modules count completed
    const completedCount = Object.values(state.modulesCompleted).filter(Boolean).length;
    const moduleProgressVal = document.getElementById('stat-modules');
    if (moduleProgressVal) {
      moduleProgressVal.textContent = `${completedCount} / 6`;
    }

    const hazardousVal = document.getElementById('stat-hazards');
    if (hazardousVal) hazardousVal.textContent = state.hazardousActions;

    // Checkbox checklist icons on modules
    for (let i = 1; i <= 6; i++) {
      const item = document.getElementById(`list-module-${i}`);
      if (item) {
        if (state.modulesCompleted[`module${i}`]) {
          item.classList.add('done');
          item.innerHTML = `✓ Module ${i} Completed`;
        } else {
          item.classList.remove('done');
          item.innerHTML = `○ Module ${i} Locked/Uncompleted`;
        }
      }
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  UIController.init();
});

window.UIController = UIController;
