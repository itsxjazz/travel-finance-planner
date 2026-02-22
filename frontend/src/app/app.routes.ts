import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { Home } from './pages/home/home';
import { Dashboard } from './pages/dashboard/dashboard';
import { Search } from './pages/search/search';
import { Planner } from './pages/planner/planner';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { Profile } from './pages/profile/profile';

export const routes: Routes = [
  // --- ROTAS PÚBLICAS ---
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: '', component: Home },

  // --- ROTAS PROTEGIDAS ---
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
  {
    path: 'profile',
    component: Profile,
    canActivate: [authGuard]
  },

  // --- REDIRECIONAMENTO DE SEGURANÇA ---
  { path: '**', redirectTo: '' }
];
