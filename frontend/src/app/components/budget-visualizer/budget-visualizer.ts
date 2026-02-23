import { Component, Input, ElementRef, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-budget-visualizer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './budget-visualizer.html',
  styleUrl: './budget-visualizer.scss'
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

 createChart() { // Criação do gráfico usando Chart.js
  if (!this.chartCanvas) return;
  if (this.chartInstance) this.chartInstance.destroy();

  const ctx = this.chartCanvas.nativeElement.getContext('2d');

  const cyanNeon = '#00f3ff';
  const purpleNeon = '#bc13fe';
  const pinkNeon = '#ff0055';

  this.chartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Passagens', 'Hotel', 'Gasto Diário'],
      datasets: [{
        data: [
          this.budgetBreakdown.flight,
          this.budgetBreakdown.hotel,
          this.budgetBreakdown.dailyExpenses
        ],
        backgroundColor: [cyanNeon, purpleNeon, pinkNeon],
        hoverOffset: 15,
        borderWidth: 0,
        borderRadius: 5,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '75%',
      plugins: {
        legend: { display: false }
      },
      animation: {
        animateScale: true,
        animateRotate: true
      }
    }
  });
}
}
