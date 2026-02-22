import { Component, EventEmitter, Output, Input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-budget-estimator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './budget-estimator.html'
})
export class BudgetEstimator {
  // Recebe o nome do país vindo do planner.ts
  @Input() destinationName: string = '';

  // Sinais do Usuário
  originCode = signal<string>('GRU');
  tripDays = signal<number>(7);
  flightClass = signal<string>('ECONOMY');
  hotelStars = signal<number>(3);
  adultsCount = signal<number>(1);

  // Define a data sugerida inicial para 30 dias no futuro
  defaultDate = new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0];
  departureDate = signal<string>(this.defaultDate);

  // Escuta a chegada das preferências salvas e atualiza os Sinais
  @Input() set savedPreferences(prefs: any) {
    if (prefs) {
      if (prefs.originCode) this.originCode.set(prefs.originCode);
      if (prefs.days) this.tripDays.set(prefs.days);
      if (prefs.flightClass) this.flightClass.set(prefs.flightClass);
      if (prefs.hotelStars) this.hotelStars.set(prefs.hotelStars);
      if (prefs.adults) this.adultsCount.set(prefs.adults);
      if (prefs.departureDate) this.departureDate.set(prefs.departureDate);
    }
  }

  // Calcula a data de Check-out do hotel automaticamente
  checkoutDate = computed(() => {
    const date = new Date(this.departureDate());
    date.setDate(date.getDate() + this.tripDays());
    return date.toISOString().split('T')[0];
  });

  // Espelho do nosso dicionário do Backend para exibir a sigla na tela
  private iataMap: Record<string, string> = {
    'Brasil': 'GRU', 'Estados Unidos': 'NYC', 'Canadá': 'YTO', 'México': 'MEX',
    'Argentina': 'EZE', 'Chile': 'SCL', 'Colômbia': 'BOG', 'Peru': 'LIM', 'Uruguai': 'MVD',
    'França': 'PAR', 'Reino Unido': 'LON', 'Portugal': 'LIS', 'Espanha': 'MAD',
    'Itália': 'ROM', 'Alemanha': 'BER', 'Países Baixos': 'AMS', 'Holanda': 'AMS',
    'Suíça': 'ZRH', 'Bélgica': 'BRU', 'Áustria': 'VIE',
    'Japão': 'TYO', 'Coreia do Sul': 'SEL', 'Singapura': 'SIN', 'Tailândia': 'BKK',
    'Emirados Árabes Unidos': 'DXB', 'Austrália': 'SYD', 'Nova Zelândia': 'AKL',
    'Egito': 'CAI'
  };

  // Calcula a sigla IATA baseada no país selecionado
  destinationIata = computed(() => this.iataMap[this.destinationName] || '???');

  // Contrato atualizado para enviar tudo ao Planner
  @Output() estimateRequested = new EventEmitter<{
    days: number;
    flightClass: string;
    hotelStars: number;
    originCode: string;
    departureDate: string;
    adults: number;
  }>();

  setStars(stars: number) {
    this.hotelStars.set(stars);
  }

  requestEstimate() {
    if (this.tripDays() < 1 || this.adultsCount() < 1) {
      alert('Valores inválidos para dias ou passageiros.');
      return;
    }

    this.estimateRequested.emit({
      days: this.tripDays(),
      flightClass: this.flightClass(),
      hotelStars: this.hotelStars(),
      originCode: this.originCode().toUpperCase(),
      departureDate: this.departureDate(),
      adults: this.adultsCount()
    });
  }
}
