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

  createChart() {
    if (!this.chartCanvas) return;
    if (this.chartInstance) this.chartInstance.destroy();

    const ctx = this.chartCanvas.nativeElement.getContext('2d');

    /* --- PALETA MONOCROMÁTICA HIGH-TECH --- */
    const cyanPrimary = '#00f3ff';   // Ciano Neon (Passagens)
    const cyanMedium  = '#00b8c4';   // Ciano Médio (Hotel)
    const cyanDeep    = '#007a82';   // Ciano Escuro (Gasto Diário)

    this.chartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Passagens', 'Hospedagem', 'Gasto Diário'],
        datasets: [{
          data: [
            this.budgetBreakdown.flight,
            this.budgetBreakdown.hotel,
            this.budgetBreakdown.dailyExpenses
          ],
          backgroundColor: [cyanPrimary, cyanMedium, cyanDeep],
          hoverOffset: 15,
          borderWidth: 0,
          borderRadius: 8,
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
