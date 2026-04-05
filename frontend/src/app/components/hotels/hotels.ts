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
      const hotelsWithImages = data.map((hotel: any) => {
        
        // Limpa o nome e transforma em tags para o buscador
        const searchTerm = hotel.name
          .toLowerCase()
          .replace(/[^a-z0-9 ]/g, '') // Remove caracteres especiais
          .split(' ')
          .filter((word: string) => word.length > 2) // Remove preposições curtas
          .slice(0, 3) // Pega as 3 palavras principais para não confundir o buscador
          .join(',');

        return {
          ...hotel,
          photoUrl: `https://loremflickr.com/800/600/${searchTerm},hotel/all?lock=${hotel.hotelId}`
        };
      });

      this.hotelsList.set(hotelsWithImages);
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
    const detalhes = `
  🏨 ${hotel.name.toUpperCase()}
  ⭐ Classificação: ${hotel.rating} Estrelas

  🛏️ DETALHES DA ACOMODAÇÃO:
  - Tipo: ${hotel.roomType}
  - Camas: ${hotel.beds}x ${hotel.bedType}
  - Descrição: ${hotel.fullDescription}

  💳 POLÍTICAS E TARIFAS:
  - Preço Total: ${hotel.currency} ${hotel.price}
  - Cancelamento: ${hotel.cancellation}

  📍 LOCALIZAÇÃO:
  - Coordenadas: ${hotel.latitude}, ${hotel.longitude}
    `;

    alert(detalhes);
  }
}