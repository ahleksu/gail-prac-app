import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Question, QuestionWithAnswer, AnswerState, DomainSummary, QuizResults } from './quiz.model';
import { Observable, map } from 'rxjs';

// Domain type mapping - maps route parameter to actual domain names in JSON
const DOMAIN_MAP: Record<string, string[]> = {
  'all': [], // Empty means all questions
  'fundamentals': ['Fundamentals of gen AI'],
  'google_cloud': ['Google Cloud\'s gen AI offerings', 'Google Cloud\'s Gen AI Offerings'],
  'techniques': ['Techniques to improve gen AI model output', 'Techniques to Improve Model Output'],
  'business': ['Business strategies for a successful gen AI solution', 'Business Strategies & Responsible AI']
};

@Injectable({ providedIn: 'root' })
export class QuizService {
  private http = inject(HttpClient);

  // Signals for reactive state management
  private questionsSignal = signal<Question[]>([]);
  private userAnswersSignal = signal<QuestionWithAnswer[]>([]);
  private answerStateSignal = signal<Record<number, AnswerState>>({});
  private shuffleEnabledSignal = signal<boolean>(true);

  // Public readonly signals
  readonly questions = this.questionsSignal.asReadonly();
  readonly userAnswers = this.userAnswersSignal.asReadonly();
  readonly answerState = this.answerStateSignal.asReadonly();
  readonly shuffleEnabled = this.shuffleEnabledSignal.asReadonly();

  /**
   * Loads questions from all.json and filters by domain type if specified
   * @param type - The quiz type ('all', 'fundamentals', 'google_cloud', 'techniques', 'business')
   */
  loadQuestions(type: string): Observable<Question[]> {
    return this.http.get<Question[]>('/quiz/all.json').pipe(
      map(questions => {
        const domainFilters = DOMAIN_MAP[type];
        
        // If no filter or 'all', return all questions
        if (!domainFilters || domainFilters.length === 0) {
          // Add original indices to all questions
          return questions.map((q, index) => ({ ...q, originalIndex: index }));
        }
        
        // Filter questions by matching domain names (case-insensitive comparison)
        // and preserve original indices
        return questions
          .map((q, index) => ({ ...q, originalIndex: index }))
          .filter(q => 
            domainFilters.some(domain => 
              q.domain?.toLowerCase() === domain.toLowerCase()
            )
          );
      })
    );
  }

  setQuestions(questions: Question[]): void {
    this.questionsSignal.set(questions);
  }

  getQuestions(): Question[] {
    return this.questionsSignal();
  }

  setUserAnswers(answers: QuestionWithAnswer[]): void {
    this.userAnswersSignal.set(answers);
  }

  getUserAnswers(): QuestionWithAnswer[] {
    return this.userAnswersSignal();
  }

  updateAnswerState(questionId: number, state: AnswerState): void {
    this.answerStateSignal.update(current => ({
      ...current,
      [questionId]: state
    }));
  }

  getAnswerState(questionId: number): AnswerState | undefined {
    return this.answerStateSignal()[questionId];
  }

  getAllAnswerStates(): Record<number, AnswerState> {
    return this.answerStateSignal();
  }

  clearState(): void {
    this.questionsSignal.set([]);
    this.userAnswersSignal.set([]);
    this.answerStateSignal.set({});
  }

  /**
   * Detects skipped questions - questions without any answer state
   */
  getSkippedQuestions(): Question[] {
    const questions = this.questionsSignal();
    const answerStates = this.answerStateSignal();
    return questions.filter(q => !answerStates[q.id]);
  }

  /**
   * Counts answered questions
   */
  getAnsweredCount(): number {
    return Object.keys(this.answerStateSignal()).length;
  }

  /**
   * Generates domain summary for results
   */
  generateDomainSummary(): Record<string, DomainSummary> {
    const questions = this.questionsSignal();
    const answerStates = this.answerStateSignal();

    return questions.reduce((acc, q) => {
      const domain = q.domain || 'Unknown';
      const userAnswer = answerStates[q.id];
      const isCorrect = userAnswer?.isCorrect ?? false;
      const isSkipped = !userAnswer;

      if (!acc[domain]) {
        acc[domain] = { correct: 0, total: 0, skipped: 0 };
      }

      acc[domain].total += 1;

      if (isCorrect) {
        acc[domain].correct += 1;
      } else if (isSkipped) {
        acc[domain].skipped += 1;
      }

      return acc;
    }, {} as Record<string, DomainSummary>);
  }

  /**
   * Shuffles array using Fisher-Yates algorithm
   */
  shuffleArray<T>(array: T[]): T[] {
    const result = array.slice();

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
  }

  /**
   * Gets unique domain names from the loaded questions in the service
   * Returns an array of objects with name and value properties for use in dropdowns
   */
  getUniqueDomains(): { name: string; value: string }[] {
    return this.extractUniqueDomains(this.questionsSignal());
  }

  /**
   * Extracts unique domain names from a given array of questions
   * Returns an array of objects with name and value properties for use in dropdowns
   */
  extractUniqueDomains(questions: { domain?: string }[]): { name: string; value: string }[] {
    const uniqueDomains = new Set<string>();
    
    questions.forEach(q => {
      if (q.domain) {
        uniqueDomains.add(q.domain);
      }
    });

    const domains = Array.from(uniqueDomains)
      .sort()
      .map(domain => ({ name: domain, value: domain }));

    return [{ name: 'All domains', value: 'All domains' }, ...domains];
  }
}
