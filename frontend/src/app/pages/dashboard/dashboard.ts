import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TripService } from '../../services/trip.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit {
  private tripService = inject(TripService);
  
  // Signals para controlar o estado da tela
  savedTrips = signal<any[]>([]);
  isLoading = signal<boolean>(true);

  ngOnInit() {
    this.loadTrips();
  }

  loadTrips() {
    this.tripService.getTrips().subscribe({
      next: (data) => {
        // O Node.js devolve um array com todas as viagens salvas
        this.savedTrips.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Erro ao buscar viagens do banco:', err);
        this.isLoading.set(false);
      }
    });
  }
}