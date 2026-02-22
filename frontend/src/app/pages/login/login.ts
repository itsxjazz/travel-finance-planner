import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class Login {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = signal<string>('');
  password = signal<string>('');
  errorMessage = signal<string>('');
  isLoading = signal<boolean>(false);

  handleLogin() {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const credentials = {
      email: this.email(),
      password: this.password()
    };

    this.authService.login(credentials).subscribe({
      next: () => {
        // Se o login for sucesso, o serviço já guardou o token.
        this.router.navigate(['/search']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Erro ao tentar entrar. Verifique suas credenciais.');
      }
    });
  }
}
