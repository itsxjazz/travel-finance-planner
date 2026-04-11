// currency.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CurrencyService {
  private http = inject(HttpClient);
  private apiBase = `${environment.apiUrl}/currency`;

  // 1. Busca a cotação atual (ex: ARS-BRL)
  getExchangeRate(currencyCode: string): Observable<number> {
    if (currencyCode === 'BRL') return new Observable(obs => { obs.next(1); obs.complete(); });
    const pair = `${currencyCode}-BRL`;
    return this.http.get<any>(`${this.apiBase}/last/${pair}`).pipe(
      map(data => {
        const key = `${currencyCode}BRL`;
        if (!data[key]) throw new Error('Moeda não encontrada');
        return parseFloat(data[key].bid);
      })
    );
  }

  // 2. Busca histórico dos últimos 360 dias
  getHistoricalRates(currencyCode: string): Observable<any[]> {
    if (currencyCode === 'BRL') return new Observable(obs => { obs.next([]); obs.complete(); });
    const pair = `${currencyCode}-BRL`;
    return this.http.get<any[]>(`${this.apiBase}/daily/${pair}/360`);
  }

  // 3. Busca cotação USD -> Moeda Estrangeira (para o Amadeus)
  getExchangeRateFromUSD(currencyCode: string): Observable<number> {
    if (currencyCode === 'USD') return new Observable(obs => { obs.next(1); obs.complete(); });

    const pair = `USD-${currencyCode}`;
    return this.http.get<any>(`${this.apiBase}/last/${pair}`).pipe(
      map(data => {
        const key = `USD${currencyCode}`;
        if (!data[key]) throw new Error('Par USD não encontrado');
        return parseFloat(data[key].bid);
      })
    );
  }
}
