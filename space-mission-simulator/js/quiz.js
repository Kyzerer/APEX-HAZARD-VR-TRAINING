/**
 * quiz.js — Post-mission debrief quiz system
 */

export class QuizSystem {
  constructor() {
    this.questions = [];
    this.currentIndex = 0;
    this.answers = [];
    this.score = 0;
    this.onComplete = null;
  }

  load(scenario) {
    // Shuffle questions
    this.questions = [...scenario.quiz].sort(() => Math.random() - 0.5);
    this.currentIndex = 0;
    this.answers = [];
    this.score = 0;
  }

  getCurrentQuestion() {
    return this.questions[this.currentIndex] || null;
  }

  answer(optionIndex) {
    const q = this.getCurrentQuestion();
    if (!q) return null;

    const correct = optionIndex === q.correct;
    if (correct) this.score++;

    const result = {
      question: q.q,
      selected: optionIndex,
      correct: q.correct,
      isCorrect: correct,
      explanation: q.explanation,
    };

    this.answers.push(result);
    return result;
  }

  next() {
    this.currentIndex++;
  }

  isDone() {
    return this.currentIndex >= this.questions.length;
  }

  getProgress() {
    return {
      current: this.currentIndex + 1,
      total: this.questions.length,
      pct: ((this.currentIndex) / this.questions.length) * 100,
    };
  }

  getResults() {
    const total = this.questions.length;
    const correct = this.score;
    const pct = Math.round((correct / total) * 100);
    let grade = 'F';
    if (pct >= 90) grade = 'A+';
    else if (pct >= 80) grade = 'A';
    else if (pct >= 70) grade = 'B';
    else if (pct >= 60) grade = 'C';
    else if (pct >= 50) grade = 'D';

    return { correct, total, pct, grade, answers: this.answers, isPerfect: correct === total };
  }
}

export default QuizSystem;
