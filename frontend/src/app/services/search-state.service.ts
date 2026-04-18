import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class SearchStateService {
  private platformId = inject(PLATFORM_ID);

  // Isolamento da Viagem
  currentTripId = signal<string | null>(null);

  // --- ESTADO: VOOS DE IDA ---
  flightsOut = signal<any[]>([]);
  originOut = signal<string>('GRU');
  destOut = signal<string>('');
  dateOut = signal<string>('');
  hasSearchedOut = signal<boolean>(false);

  // --- ESTADO: VOOS DE VOLTA ---
  flightsIn = signal<any[]>([]);
  originIn = signal<string>('');
  destIn = signal<string>('');
  dateIn = signal<string>('');
  hasSearchedIn = signal<boolean>(false);

  // Taxa de câmbio compartilhada para os voos
  exchangeRateFlight = signal<number>(1);

  // --- ESTADO: HOTÉIS ---
  hotelsList = signal<any[]>([]);
  hasSearchedHotels = signal<boolean>(false);
  exchangeRateHotels = signal<number>(1);

  // --- ESTADO: EXPLORAÇÃO (POIs) ---
  rawPointsOfInterest = signal<any[]>([]);
  hasSearchedPOIs = signal<boolean>(false);

  initializeState(tripId: string) {
    if (this.currentTripId() !== tripId) {
      this.clearState();
      this.currentTripId.set(tripId);
    }
    this.restoreFromStorage();
  }

  clearState() {
    this.flightsOut.set([]);
    this.originOut.set('GRU');
    this.destOut.set('');
    this.dateOut.set('');
    this.hasSearchedOut.set(false);

    this.flightsIn.set([]);
    this.originIn.set('');
    this.destIn.set('');
    this.dateIn.set('');
    this.hasSearchedIn.set(false);
    this.exchangeRateFlight.set(1);

    this.hotelsList.set([]);
    this.hasSearchedHotels.set(false);
    this.exchangeRateHotels.set(1);

    this.rawPointsOfInterest.set([]);
    this.hasSearchedPOIs.set(false);
  }

  saveToStorage() {
    if (isPlatformBrowser(this.platformId) && this.currentTripId()) {
      const state = {
        flightsOut: this.flightsOut(),
        originOut: this.originOut(),
        destOut: this.destOut(),
        dateOut: this.dateOut(),
        hasSearchedOut: this.hasSearchedOut(),
        
        flightsIn: this.flightsIn(),
        originIn: this.originIn(),
        destIn: this.destIn(),
        dateIn: this.dateIn(),
        hasSearchedIn: this.hasSearchedIn(),
        exchangeRateFlight: this.exchangeRateFlight(),

        hotelsList: this.hotelsList(),
        hasSearchedHotels: this.hasSearchedHotels(),
        exchangeRateHotels: this.exchangeRateHotels(),

        rawPointsOfInterest: this.rawPointsOfInterest(),
        hasSearchedPOIs: this.hasSearchedPOIs()
      };
      sessionStorage.setItem(`searchState_${this.currentTripId()}`, JSON.stringify(state));
    }
  }

  restoreFromStorage() {
    if (isPlatformBrowser(this.platformId) && this.currentTripId()) {
      const savedUrlData = sessionStorage.getItem(`searchState_${this.currentTripId()}`);
      if (savedUrlData) {
        try {
          const state = JSON.parse(savedUrlData);
          this.flightsOut.set(state.flightsOut || []);
          this.originOut.set(state.originOut || 'GRU');
          this.destOut.set(state.destOut || '');
          this.dateOut.set(state.dateOut || '');
          this.hasSearchedOut.set(state.hasSearchedOut || false);

          this.flightsIn.set(state.flightsIn || []);
          this.originIn.set(state.originIn || '');
          this.destIn.set(state.destIn || '');
          this.dateIn.set(state.dateIn || '');
          this.hasSearchedIn.set(state.hasSearchedIn || false);
          this.exchangeRateFlight.set(state.exchangeRateFlight || 1);

          this.hotelsList.set(state.hotelsList || []);
          this.hasSearchedHotels.set(state.hasSearchedHotels || false);
          this.exchangeRateHotels.set(state.exchangeRateHotels || 1);

          this.rawPointsOfInterest.set(state.rawPointsOfInterest || []);
          this.hasSearchedPOIs.set(state.hasSearchedPOIs || false);
        } catch (e) {
          console.error("Failed to parse search state", e);
        }
      }
    }
  }
}
