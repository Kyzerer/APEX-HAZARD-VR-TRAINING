/**
 * ui.js — Dashboard UI: mission cards, progress, leaderboard, certificate
 */

import SCENARIOS from './scenarios.js';
import Storage from './storage.js';

export class UIManager {
  constructor(progress, leaderboard, certificate, audio) {
    this.progress = progress;
    this.leaderboard = leaderboard;
    this.certificate = certificate;
    this.audio = audio;

    this.onMissionLaunch = null;
    this.totalTimeSeconds = 0;
    this.totalTimerInterval = null;
    this.currentPanel = 'missions';
    this.settings = this._loadSettings();
    this._applySettings();
  }

  _loadSettings() {
    return Storage.get('settings', {
      speed: 5, sensitivity: 5, invertY: false,
      masterVol: 70, sfxVol: 80, audio: true,
      quality: 'medium', bloom: true, particles: true,
      fontSize: 'normal', highContrast: false, reduceMotion: false,
      theme: 'dark',
    });
  }

  _applySettings() {
    const s = this.settings;
    document.documentElement.dataset.theme = s.theme === 'light' ? 'light' : '';
    document.documentElement.dataset.font = s.fontSize;
    document.documentElement.dataset.contrast = s.highContrast ? 'high' : '';
    if (s.reduceMotion) {
      document.documentElement.style.setProperty('--transition', '0s');
    }
  }

  saveSettings() {
    Storage.set('settings', this.settings);
    this._applySettings();
  }

  init() {
    this._buildMissionCards();
    this._buildAchievements();
    this._setupSidebarNav();
    this._setupFilterBtns();
    this._setupSettingsPanel();
    this._setupLeaderboard();
    this._syncAstronautCard();
    this._startTotalTimer();
    this._updateTopBar();
    this.certificate.populate(this.progress.astronautName, this.progress);
    this._drawProgressDonut();
    this._buildHistoryTable();
  }

