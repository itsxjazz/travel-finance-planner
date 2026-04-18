import { Component, Input, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TripService } from '../../services/trip.service';
import { CurrencyService } from '../../services/currency.service';
import { SearchStateService } from '../../services/search-state.service';

@Component({
  selector: 'app-flights',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './flights.html',
  styleUrl: './flights.scss'
})
export class Flights implements OnInit, OnDestroy {
  private subs: Subscription[] = [];
  private tripService    = inject(TripService);
  private currencyService = inject(CurrencyService);
  private searchState    = inject(SearchStateService);

  @Input() destinationIata!: string;
  @Input() departureDate!: string | Date | null;
  @Input() originIata!: string;

  // Signals locais de UI (loading/error), resultados e inputs vêm do SearchStateService
  isLoadingOut  = signal<boolean>(false);
  isLoadingIn   = signal<boolean>(false);
  errorMessage  = signal<string>('');

  // Aliases para os Signals do service (usados no template como propriedades)
  get flightsOut()      { return this.searchState.flightsOut; }
  get flightsIn()       { return this.searchState.flightsIn; }
  get hasSearchedOut()  { return this.searchState.hasSearchedOut; }
  get hasSearchedIn()   { return this.searchState.hasSearchedIn; }
  get currentExchangeRate() { return this.searchState.exchangeRateFlight; }

  // Inputs de formulário — lidos do service para persistir entre abas
  get originOut() { return this.searchState.originOut; }
  get destOut()   { return this.searchState.destOut; }
  get dateOut()   { return this.searchState.dateOut; }
  get originIn()  { return this.searchState.originIn; }
  get destIn()    { return this.searchState.destIn; }
  get dateIn()    { return this.searchState.dateIn; }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  ngOnInit() {
    // Só inicializa os campos com props se a aba nunca foi usada antes
    if (!this.searchState.hasSearchedOut() && !this.searchState.hasSearchedIn()) {
      if (this.originIata)    this.searchState.originOut.set(this.originIata);
      if (this.destinationIata) this.searchState.destOut.set(this.destinationIata);

      if (this.departureDate) {
        this.searchState.dateOut.set(
          this.departureDate instanceof Date
            ? this.departureDate.toISOString().split('T')[0]
            : this.departureDate
        );
      } else {
        // Fallback para hoje caso não haja data estimada na viagem
        this.searchState.dateOut.set(new Date().toISOString().split('T')[0]);
      }

      // Sugestão de volta (campos invertidos)
      this.searchState.originIn.set(this.searchState.destOut() || 'PAR');
      this.searchState.destIn.set(this.searchState.originOut() || 'GRU');

      const returnDate = new Date(this.searchState.dateOut());
      returnDate.setDate(returnDate.getDate() + 7);
      this.searchState.dateIn.set(returnDate.toISOString().split('T')[0]);
    }
    // Se já buscou antes, os dados já estão no service — não é preciso fazer nada.
  }

  fetchOutbound() {
    if (this.searchState.originOut().length !== 3 || this.searchState.destOut().length !== 3) return;

    this.isLoadingOut.set(true);
    this.searchState.hasSearchedOut.set(true);
    this.searchState.flightsOut.set([]);

    const sub = this.tripService.getFlights(
      this.searchState.originOut().toUpperCase(),
      this.searchState.destOut().toUpperCase(),
      this.searchState.dateOut()
    ).subscribe({
      next: (data) => {
        this.searchState.flightsOut.set(data);
        this.isLoadingOut.set(false);
        this.searchState.saveToStorage();

        if (data && data.length > 0) {
          const returnedCurrency = data[0].currency || 'EUR';
          this.currencyService.getExchangeRate(returnedCurrency).subscribe({
            next: (rate) => { 
                this.searchState.exchangeRateFlight.set(rate); 
                this.searchState.saveToStorage(); 
            },
            error: () => { 
                this.searchState.exchangeRateFlight.set(1);
                this.searchState.saveToStorage();
            }
          });
        }
      },
      error: () => {
        this.isLoadingOut.set(false);
        this.errorMessage.set('Erro ao buscar voos de ida.');
      }
    });
    this.subs.push(sub);
  }

  fetchInbound() {
    if (this.searchState.originIn().length !== 3 || this.searchState.destIn().length !== 3) return;

    this.isLoadingIn.set(true);
    this.searchState.hasSearchedIn.set(true);
    this.searchState.flightsIn.set([]);

    const sub = this.tripService.getFlights(
      this.searchState.originIn().toUpperCase(),
      this.searchState.destIn().toUpperCase(),
      this.searchState.dateIn()
    ).subscribe({
      next: (data) => {
        this.searchState.flightsIn.set(data);
        this.isLoadingIn.set(false);
        this.searchState.saveToStorage();
      },
      error: () => {
        this.isLoadingIn.set(false);
        this.errorMessage.set('Erro ao buscar voos de volta.');
      }
    });
    this.subs.push(sub);
  }

  formatDuration(duration: string): string {
    if (!duration) return '';
    const hours = duration.match(/(\d+)H/);
    const mins  = duration.match(/(\d+)M/);
    return `${hours ? hours[1] + 'h' : ''} ${mins ? mins[1] + 'm' : ''}`.trim();
  }

  getAirlineLogo(code: string): string {
    return `https://images.kiwi.com/airlines/64/${code}.png`;
  }

  handleLogoError(event: any) {
    event.target.style.display = 'none';
  }
}