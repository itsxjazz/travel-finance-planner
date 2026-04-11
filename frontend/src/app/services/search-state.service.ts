import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SearchStateService {

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
}
