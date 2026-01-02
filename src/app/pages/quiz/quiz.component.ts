import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';

import { Question, AnswerState } from '../../core/quiz.model';
import { QuizService } from '../../core/quiz.service';

import { ProgressBarModule } from 'primeng/progressbar';
import { ButtonModule } from 'primeng/button';
import { RadioButtonModule } from 'primeng/radiobutton';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'app-quiz',
  standalone: true,
  templateUrl: './quiz.component.html',
  styleUrl: './quiz.component.css',
  imports: [
    CommonModule,
    FormsModule,
    ProgressBarModule,
    ButtonModule,
    RadioButtonModule,
    CheckboxModule,
    DialogModule
  ],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('600ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class QuizComponent implements OnInit {
  private quizService = inject(QuizService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Signals for state management
  questions = signal<Question[]>([]);
  currentQuestionIndex = signal(0);
  selectedOption = signal<string | null>(null);
  selectedOptions = signal<string[]>([]);
  showExplanation = signal(false);
  isCorrect = signal(false);
  showConfirmDialog = signal(false);
  answerState = signal<Record<number, AnswerState>>({});

  private quizType = 'all';

  // Computed properties
  currentQuestion = computed(() => this.questions()[this.currentQuestionIndex()]);
  
  progressValue = computed(() => {
    const total = this.questions().length;
    return total > 0 ? ((this.currentQuestionIndex() + 1) / total) * 100 : 0;
  });

  ngOnInit(): void {
    this.quizType = this.route.snapshot.queryParamMap.get('type') ?? 'all';

    this.quizService.loadQuestions(this.quizType).subscribe((data) => {
      // Apply shuffling only if enabled
      const loadedQuestions = this.quizService.getShuffleEnabled() 
        ? this.quizService.shuffleArray([...data])
        : data;

      this.questions.set(loadedQuestions);
      this.quizService.setQuestions(loadedQuestions);
      this.restoreState();
    });
  }

  isSelected(option: string): boolean {
    const question = this.currentQuestion();
    if (!question) return false;
    
    return question.type === 'multiple'
      ? this.selectedOptions().includes(option)
      : this.selectedOption() === option;
  }

  toggleAnswer(option: string): void {
    const question = this.currentQuestion();
    if (!question) return;

    if (question.type === 'single') {
      this.selectedOption.set(option);
    } else {
      const current = this.selectedOptions();
      const index = current.indexOf(option);
      if (index === -1) {
        this.selectedOptions.set([...current, option]);
      } else {
        this.selectedOptions.set(current.filter(o => o !== option));
      }
    }
  }

  checkAnswer(): void {
    const question = this.currentQuestion();
    if (!question) return;

    let correct = false;

    if (question.type === 'multiple') {
      const correctAnswers = question.answers
        .filter(a => a.status === 'correct')
        .map(a => a.text)
        .sort();
      const selected = [...this.selectedOptions()].sort();
      correct = JSON.stringify(selected) === JSON.stringify(correctAnswers);
    } else {
      const correctAnswer = question.answers.find(a => a.status === 'correct')?.text;
      correct = this.selectedOption() === correctAnswer;
    }

    const newState: AnswerState = {
      selectedOption: this.selectedOption() ?? undefined,
      selectedOptions: [...this.selectedOptions()],
      showExplanation: true,
      isCorrect: correct
    };

    this.answerState.update(current => ({
      ...current,
      [question.id]: newState
    }));

    this.quizService.updateAnswerState(question.id, newState);
    this.showExplanation.set(true);
    this.isCorrect.set(correct);
  }

  goNext(): void {
    if (this.currentQuestionIndex() < this.questions().length - 1) {
      this.currentQuestionIndex.update(i => i + 1);
      this.restoreState();
    }
  }

  goBack(): void {
    if (this.currentQuestionIndex() > 0) {
      this.currentQuestionIndex.update(i => i - 1);
      this.restoreState();
    }
  }

  restoreState(): void {
    const question = this.currentQuestion();
    if (!question) return;

    const cached = this.answerState()[question.id];
    if (cached) {
      this.selectedOption.set(cached.selectedOption ?? null);
      this.selectedOptions.set(cached.selectedOptions ?? []);
      this.showExplanation.set(cached.showExplanation);
      this.isCorrect.set(cached.isCorrect);
    } else {
      this.selectedOption.set(null);
      this.selectedOptions.set([]);
      this.showExplanation.set(false);
      this.isCorrect.set(false);
    }
  }

  finishTest(): void {
    const total = this.questions().length;
    const answeredCount = Object.keys(this.answerState()).length;

    if (answeredCount < total) {
      this.showConfirmDialog.set(true);
      return;
    }

    this.finalizeQuiz();
  }

  finalizeQuiz(): void {
    const questions = this.questions();
    const states = this.answerState();
    const total = questions.length;
    const answered = Object.values(states);
    const correct = answered.filter(a => a.isCorrect).length;
    const timestamp = new Date();

    const domainSummary = questions.reduce((acc, q) => {
      const domain = q.domain || 'Unknown';
      const userAnswer = states[q.id];
      const isCorrect = userAnswer?.isCorrect ?? false;
      const isSkipped = !userAnswer;

      if (!acc[domain]) acc[domain] = { correct: 0, total: 0, skipped: 0 };

      acc[domain].total += 1;

      if (isCorrect) {
        acc[domain].correct += 1;
      } else if (isSkipped) {
        acc[domain].skipped += 1;
      }

      return acc;
    }, {} as Record<string, { correct: number; total: number; skipped: number }>);

    // Sort questions by original order for consistent review experience
    const sortedQuestions = this.quizService.sortByOriginalOrder(questions);

    const questionsWithAnswers = sortedQuestions.map(q => ({
      ...q,
      userAnswer: q.type === 'multiple'
        ? states[q.id]?.selectedOptions ?? []
        : (states[q.id]?.selectedOption ? [states[q.id].selectedOption!] : []),
      isSkipped: !states[q.id]
    }));

    this.router.navigate(['/result'], {
      state: {
        total,
        correct,
        timestamp,
        domainSummary,
        type: this.quizType,
        questions: questionsWithAnswers
      }
    });
  }

  confirmFinish(): void {
    this.showConfirmDialog.set(false);
    this.finalizeQuiz();
  }

  closeConfirmDialog(): void {
    this.showConfirmDialog.set(false);
  }
}
