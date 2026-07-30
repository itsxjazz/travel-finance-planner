import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search.html',
  styleUrl: './search.scss'
})
export class Search {
  private http = inject(HttpClient);
  private router = inject(Router);

  searchQuery = signal<string>('');
  searchResults = signal<any[]>([]);
  isSearching = signal<boolean>(false);
  hasSearched = signal<boolean>(false);

  // Países que o sistema de busca inteligente e AwesomeAPI suportam perfeitamente
  private verifiedCountries = [
    // Américas
    'BRA', 'USA', 'CAN', 'MEX', 'ARG', 'CHL', 'COL', 'PER', 'URY',
    // Europa
    'FRA', 'GBR', 'PRT', 'ESP', 'ITA', 'DEU', 'NLD', 'CHE', 'BEL', 'AUT',
    // Ásia e Oceania
    'JPN', 'KOR', 'SGP', 'THA', 'ARE', 'AUS', 'NZL',
    // África
    'EGY'
  ];

  searchCountry() {
    if (!this.searchQuery().trim()) return;

    this.isSearching.set(true);
    this.hasSearched.set(false);

    const url = `${environment.apiUrl}/countries/search?q=${encodeURIComponent(this.searchQuery().trim())}`;

    this.http.get<any>(url).subscribe({
      next: (response) => {
        const data = response?.data?.objects || [];
        // FILTRO ESTRATÉGICO:
        // Filtra o array 'data' para manter apenas países cujos códigos (alpha_3) estão na lista.
        const filteredResults = data.filter((country: any) =>
          country.codes?.alpha_3 && this.verifiedCountries.includes(country.codes.alpha_3)
        );

        this.searchResults.set(filteredResults);
        this.isSearching.set(false);
        this.hasSearched.set(true);
      },
      error: (err) => {
        console.error('Erro na busca ou país não encontrado', err);
        this.searchResults.set([]);
        this.isSearching.set(false);
        this.hasSearched.set(true);
      }
    });
  }

  selectCountry(apiCountry: any) { // Quando o usuário clica em um país da lista de resultados
    const currencyCode = this.getCurrencyCode(apiCountry);
    const countryName = apiCountry.names?.translations?.por?.common || apiCountry.names?.common;

    const tripData = {
      destination: countryName,
      countryCode: currencyCode,
      flagUrl: apiCountry.flag?.url_svg || apiCountry.flag?.url_png
    };

    this.router.navigate(['/planner'], { state: { tripData: tripData } });
  }

  getCurrencyCode(country: any): string { // Retorna o código da moeda local
    if (!country || !country.currencies) return 'N/A';
    
    // Formato v5: Array de moedas
    if (Array.isArray(country.currencies) && country.currencies.length > 0) {
      return country.currencies[0].code || 'N/A';
    }
    
    // Fallback para formato antigo v3.1 por segurança
    const keys = Object.keys(country.currencies);
    return keys.length > 0 ? keys[0] : 'N/A';
  }
}
