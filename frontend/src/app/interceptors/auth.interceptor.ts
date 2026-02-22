import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  const isBackendUrl = req.url.startsWith('http://localhost:5000');

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
