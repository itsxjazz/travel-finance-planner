import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // O serviço checa se o token existe no localStorage
  if (authService.isLoggedIn()) {
    return true; // Entrada liberada!
  }

  // Se não estiver logado, manda direto para a tela de login
  console.warn('Acesso negado: Redirecionando para o login.');
  router.navigate(['/login']);
  return false;
};
