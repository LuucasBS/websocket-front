import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../../shared/models/user.model';
import { NotificationService } from './notification.service';

interface LoginResponse {
  token: string;
  expiresAt?: string;
  user: {
    id: string;
    username: string;
    status?: string;
    lastSeen?: string;
    displayName?: string;
    online?: boolean;
  };
}

interface LoginPayload {
  username: string;
  password: string;
}

const TOKEN_KEY = 'chat_token';
const USER_KEY = 'chat_user';

const MOCK_USERS: Array<{ username: string; password: string; id: string; displayName: string }> = [
  { username: 'alice', password: '123456', id: 'u-1', displayName: 'Alice' },
  { username: 'bob', password: '123456', id: 'u-2', displayName: 'Bob' },
  { username: 'carol', password: '123456', id: 'u-3', displayName: 'Carol' }
];

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly notifications = inject(NotificationService);

  private readonly _token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  private readonly _user = signal<User | null>(this.readUserFromStorage());

  readonly token = this._token.asReadonly();
  readonly currentUser = this._user.asReadonly();
  readonly isAuthenticated = computed(() => Boolean(this._token() && this._user()));

  login(payload: LoginPayload): Observable<User> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, payload).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 0) {
          return this.localLogin(payload);
        }
        return throwError(() => error);
      }),
      tap((response) => {
        this.storeSession(response.token, this.mapUser(response.user));
        this.notifications.requestPermission();
      }),
      map((response) => this.mapUser(response.user))
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._token.set(null);
    this._user.set(null);
  }

  getToken(): string | null {
    return this._token();
  }

  private localLogin(payload: LoginPayload): Observable<LoginResponse> {
    const found = MOCK_USERS.find(
      (user) => user.username.toLowerCase() === payload.username.toLowerCase() && user.password === payload.password
    );

    if (!found) {
      return throwError(() => new Error('Usuario ou senha invalidos.'));
    }

    const user: User = {
      id: found.id,
      username: found.username,
      displayName: found.displayName,
      online: true
    };

    return of({
      token: this.generateMockToken(found.username),
      user
    });
  }

  private storeSession(token: string, user: User): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this._token.set(token);
    this._user.set(user);
  }

  private readUserFromStorage(): User | null {
    const raw = localStorage.getItem(USER_KEY);

    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as User;
      return parsed;
    } catch {
      return null;
    }
  }

  private mapUser(raw: LoginResponse['user']): User {
    return {
      id: raw.id,
      username: raw.username,
      displayName: raw.displayName ?? raw.username,
      online: raw.online ?? raw.status === 'ONLINE'
    };
  }

  private generateMockToken(username: string): string {
    return btoa(`${username}:${Date.now()}`);
  }
}
