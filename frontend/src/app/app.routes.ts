import { Routes } from '@angular/router';
import { Dashboard } from './pages/dashboard/dashboard';
import { Search} from './pages/search/search';
import { Planner} from './pages/planner/planner';

export const routes: Routes = [
    // Rota inicial (Dashboard)
  { path: '', component: Dashboard },
  
    // Rota de busca
  { path: 'search', component: Search },
  
    // Rota de planejamento financeiro
  { path: 'planner', component: Planner},
  
    // Rota curinga (se o usuário digitar um link que não existe, volta pro Dashboard)
  { path: '**', redirectTo: '' }
];
