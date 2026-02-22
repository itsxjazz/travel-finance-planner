import { Component, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.html'
})
export class Header {
  private authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);

  isLoggedIn = this.authService.isLoggedInSignal;

  logout() {
    this.authService.logout();
  }

  getUserName(): string {
    if (isPlatformBrowser(this.platformId)) {
      const userData = localStorage.getItem('travel_planner_user');
      if (userData) {
        const user = JSON.parse(userData);
        return user.name;
      }
    }
    return 'Viajante';
  }
}
