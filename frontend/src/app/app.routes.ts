import { Routes } from '@angular/router';
import { GameBoard } from './game-board/game-board';
import { landingPage } from './landing-page/landing-page';
import { Admin } from './admin/admin'

export const routes: Routes = [
  { path: '', pathMatch: 'full', children: [] },
  { path: 'landing', component: landingPage },
  { path: 'game-board', component: GameBoard },
  { path: 'admin', component: Admin }
];
