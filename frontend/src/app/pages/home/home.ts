import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html'
})
export class Home {
  private router = inject(Router);

  // Função disparada pelo botão principal
  startPlanning() {
    this.router.navigate(['/search']);
  }
}