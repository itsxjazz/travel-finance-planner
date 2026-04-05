import { Component, Input, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TripService } from '../../services/trip.service';
import { HotelDetails } from './hotel-details';

@Component({
  selector: 'app-hotels',
  standalone: true,
  imports: [CommonModule, HotelDetails],
  templateUrl: './hotels.html',
  styleUrl: './hotels.scss'
})
export class Hotels implements OnInit {
  @Input() cityCode!: string; 
  
  private tripService = inject(TripService);

  hotelsList = signal<any[]>([]);
  isLoading = signal<boolean>(true);
  errorMessage = signal<string>('');
  selectedHotel = signal<any>(null);

  ngOnInit() {
    if (this.cityCode) {
      this.fetchHotels();
    }
  }

  fetchHotels() {
    this.isLoading.set(true);
    
    this.tripService.getHotels(this.cityCode).subscribe({
      next: (data) => {
        // O data já vem do Node.js com a photoUrl do Unsplash embutida
        this.hotelsList.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Erro ao buscar hotéis no Amadeus:', err);
        this.errorMessage.set('Hospedagens indisponíveis no momento para este destino.');
        this.isLoading.set(false);
      }
    });
  }

  showDetails(hotel: any) {
    this.selectedHotel.set(hotel);
  }

  handleImageError(event: any) {
    // Fallback de segurança caso a URL do Unsplash venha quebrada
    event.target.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80';
  }
}