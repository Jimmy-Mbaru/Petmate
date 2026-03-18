import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

/** Role values from backend: OWNER, HOST, ADMIN */
export type UserRole = 'OWNER' | 'HOST' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  bio?: string;
  avatar?: string;
  role: UserRole;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'OWNER' | 'HOST';
}

/** Backend auth response (POST /auth/login, POST /auth/register). */
interface BackendAuthResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    avatarUrl: string | null;
  };
}

function mapBackendUserToUser(backend: BackendAuthResponse['user']): User {
  const parts = (backend.name || '').trim().split(/\s+/);
  const firstName = parts[0] ?? '';
  const lastName = parts.slice(1).join(' ') ?? '';
  const role = (backend.role ?? 'OWNER').toUpperCase() as User['role'];
  return {
    id: String(backend.id),
    email: backend.email,
    firstName,
    lastName,
    avatar: backend.avatarUrl ?? undefined,
    role: role === 'OWNER' || role === 'HOST' || role === 'ADMIN' ? role : 'OWNER',
  };
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  private readonly STORAGE_KEY = 'petmate_auth';
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {
    this.loadStoredAuth();
  }

  /**
   * Normalize stored user so it always has firstName, lastName, avatar
   * (handles both frontend User shape and backend-like shape with name/avatarUrl).
   */
  private normalizeStoredUser(raw: Record<string, unknown>): User {
    const role = (raw['role'] === 'ADMIN' || raw['role'] === 'HOST' ? raw['role'] : 'OWNER') as UserRole;
    const name = (raw['name'] as string) || '';
    const firstName = (raw['firstName'] as string) ?? (name.trim().split(/\s+/)[0] ?? '');
    const lastName = (raw['lastName'] as string) ?? (name.trim().split(/\s+/).slice(1).join(' ') ?? '');
    const avatar = (raw['avatar'] as string) ?? (raw['avatarUrl'] as string) ?? undefined;
    return {
      id: String(raw['id']),
      email: String(raw['email'] ?? ''),
      firstName: firstName || 'User',
      lastName: lastName ?? '',
      bio: raw['bio'] as string | undefined,
      avatar: avatar || undefined,
      role,
    };
  }

  private loadStoredAuth(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const raw = parsed?.user;
        if (raw && typeof raw['id'] === 'string' && parsed?.token) {
          const user = this.normalizeStoredUser(raw as Record<string, unknown>);
          this.currentUserSubject.next(user);
          this.isAuthenticatedSubject.next(true);
        } else {
          this.clearAuth();
        }
      } catch {
        this.clearAuth();
      }
    }
  }

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http
      .post<BackendAuthResponse>(`${this.apiUrl}/auth/login`, {
        email: credentials.email,
        password: credentials.password,
      })
      .pipe(
        map((res) => ({
          user: mapBackendUserToUser(res.user),
          token: res.access_token,
        })),
        tap((auth) => this.setAuth(auth))
      );
  }

  register(credentials: RegisterCredentials): Observable<AuthResponse> {
    const name = [credentials.firstName, credentials.lastName].filter(Boolean).join(' ');
    return this.http
      .post<BackendAuthResponse>(`${this.apiUrl}/auth/register`, {
        name: name || credentials.email,
        email: credentials.email,
        password: credentials.password,
        role: credentials.role || 'OWNER',
      })
      .pipe(
        map((res) => ({
          user: mapBackendUserToUser(res.user),
          token: res.access_token,
        })),
        tap((auth) => this.setAuth(auth))
      );
  }

  logout(): void {
    this.clearAuth();
  }

  private setAuth(response: AuthResponse): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(response));
    this.currentUserSubject.next(response.user);
    this.isAuthenticatedSubject.next(true);
  }

  private clearAuth(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.getValue();
  }

  getToken(): string | null {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored).token;
      } catch {
        return null;
      }
    }
    return null;
  }

  /** Whether the current user has the given role. */
  hasRole(role: UserRole): boolean {
    const user = this.getCurrentUser();
    return user != null && user.role === role;
  }

  /** True if current user is an admin (can access /app/admin). */
  isAdmin(): boolean {
    return this.hasRole('ADMIN');
  }

  /** True if current user can access owner app area (OWNER or HOST). */
  isOwnerOrHost(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'OWNER' || user?.role === 'HOST' || false;
  }

  /** Update stored user from profile API response (e.g. after PATCH /users/:id). */
  updateProfileInStorage(profile: { name: string; bio?: string; avatarUrl: string | null; role?: string }): void {
    const current = this.currentUserSubject.getValue();
    const token = this.getToken();
    if (!current || !token) return;
    const parts = (profile.name || '').trim().split(/\s+/);
    const updated: User = {
      ...current,
      firstName: parts[0] ?? '',
      lastName: parts.slice(1).join(' ') ?? '',
      bio: profile.bio ?? current.bio,
      avatar: profile.avatarUrl ?? undefined,
      ...(profile.role && { role: profile.role as User['role'] }),
    };
    this.setAuth({ user: updated, token });
  }

  /**
   * Verify email using the token from the verification link.
   * @param token - The verification token
   * @returns Observable with success message
   */
  verifyEmail(token: string): Observable<{ message: string }> {
    return this.http.get<{ message: string }>(`${this.apiUrl}/auth/verify-email`, {
      params: { token },
    });
  }

  /**
   * Resend the email verification link.
   */
  resendVerificationEmail(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/resend-verification`, { email });
  }

  /**
   * Request a password reset link.
   * @param email - The user's email address
   * @returns Observable with success message
   */
  requestPasswordReset(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/forgot-password`, { email });
  }

  /**
   * Reset password using the token from the email.
   * @param token - The reset token
   * @param password - The new password
   * @returns Observable with success message
   */
  resetPassword(token: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/reset-password`, { token, newPassword });
  }
}
