import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, style, animate, transition } from '@angular/animations';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { QuizService } from '../../core/quiz.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, CheckboxModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('600ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
})
export class HomeComponent {
  private router = inject(Router);
  private quizService = inject(QuizService);

  shuffleQuestions = signal(true);

  startQuiz(type: string): void {
    this.quizService.setShuffleEnabled(this.shuffleQuestions());
    this.router.navigate(['/quiz'], { queryParams: { type } });
  }
}
