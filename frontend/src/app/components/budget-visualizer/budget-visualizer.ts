import { Component, Input, ElementRef, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-budget-visualizer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './budget-visualizer.html'
})
export class BudgetVisualizer implements OnChanges {
  // Recebe os dados do Planner
  @Input() budgetBreakdown: any;
  @Input() currencyCode: string = 'USD';

  @ViewChild('budgetChartCanvas') chartCanvas!: ElementRef;
  chartInstance: any;

  // Escuta as mudanças nos valores para desenhar ou atualizar o gráfico
  ngOnChanges(changes: SimpleChanges) {
    if (changes['budgetBreakdown'] && this.budgetBreakdown) {
      setTimeout(() => this.createChart(), 0);
    }
  }

  createChart() {
    if (!this.chartCanvas) return;
    if (this.chartInstance) this.chartInstance.destroy();

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    this.chartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Aéreo', 'Hospedagem', 'Gastos Diários'],
        datasets: [{
          data: [this.budgetBreakdown.flight, this.budgetBreakdown.hotel, this.budgetBreakdown.dailyExpenses],
          backgroundColor: ['#00d2ff', '#f39c12', '#27ae60'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { color: '#ffffff', boxWidth: 12 } } },
        cutout: '70%'
      }
    });
  }
}
