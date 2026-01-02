import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ChipModule } from 'primeng/chip';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';

interface ReviewQuestion {
  id: number;
  question: string;
  domain: string;
  type: 'single' | 'multiple';
  answers: { text: string; status: 'correct' | 'skipped'; explanation: string }[];
  userAnswer: string[];
  resource?: string;
  isCorrect?: boolean;
  isSkipped?: boolean;
}

@Component({
  selector: 'app-review-answers',
  standalone: true,
  imports: [CommonModule, FormsModule, ChipModule, SelectModule, ButtonModule],
  templateUrl: './review-answers.component.html',
  styleUrl: './review-answers.component.css'
})
export class ReviewAnswersComponent {
  private router = inject(Router);

  allQuestions = signal<ReviewQuestion[]>([]);
  filteredQuestions = signal<ReviewQuestion[]>([]);
  selectedDomain = signal('All domains');
  showAll = signal(true);

  domainOptions = signal([
    { name: 'All domains', value: 'All domains' },
    { name: 'Fundamentals of gen AI', value: 'Fundamentals of gen AI' },
    { name: "Google Cloud's gen AI offerings", value: "Google Cloud's gen AI offerings" },
    { name: 'Responsible AI practices', value: 'Responsible AI practices' },
    { name: 'Gen AI applications', value: 'Gen AI applications' }
  ]);

  totalQuestions = computed(() => this.allQuestions().length);
  correctAnswers = computed(() => this.allQuestions().filter(q => q.isCorrect).length);
  incorrectAnswers = computed(() => this.allQuestions().filter(q => !q.isCorrect && !q.isSkipped).length);
  skippedAnswers = computed(() => this.allQuestions().filter(q => q.isSkipped).length);

  constructor() {
    const state = this.router.getCurrentNavigation()?.extras.state;
    
    if (state && state['questions']?.length) {
      const questions = state['questions'].map((q: ReviewQuestion) => {
        const correctAnswers = q.answers.filter(a => a.status === 'correct').map(a => a.text);
        const hasAnswer = q.userAnswer?.length > 0;
        const isCorrect =
          hasAnswer &&
          correctAnswers.length === q.userAnswer.length &&
          correctAnswers.every(ans => q.userAnswer.includes(ans));

        return {
          ...q,
          isCorrect,
          isSkipped: !hasAnswer
        };
      });

      this.allQuestions.set(questions);
      this.filteredQuestions.set([...questions]);
    } else {
      console.warn('ReviewAnswersComponent: Missing or invalid navigation state. Redirecting to home.');
      this.router.navigate(['/']);
    }
  }

  filterQuestions(): void {
    const domain = this.selectedDomain();
    if (domain === 'All domains') {
      this.filteredQuestions.set([...this.allQuestions()]);
    } else {
      this.filteredQuestions.set(this.allQuestions().filter(q => q.domain === domain));
    }
  }

  onDomainChange(value: string): void {
    this.selectedDomain.set(value);
    this.filterQuestions();
  }

  isUserIncorrect(q: ReviewQuestion, answer: { status: string; text: string }): boolean {
    return q.userAnswer.includes(answer.text) && answer.status !== 'correct';
  }

  toggleCollapseAll(): void {
    this.showAll.update(v => !v);
  }

  goBack(): void {
    this.router.navigate(['/result'], {
      state: {
        total: this.totalQuestions(),
        correct: this.correctAnswers(),
        skipped: this.skippedAnswers(),
        domainSummary: this.generateDomainSummary(),
        timestamp: new Date(),
        type: 'all',
        questions: this.allQuestions()
      }
    });
  }

  private generateDomainSummary(): Record<string, { correct: number; total: number; skipped: number }> {
    const summary: Record<string, { correct: number; total: number; skipped: number }> = {};
    this.allQuestions().forEach((q) => {
      const domain = q.domain;
      if (!summary[domain]) {
        summary[domain] = { correct: 0, total: 0, skipped: 0 };
      }
      summary[domain].total += 1;
      if (q.isCorrect) {
        summary[domain].correct += 1;
      }
      if (q.isSkipped) {
        summary[domain].skipped += 1;
      }
    });
    return summary;
  }

  retakeTest(): void {
    this.router.navigate(['/quiz'], { queryParams: { type: 'all' } });
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}
