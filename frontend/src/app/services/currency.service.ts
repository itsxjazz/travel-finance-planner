import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CurrencyService {
  private http = inject(HttpClient);
  private baseUrl = 'https://economia.awesomeapi.com.br/last';

  // Busca a cotação atual da moeda estrangeira em relação ao Real
  getExchangeRate(currencyCode: string): Observable<number> {
    // Exemplo de URL: https://economia.awesomeapi.com.br/last/JPY-BRL
    return this.http.get<any>(`${this.baseUrl}/${currencyCode}-BRL`).pipe(
      map(response => {
        // A API responde com um objeto dinâmico: { JPYBRL: { bid: "0.034" } }
        const key = `${currencyCode}BRL`;
        return parseFloat(response[key].bid);
      })
    );
  }
}