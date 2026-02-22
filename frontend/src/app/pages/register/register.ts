import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.html',
  styleUrls: ['./register.scss']
})
export class Register {
  private authService = inject(AuthService);
  private router = inject(Router);

  name = signal<string>('');
  email = signal<string>('');
  password = signal<string>('');
  errorMessage = signal<string>('');
  isLoading = signal<boolean>(false);

  handleRegister() {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const userData = {
      name: this.name(),
      email: this.email(),
      password: this.password()
    };

    this.authService.register(userData).subscribe({
      next: () => {
        // Após o registro, o serviço já guarda o token e podemos ir para a busca
        this.router.navigate(['/search']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Erro ao criar conta. Tente novamente.');
      }
    });
  }
}
