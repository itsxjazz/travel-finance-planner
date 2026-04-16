import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

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

    const url = `https://restcountries.com/v3.1/translation/${this.searchQuery()}`;

    this.http.get<any[]>(url).subscribe({
      next: (data) => {
        // FILTRO ESTRATÉGICO:
        // Filtra o array 'data' para manter apenas países cujos códigos (cca3) estão na lista.
        const filteredResults = data.filter(country =>
          this.verifiedCountries.includes(country.cca3)
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
    const countryName = apiCountry.translations?.por?.common || apiCountry.name.common;

    const tripData = {
      destination: countryName,
      countryCode: currencyCode,
      flagUrl: apiCountry.flags.svg
    };

    this.router.navigate(['/planner'], { state: { tripData: tripData } });
  }

  getCurrencyCode(country: any): string { // Retorna o código da moeda local
    if (!country || !country.currencies) return 'N/A';
    const keys = Object.keys(country.currencies);
    return keys.length > 0 ? keys[0] : 'N/A';
  }
}
