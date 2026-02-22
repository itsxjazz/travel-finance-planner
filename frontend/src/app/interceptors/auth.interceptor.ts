import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const platformId = inject(PLATFORM_ID);

  const token = isPlatformBrowser(platformId) ? authService.getToken() : null;

  const isBackendUrl = req.url.startsWith('http://localhost:5000');

  if (isBackendUrl) {
    console.log(`[Interceptor] Verificando rota: ${req.url} | Token presente: ${!!token}`);
  }

  if (token && isBackendUrl) {
    const authReq = req.clone({
      setHeaders: {
        'x-auth-token': token
      }
    });
    return next(authReq);
  }

  return next(req);
};
