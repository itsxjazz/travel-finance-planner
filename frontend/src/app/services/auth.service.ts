import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  private apiUrl = 'http://localhost:5000/api/auth';
  private tokenKey = 'travel_planner_token';
  private userKey = 'travel_planner_user';

  isLoggedInSignal = signal<boolean>(false);

  constructor() {
    // Inicializa o sinal assim que o app abre
    this.isLoggedInSignal.set(this.isLoggedIn());
  }

  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem(this.tokenKey);
    }
    return null;
  }

  // --- LOGIN ---
  login(credentials: any) {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => {
        if (response?.token) {
          this.saveAuthData(response);
        }
      })
    );
  }

  logout() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
      this.isLoggedInSignal.set(false);
    }
    this.router.navigate(['/login']);
  }

  // --- REGISTRAR ---
  register(userData: any) {
    return this.http.post<any>(`${this.apiUrl}/register`, userData).pipe(
      tap(response => {
        if (response && response.token) {
          this.saveAuthData(response);
        }
      })
    );
  }

  // Busca os dados do usuário logado
  getProfile() {
    return this.http.get<any>(`${this.apiUrl}/profile`);
  }

  // Envia a requisição de troca de senha
  changePassword(data: any) {
    return this.http.put<any>(`${this.apiUrl}/change-password`, data);
  }

  isLoggedIn(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      return !!localStorage.getItem(this.tokenKey);
    }
    return false;
  }

  // --- SALVAR DADOS (Privado) ---
  private saveAuthData(data: any) {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.tokenKey, data.token);
      localStorage.setItem(this.userKey, JSON.stringify({ name: data.name }));
      this.isLoggedInSignal.set(true);
    }
  }

  getUserName(): string {
    if (isPlatformBrowser(this.platformId)) {
      const user = localStorage.getItem(this.userKey);
      return user ? JSON.parse(user).name : 'Viajante';
    }
    return 'Viajante';
  }
}
