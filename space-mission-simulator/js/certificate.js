/**
 * certificate.js — Flight readiness certificate generation and printing
 */

export class CertificateSystem {
  constructor() {}

  populate(astronautName, progress) {
    const readiness = progress.getReadinessPct();
    const completed = progress.data.completedMissions;
    const avgScore = progress.data.averageScore || 0;
    const totalTime = progress.getTotalHours();

    document.getElementById('cert-name').textContent = astronautName;
    document.getElementById('cert-date').textContent = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
    document.getElementById('cert-score').textContent = `${readiness}% Readiness`;
    document.getElementById('cert-modules').textContent = `${completed} / 10`;
    document.getElementById('cert-time').textContent = totalTime;

    const note = document.getElementById('cert-note');
    const printBtn = document.getElementById('cert-print-btn');

    if (completed >= 10) {
      note.textContent = 'All missions completed — certificate is valid!';
      note.style.color = '#10B981';
      printBtn.disabled = false;
    } else {
      note.textContent = `Complete ${10 - completed} more mission(s) to unlock full certification.`;
      note.style.color = '';
      printBtn.disabled = true;
    }
  }

  print() {
    window.print();
  }
}

export default CertificateSystem;
