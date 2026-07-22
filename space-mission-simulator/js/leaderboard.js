/**
 * leaderboard.js — Mock leaderboard with realistic astronaut data
 */

export class Leaderboard {
  constructor() {
    this.entries = this._generateMockData();
  }

  _generateMockData() {
    return [
      { name: 'Col. Elena Vasquez',   agency: '🇺🇸 NASA',   time: '04:12', score: 1480, readiness: 98 },
      { name: 'Maj. Yuki Nakamura',   agency: '🇯🇵 JAXA',   time: '04:55', score: 1430, readiness: 96 },
      { name: 'Cdr. Arjun Sharma',    agency: '🇮🇳 ISRO',   time: '05:20', score: 1390, readiness: 95 },
      { name: 'Dr. Lena Fischer',     agency: '🇩🇪 ESA',    time: '05:41', score: 1360, readiness: 94 },
      { name: 'Cdr. Marcus Webb',     agency: '🇺🇸 NASA',   time: '06:02', score: 1310, readiness: 92 },
      { name: 'Dr. Liu Ming',         agency: '🇨🇳 CNSA',   time: '06:23', score: 1280, readiness: 91 },
      { name: 'Maj. Ivan Petrov',     agency: '🇷🇺 Roscosmos', time: '06:48', score: 1240, readiness: 89 },
      { name: 'Cdr. Sarah Okonjo',    agency: '🇬🇧 ESA',    time: '07:15', score: 1190, readiness: 88 },
      { name: 'Dr. Carlos Mendez',    agency: '🇲🇽 AEM',    time: '07:40', score: 1150, readiness: 86 },
      { name: 'Lt. Amara Diallo',     agency: '🇫🇷 ESA',    time: '08:00', score: 1100, readiness: 84 },
      { name: 'Cdr. Nora Andersen',   agency: '🇳🇴 ESA',    time: '08:22', score: 1060, readiness: 82 },
      { name: 'Dr. Kenji Watanabe',   agency: '🇯🇵 JAXA',   time: '08:55', score: 1020, readiness: 80 },
    ];
  }

  addUserEntry(name, score, time, readiness) {
    // Remove existing user entry if present
    this.entries = this.entries.filter(e => e._isUser !== true);

    const entry = {
      name: `► ${name}`,
      agency: '👨‍🚀 YOU',
      time: this._formatTime(time),
      score,
      readiness,
      _isUser: true,
    };

    this.entries.push(entry);
    this._sort('score');
  }

  _sort(by) {
    this.entries.sort((a, b) => {
      if (by === 'score') return b.score - a.score;
      if (by === 'time') return this._parseTime(a.time) - this._parseTime(b.time);
      if (by === 'readiness') return b.readiness - a.readiness;
      return 0;
    });
  }

  getEntries(sortBy = 'score', filter = '') {
    let entries = [...this.entries];
    this._sort.call({ entries }, sortBy);
    entries.sort((a, b) => {
      if (sortBy === 'score') return b.score - a.score;
      if (sortBy === 'time') return this._parseTime(a.time) - this._parseTime(b.time);
      if (sortBy === 'readiness') return b.readiness - a.readiness;
      return 0;
    });

    if (filter) {
      entries = entries.filter(e =>
        e.name.toLowerCase().includes(filter.toLowerCase()) ||
        e.agency.toLowerCase().includes(filter.toLowerCase())
      );
    }

    return entries.map((e, i) => ({ rank: i + 1, ...e }));
  }

  _parseTime(t) {
    const [m, s] = t.split(':').map(Number);
    return m * 60 + (s || 0);
  }

  _formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
}

export default Leaderboard;
