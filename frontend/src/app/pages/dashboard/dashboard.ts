import { Component, OnInit, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { TripService } from '../../services/trip.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html'
})
export class Dashboard implements OnInit {
  private tripService = inject(TripService);
  private router = inject(Router);

  // 1. Injeta o identificador de plataforma
  private platformId = inject(PLATFORM_ID);

  savedTrips = signal<any[]>([]);
  isLoading = signal<boolean>(true);

  ngOnInit() {
    // 2. Protege a requisição: só roda no Navegador
    if (isPlatformBrowser(this.platformId)) {
      this.loadTrips();
    } else {
      // Se estiver no servidor, apenas desliga o loading para não travar a tela
      this.isLoading.set(false);
    }
  }

  loadTrips() {
    this.isLoading.set(true);
    this.tripService.getTrips().subscribe({
      next: (data) => {
        this.savedTrips.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Erro ao buscar viagens:', err);
        this.isLoading.set(false);
      }
    });
  }

  editTrip(trip: any) {
    this.router.navigate(['/planner'], {
      state: { tripData: trip, isEditing: true }
    });
  }

  deleteTrip(id: string) {
    if (confirm('Tem certeza que deseja excluir este planejamento?')) {
      this.tripService.deleteTrip(id).subscribe({
        next: () => {
          this.savedTrips.set(this.savedTrips().filter(t => t._id !== id));
        },
        error: (err) => alert('Erro ao excluir a viagem.')
      });
    }
  }

  // Calcula a porcentagem de progresso da viagem
  getProgress(trip: any): number {
    if (!trip.financialGoalBrl || trip.financialGoalBrl === 0) return 0;

    // (O que já tem / O que precisa) * 100
    const percentage = (trip.currentSavingsBrl / trip.financialGoalBrl) * 100;

    return percentage > 100 ? 100 : percentage;
  }
}
