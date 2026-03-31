import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
	{
		path: 'login',
		loadComponent: () => import('./features/login/login.component').then((m) => m.LoginComponent)
	},
	{
		path: 'lobby',
		canActivate: [authGuard],
		loadComponent: () => import('./features/lobby/lobby.component').then((m) => m.LobbyComponent)
	},
	{
		path: 'chat/:userId',
		canActivate: [authGuard],
		loadComponent: () => import('./features/chat/chat.component').then((m) => m.ChatComponent)
	},
	{
		path: '',
		pathMatch: 'full',
		redirectTo: 'lobby'
	},
	{
		path: '**',
		redirectTo: 'lobby'
	}
];
