import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface BlockedUser {
  blockedId: string;
  blocked: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  createdAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class BlockUserService {
  private readonly apiUrl = `${environment.apiUrl}/block-report`;

  constructor(private http: HttpClient) {}

  /**
   * Block a user
   */
  blockUser(userId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/block/${userId}`, {});
  }

  /**
   * Unblock a user
   */
  unblockUser(userId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/block/${userId}`);
  }

  /**
   * Get list of blocked users
   */
  getBlockedUsers(): Observable<BlockedUser[]> {
    return this.http.get<BlockedUser[]>(`${this.apiUrl}/blocked`);
  }
}
