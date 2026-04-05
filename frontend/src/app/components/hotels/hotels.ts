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
  @Input() location!: string;
  @Input() stars: number = 3;
  
  private tripService = inject(TripService);

  hotelsList = signal<any[]>([]);
  isLoading = signal<boolean>(true);
  errorMessage = signal<string>('');

  ngOnInit() {
    if (this.location) {
      this.fetchHotels();
    }
  }

  fetchHotels() {
    this.isLoading.set(true); // Garante que o loading inicia
    
    this.tripService.getHotels(this.location, this.stars).subscribe({
      next: (data) => {
        this.hotelsList.set(data);
        this.isLoading.set(false); // <- Desliga o loading quando dá sucesso
      },
      error: (err) => {
        console.error('Erro na aba de hotéis:', err); // Unimos os dois erros aqui
        this.errorMessage.set('Os hotéis para este destino estão indisponíveis no momento. O Amadeus Test Environment possui cobertura limitada.');
        this.isLoading.set(false); // <- Desliga o loading quando dá erro
      }
    });
  }
}