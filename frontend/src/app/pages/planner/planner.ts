import { Component, OnInit, inject, signal, computed, ElementRef, ViewChild, PLATFORM_ID, effect } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CurrencyService } from '../../services/currency.service';
import { TaxService } from '../../services/tax.service';
import { TripService } from '../../services/trip.service';
import { Chart, registerables } from 'chart.js';
import { Router } from '@angular/router';
import { BudgetEstimator } from '../../budget-estimator/budget-estimator';

type Leaflet = any;
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

  private map: any;
  private markersLayer: any;
  private L: any;

  readonly Infinity = Infinity;
  tripDetails: any = null;
  chart: any;

  // NOVO: Controle de Loading inicial
  isLoading = signal<boolean>(true);

  localGoal = signal<number>(0);
  exchangeRate = signal<number>(0);
  currentSavings = signal<number>(0);
  monthlyContribution = signal<number>(0);
  cdiRate = signal<number>(0);
  indexPercentage = signal<number>(100);
  isSaving = signal<boolean>(false);
  saveSuccess = signal<boolean>(false);
  originCode = signal<string>('GRU');
  isEditing = signal<boolean>(false);
  tripId = signal<string | null>(null);
  budgetResult = signal<any>(null);
  isCalculating = signal<boolean>(false);

  itinerary = signal<any[]>([]);
  rawPointsOfInterest = signal<any[]>([]);
  activeFilter = signal<string>('Todos');
  currentPage = signal<number>(1);
  itemsPerPage = 10;

  private bffDictionary: { [key: string]: string } = {
    'Brasil': 'GRU', 'Estados Unidos': 'NYC', 'Canadá': 'YTO', 'México': 'MEX',
    'Argentina': 'EZE', 'Chile': 'SCL', 'Colômbia': 'BOG', 'Peru': 'LIM', 'Uruguai': 'MVD',
    'França': 'PAR', 'Reino Unido': 'LON', 'Portugal': 'LIS', 'Espanha': 'MAD',
    'Itália': 'ROM', 'Alemanha': 'BER', 'Países Baixos': 'AMS', 'Holanda': 'AMS',
    'Suíça': 'ZRH', 'Bélgica': 'BRU', 'Áustria': 'VIE',
    'Japão': 'TYO', 'Coreia do Sul': 'SEL', 'Singapura': 'SIN', 'Tailândia': 'BKK',
    'Emirados Árabes Unidos': 'DXB', 'Austrália': 'SYD', 'Nova Zelândia': 'AKL',
    'Egito': 'CAI'
  };

  constructor() {
    effect(() => {
      const pois = this.rawPointsOfInterest();
      if (pois.length > 0 && isPlatformBrowser(this.platformId)) {
        this.updateMapMarkers(pois);
      }
    });
  }

  filteredPOIs = computed(() => {
    const filter = this.activeFilter();
    const page = this.currentPage();
    const pois = this.rawPointsOfInterest();

    let filtered = pois;
    if (filter !== 'Todos') {
      const filterMap: { [key: string]: string } = {
        'Cultura': 'CULTURA',
        'Gastronomia': 'RESTAURANT',
        'Shopping': 'SHOPPING',
        'Compras': 'SHOPPING'
      };
      filtered = pois.filter(poi => poi.category === filterMap[filter]);
    }

    const startIndex = (page - 1) * this.itemsPerPage;
    return filtered.slice(startIndex, startIndex + this.itemsPerPage);
  });

  brlGoal = computed(() => this.localGoal() * this.exchangeRate());
  finalAnnualTax = computed(() => (this.cdiRate() * this.indexPercentage()) / 100);

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
      // Tenta pegar do history (navegação normal via Dashboard/Search)
      if (history.state && history.state.tripData) {
        this.tripDetails = history.state.tripData;
        localStorage.setItem('activeTrip', JSON.stringify(this.tripDetails));

        if (history.state.isEditing) {
          // Avisa os Signals do Angular que está editando
          this.isEditing.set(true);
          this.tripId.set(this.tripDetails._id);

          localStorage.setItem('isEditing', 'true');
          localStorage.setItem('tripId', this.tripDetails._id);
        } else {
          // Garante que não é edição
          this.isEditing.set(false);
          this.tripId.set(null);

          localStorage.removeItem('isEditing');
          localStorage.removeItem('tripId');
        }
      } else {
        // Tenta pegar do localStorage (Caso a pessoa dê F5 na página)
        const savedTrip = localStorage.getItem('activeTrip');
        if (savedTrip) {
          this.tripDetails = JSON.parse(savedTrip);
          const editMode = localStorage.getItem('isEditing') === 'true';
          const savedId = localStorage.getItem('tripId');

          if (editMode && savedId) {
            this.isEditing.set(true);
            this.tripId.set(savedId);
          }
        }
      }

      // Se achou dados (via history ou storage), carrega os serviços
      if (this.tripDetails) {
        this.localGoal.set(this.tripDetails.financialGoalLocal || 0);
        this.currentSavings.set(this.tripDetails.currentSavingsBrl || 0);
        this.monthlyContribution.set(this.tripDetails.monthlyContributionBrl || 0);

        if (this.tripDetails.itinerary) {
          this.itinerary.set(this.tripDetails.itinerary);
        }

        this.fetchRate();
        this.fetchCDI();
        this.loadHistoricalData();
        this.loadPOIs();
        this.isLoading.set(false);
      } else {
        // Se não tem dados nenhum, expulsa para a busca
        this.router.navigate(['/search']);
      }

    } else {
      // Se for SSR (no servidor), apenas desliga o loading
      this.isLoading.set(false);
    }
  }

  private async initMap(lat: number, lng: number) {
    if (this.map || !isPlatformBrowser(this.platformId)) return;
    this.L = await import('leaflet');
    this.map = this.L.map('map-container').setView([lat, lng], 13);
    this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);
    this.markersLayer = this.L.layerGroup().addTo(this.map);
  }

  private async updateMapMarkers(pois: any[]) {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!this.L) this.L = await import('leaflet');
    if (!this.map) return;

    this.markersLayer.clearLayers();
    pois.forEach(poi => {
      const color = this.getCategoryColor(poi.category);
      const marker = this.L.circleMarker([poi.lat, poi.lon], {
        radius: 8, fillColor: color, color: '#fff', weight: 2, fillOpacity: 0.8
      });
      marker.bindPopup(`
        <div style="font-family: sans-serif; min-width: 150px;">
          <strong style="color: #2c3e50; font-size: 1rem;">${poi.name}</strong><br>
          <span style="font-size: 0.8rem; color: #777;">${this.translateCategory(poi.category)}</span><br>
          <p style="font-size: 0.75rem; margin: 8px 0;">${poi.address}</p>
        </div>
      `);
      this.markersLayer.addLayer(marker);
    });

    if (pois.length > 0) {
      const group = new this.L.FeatureGroup(this.markersLayer.getLayers());
      this.map.fitBounds(group.getBounds().pad(0.1));
    }
  }

  private getCategoryColor(category: string): string {
    const colors: { [key: string]: string } = {
      'RESTAURANT': '#e67e22', 'SHOPPING': '#3498db', 'CULTURA': '#27ae60'
    };
    return colors[category] || '#95a5a6';
  }

  fetchRate() {
    this.currencyService.getExchangeRate(this.tripDetails.countryCode).subscribe(rate => {
      this.exchangeRate.set(Math.round(rate * 100) / 100);
    });
  }

  fetchCDI() {
    this.taxService.getRate('CDI').subscribe((rate: number) => this.cdiRate.set(rate));
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

  loadPOIs() {
    if (!this.tripDetails?.destination) return;
    const countryName = this.tripDetails.destination;
    const iataCode = this.bffDictionary[countryName] || 'PAR';

    this.tripService.getPointsOfInterest(iataCode).subscribe({
      next: (response: any) => {
        const data = response.data || [];
        this.rawPointsOfInterest.set(data);
        if (data.length > 0 && isPlatformBrowser(this.platformId)) {
          this.initMap(data[0].lat, data[0].lon);
        }
      },
      error: (err) => console.error('Erro ao buscar Pontos de Interesse:', err)
    });
  }

  setFilter(filterName: string) {
    this.activeFilter.set(filterName);
    this.currentPage.set(1);
  }

  setPage(page: number) {
    this.currentPage.set(page);
    window.scrollTo({ top: 800, behavior: 'smooth' });
  }

  createChart(labels: string[], data: number[]) {
    if (this.chart) this.chart.destroy();
    this.chart = new Chart(this.chartCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: `${this.tripDetails.countryCode}/BRL`, data: data, borderColor: '#00d2ff', backgroundColor: 'rgba(0, 210, 255, 0.05)', fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: {
          y: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#a0a0a0' } },
          x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#a0a0a0' } }
        }
      }
    });
  }

  createBudgetChart(breakdown: any) {
    if (this.budgetChartInstance) this.budgetChartInstance.destroy();
    const ctx = this.budgetChartCanvas.nativeElement.getContext('2d');
    this.budgetChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Aéreo', 'Hospedagem', 'Gastos Diários'],
        datasets: [{
          data: [breakdown.flight, breakdown.hotel, breakdown.dailyExpenses],
          backgroundColor: ['#00d2ff', '#f39c12', '#27ae60'], borderWidth: 0
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#ffffff', boxWidth: 12 } } }, cutout: '70%'
      }
    });
  }

  handleInput(event: any, signalRef: any) {
    let value = event.target.value;
    if (!value) { signalRef.set(0); return; }
    let cleanValue = value.replace(/\./g, '').replace(/,/g, '.');
    signalRef.set(parseFloat(cleanValue) || 0);
  }

  translateCategory(category: string): string {
    const categories: { [key: string]: string } = {
      'CULTURA': '🏛️ Cultura', 'RESTAURANT': '🍴 Gastronomia', 'SHOPPING': '🛍️ Compras'
    };
    return categories[category] || category;
  }

  saveTrip() {
    if (this.isSaving() || this.monthsToGoal() === Infinity || this.monthsToGoal() === 0) return;

    this.isSaving.set(true);
    const payload = {
      destination: this.tripDetails.destination, countryCode: this.tripDetails.countryCode, flagUrl: this.tripDetails.flagUrl, financialGoalLocal: this.localGoal(), financialGoalBrl: this.brlGoal(), currentSavingsBrl: this.currentSavings(), monthlyContributionBrl: this.monthlyContribution(), estimatedTravelDate: this.travelDate(), itinerary: this.itinerary()
    };

    const action = this.isEditing() && this.tripId()
      ? this.tripService.updateTrip(this.tripId()!, payload)
      : this.tripService.saveTripPlan(payload);

    action.subscribe({
      next: (response: any) => {
        if (!this.isEditing() && response && response._id) {
          this.tripId.set(response._id);
          this.isEditing.set(true);
          localStorage.setItem('isEditing', 'true'); // Atualiza o localStorage também
          localStorage.setItem('tripId', response._id);
        }
        this.handleSaveSuccess();
      },
      error: (err) => this.handleSaveError(err)
    });
  }

  handleSaveSuccess() {
    this.isSaving.set(false);
    this.saveSuccess.set(true);
    setTimeout(() => this.saveSuccess.set(false), 3000);
  }

  handleSaveError(err: any) {
    this.isSaving.set(false);
    alert('Erro ao salvar no banco de dados.');
  }

  goToSearch() {
    // Limpa o localStorage ao sair da página de forma voluntária
    localStorage.removeItem('activeTrip');
    localStorage.removeItem('isEditing');
    localStorage.removeItem('tripId');
    this.router.navigate(['/search']);
  }

  generateBudget(preferences: any) {
    this.isCalculating.set(true);
    const destCurrency = this.tripDetails?.countryCode;
    const payload = { ...preferences, cityName: this.tripDetails?.destination, destinationCode: destCurrency };
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
            setTimeout(() => this.createBudgetChart(localBreakdown), 0);
            this.isCalculating.set(false);
          },
          error: () => this.isCalculating.set(false)
        });
      },
      error: () => this.isCalculating.set(false)
    });
  }

  addToItinerary(poi: any) {
    const exists = this.itinerary().find(item => item.id === poi.id);
    if (!exists) {
      this.itinerary.update(current => [...current, poi]);
    } else {
      alert('Este local já está no seu roteiro.');
    }
  }

  removeFromItinerary(poiId: string) {
    this.itinerary.update(current => current.filter(item => item.id !== poiId));
  }
}
