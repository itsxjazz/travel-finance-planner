import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss'
})
export class Profile implements OnInit {
  private authService = inject(AuthService);

  // Armazena os dados do banco
  userData = signal<any>(null);

  // Controle do formulário
  oldPassword = signal('');
  newPassword = signal('');

  // Feedback para o usuário
  message = signal('');
  isError = signal(false);

  ngOnInit() {
    this.loadProfile();
  }

  loadProfile() { // Busca os dados do perfil para exibir
    this.authService.getProfile().subscribe({
      next: (data) => this.userData.set(data),
      error: (err) => console.error('Erro ao buscar dados do perfil', err)
    });
  }

  changePassword() { // Função disparada ao enviar o formulário de mudança de senha
    if (!this.oldPassword() || !this.newPassword()) {
      this.showFeedback('Preencha as duas senhas.', true);
      return;
    }

    const payload = {
      oldPassword: this.oldPassword(),
      newPassword: this.newPassword()
    };

    this.authService.changePassword(payload).subscribe({
      next: () => {
        this.showFeedback('Segurança atualizada com sucesso!', false);
        this.oldPassword.set('');
        this.newPassword.set('');
      },
      error: (err) => {
        this.showFeedback(err.error?.message || 'Erro ao atualizar a senha.', true);
      }
    });
  }

  private showFeedback(msg: string, error: boolean) {
    this.message.set(msg);
    this.isError.set(error);
    setTimeout(() => this.message.set(''), 4000); // Limpa a mensagem após 4s
  }
}
