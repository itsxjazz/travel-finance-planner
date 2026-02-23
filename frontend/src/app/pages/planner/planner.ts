import { Component, OnInit, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// Serviços
import { CurrencyService } from '../../services/currency.service';
import { TaxService } from '../../services/tax.service';
import { TripService } from '../../services/trip.service';

// Constantes
import { IATA_CODES } from '../../constants/iata-codes';

// Componentes Modularizados
import { BudgetEstimator } from '../../components/budget-estimator/budget-estimator';
import { CurrencyChart } from '../../components/currency-chart/currency-chart';
import { BudgetVisualizer } from '../../components/budget-visualizer/budget-visualizer';
import { InteractiveMap } from '../../components/interactive-map/interactive-map';
import { SavingsCalculator } from '../../components/savings-calculator/savings-calculator';
import { TripItinerary } from '../../components/trip-itinerary/trip-itinerary';
import { DiscoveryGrid } from '../../components/discovery-grid/discovery-grid';

@Component({
  selector: 'app-planner',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BudgetEstimator,
    CurrencyChart,
    BudgetVisualizer,
    InteractiveMap,
    SavingsCalculator,
    TripItinerary,
    DiscoveryGrid
  ],
  templateUrl: './planner.html',
  styleUrl: './planner.scss'
})
export class Planner implements OnInit {
  private currencyService = inject(CurrencyService);
  private taxService = inject(TaxService);
  private tripService = inject(TripService);
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);

  // Dados da Viagem
  tripDetails: any = null;
  isLoading = signal<boolean>(true);
  rawPointsOfInterest = signal<any[]>([]);

  // Estados Financeiros (Centralizados para o MongoDB)
  localGoal = signal<number>(0);
  exchangeRate = signal<number>(0);
  currentSavings = signal<number>(0);
  monthlyContribution = signal<number>(0);
  cdiRate = signal<number>(0);
  indexPercentage = signal<number>(100);
  estimatedTravelDate = signal<string | Date | null>(null);


  // Estados de Operação e Edição
  isSaving = signal<boolean>(false);
  saveSuccess = signal<boolean>(false);
  isEditing = signal<boolean>(false);
  tripId = signal<string | null>(null);

  // Resultados Amadeus
  budgetResult = signal<any>(null);
  budgetPreferences = signal<any>(null);
  isCalculating = signal<boolean>(false);

  // Roteiro
  itinerary = signal<any[]>([]);

  // Computeds Essenciais
  brlGoal = computed(() => this.localGoal() * this.exchangeRate());

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.restoreSession();
      if (this.tripDetails) {
        this.initializeData();
      } else {
        this.router.navigate(['/search']);
      }
    } else {
      this.isLoading.set(false);
    }
  }

  // --- INICIALIZAÇÃO ---

  private restoreSession() {
    if (history.state && history.state.tripData) {
      this.tripDetails = history.state.tripData;
      localStorage.setItem('activeTrip', JSON.stringify(this.tripDetails));
      this.isEditing.set(!!history.state.isEditing);
      if (this.isEditing()) {
        this.tripId.set(this.tripDetails._id);
        localStorage.setItem('isEditing', 'true');
        localStorage.setItem('tripId', this.tripDetails._id);
      }
    } else {
      const savedTrip = localStorage.getItem('activeTrip');
      if (savedTrip) {
        this.tripDetails = JSON.parse(savedTrip);
        this.isEditing.set(localStorage.getItem('isEditing') === 'true');
        this.tripId.set(localStorage.getItem('tripId'));
      }
    }
  }

  private initializeData() {
    this.localGoal.set(this.tripDetails.financialGoalLocal || 0);
    this.currentSavings.set(this.tripDetails.currentSavingsBrl || 0);
    this.monthlyContribution.set(this.tripDetails.monthlyContributionBrl || 0);
    if (this.tripDetails.itinerary) this.itinerary.set(this.tripDetails.itinerary);
    if (this.tripDetails.budgetResult) this.budgetResult.set(this.tripDetails.budgetResult);
    if (this.tripDetails.budgetPreferences) this.budgetPreferences.set(this.tripDetails.budgetPreferences);
    if (this.tripDetails.estimatedTravelDate) {
      this.estimatedTravelDate.set(this.tripDetails.estimatedTravelDate);
    }

    this.fetchRate();
    this.fetchCDI();
    this.loadPOIs();
    this.isLoading.set(false);
  }

  // --- SERVIÇOS EXTERNOS ---

  fetchRate() {
    this.currencyService.getExchangeRate(this.tripDetails.countryCode).subscribe(rate => {
      this.exchangeRate.set(Math.round(rate * 100) / 100);
    });
  }

  fetchCDI() {
    this.taxService.getRate('CDI').subscribe((rate: number) => this.cdiRate.set(rate));
  }

  loadPOIs() {
    if (!this.tripDetails?.destination) return;
    const iataCode = IATA_CODES[this.tripDetails.destination] || 'PAR';
    this.tripService.getPointsOfInterest(iataCode).subscribe({
      next: (response: any) => this.rawPointsOfInterest.set(response.data || []),
      error: (err) => console.error('Erro ao buscar POIs:', err)
    });
  }

  // --- INTERAÇÃO E UI ---

  handleInput(event: any, signalRef: any) {
    let value = event.target.value;
    if (!value) { signalRef.set(0); return; }
    let cleanValue = value.replace(/\./g, '').replace(/,/g, '.');
    signalRef.set(parseFloat(cleanValue) || 0);
  }

  // --- LÓGICA DE PERSISTÊNCIA ---

  saveTrip() {
    if (this.isSaving()) return;
    this.isSaving.set(true);

    const payload = {
      destination: this.tripDetails.destination,
      countryCode: this.tripDetails.countryCode,
      flagUrl: this.tripDetails.flagUrl,
      financialGoalLocal: this.localGoal(),
      financialGoalBrl: this.brlGoal(),
      currentSavingsBrl: this.currentSavings(),
      monthlyContributionBrl: this.monthlyContribution(),
      itinerary: this.itinerary(),
      budgetResult: this.budgetResult(),
      budgetPreferences: this.budgetPreferences(),
      estimatedTravelDate: this.estimatedTravelDate()
    };

    const action = this.isEditing() && this.tripId()
      ? this.tripService.updateTrip(this.tripId()!, payload)
      : this.tripService.saveTripPlan(payload);

    action.subscribe({
      next: (response: any) => {
        if (!this.isEditing() && response?._id) {
          this.tripId.set(response._id);
          this.isEditing.set(true);
          localStorage.setItem('isEditing', 'true');
          localStorage.setItem('tripId', response._id);
        }
        this.handleSaveSuccess();
      },
      error: () => {
        this.isSaving.set(false);
        alert('Erro ao salvar no banco de dados.');
      }
    });
  }

  generateBudget(preferences: any) {
    this.budgetPreferences.set(preferences);
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
            this.budgetResult.set({
              breakdown: localBreakdown,
              estimatedTotalUsd: localBreakdown.flight + localBreakdown.hotel + localBreakdown.dailyExpenses
            });
            this.localGoal.set(this.budgetResult().estimatedTotalUsd);
            this.isCalculating.set(false);
          },
          error: () => this.isCalculating.set(false)
        });
      },
      error: () => this.isCalculating.set(false)
    });
  }

  // --- GESTÃO DO ROTEIRO ---

  addToItinerary(poi: any) {
    if (!this.itinerary().find(item => item.id === poi.id)) {
      this.itinerary.update(current => [...current, poi]);
    } else {
      alert('Este local já está no seu roteiro.');
    }
  }

  removeFromItinerary(poiId: string) {
    this.itinerary.update(current => current.filter(item => item.id !== poiId));
  }

  handleSaveSuccess() {
    this.isSaving.set(false);
    this.saveSuccess.set(true);
    setTimeout(() => this.saveSuccess.set(false), 3000);
  }

  goToSearch() {
    localStorage.removeItem('activeTrip');
    localStorage.removeItem('isEditing');
    localStorage.removeItem('tripId');
    this.router.navigate(['/search']);
  }
}
