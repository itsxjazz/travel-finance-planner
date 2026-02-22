import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { Home } from './pages/home/home';
import { Dashboard } from './pages/dashboard/dashboard';
import { Search } from './pages/search/search';
import { Planner } from './pages/planner/planner';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';

export const routes: Routes = [
  // --- ROTAS PÚBLICAS ---
  // (Qualquer pessoa pode acessar)
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: '', component: Home }, // Landing page do app

  // --- ROTAS PROTEGIDAS ---
  // (O AuthGuard vai checar o JWT antes de deixar entrar)
  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [authGuard]
  },
  {
    path: 'search',
    component: Search,
    canActivate: [authGuard]
  },
  {
    path: 'planner',
    component: Planner,
    canActivate: [authGuard]
  },

  // --- REDIRECIONAMENTO DE SEGURANÇA ---
  // Se a rota não existir, manda para o login ou home
  { path: '**', redirectTo: '' }
];
