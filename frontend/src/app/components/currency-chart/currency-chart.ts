import { Component, Input, ElementRef, ViewChild, PLATFORM_ID, inject, OnChanges, SimpleChanges } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { CurrencyService } from '../../services/currency.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables); // Registro global dos componentes do Chart.js para evitar erros de renderização

@Component({
  selector: 'app-currency-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './currency-chart.html',
  styleUrl: './currency-chart.scss'
})
export class CurrencyChart implements OnChanges {
  @Input() countryCode!: string;
  @ViewChild('currencyChart') chartCanvas!: ElementRef;

  private currencyService = inject(CurrencyService);
  private platformId = inject(PLATFORM_ID);

  chart: any;

  ngOnChanges(changes: SimpleChanges) { // Escuta mudanças no código do país para atualizar o gráfico
    if (changes['countryCode'] && this.countryCode) {
      this.loadHistoricalData();
    }
  }

  loadHistoricalData() { // Busca os dados históricos e prepara o gráfico
    if (isPlatformBrowser(this.platformId)) {
      this.currencyService.getHistoricalRates(this.countryCode).subscribe(data => {
        const historyData = [...data].reverse();

        const labels = historyData.map((d: any) => {
          const date = new Date(parseInt(d.timestamp) * 1000);
          return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        });

        const values = historyData.map((d: any) => parseFloat(d.bid));

        // Filtragem para manter o gráfico limpo (um ponto por mês/período)
        const filteredLabels = labels.filter((_: any, i: number) => i % 30 === 0);
        const filteredValues = values.filter((_: any, i: number) => i % 30 === 0);

        setTimeout(() => {
          this.createChart(filteredLabels, filteredValues);
        }, 0);
      });
    }
  }

  createChart(labels: string[], data: number[]) { // Criação do gráfico usando Chart.js
    if (!this.chartCanvas || !this.chartCanvas.nativeElement) return;
    if (this.chart) this.chart.destroy();

    const ctx = this.chartCanvas.nativeElement.getContext('2d');

    // Configuração do Gradiente Neon (Ciano)
    const gradient = ctx.createLinearGradient(0, 0, 0, 160);
    gradient.addColorStop(0, 'rgba(0, 243, 255, 0.3)'); // Ciano Neon com transparência
    gradient.addColorStop(1, 'rgba(0, 243, 255, 0)');   // Fade out total

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: `${this.countryCode}/BRL`,
          data: data,
          borderColor: '#00f3ff', // Cor Ciano Neon exata
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,           // Curva suave
          pointRadius: 0,         // Visual clean sem pontos
          pointHoverRadius: 6,
          borderWidth: 3          // Linha mais robusta
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false } // Oculta legenda para economizar espaço no dashboard
        },
        scales: {
          x: {
            grid: { display: false }, // Remove grades verticais
            ticks: {
              color: '#5a5a75',       // Cor atenuada para o tema dark
              font: { size: 10 }
            }
          },
          y: {
            grid: {
              color: 'rgba(255, 255, 255, 0.05)' // Linhas horizontais quase invisíveis
            },
            ticks: {
              color: '#5a5a75',
              font: { size: 10 }
            }
          }
        }
      }
    });
  }
}
