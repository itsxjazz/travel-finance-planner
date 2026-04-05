import { Component, Input, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TripService } from '../../services/trip.service';

@Component({
  selector: 'app-hotels',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hotels.html',
  styleUrl: './hotels.scss'
})
export class Hotels implements OnInit {
  @Input() cityCode!: string; // Recebe 'PAR', 'LON', 'NYC'...
  
  private tripService = inject(TripService);

  hotelsList = signal<any[]>([]);
  isLoading = signal<boolean>(true);
  errorMessage = signal<string>('');

  ngOnInit() {
    if (this.cityCode) {
      this.fetchHotels();
    }
  }

  fetchHotels() {
    this.isLoading.set(true);
    this.tripService.getHotels(this.cityCode).subscribe({
      next: (data) => {
        this.hotelsList.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Erro ao buscar hotéis:', err);
        this.errorMessage.set('Os hotéis para este destino estão indisponíveis no momento. O Amadeus Test Environment possui cobertura limitada.');
        this.isLoading.set(false);
      }
    });
  }
}