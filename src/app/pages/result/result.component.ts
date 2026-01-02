import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ChartModule } from 'primeng/chart';
import { ButtonModule } from 'primeng/button';
import { QuizService } from '../../core/quiz.service';
import { QuestionWithAnswer } from '../../core/quiz.model';

interface DomainBreakdown {
  domain: string;
  correct: number;
  incorrect: number;
  skipped: number;
}

@Component({
  selector: 'app-result',
  standalone: true,
  templateUrl: './result.component.html',
  styleUrl: './result.component.css',
  imports: [CommonModule, ChartModule, ButtonModule],
})
export class ResultComponent implements OnInit {
  private router = inject(Router);
  private quizService = inject(QuizService);

  totalQuestions = signal(0);
  correctAnswers = signal(0);
  score = signal(0);
  finishedAt = signal<Date>(new Date());
  quizType = signal('all');
  domainBreakdown = signal<DomainBreakdown[]>([]);
  skippedAnswers = signal(0);

  chartData = signal<any>(null);
  chartOptions = signal<any>(null);
  barChartData = signal<any>(null);
  barChartOptions = signal<any>(null);

  private isValidQuizState(state: any): boolean {
    return state && 
           typeof state['total'] !== 'undefined' && 
           typeof state['correct'] !== 'undefined' &&
           state['timestamp'] !== undefined &&
           state['domainSummary'] !== undefined;
  }

  ngOnInit(): void {
    // Try to get state from history.state first, fall back to sessionStorage
    let state = history.state;
    
    // If no valid state from navigation, try sessionStorage
    if (!this.isValidQuizState(state)) {
      const storedResults = this.quizService.getQuizResults();
      if (storedResults) {
        state = storedResults;
      } else {
        // No results available, redirect to home
        this.router.navigate(['/']);
        return;
      }
    }
    
    if (state) {
      const total = state['total'] ?? 0;
      const correct = state['correct'] ?? 0;
      
      this.totalQuestions.set(total);
      this.correctAnswers.set(correct);
      this.score.set(total > 0 ? Math.round((correct / total) * 100) : 0);
      this.finishedAt.set(new Date(state['timestamp']));
      this.quizType.set(state['type'] ?? 'all');

      const domainSummary = state['domainSummary'] ?? {};
      const breakdown = Object.keys(domainSummary).map(domain => {
        const summary = domainSummary[domain];
        const skipped = summary.skipped ?? 0;
        return {
          domain,
          correct: summary.correct,
          incorrect: summary.total - summary.correct - skipped,
          skipped: skipped
        };
      });
      this.domainBreakdown.set(breakdown);

      // Count skipped
      const totalSkipped = state['skipped'] ?? breakdown.reduce((acc, d) => acc + d.skipped, 0);
      this.skippedAnswers.set(totalSkipped);

      this.setupChart();
      this.setupBarChart();
    }
  }

  setupChart(): void {
    const incorrect = this.totalQuestions() - this.correctAnswers() - this.skippedAnswers();

    this.chartData.set({
      labels: ['Correct', 'Incorrect', 'Skipped'],
      datasets: [
        {
          data: [this.correctAnswers(), incorrect, this.skippedAnswers()],
          backgroundColor: ['#16a34a', '#ef4444', '#9CA3AF'],
          hoverOffset: 4
        }
      ]
    });

    this.chartOptions.set({
      cutout: '60%',
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    });
  }

  setupBarChart(): void {
    const breakdown = this.domainBreakdown();
    
    this.barChartData.set({
      labels: breakdown.map(d => d.domain),
      datasets: [
        {
          label: 'Correct',
          backgroundColor: '#16a34a',
          data: breakdown.map(d => d.correct)
        },
        {
          label: 'Incorrect',
          backgroundColor: '#ef4444',
          data: breakdown.map(d => d.incorrect)
        },
        {
          label: 'Skipped',
          backgroundColor: '#9CA3AF',
          data: breakdown.map(d => d.skipped)
        }
      ]
    });

    this.barChartOptions.set({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top'
        }
      },
      scales: {
        x: {
          stacked: true,
          ticks: {
            color: '#4B5563'
          },
          grid: {
            color: '#E5E7EB'
          }
        },
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: {
            color: '#4B5563'
          },
          grid: {
            color: '#E5E7EB'
          }
        }
      }
    });
  }

  goToReview(): void {
    // Get questions from history.state or sessionStorage
    let questions: QuestionWithAnswer[] = [];
    
    if (history.state && history.state.questions) {
      questions = history.state.questions;
    } else {
      const storedResults = this.quizService.getQuizResults();
      if (storedResults && storedResults.questions) {
        questions = storedResults.questions;
      }
    }

    this.router.navigate(['/review'], {
      state: {
        questions: questions
      }
    });
  }

  retakeQuiz(): void {
    this.router.navigate(['/quiz'], { queryParams: { type: this.quizType() } });
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}
