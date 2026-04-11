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
  @Input() cityName!: string; 
  
  private tripService = inject(TripService);

  hotelsList = signal<any[]>([]);
  isLoading = signal<boolean>(false);
  hasSearched = signal<boolean>(false);
  errorMessage = signal<string>('');
  selectedHotel = signal<any>(null);
  
  isLoadingDetails = signal<boolean>(false);

  ngOnInit() {
    // Initial fetch removed to save API credits
  }

  fetchHotels() {
    this.isLoading.set(true);
    this.hasSearched.set(true);
    
    this.tripService.getHotels(this.cityName).subscribe({
      next: (data) => {
        this.hotelsList.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Erro ao buscar hotéis:', err);
        this.errorMessage.set('Hospedagens indisponíveis no momento para este destino.');
        this.isLoading.set(false);
      }
    });
  }

  showDetails(hotel: any) {
    this.isLoadingDetails.set(true); 

    this.tripService.getHotelDetails(hotel.hotelId).subscribe({
      next: (realData) => {
        const hotelCompleto = {
          ...hotel,
          fullDescription: realData.fullDescription,
          gallery: realData.photos,
          roomType: realData.realRoomName,
          bedType: realData.realBedType,
        };
        
        this.selectedHotel.set(hotelCompleto);
        this.isLoadingDetails.set(false);
      },
      error: (err) => {
        console.error('Erro ao buscar detalhes profundos:', err);
        this.selectedHotel.set(hotel);
        this.isLoadingDetails.set(false);
      }
    });
  }
}