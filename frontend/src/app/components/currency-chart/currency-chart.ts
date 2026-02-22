import { Component, Input, ElementRef, ViewChild, PLATFORM_ID, inject, OnChanges, SimpleChanges } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { CurrencyService } from '../../services/currency.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-currency-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './currency-chart.html'
})
export class CurrencyChart implements OnChanges {
  // Recebe a sigla da moeda (ex: EUR, USD, JPY) do Planner
  @Input() countryCode!: string;

  @ViewChild('currencyChart') chartCanvas!: ElementRef;

  private currencyService = inject(CurrencyService);
  private platformId = inject(PLATFORM_ID);

  chart: any;

  // Fica escutando as mudanças. Assim que o countryCode chegar, ele busca os dados
  ngOnChanges(changes: SimpleChanges) {
    if (changes['countryCode'] && this.countryCode) {
      this.loadHistoricalData();
    }
  }

  loadHistoricalData() {
    if (isPlatformBrowser(this.platformId)) {
      this.currencyService.getHistoricalRates(this.countryCode).subscribe(data => {
        const historyData = [...data].reverse();
        const labels = historyData.map((d: any) => {
          const date = new Date(parseInt(d.timestamp) * 1000);
          return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        });
        const values = historyData.map((d: any) => parseFloat(d.bid));
        const filteredLabels = labels.filter((_: any, i: number) => i % 30 === 0);
        const filteredValues = values.filter((_: any, i: number) => i % 30 === 0);

        setTimeout(() => {
          this.createChart(filteredLabels, filteredValues);
        }, 0);
      });
    }
  }

  createChart(labels: string[], data: number[]) {
    if (!this.chartCanvas || !this.chartCanvas.nativeElement) return;

    if (this.chart) this.chart.destroy();

    this.chart = new Chart(this.chartCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: `${this.countryCode}/BRL`,
          data: data,
          borderColor: '#00d2ff',
          backgroundColor: 'rgba(0, 210, 255, 0.05)',
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#a0a0a0' } },
          x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#a0a0a0' } }
        }
      }
    });
  }
}
