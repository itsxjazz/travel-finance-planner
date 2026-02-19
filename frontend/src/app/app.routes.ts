import { Routes } from '@angular/router';
import { Home } from './pages/home/home'; 
import { Dashboard } from './pages/dashboard/dashboard';
import { Search } from './pages/search/search';
import { Planner } from './pages/planner/planner';

export const routes: Routes = [
  // Rota raiz abre a Home
  { path: '', component: Home }, 

  // Dashboard 
  { path: 'dashboard', component: Dashboard },
  
  // Rota de busca
  { path: 'search', component: Search },
  
  // Rota de planejamento financeiro
  { path: 'planner', component: Planner },
  
  // Redireciona qualquer URL digitada errada para a Home
  { path: '**', redirectTo: '' }
];