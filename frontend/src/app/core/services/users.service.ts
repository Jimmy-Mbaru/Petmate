import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  bio?: string;
  firstName?: string;
  lastName?: string;
  role: string;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface UpdateUserDto {
  name?: string;
  bio?: string;
  avatarUrl?: string;
}

export interface UserListResponse {
  data: UserProfile[];
  total: number;
  limit: number;
  offset: number;
}

export interface ApiMessageResponse {
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private readonly apiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  /** Get user profile by ID */
  getProfile(id: string): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/${id}`);
  }

  /** Update user profile (own profile or admin) */
  updateProfile(id: string, dto: UpdateUserDto): Observable<UserProfile> {
    return this.http.patch<UserProfile>(`${this.apiUrl}/${id}`, dto);
  }

  /** Get all users with pagination (admin only) */
  getUsers(limit: number = 10, offset: number = 0): Observable<UserListResponse> {
    return this.http.get<UserListResponse>(`${this.apiUrl}`, {
      params: { limit, offset },
    });
  }

  /** Delete/deactivate user (admin only) */
  deleteUser(id: string): Observable<ApiMessageResponse> {
    return this.http.delete<ApiMessageResponse>(`${this.apiUrl}/${id}`);
  }

  /** Suspend/unsuspend user (admin only) */
  suspendUser(id: string, suspend: boolean): Observable<UserProfile> {
    const action = suspend ? 'suspend' : 'activate';
    return this.http.patch<UserProfile>(`${environment.apiUrl}/admin/users/${id}/${action}`, {});
  }

  /** Update user role (admin only) */
  updateUserRole(id: string, role: string): Observable<UserProfile> {
    return this.http.patch<UserProfile>(`${environment.apiUrl}/admin/users/${id}/role`, { role });
  }
}
