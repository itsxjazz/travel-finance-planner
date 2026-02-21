import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  private apiUrl = 'http://localhost:5000/api/auth';

  private tokenKey = 'travel_planner_token';
  private userKey = 'travel_planner_user';

  // --- REGISTRAR ---
  register(userData: any) {
    return this.http.post<any>(`${this.apiUrl}/register`, userData).pipe(
      tap(response => {
        // Se a requisição der certo, já salvamos o token e os dados automaticamente
        if (response && response.token) {
          this.saveAuthData(response);
        }
      })
    );
  }

  // --- LOGIN ---
  login(credentials: any) {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => {
        if (response && response.token) {
          this.saveAuthData(response);
        }
      })
    );
  }

  // --- LOGOUT ---
  logout() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
    }
    // Expulsa o usuário de volta para a tela de login
    this.router.navigate(['/login']);
  }

  // --- UTILITÁRIOS DE SESSÃO ---
  private saveAuthData(data: any) {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.tokenKey, data.token);
      localStorage.setItem(this.userKey, JSON.stringify({
        id: data._id,
        name: data.name,
        email: data.email
      }));
    }
  }

  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem(this.tokenKey);
    }
    return null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken(); // Retorna true se o token existir
  }
}
