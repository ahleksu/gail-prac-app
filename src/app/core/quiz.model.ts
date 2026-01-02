export interface Answer {
  text: string;
  status: 'correct' | 'incorrect';
  explanation: string;
}

export interface Question {
  id: number;
  question: string;
  domain: string;
  resource?: string;
  type: 'single' | 'multiple';
  answers: Answer[];
}

export interface QuestionWithAnswer extends Question {
  userAnswer: string[];
  isSkipped: boolean;
  isCorrect?: boolean;
}

export interface DomainSummary {
  correct: number;
  total: number;
  skipped: number;
}

export interface AnswerState {
  selectedOption?: string;
  selectedOptions?: string[];
  showExplanation: boolean;
  isCorrect: boolean;
}
