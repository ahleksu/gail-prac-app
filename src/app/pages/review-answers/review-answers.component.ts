import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ChipModule } from 'primeng/chip';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { QuizService } from '../../core/quiz.service';

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
export class ReviewAnswersComponent implements OnInit {
  private router = inject(Router);
  private quizService = inject(QuizService);

  allQuestions = signal<QuestionWithAnswer[]>([]);
  filteredQuestions = signal<QuestionWithAnswer[]>([]);
  selectedDomain = signal('All domains');
  showAll = signal(true);

  domainOptions = signal<{ name: string; value: string }[]>([]);

  totalQuestions = computed(() => this.allQuestions().length);
  correctAnswers = computed(() => this.allQuestions().filter(q => q.isCorrect).length);
  incorrectAnswers = computed(() => this.allQuestions().filter(q => !q.isCorrect && !q.isSkipped).length);
  skippedAnswers = computed(() => this.allQuestions().filter(q => q.isSkipped).length);

  ngOnInit(): void {
    // Try to get state from navigation first
    const state = this.router.getCurrentNavigation()?.extras.state;
    let questionsData = state && state['questions']?.length ? state['questions'] : null;
    
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
      
      // Derive domain options from the actual questions using the service method
      this.domainOptions.set(this.quizService.extractUniqueDomains(questions));
    } else {
      console.warn('ReviewAnswersComponent: Missing or invalid navigation state. Redirecting to home.');
      this.router.navigate(['/']);
    }
    
    const questions = questionsData.map((q: QuestionWithAnswer) => {
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

  isUserIncorrect(q: QuestionWithAnswer, answer: { status: string; text: string }): boolean {
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
