import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
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
  private router = inject(Router);

  // Sinal para controlar o estado do menu
  isMenuOpen = signal<boolean>(false);

  // Atalho para o sinal de login
  isLoggedIn = this.authService.isLoggedInSignal;

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
    this.closeMenu();
  }

  //  O nome também reage às mudanças do AuthService
  getUserName(): string {
    return this.authService.getUserName();
  }

  // Método para alternar o estado do menu
  toggleMenu() {
    this.isMenuOpen.update(state => !state);
  }

  // Método para alternar o estado do menu
  closeMenu() {
    this.isMenuOpen.set(false);
  }
}
