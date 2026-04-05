import { Component, Input, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TripService } from '../../services/trip.service';

@Component({
  selector: 'app-flights',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './flights.html',
  styleUrl: './flights.scss'
})
export class Flights implements OnInit {
  private tripService = inject(TripService);

  @Input() destinationIata!: string;
  @Input() departureDate!: string | Date | null;
  @Input() originIata!: string; 

  // --- ESTADOS IDA ---
  originOut = signal<string>('GRU');
  destOut = signal<string>('');
  dateOut = signal<string>('');
  flightsOut = signal<any[]>([]);
  isLoadingOut = signal<boolean>(false);
  hasSearchedOut = signal<boolean>(false);

  // --- ESTADOS VOLTA ---
  originIn = signal<string>('');
  destIn = signal<string>('');
  dateIn = signal<string>('');
  flightsIn = signal<any[]>([]);
  isLoadingIn = signal<boolean>(false);
  hasSearchedIn = signal<boolean>(false); 

  errorMessage = signal<string>('');

  ngOnInit() {
    // 1. APENAS inicializa os campos
    if (this.originIata) this.originOut.set(this.originIata);
    if (this.destinationIata) this.destOut.set(this.destinationIata);
    
    if (this.departureDate) {
      this.dateOut.set(this.departureDate instanceof Date ? 
        this.departureDate.toISOString().split('T')[0] : this.departureDate);
    }

    // Configura sugestão de volta (Invertido)
    this.originIn.set(this.destOut() || 'PAR');
    this.destIn.set(this.originOut() || 'GRU');
    
    const returnDate = new Date(this.dateOut() || new Date());
    returnDate.setDate(returnDate.getDate() + 7);
    this.dateIn.set(returnDate.toISOString().split('T')[0]);
  }

  fetchOutbound() {
    if (this.originOut().length !== 3 || this.destOut().length !== 3) return;
    
    this.isLoadingOut.set(true);
    this.hasSearchedOut.set(true);
    this.flightsOut.set([]);

    this.tripService.getFlights(this.originOut().toUpperCase(), this.destOut().toUpperCase(), this.dateOut())
      .subscribe({
        next: (data) => {
          this.flightsOut.set(data);
          this.isLoadingOut.set(false);
        },
        error: () => {
          this.isLoadingOut.set(false);
          this.errorMessage.set('Erro ao buscar voos de ida.');
        }
      });
  }

  fetchInbound() {
    if (this.originIn().length !== 3 || this.destIn().length !== 3) return;
    
    this.isLoadingIn.set(true);
    this.hasSearchedIn.set(true);
    this.flightsIn.set([]);

    this.tripService.getFlights(this.originIn().toUpperCase(), this.destIn().toUpperCase(), this.dateIn())
      .subscribe({
        next: (data) => {
          this.flightsIn.set(data);
          this.isLoadingIn.set(false);
        },
        error: () => {
          this.isLoadingIn.set(false);
          this.errorMessage.set('Erro ao buscar voos de volta.');
        }
      });
  }

  formatDuration(duration: string): string {
    if (!duration) return '';
    const hours = duration.match(/(\d+)H/);
    const mins = duration.match(/(\d+)M/);
    return `${hours ? hours[1] + 'h' : ''} ${mins ? mins[1] + 'm' : ''}`.trim();
  }

  getAirlineLogo(code: string): string {
    return `https://images.kiwi.com/airlines/64/${code}.png`;
  }

  handleLogoError(event: any) {
    event.target.style.display = 'none';
  }
}