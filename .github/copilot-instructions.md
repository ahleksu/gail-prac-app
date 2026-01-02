# Copilot Instructions for GAIL Practice App

## Project Overview
Angular 21+ quiz application for Google AI Learning (GAIL) certification practice. Uses standalone components, signals for reactive state, PrimeNG UI components, and TailwindCSS styling.

## Architecture

### Core Data Flow
1. Quiz questions loaded from static JSON in `public/quiz/{type}.json`
2. `QuizService` manages global state via Angular signals (`questionsSignal`, `userAnswersSignal`, `answerStateSignal`)
3. Navigation passes quiz results via Angular Router state (`history.state`)
4. No backend—all data is client-side only

### Key Files
- [src/app/core/quiz.model.ts](src/app/core/quiz.model.ts) - `Question`, `Answer`, `AnswerState` interfaces
- [src/app/core/quiz.service.ts](src/app/core/quiz.service.ts) - Centralized state with signals, question shuffling, domain summary generation
- [src/app/app.routes.ts](src/app/app.routes.ts) - Simple flat routing: `/`, `/quiz`, `/result`, `/review`

### Page Components
| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | `HomeComponent` | Quiz type selection |
| `/quiz` | `QuizComponent` | Question display, answer checking, state caching |
| `/result` | `ResultComponent` | Score display with Chart.js visualizations |
| `/review` | `ReviewAnswersComponent` | Detailed answer review with domain filtering |

## Conventions

### Component Pattern
All components are **standalone** with explicit imports:
```typescript
@Component({
  selector: 'app-example',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule], // Explicit PrimeNG imports
  templateUrl: './example.component.html',
  styleUrl: './example.component.css' // Note: styleUrl (singular)
})
```

### State Management
Use **Angular signals** for component state—avoid RxJS BehaviorSubjects:
```typescript
// ✓ Preferred
questions = signal<Question[]>([]);
currentQuestion = computed(() => this.questions()[this.currentQuestionIndex()]);

// ✗ Avoid
questionsSubject = new BehaviorSubject<Question[]>([]);
```

### Template Syntax
Use **Angular 17+ control flow** (`@if`, `@for`) instead of structural directives:
```html
@if (currentQuestion(); as question) {
  @for (answer of question.answers; track answer.text) {
    <!-- content -->
  }
}
```

### Styling
- TailwindCSS utility classes for layout (`flex`, `max-w-3xl`, `mx-auto`)
- PrimeNG components for UI elements (`p-button`, `p-radiobutton`, `p-checkbox`)
- Custom theme defined in [src/app/app.config.ts](src/app/app.config.ts) using `definePreset(Aura, {...})`

## Quiz Data Format
Questions in `public/quiz/*.json` follow this structure:
```json
{
  "id": 1,
  "question": "Question text?",
  "domain": "Fundamentals of gen AI",
  "resource": "https://cloud.google.com/...",
  "type": "single",  // or "multiple"
  "answers": [
    { "text": "Option A", "status": "correct", "explanation": "..." },
    { "text": "Option B", "status": "skipped", "explanation": "..." }
  ]
}
```
- `status: "correct"` marks the right answer(s)
- `status: "skipped"` marks wrong answers (naming is legacy)

## Commands
```bash
ng serve          # Dev server at localhost:4200
ng test           # Karma unit tests
ng build          # Production build to dist/
ng generate component pages/new-page  # New page component
```

## Adding New Quiz Types
1. Create JSON file in `public/quiz/{type}.json` matching the question format above
2. Add button in `HomeComponent` calling `startQuiz('{type}')`
3. Questions auto-load via `QuizService.loadQuestions(type)`
