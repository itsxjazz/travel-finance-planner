import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './../services/auth.service';
import { isPlatformBrowser } from '@angular/common';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // Só faz a checagem se estiver rodando no Navegador do usuário
  if (isPlatformBrowser(platformId)) {
    if (authService.isLoggedIn()) {
      return true;
    } else {
      console.warn('Acesso negado: Redirecionando para o login.');
      router.navigate(['/login']);
      return false;
    }
  }

  // Se estiver renderizando no servidor (SSR), deixa passar temporariamente
  return true;
};