  _buildMissionCards() {
    const grid = document.getElementById('mission-cards-grid');
    if (!grid) return;
    grid.innerHTML = '';

    SCENARIOS.forEach(sc => {
      const mData = this.progress.getMissionData(sc.id);
      const completed = mData?.completed ?? false;
      const score = mData?.score ?? 0;
      const pct = completed ? 100 : 0;
      const statusIcon = completed ? '✅' : '🔒';
      const pctClass = completed ? 'completed' : 'not-started';

      const card = document.createElement('div');
      card.className = 'mission-card';
      card.dataset.difficulty = sc.difficulty;
      card.innerHTML = `
        <div class="mc-header">
          <div class="mc-icon">${sc.icon}</div>
          <div class="mc-badge ${sc.difficulty}">${sc.difficulty.toUpperCase()}</div>
        </div>
        <div class="mc-body">
          <div class="mc-title">${sc.title}</div>
          <div class="mc-desc">${sc.description.substring(0, 100)}...</div>
          <div class="mc-meta">
            <div class="mc-meta-item">
              <span class="mc-meta-label">DURATION</span>
              <span class="mc-meta-value">${sc.duration} MIN</span>
            </div>
            <div class="mc-meta-item">
              <span class="mc-meta-label">MAX SCORE</span>
              <span class="mc-meta-value">${sc.maxScore}</span>
            </div>
          </div>
          <div class="mc-progress">
            <div class="mc-progress-label">
              <span>Completion</span><span>${pct}%</span>
            </div>
            <div class="mc-progress-bar">
              <div class="mc-progress-fill ${pctClass}" style="width:${pct}%"></div>
            </div>
          </div>
        </div>
        <div class="mc-footer">
          <div class="mc-score">Best: <span>${score > 0 ? score : '--'}</span></div>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="mc-status-badge">${statusIcon}</span>
            <button class="mc-launch-btn" data-id="${sc.id}">▶ LAUNCH</button>
          </div>
        </div>
      `;

      card.querySelector('.mc-launch-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.audio.click();
        if (this.onMissionLaunch) this.onMissionLaunch(sc.id);
      });

      grid.appendChild(card);
    });
  }

  _buildAchievements() {
    const grid = document.getElementById('achievements-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const achievements = this.progress.getAchievements();
    achievements.forEach(ach => {
      const div = document.createElement('div');
      div.className = `achievement-item ${ach.unlocked ? 'unlocked' : ''}`;
      div.innerHTML = `
        <div class="ach-icon">${ach.icon}</div>
        <div class="ach-name">${ach.name}</div>
        <div class="ach-desc">${ach.desc}</div>
      `;
      grid.appendChild(div);
    });
  }

  _buildHistoryTable() {
    const tbody = document.getElementById('history-tbody');
    if (!tbody) return;
    const history = this.progress.getHistory();

    if (history.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="no-data">No missions completed yet.</td></tr>';
      return;
    }

    tbody.innerHTML = history.slice(0, 20).map(h => {
      const sc = SCENARIOS.find(s => s.id === h.mission);
      const statusColor = h.status === 'PASS' ? '#10B981' : '#EF4444';
      return `<tr>
        <td>${sc?.title || h.mission}</td>
        <td>${h.date}</td>
        <td style="color:#0EA5E9;font-family:'Orbitron',monospace">${h.score}</td>
        <td>${this._formatTime(h.time)}</td>
        <td><span style="color:${statusColor};font-family:'Orbitron',monospace;font-size:0.68rem">${h.status}</span></td>
      </tr>`;
    }).join('');
  }

  _setupSidebarNav() {
    document.querySelectorAll('.sidebar-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.audio.click();
        const panel = link.dataset.panel;
        this.switchPanel(panel);
      });
    });
  }

  switchPanel(panel) {
    this.currentPanel = panel;
    document.querySelectorAll('.sidebar-link').forEach(l => {
      l.classList.toggle('active', l.dataset.panel === panel);
    });
    document.querySelectorAll('.panel').forEach(p => {
      p.classList.toggle('active', p.id === `panel-${panel}`);
    });

    const titles = {
      missions: 'MISSION CONTROL',
      progress: 'TRAINING PROGRESS',
      leaderboard: 'LEADERBOARD',
      certificate: 'FLIGHT CERTIFICATE',
      settings: 'SYSTEM SETTINGS',
    };
    const el = document.getElementById('panel-title');
    if (el) el.textContent = titles[panel] || panel.toUpperCase();

    if (panel === 'progress') {
      this._buildAchievements();
      this._drawProgressDonut();
      this._buildHistoryTable();
      this._updateProgressStats();
    }
    if (panel === 'leaderboard') this._renderLeaderboard();
    if (panel === 'certificate') {
      this.certificate.populate(this.progress.astronautName, this.progress);
    }
  }

  _updateProgressStats() {
    const p = this.progress;
    const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    el('pstat-missions', p.data.completedMissions);
    el('pstat-hours', p.getTotalHours());
    el('pstat-avg', p.data.averageScore || '--');
    el('pstat-best', p.data.bestScore || '--');
  }

  _drawProgressDonut() {
    const canvas = document.getElementById('progress-donut');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pct = this.progress.getReadinessPct() / 100;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = 80;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background circle
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 14;
    ctx.stroke();

    // Progress arc
    if (pct > 0) {
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#0EA5E9');
      gradient.addColorStop(1, '#10B981');
      ctx.beginPath();
      ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * pct));
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    const pctEl = document.getElementById('donut-pct');
    if (pctEl) pctEl.textContent = `${Math.round(pct * 100)}%`;
  }

  _setupFilterBtns() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.audio.click();
        const filter = btn.dataset.filter;
        document.querySelectorAll('.mission-card').forEach(card => {
          card.style.display =
            filter === 'all' || card.dataset.difficulty === filter ? '' : 'none';
        });
      });
    });
  }

  _setupSettingsPanel() {
    const s = this.settings;

    const bind = (id, key, type = 'value') => {
      const el = document.getElementById(id);
      if (!el) return;
      if (type === 'checked') el.checked = s[key];
      else el.value = s[key];
      el.addEventListener('change', () => {
        s[key] = type === 'checked' ? el.checked : el.value;
      });
    };

    bind('setting-speed', 'speed');
    bind('setting-sensitivity', 'sensitivity');
    bind('setting-invert-y', 'invertY', 'checked');
    bind('setting-master-vol', 'masterVol');
    bind('setting-sfx-vol', 'sfxVol');
    bind('setting-audio', 'audio', 'checked');
    bind('setting-quality', 'quality');
    bind('setting-bloom', 'bloom', 'checked');
    bind('setting-particles', 'particles', 'checked');
    bind('setting-font-size', 'fontSize');
    bind('setting-high-contrast', 'highContrast', 'checked');
    bind('setting-reduce-motion', 'reduceMotion', 'checked');

    document.getElementById('save-settings-btn')?.addEventListener('click', () => {
      this.saveSettings();
      if (this.onSettingsSave) this.onSettingsSave(s);
      this.audio.success();
    });

    document.getElementById('reset-progress-btn')?.addEventListener('click', () => {
      if (confirm('⚠️ Reset ALL mission progress? This cannot be undone.')) {
        this.progress.reset();
        location.reload();
      }
    });
  }

  _setupLeaderboard() {
    const search = document.getElementById('lb-search');
    const sort   = document.getElementById('lb-sort');

    search?.addEventListener('input', () => this._renderLeaderboard());
    sort?.addEventListener('change', () => this._renderLeaderboard());
  }

  _renderLeaderboard() {
    const search = document.getElementById('lb-search')?.value || '';
    const sortBy = document.getElementById('lb-sort')?.value || 'score';
    const tbody = document.getElementById('leaderboard-tbody');
    if (!tbody) return;

    // Add user to leaderboard
    this.leaderboard.addUserEntry(
      this.progress.astronautName,
      this.progress.data.bestScore,
      this.progress.data.fastestTime || 999,
      this.progress.getReadinessPct()
    );

    const entries = this.leaderboard.getEntries(sortBy, search);
    tbody.innerHTML = entries.map(e => {
      const rankClass = e.rank <= 3 ? `rank-${e.rank}` : 'rank-other';
      const isUser = e._isUser;
      const rowStyle = isUser ? 'background:rgba(14,165,233,0.06);' : '';
      const readinessColor = e.readiness >= 90 ? '#10B981' : e.readiness >= 70 ? '#F59E0B' : '#EF4444';
      return `<tr style="${rowStyle}">
        <td><span class="rank-badge ${rankClass}">${e.rank}</span></td>
        <td style="font-weight:${isUser ? '600' : '400'};color:${isUser ? '#0EA5E9' : ''}">${e.name}</td>
        <td style="color:#64748B;font-size:0.78rem">${e.agency}</td>
        <td style="font-family:'Orbitron',monospace;font-size:0.78rem">${e.time}</td>
        <td style="font-family:'Orbitron',monospace;color:#0EA5E9;font-size:0.9rem">${e.score || '--'}</td>
        <td><span class="readiness-pct-cell" style="background:${readinessColor}22;color:${readinessColor}">${e.readiness}%</span></td>
      </tr>`;
    }).join('') || '<tr><td colspan="6" class="no-data">No entries found</td></tr>';
  }

  _syncAstronautCard() {
    const p = this.progress;
    const nameEl = document.getElementById('sidebar-astronaut-name');
    const rankEl = document.getElementById('sidebar-astronaut-rank');
    const fillEl = document.getElementById('sidebar-readiness');
    const pctEl  = document.getElementById('sidebar-readiness-pct');

    if (nameEl) nameEl.textContent = p.astronautName;
    if (rankEl) rankEl.textContent = p.getRank();
    const pct = p.getReadinessPct();
    if (fillEl) fillEl.style.width = `${pct}%`;
    if (pctEl) pctEl.textContent = `${pct}%`;
  }

  _startTotalTimer() {
    const el = document.getElementById('total-time-display');
    const startSecs = this.progress.data.totalPlaySeconds;
    let secs = startSecs;

    this.totalTimerInterval = setInterval(() => {
      secs++;
      if (el) el.textContent = this._formatTimeHMS(secs);
    }, 1000);
  }

  _updateTopBar() {
    const completed = this.progress.data.completedMissions;
    const el = document.getElementById('completed-count-display');
    if (el) el.textContent = `${completed}/10`;
  }

  toggleTheme() {
    const s = this.settings;
    s.theme = s.theme === 'dark' ? 'light' : 'dark';
    this._applySettings();
    this.saveSettings();
  }

  toggleMute() {
    const muted = this.audio.enabled;
    if (muted) this.audio.mute();
    else this.audio.unmute();
    const btn = document.getElementById('topbar-mute-btn');
    if (btn) btn.textContent = this.audio.enabled ? '🔊' : '🔇';
  }

  _formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(Math.round(s)).padStart(2, '0')}`;
  }

  _formatTimeHMS(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  destroy() {
    if (this.totalTimerInterval) clearInterval(this.totalTimerInterval);
  }
}

export default UIManager;
