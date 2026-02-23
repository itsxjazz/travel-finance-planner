import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class Header {
  // Torna o serviço público para acessar o sinal direto no HTML
  public authService = inject(AuthService);

  // Atalho para o sinal de login
  isLoggedIn = this.authService.isLoggedInSignal;

  logout() {
    this.authService.logout();
  }

  // Agora o nome também reage às mudanças do AuthService
  getUserName(): string {
    return this.authService.getUserName();
  }
}
