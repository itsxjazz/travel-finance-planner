import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search.html'
})
export class Search {
  private http = inject(HttpClient);
  private router = inject(Router);

  searchQuery = signal<string>('');
  searchResults = signal<any[]>([]); 
  isSearching = signal<boolean>(false);
  hasSearched = signal<boolean>(false);

  searchCountry() {
    if (!this.searchQuery().trim()) return;
    
    this.isSearching.set(true);
    this.hasSearched.set(false);

    const url = `https://restcountries.com/v3.1/translation/${this.searchQuery()}`;

    this.http.get<any[]>(url).subscribe({
      next: (data) => {
        console.log('Sucesso! Dados recebidos da API:', data);
        this.searchResults.set(data);
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

  selectCountry(apiCountry: any) {
    const currencyCode = this.getCurrencyCode(apiCountry); // Usa a nova função segura
    const countryName = apiCountry.translations?.por?.common || apiCountry.name.common;

    const tripData = {
      destination: countryName,
      countryCode: currencyCode,
      flagUrl: apiCountry.flags.svg
    };

    this.router.navigate(['/planner'], { state: { tripData: tripData } });
  }

  getCurrencyCode(country: any): string {
    if (!country || !country.currencies) return 'N/A';
    const keys = Object.keys(country.currencies);
    return keys.length > 0 ? keys[0] : 'N/A';
  }
}