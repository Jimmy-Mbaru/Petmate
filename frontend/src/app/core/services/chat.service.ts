import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  /**
   * Whether the receiver has read this message.
   */
  read: boolean;
  /**
   * ISO timestamp when the message was sent.
   */
  sentAt: string;
}

export interface Conversation {
  userId: string;
  userName: string;
  userAvatar?: string;
  lastMessage?: string;
  lastMessageAt: string;
  lastMessageFromSelf: boolean;
  unreadCount: number;
}

export interface UnreadCountResponse {
  unreadCount: number;
}

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private readonly apiUrl = `${environment.apiUrl}/chat`;

  constructor(private http: HttpClient) {}

  /**
   * List conversations with last message and unread count.
   */
  getConversations(): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(`${this.apiUrl}/conversations`);
  }

  /**
   * Get total unread messages count.
   */
  getUnreadCount(): Observable<UnreadCountResponse> {
    return this.http.get<UnreadCountResponse>(`${this.apiUrl}/unread-count`);
  }

  /**
   * Get message history with a user.
   */
  getHistory(otherUserId: string): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.apiUrl}/${otherUserId}`);
  }

  /**
   * Mark messages from a user as read.
   */
  markAsRead(otherUserId: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/read`, { otherUserId });
  }

  /**
   * Send a message to a user (REST fallback).
   */
  sendMessage(receiverId: string, content: string): Observable<ChatMessage> {
    return this.http.post<ChatMessage>(`${this.apiUrl}/message`, { receiverId, content });
  }
}
