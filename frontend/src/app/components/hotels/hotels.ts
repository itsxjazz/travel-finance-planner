import { Component, Input, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { TripService } from '../../services/trip.service';
import { CurrencyService } from '../../services/currency.service';
import { SearchStateService } from '../../services/search-state.service';
import { HotelDetails } from './hotel-details';

@Component({
  selector: 'app-hotels',
  standalone: true,
  imports: [CommonModule, HotelDetails],
  templateUrl: './hotels.html',
  styleUrl: './hotels.scss'
})
export class Hotels implements OnInit, OnDestroy {
  @Input() cityName!: string;
  private subs: Subscription[] = [];

  private tripService     = inject(TripService);
  private currencyService = inject(CurrencyService);
  private searchState     = inject(SearchStateService);

  // Estado local de UI (loading, error, detalhes) — esses não precisam persistir
  isLoading        = signal<boolean>(false);
  errorMessage     = signal<string>('');
  selectedHotel    = signal<any>(null);
  isLoadingDetails = signal<boolean>(false);

  // Aliases para os Signals do service
  get hotelsList()        { return this.searchState.hotelsList; }
  get hasSearched()       { return this.searchState.hasSearchedHotels; }
  get currentExchangeRate() { return this.searchState.exchangeRateHotels; }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  ngOnInit() {
    // Se já há resultados no service, exibe diretamente sem nova chamada à API
    // Nenhuma ação necessária — o template lê o signal do service
  }

  fetchHotels() {
    this.isLoading.set(true);
    this.searchState.hasSearchedHotels.set(true);

    const sub = this.tripService.getHotels(this.cityName).subscribe({
      next: (data) => {
        this.searchState.hotelsList.set(data);
        this.isLoading.set(false);
        this.searchState.saveToStorage();

        if (data && data.length > 0) {
          const returnedCurrency = data[0].currency || 'EUR';
          this.currencyService.getExchangeRate(returnedCurrency).subscribe({
            next: (rate) => {
                this.searchState.exchangeRateHotels.set(rate);
                this.searchState.saveToStorage();
            },
            error: () => {
                this.searchState.exchangeRateHotels.set(1);
                this.searchState.saveToStorage();
            }
          });
        }
      },
      error: (err) => {
        console.error('Erro ao buscar hotéis:', err);
        this.errorMessage.set('Hospedagens indisponíveis no momento para este destino.');
        this.isLoading.set(false);
      }
    });
    this.subs.push(sub);
  }

  showDetails(hotel: any) {
    this.isLoadingDetails.set(true);

    const sub = this.tripService.getHotelDetails(hotel.hotelId).subscribe({
      next: (realData) => {
        const hotelCompleto = {
          ...hotel,
          fullDescription: realData.fullDescription,
          gallery: realData.photos,
          roomType: realData.realRoomName,
          bedType: realData.realBedType,
        };

        this.selectedHotel.set(hotelCompleto);
        this.isLoadingDetails.set(false);
      },
      error: (err) => {
        console.error('Erro ao buscar detalhes profundos:', err);
        this.selectedHotel.set(hotel);
        this.isLoadingDetails.set(false);
      }
    });
    this.subs.push(sub);
  }
}