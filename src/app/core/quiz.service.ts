import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Question, QuestionWithAnswer, AnswerState, DomainSummary } from './quiz.model';
import { Observable, map } from 'rxjs';

// Domain type mapping - maps route parameter to actual domain names in JSON
// Note: The JSON uses curly/smart apostrophe (') not straight apostrophe (')
const DOMAIN_MAP: Record<string, string[]> = {
  'all': [], // Empty means all questions
  'fundamentals': ['Fundamentals of gen AI'],
  'google_cloud': [`Google Cloud\u2019s gen AI offerings`],
  'techniques': ['Techniques to improve gen AI model output'],
  'business': ['Business strategies for a successful gen AI solution']
};

@Injectable({ providedIn: 'root' })
export class QuizService {
  private http = inject(HttpClient);

  // Signals for reactive state management
  private questionsSignal = signal<Question[]>([]);
  private userAnswersSignal = signal<QuestionWithAnswer[]>([]);
  private answerStateSignal = signal<Record<number, AnswerState>>({});

  // Public readonly signals
  readonly questions = this.questionsSignal.asReadonly();
  readonly userAnswers = this.userAnswersSignal.asReadonly();
  readonly answerState = this.answerStateSignal.asReadonly();

  // Shuffle setting
  private shuffleEnabled = true;

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
          return questions;
        }
        
        // Filter questions by matching domain names (case-insensitive comparison)
        return questions.filter(q => 
          domainFilters.some(domain => 
            q.domain?.toLowerCase() === domain.toLowerCase()
          )
        );
      })
    );
  }

  /**
   * Get shuffle setting
   */
  getShuffleEnabled(): boolean {
    return this.shuffleEnabled;
  }

  /**
   * Set shuffle setting
   */
  setShuffleEnabled(enabled: boolean): void {
    this.shuffleEnabled = enabled;
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
    return array
      .map(value => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ value }) => value);
  }

  /**
   * Sorts questions by their original ID order
   */
  sortByOriginalOrder(questions: Question[]): Question[] {
    return [...questions].sort((a, b) => a.id - b.id);
  }

  /**
   * Save quiz results to sessionStorage
   */
  saveQuizResults(results: unknown): void {
    try {
      sessionStorage.setItem('quizResults', JSON.stringify(results));
    } catch (e) {
      console.error('Failed to save quiz results:', e);
    }
  }

  /**
   * Load quiz results from sessionStorage
   */
  loadQuizResults(): unknown | null {
    try {
      const data = sessionStorage.getItem('quizResults');
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Failed to load quiz results:', e);
      return null;
    }
  }

  /**
   * Get quiz results from sessionStorage (alias for loadQuizResults)
   */
  getQuizResults(): unknown | null {
    return this.loadQuizResults();
  }

  /**
   * Clear quiz results from sessionStorage
   */
  clearQuizResults(): void {
    try {
      sessionStorage.removeItem('quizResults');
    } catch (e) {
      console.error('Failed to clear quiz results:', e);
    }
  }

  /**
   * Extract unique domains from questions for filtering
   */
  extractUniqueDomains(questions: Question[]): { name: string; value: string }[] {
    const domains = new Set<string>();
    questions.forEach(q => {
      if (q.domain) {
        domains.add(q.domain);
      }
    });
    
    const options = [{ name: 'All domains', value: 'All domains' }];
    domains.forEach(domain => {
      options.push({ name: domain, value: domain });
    });
    
    return options;
  }
}
