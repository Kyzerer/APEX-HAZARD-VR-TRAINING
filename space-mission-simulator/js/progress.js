/**
 * progress.js — Mission progress, achievements and stats tracking
 */

import Storage from './storage.js';

const ACHIEVEMENTS = [
  { id: 'first_mission', icon: '🚀', name: 'First Launch', desc: 'Complete your first mission', condition: p => p.completedMissions >= 1 },
  { id: 'perfect_score', icon: '⭐', name: 'Perfect Score', desc: 'Score 100% on any mission', condition: p => p.bestScore >= 1000 },
  { id: 'speed_runner', icon: '⚡', name: 'Speed Runner', desc: 'Complete a mission in under 3 min', condition: p => p.fastestTime !== null && p.fastestTime < 180 },
  { id: 'iron_will', icon: '💪', name: 'Iron Will', desc: 'Complete 5 missions', condition: p => p.completedMissions >= 5 },
  { id: 'elite_astronaut', icon: '👨‍🚀', name: 'Elite Astronaut', desc: 'Complete all 10 missions', condition: p => p.completedMissions >= 10 },
  { id: 'quiz_master', icon: '🎓', name: 'Quiz Master', desc: 'Score 100% on 3 quizzes', condition: p => p.perfectQuizzes >= 3 },
  { id: 'survivor', icon: '🛡️', name: 'Survivor', desc: 'Survive a critical emergency', condition: p => p.criticalSurvived >= 1 },
  { id: 'protocol', icon: '📋', name: 'By The Book', desc: 'Follow all objectives in order', condition: p => p.perfectObjectives >= 1 },
];

const RANKS = [
  { name: 'Cadet', minMissions: 0 },
  { name: 'Ensign', minMissions: 1 },
  { name: 'Lieutenant', minMissions: 3 },
  { name: 'Commander', minMissions: 5 },
  { name: 'Captain', minMissions: 7 },
  { name: 'Mission Specialist', minMissions: 9 },
  { name: 'Flight Director', minMissions: 10 },
];

export class ProgressManager {
  constructor() {
    this.data = this._load();
    this.totalTimerInterval = null;
  }

  _load() {
    return Storage.get('progress', {
      astronautName: 'Commander',
      completedMissions: 0,
      totalPlaySeconds: 0,
      bestScore: 0,
      averageScore: 0,
      fastestTime: null,
      perfectQuizzes: 0,
      criticalSurvived: 0,
      perfectObjectives: 0,
      missionScores: {},        // missionId → { score, time, date, completed }
      unlockedAchievements: [],
      history: [],
    });
  }

  save() { Storage.set('progress', this.data); }

  get astronautName() { return this.data.astronautName; }
  set astronautName(n) { this.data.astronautName = n; this.save(); }

  getRank() {
    const cm = this.data.completedMissions;
    let rank = RANKS[0];
    for (const r of RANKS) { if (cm >= r.minMissions) rank = r; }
    return rank.name;
  }

  getReadinessPct() {
    return Math.min(100, Math.round((this.data.completedMissions / 10) * 100));
  }

  completeMission(missionId, score, timeSeconds, objectives = []) {
    const existing = this.data.missionScores[missionId];
    const wasCompleted = existing?.completed;

    this.data.missionScores[missionId] = {
      score,
      time: timeSeconds,
      date: new Date().toLocaleDateString(),
      completed: true,
    };

    if (!wasCompleted) {
      this.data.completedMissions++;
    }

    // Update best/average
    const allScores = Object.values(this.data.missionScores)
      .filter(m => m.completed)
      .map(m => m.score);

    this.data.bestScore = Math.max(...allScores);
    this.data.averageScore = Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length);

    if (this.data.fastestTime === null || timeSeconds < this.data.fastestTime) {
      this.data.fastestTime = timeSeconds;
    }

    // Add history entry
    this.data.history.unshift({
      mission: missionId,
      score,
      time: timeSeconds,
      date: new Date().toLocaleDateString(),
      status: score >= 700 ? 'PASS' : 'FAIL',
    });

    if (this.data.history.length > 50) {
      this.data.history = this.data.history.slice(0, 50);
    }

    this._checkAchievements();
    this.save();
  }

  getMissionData(missionId) {
    return this.data.missionScores[missionId] || null;
  }

  addPlayTime(seconds) {
    this.data.totalPlaySeconds += seconds;
    this.save();
  }

  addPerfectQuiz() {
    this.data.perfectQuizzes++;
    this._checkAchievements();
    this.save();
  }

  addCriticalSurvived() {
    this.data.criticalSurvived++;
    this._checkAchievements();
    this.save();
  }

  addPerfectObjectives() {
    this.data.perfectObjectives++;
    this._checkAchievements();
    this.save();
  }

  _checkAchievements() {
    for (const ach of ACHIEVEMENTS) {
      if (!this.data.unlockedAchievements.includes(ach.id) && ach.condition(this.data)) {
        this.data.unlockedAchievements.push(ach.id);
      }
    }
  }

  getAchievements() {
    return ACHIEVEMENTS.map(a => ({
      ...a,
      unlocked: this.data.unlockedAchievements.includes(a.id),
    }));
  }

  getTotalHours() {
    const total = this.data.totalPlaySeconds;
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    return `${h}h ${m}m`;
  }

  getHistory() { return this.data.history; }

  reset() {
    Storage.clear();
    this.data = this._load();
  }
}

export default ProgressManager;
