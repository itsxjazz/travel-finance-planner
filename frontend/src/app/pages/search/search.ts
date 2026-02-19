import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { CountryService } from '../../services/country.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search.html',
  styleUrl: './search.scss'
})
export class Search {
  searchTerm: string = '';
  
  countryData = signal<any>(null);
  errorMessage = signal<string>('');
  private router = inject(Router); 
  
  private countryService = inject(CountryService);

  searchCountry() {
    console.log('Botão clicado! Buscando por:', this.searchTerm);

    if (!this.searchTerm) return;
    
    this.errorMessage.set('');
    this.countryData.set(null);

    this.countryService.getCountry(this.searchTerm).subscribe({
      next: (data) => {
        console.log('Sucesso! Dados recebidos da API:', data);
        this.countryData.set(data[0]); 
      },
      error: (err) => {
        console.error('Ops, deu erro na API:', err);
        this.errorMessage.set('País não encontrado. Tente outro nome.');
      }
    });
  }

  getCurrencyCode(): string {
    const data = this.countryData(); 
    if (data?.currencies) {
      return Object.keys(data.currencies)[0]; 
    }
    return 'N/A';
  }

  goToPlanner() {
    const data = this.countryData();
    if (!data) return;

    const tripPayload = {
      destination: data.name.common,
      countryCode: this.getCurrencyCode(),
      flagUrl: data.flags.svg
    };

    this.router.navigate(['/planner'], { state: { tripData: tripPayload } });
  }
}