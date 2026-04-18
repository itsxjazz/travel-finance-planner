import { Component, OnInit, OnDestroy, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { Subscription } from 'rxjs';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// Serviços
import { CurrencyService } from '../../services/currency.service';
import { TaxService } from '../../services/tax.service';
import { TripService } from '../../services/trip.service';
import { SearchStateService } from '../../services/search-state.service';

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
import { Hotels } from '../../components/hotels/hotels';
import { Flights } from '../../components/flights/flights';

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
    DiscoveryGrid,
    Hotels,
    Flights
  ],
  templateUrl: './planner.html',
  styleUrl: './planner.scss'
})
export class Planner implements OnInit, OnDestroy {
  private subs: Subscription[] = [];
  private currencyService = inject(CurrencyService);
  private taxService = inject(TaxService);
  private tripService = inject(TripService);
  private searchState = inject(SearchStateService);
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);

  // --- CONTROLE DE UI (ABAS) ---
  activeTab = signal<'finance' | 'hotels' | 'flights' | 'explore'>('finance');

  // Dados da Viagem
  tripDetails: any = null;
  isLoading = signal<boolean>(true);
  isLoadingPOIs = signal<boolean>(false);
  showStaleDataBanner = signal<boolean>(false);
  lastUpdatedDate = signal<string>('');

  // Consumindo o estado do SearchStateService para persistencia perfeita
  get rawPointsOfInterest() { return this.searchState.rawPointsOfInterest; }
  get hasSearchedPOIs() { return this.searchState.hasSearchedPOIs; }

  // Estados Financeiros
  localGoal = signal<number>(0);
  exchangeRate = signal<number>(0);
  currentSavings = signal<number>(0);
  monthlyContribution = signal<number>(0);
  cdiRate = signal<number>(0);
  indexPercentage = signal<number>(100);
  estimatedTravelDate = signal<string | Date | null>(null);

  // Estados de Operação
  isSaving = signal<boolean>(false);
  saveSuccess = signal<boolean>(false);
  isEditing = signal<boolean>(false);
  tripId = signal<string | null>(null);

  // Resultados da busca inteligente (Booking & Kiwi)
  budgetResult = signal<any>(null);
  budgetPreferences = signal<any>(null);
  isCalculating = signal<boolean>(false);
  originIata = signal<string>('GRU');

  // Roteiro
  itinerary = signal<any[]>([]);

  // Computeds
  brlGoal = computed(() => this.localGoal() * this.exchangeRate());

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.restoreSession();
      if (this.tripDetails) {
        setTimeout(() => {
          this.initializeData();
        }, 0);
      } else {
        this.router.navigate(['/search']);
      }
    } else {
      this.isLoading.set(false);
    }
  }

  private restoreSession() { // Restaura os dados da viagem do estado de navegação ou do localStorage
    if (history.state && history.state.tripData) {
      this.tripDetails = history.state.tripData;
      localStorage.setItem('activeTrip', JSON.stringify(this.tripDetails));      this.isEditing.set(!!history.state.isEditing);
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

  private initializeData() { // Inicializa os sinais com os dados da viagem restaurada
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
  
  const tripIdentifier = this.tripDetails._id || this.tripDetails.destination || 'unsaved';
  this.searchState.initializeState(tripIdentifier);

  // Verificação de dados estáticos (> 24h)
  // Usando updatedAt (ou createdAt se nunca foi editado) como fonte da verdade
  const lastUpdateRaw = this.tripDetails.updatedAt || this.tripDetails.createdAt;
  
  if (lastUpdateRaw) {
    const lastUpdate = new Date(lastUpdateRaw);
    const now = new Date();
    
    if (!isNaN(lastUpdate.getTime())) {
      const diffInHours = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
      const forceStale = localStorage.getItem('forceStale') === 'true';

      if (diffInHours > 24 || forceStale) {
        this.showStaleDataBanner.set(true);
        this.lastUpdatedDate.set(lastUpdate.toLocaleDateString('pt-BR'));
      }
    }
  } else if (this.tripId()) {
    // Caso de segurança para registros sem data no banco
    this.showStaleDataBanner.set(true);
    this.lastUpdatedDate.set('mais de 24h');
  }

  // loadPOIs() removido para evitar gasto de créditos desnecessário na aba Exploração
  this.isLoading.set(false);

  // Se a viagem já tem preferências salvas e ainda não buscou hotéis (novo acesso), 
  // dispara as buscas em segundo plano automaticamente para popular as abas.
  if (this.budgetPreferences() && !this.searchState.hasSearchedHotels()) {
    this.triggerBackgroundSearches(this.budgetPreferences());
  }
}

  fetchRate() { // Busca a cotação atual do destino para converter os valores
    const sub = this.currencyService.getExchangeRate(this.tripDetails.countryCode).subscribe(rate => {
      // Mantém a precisão total para moedas desvalorizadas
      this.exchangeRate.set(rate);
    });
    this.subs.push(sub);
  }

  fetchCDI() { // Busca a taxa CDI atual para os cálculos financeiros
    const sub = this.taxService.getRate('CDI').subscribe((rate: number) => this.cdiRate.set(rate));
    this.subs.push(sub);
  }

  loadPOIs() {
  if (!this.tripDetails?.destination) return;

  this.isLoadingPOIs.set(true);
  this.hasSearchedPOIs.set(true);

  const iataCode = this.destinationIataCode;

  const sub = this.tripService.getPointsOfInterest(iataCode).subscribe({
    next: (response: any) => {
        this.rawPointsOfInterest.set(response.data || []);
        this.isLoadingPOIs.set(false);
        this.searchState.saveToStorage();
      },
      error: (err) => {
        console.error('Erro ao buscar POIs:', err);
        this.isLoadingPOIs.set(false);
      }
    });
    this.subs.push(sub);
  }

  handleInput(event: any, signalRef: any) { // Formata os inputs financeiros para aceitar apenas números e vírgula
    let value = event.target.value;
    if (!value) { signalRef.set(0); return; }
    let cleanValue = value.replace(/\./g, '').replace(/,/g, '.');
    signalRef.set(parseFloat(cleanValue) || 0);
  }

  saveTrip() { // Salva a viagem no banco de dados
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

    const action$ = this.isEditing() && this.tripId()
      ? this.tripService.updateTrip(this.tripId()!, payload)
      : this.tripService.saveTripPlan(payload);

    const sub = action$.subscribe({
      next: (response: any) => {
        // Atualiza os dados locais com a resposta do servidor (incluindo _id e lastUpdated)
        this.tripDetails = { ...this.tripDetails, ...response };
        localStorage.setItem('activeTrip', JSON.stringify(this.tripDetails));

        if (!this.isEditing() && response?._id) {
          this.tripId.set(response._id);
          this.isEditing.set(true);
          localStorage.setItem('isEditing', 'true');
          localStorage.setItem('tripId', response._id);
        }

        // Se salvou com sucesso, os dados não estão mais "estáticos/velhos"
        this.showStaleDataBanner.set(false);

        this.handleSaveSuccess();
      },
      error: () => {
        this.isSaving.set(false);
        alert('Erro ao salvar no banco de dados.');
      }
    });
    this.subs.push(sub);
  }

  generateBudget(preferences: any) { // Envia as preferências para o backend, recebe o orçamento detalhado e atualiza os sinais correspondentes
    this.budgetPreferences.set(preferences);
    this.isCalculating.set(true);
    
    // Se o usuário está gerando um novo orçamento, os dados não são mais "antigos"
    this.showStaleDataBanner.set(false);

    const cityName = this.tripDetails?.destination;
    const destCurrency = this.tripDetails?.countryCode;
    const payload = { ...preferences, cityName, destinationCode: destCurrency };

    // 1. Orçamento Inteligente (Estimativa baseada em médias)
    const budgetSub = this.tripService.calculateSmartBudget(payload).subscribe({
      next: (response) => {
        const usdBreakdown = response.breakdown;
        this.currencyService.getExchangeRateFromUSD(destCurrency).subscribe({
          next: (rate) => {
            const localBreakdown = {
              flight: usdBreakdown.flight * rate,
              hotel: usdBreakdown.hotel * rate,
              dailyExpenses: usdBreakdown.dailyExpenses * rate
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
    this.subs.push(budgetSub);

    // 2. Dispara as buscas em tempo real (Hotéis e Voos)
    this.triggerBackgroundSearches(preferences);
  }

  /**
   * Dispara as buscas reais de hotéis e voos em segundo plano para popular as abas
   * @param preferences As preferências de viagem (origem, datas, dias, etc)
   */
  private triggerBackgroundSearches(preferences: any) {
    const cityName = this.tripDetails?.destination;

    // 1. Busca Real de Hotéis (Popula a aba de Hospedagem)
    this.searchState.hasSearchedHotels.set(true);
    const hotelsSub = this.tripService.getHotels(cityName).subscribe({
      next: (data) => {
        this.searchState.hotelsList.set(data);
        if (data && data.length > 0) {
          const returnedCurrency = data[0].currency || 'EUR';
          this.currencyService.getExchangeRate(returnedCurrency).subscribe(rate => {
            this.searchState.exchangeRateHotels.set(rate);
            this.searchState.saveToStorage();
          });
        }
        this.searchState.saveToStorage();
      }
    });
    this.subs.push(hotelsSub);

    // 2. Busca Real de Voos (Ida e Volta - Popula a aba de Voos)
    const origin = preferences.originCode;
    const destination = this.destinationIataCode;
    const depDate = preferences.departureDate;

    if (origin && destination && destination !== '???') {
      // Configura os campos de ida no estado global
      this.searchState.originOut.set(origin);
      this.searchState.destOut.set(destination);
      this.searchState.dateOut.set(depDate);
      this.searchState.hasSearchedOut.set(true);

      const flightsOutSub = this.tripService.getFlights(origin, destination, depDate).subscribe({
        next: (data) => {
          this.searchState.flightsOut.set(data || []);
          if (data && data.length > 0) {
            const returnedCurrency = data[0].currency || 'EUR';
            this.currencyService.getExchangeRate(returnedCurrency).subscribe(rate => {
              this.searchState.exchangeRateFlight.set(rate);
              this.searchState.saveToStorage();
            });
          }
          this.searchState.saveToStorage();
        }
      });
      this.subs.push(flightsOutSub);

      // Calcula a data de volta baseada nos dias de viagem do orçamento
      const returnDt = new Date(depDate);
      returnDt.setDate(returnDt.getDate() + (preferences.days || 7));
      const returnDateStr = returnDt.toISOString().split('T')[0];

      // Configura os campos de volta no estado global
      this.searchState.originIn.set(destination);
      this.searchState.destIn.set(origin);
      this.searchState.dateIn.set(returnDateStr);
      this.searchState.hasSearchedIn.set(true);

      const flightsInSub = this.tripService.getFlights(destination, origin, returnDateStr).subscribe({
        next: (data) => {
          this.searchState.flightsIn.set(data || []);
          this.searchState.saveToStorage();
        }
      });
      this.subs.push(flightsInSub);
    }
  }

  addToItinerary(poi: any) { // Adiciona um ponto de interesse ao roteiro, evitando duplicatas
    if (!this.itinerary().find(item => item.id === poi.id)) {
      this.itinerary.update(current => [...current, poi]);
    } else {
      alert('Este local já está no seu roteiro.');
    }
  }

  removeFromItinerary(poiId: string) { // Remove um ponto de interesse do roteiro
    this.itinerary.update(current => current.filter(item => item.id !== poiId));
  }

  onManualUpdate(event: { category: string, value: number }) {
    this.budgetResult.update(current => {
      if (!current) return current;

      const newBreakdown = { ...current.breakdown, [event.category]: event.value };

      // Marca a categoria específica como manual para persistência
      if (event.category === 'flight') newBreakdown.isFlightManual = true;
      if (event.category === 'hotel') newBreakdown.isHotelManual = true;
      if (event.category === 'dailyExpenses') newBreakdown.isDailyManual = true;

      const newTotal = newBreakdown.flight + newBreakdown.hotel + newBreakdown.dailyExpenses;

      // Sincroniza o localGoal para atualizar o restante da UI reativamente
      this.localGoal.set(newTotal);

      return {
        ...current,
        breakdown: newBreakdown,
        estimatedTotalUsd: newTotal // O nome do campo no banco é estimatedTotalUsd mas aqui representa o total na moeda local
      };
    });
  }

  formatBRL(value: number): string { // Formata um número para o padrão brasileiro (1.234,56)
    if (!value || isNaN(value)) return '0,00';
    const fixed = typeof value === 'string' ? parseFloat(value) : value;
    return fixed.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  handleSaveSuccess() { // Feedback visual após salvar a viagem
    this.isSaving.set(false);
    this.saveSuccess.set(true);
    setTimeout(() => this.saveSuccess.set(false), 3000);
  }

get destinationIataCode(): string {
  if (!this.tripDetails?.destination) return '';
  const dest = this.tripDetails.destination.trim();  

  return IATA_CODES[dest] || '';
  }

  get destinationCityName(): string {
  if (!this.tripDetails?.destination) return ''; 
  
  return this.tripDetails.destination.trim();
}
}