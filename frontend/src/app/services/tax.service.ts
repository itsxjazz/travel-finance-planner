import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TaxService {
  private http = inject(HttpClient);
  private apiUrl = 'https://brasilapi.com.br/api/taxas/v1';

  /**
   * Busca uma taxa específica pelo nome (CDI, SELIC, IPCA)
   * @param name Nome da taxa desejada
   * @returns Valor da taxa ou fallback caso não encontre
   */
  getRate(name: string): Observable<number> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      map(taxas => {
        // Busca a taxa exata pelo nome enviado
        const taxa = taxas.find(t => t.nome.toUpperCase() === name.toUpperCase());
        
        if (taxa) {
          return taxa.valor;
        }

        // Fallbacks inteligentes caso a API não retorne o índice específico
        const fallbacks: { [key: string]: number } = {
          'CDI': 12.0,
          'SELIC': 12.0,
          'IPCA': 4.5
        };

        return fallbacks[name.toUpperCase()] || 0;
      })
    );
  }

  /**
   * Busca todas as taxas de uma vez para popular os signals do Planner
   */
  getAllRates(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }
}