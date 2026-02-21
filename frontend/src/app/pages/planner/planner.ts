import { Component, OnInit, inject, signal, computed, ElementRef, ViewChild, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CurrencyService } from '../../services/currency.service';
import { TaxService } from '../../services/tax.service';
import { TripService } from '../../services/trip.service';
import { Chart, registerables } from 'chart.js';
import { Router } from '@angular/router';
import { BudgetEstimator } from '../../budget-estimator/budget-estimator';

Chart.register(...registerables);

@Component({
  selector: 'app-planner',
  standalone: true,
  imports: [CommonModule, FormsModule, BudgetEstimator],
  templateUrl: './planner.html',
  styleUrl: './planner.scss'
})
export class Planner implements OnInit {
  @ViewChild('currencyChart') chartCanvas!: ElementRef;
  @ViewChild('budgetChartCanvas') budgetChartCanvas!: ElementRef;
  budgetChartInstance: any;

  private currencyService = inject(CurrencyService);
  private taxService = inject(TaxService);
  private tripService = inject(TripService);
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);

  readonly Infinity = Infinity;
  tripDetails: any = null;
  chart: any;

  // --- SIGNALS ---
  localGoal = signal<number>(0);
  exchangeRate = signal<number>(0);
  currentSavings = signal<number>(0);
  monthlyContribution = signal<number>(0);
  cdiRate = signal<number>(0);
  indexPercentage = signal<number>(100);
  isSaving = signal<boolean>(false);
  saveSuccess = signal<boolean>(false);
  
  // CORREÇÃO 1: Adicionando o signal que faltava
  originCode = signal<string>('GRU');

  brlGoal = computed(() => this.localGoal() * this.exchangeRate());
  finalAnnualTax = computed(() => (this.cdiRate() * this.indexPercentage()) / 100);

  isEditing = signal<boolean>(false);
  tripId = signal<string | null>(null);

  budgetResult = signal<any>(null);
  isCalculating = signal<boolean>(false);

  // --- LÓGICA FINANCEIRA ---
  private getIRRate(months: number): number {
    if (months <= 6) return 0.225;
    if (months <= 12) return 0.20;
    if (months <= 24) return 0.175;
    return 0.15;
  }

  monthsToGoal = computed(() => {
    const target = this.brlGoal();
    const initial = this.currentSavings();
    const monthlyAdd = this.monthlyContribution();

    if (target <= 0 || (monthlyAdd <= 0 && initial < target)) return Infinity;
    if (initial >= target) return 0;

    let months = 0;
    let balanceGross = initial;
    const annualRate = this.finalAnnualTax() / 100;
    const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;

    while (months < 600) {
      months++;
      balanceGross = (balanceGross * (1 + monthlyRate)) + monthlyAdd;
      const totalInvestedSoFar = initial + (monthlyAdd * months);
      const profit = balanceGross - totalInvestedSoFar;
      const ir = this.getIRRate(months);
      const netBalance = totalInvestedSoFar + (profit * (1 - ir));
      if (netBalance >= target) return months;
    }
    return Infinity;
  });

  redemptionDetails = computed(() => {
    const months = this.monthsToGoal();
    if (months === Infinity || months === 0) return null;

    const initial = this.currentSavings();
    const monthlyAdd = this.monthlyContribution();
    const annualRate = this.finalAnnualTax() / 100;
    const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;

    let balanceGross = initial;
    let totalInvested = initial;

    for (let i = 1; i <= months; i++) {
      balanceGross = (balanceGross * (1 + monthlyRate)) + monthlyAdd;
      totalInvested += monthlyAdd;
    }

    const profit = balanceGross - totalInvested;
    const irRate = this.getIRRate(months);
    const totalIR = profit * irRate;

    return {
      totalInvested: totalInvested,
      grossInterest: profit,
      totalIR: totalIR,
      netRedemption: totalInvested + (profit - totalIR),
      irRatePercentage: irRate * 100
    };
  });

  travelDate = computed(() => {
    const months = this.monthsToGoal();
    if (months === Infinity || months === 0) return null;
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return date;
  });

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      if (history.state && history.state.tripData) {
        this.tripDetails = history.state.tripData;

        if (history.state.isEditing) {
          this.isEditing.set(true);
          this.tripId.set(this.tripDetails._id);
          this.localGoal.set(this.tripDetails.financialGoalLocal);
          this.currentSavings.set(this.tripDetails.currentSavingsBrl);
          this.monthlyContribution.set(this.tripDetails.monthlyContributionBrl);
        }

        this.fetchRate();
        this.fetchCDI();
        this.loadHistoricalData();
      }
    }
  }

  fetchRate() {
    this.currencyService.getExchangeRate(this.tripDetails.countryCode).subscribe(rate => {
      this.exchangeRate.set(Math.round(rate * 100) / 100);
    });
  }

  fetchCDI() {
    this.taxService.getRate('CDI').subscribe((rate: number) => {
      this.cdiRate.set(rate);
    });
  }

  loadHistoricalData() {
    if (isPlatformBrowser(this.platformId)) {
      this.currencyService.getHistoricalRates(this.tripDetails.countryCode).subscribe(data => {
        const historyData = [...data].reverse();
        const labels = historyData.map(d => {
          const date = new Date(parseInt(d.timestamp) * 1000);
          return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        });
        const values = historyData.map(d => parseFloat(d.bid));
        const filteredLabels = labels.filter((_, i) => i % 30 === 0);
        const filteredValues = values.filter((_, i) => i % 30 === 0);
        this.createChart(filteredLabels, filteredValues);
      });
    }
  }

  createChart(labels: string[], data: number[]) {
    if (this.chart) this.chart.destroy();
    this.chart = new Chart(this.chartCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: `${this.tripDetails.countryCode}/BRL`,
          data: data,
          borderColor: '#27ae60',
          backgroundColor: 'rgba(39, 174, 96, 0.05)',
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
          y: { beginAtZero: false, grid: { display: false }, ticks: { font: { size: 10 } } },
          x: { grid: { display: false }, ticks: { font: { size: 10 } } }
        }
      }
    });
  }

  handleInput(event: any, signalRef: any) {
    let value = event.target.value;
    if (!value) { signalRef.set(0); return; }
    let cleanValue = value.replace(/\./g, '').replace(/,/g, '.');
    signalRef.set(parseFloat(cleanValue) || 0);
  }

  saveTrip() {
    if (this.monthsToGoal() === Infinity || this.monthsToGoal() === 0) return;

    this.isSaving.set(true);

    const payload = {
      destination: this.tripDetails.destination,
      countryCode: this.tripDetails.countryCode,
      flagUrl: this.tripDetails.flagUrl,
      financialGoalLocal: this.localGoal(),
      financialGoalBrl: this.brlGoal(),
      currentSavingsBrl: this.currentSavings(),
      monthlyContributionBrl: this.monthlyContribution(),
      estimatedTravelDate: this.travelDate()
    };

    if (this.isEditing() && this.tripId()) {
      this.tripService.updateTrip(this.tripId()!, payload).subscribe({
        next: (response) => this.handleSaveSuccess(),
        error: (err) => this.handleSaveError(err)
      });
    } else {
      this.tripService.saveTripPlan(payload).subscribe({
        next: (response) => this.handleSaveSuccess(),
        error: (err) => this.handleSaveError(err)
      });
    }
  }

  handleSaveSuccess() {
    this.isSaving.set(false);
    this.saveSuccess.set(true);
    setTimeout(() => this.saveSuccess.set(false), 3000);
  }

  handleSaveError(err: any) {
    console.error('Erro ao salvar:', err);
    this.isSaving.set(false);
    alert('Ocorreu um erro ao processar sua solicitação.');
  }

  goToSearch() {
    this.router.navigate(['/search']);
  }

  // --- GERADOR DE ORÇAMENTO INTELIGENTE ---
  generateBudget(preferences: any) {
    this.isCalculating.set(true);
    const destCurrency = this.tripDetails?.countryCode;

    const payload = { 
      ...preferences, 
      cityName: this.tripDetails?.destination,
      destinationCode: destCurrency,
    };
    
    console.log('🚀 Enviando payload para o Node.js:', payload);

    this.tripService.calculateSmartBudget(payload).subscribe({
      next: (response) => {
        const usdBreakdown = response.breakdown;

        this.currencyService.getExchangeRateFromUSD(destCurrency).subscribe({
          next: (rate) => {
            const localBreakdown = {
              flight: Math.round(usdBreakdown.flight * rate),
              hotel: Math.round(usdBreakdown.hotel * rate),
              dailyExpenses: Math.round(usdBreakdown.dailyExpenses * rate)
            };

            const totalLocal = localBreakdown.flight + localBreakdown.hotel + localBreakdown.dailyExpenses;

            this.budgetResult.set({ breakdown: localBreakdown, estimatedTotalUsd: totalLocal });
            this.localGoal.set(totalLocal);

            // CORREÇÃO 2: Chamada segura do gráfico
            setTimeout(() => this.createBudgetChart(localBreakdown), 0);
            this.isCalculating.set(false);
          },
          error: (err) => {
            console.error('Erro na conversão:', err);
            this.isCalculating.set(false);
          }
        });
      },
      error: (err) => {
        console.error('Erro no backend:', err);
        this.isCalculating.set(false);
      }
    });
  }

  // CORREÇÃO 3: Método do Gráfico de Rosca reintroduzido (estava faltando no arquivo)
  createBudgetChart(breakdown: any) {
    if (this.budgetChartInstance) this.budgetChartInstance.destroy();

    const ctx = this.budgetChartCanvas.nativeElement.getContext('2d');
    this.budgetChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Aéreo', 'Hospedagem', 'Gastos Diários'],
        datasets: [{
          data: [breakdown.flight, breakdown.hotel, breakdown.dailyExpenses],
          backgroundColor: ['#3498db', '#f1c40f', '#2ecc71'],
          borderWidth: 0,
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, padding: 15 } }
        },
        cutout: '70%'
      }
    });
  }
} 