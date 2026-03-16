import { Component, OnInit, OnDestroy, signal, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../../environments/environment';
import { ChatService, ChatMessage, Conversation } from '../../../core/services/chat.service';
import { AuthService } from '../../../core/auth/auth.service';
import { UsersService, UserProfile } from '../../../core/services/users.service';
import AOS from 'aos';

interface ExtendedChatMessage extends ChatMessage {
  isSelf: boolean;
}

@Component({
  selector: 'app-admin-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css'],
})
export class AdminChatComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly loading = signal(false);
  readonly conversations = signal<Conversation[]>([]);
  readonly selectedConversation = signal<Conversation | null>(null);
  readonly messages = signal<ExtendedChatMessage[]>([]);
  readonly messageInput = signal('');
  readonly users = signal<UserProfile[]>([]);
  readonly searchQuery = signal('');
  readonly composing = signal(false);
  /** userId -> { online, lastSeenAt } for presence */
  readonly presenceMap = signal<Record<string, { online: boolean; lastSeenAt: string | null }>>({});
  /** User IDs whose avatar image failed to load → show initials instead */
  readonly avatarLoadFailed = signal<Set<string>>(new Set());
  /** Other user is typing in the selected conversation */
  readonly otherUserTyping = signal(false);

  private socket: Socket | null = null;
  private socketConnected = false;
  private typingTimeout: ReturnType<typeof setTimeout> | null = null;
  private emitTypingTimeout: ReturnType<typeof setTimeout> | null = null;

  @ViewChild('messagesContainer') messagesContainerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('messageInput') messageInputRef!: ElementRef<HTMLInputElement>;

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private usersService: UsersService
  ) {}

  ngOnInit(): void {
    AOS.init({
      duration: 600,
      easing: 'ease-out-cubic',
      once: false,
      offset: 30,
    });
    this.loadConversations();
    this.loadUsers();
    this.connectSocket();
  }

  ngAfterViewInit(): void {
    AOS.refresh();
  }

  ngOnDestroy(): void {
    if (this.typingTimeout) clearTimeout(this.typingTimeout);
    if (this.emitTypingTimeout) clearTimeout(this.emitTypingTimeout);
    if (this.socket) {
      this.socket.off('new_message');
      this.socket.off('messages_read');
      this.socket.off('presence');
      this.socket.off('user_typing');
      this.socket.disconnect();
    }
    AOS.refresh();
  }

  private connectSocket(): void {
    const token = this.authService.getToken();
    if (!token) return;

    this.socket = io(environment.apiUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      this.socketConnected = true;
      this.requestPresenceForVisibleUsers();
    });

    this.socket.on('new_message', (message: ChatMessage) => {
      this.handleNewMessage(message);
    });

    this.socket.on('messages_read', (data: { readerId: string }) => {
      this.handleMessagesRead(data);
    });

    this.socket.on('presence', (data: { userId: string; online: boolean; lastSeenAt: string | null }) => {
      this.presenceMap.update((m) => ({ ...m, [data.userId]: { online: data.online, lastSeenAt: data.lastSeenAt } }));
    });

    this.socket.on('user_typing', (data: { userId: string }) => {
      const conv = this.selectedConversation();
      if (conv?.userId !== data.userId) return;
      this.otherUserTyping.set(true);
      if (this.typingTimeout) clearTimeout(this.typingTimeout);
      this.typingTimeout = setTimeout(() => {
        this.otherUserTyping.set(false);
        this.typingTimeout = null;
      }, 3000);
    });
  }

  private requestPresenceForVisibleUsers(): void {
    if (!this.socket?.connected) return;
    const userIds = new Set<string>();
    const conv = this.selectedConversation();
    if (conv) userIds.add(conv.userId);
    this.users().forEach((u) => userIds.add(u.id));
    this.conversations().forEach((c) => userIds.add(c.userId));
    userIds.forEach((userId) => this.requestPresence(userId));
  }

  private requestPresence(userId: string): void {
    if (!this.socket?.connected || !userId) return;
    this.socket.emit('get_presence', { userId }, (res: { userId?: string; online?: boolean; lastSeenAt?: string | null } | { error?: string }) => {
      const success = res && !('error' in res) ? (res as { userId?: string; online?: boolean; lastSeenAt?: string | null }) : null;
      if (success?.userId != null) {
        this.presenceMap.update((m) => ({
          ...m,
          [success.userId!]: { online: success.online ?? false, lastSeenAt: success.lastSeenAt ?? null },
        }));
      }
    });
  }

  private emitMessagesRead(otherUserId: string): void {
    if (!this.socket || !this.socketConnected) return;
    this.socket.emit('messages_read', { senderId: otherUserId });
  }

  private handleNewMessage(message: ChatMessage): void {
    const currentConv = this.selectedConversation();
    const currentUserId = this.getCurrentUserId();

    // Always refresh conversations to update last message + unread counts
    this.loadConversations();

    if (!currentConv || !currentUserId) {
      return;
    }

    const otherUserId = currentConv.userId;

    // Only append to the active thread
    if (message.senderId === otherUserId || message.receiverId === otherUserId) {
      const isSelf = message.senderId === currentUserId;
      this.messages.update(msgs => [...msgs, { ...message, isSelf } as ExtendedChatMessage]);
      setTimeout(() => this.scrollToBottom(), 100);

      // If we just received a message from the other user, immediately mark as read
      if (message.senderId === otherUserId && !message.read) {
        this.emitMessagesRead(otherUserId);
      }
    }
  }

  private handleMessagesRead(data: { readerId: string }): void {
    const currentConv = this.selectedConversation();
    if (!currentConv || data.readerId !== currentConv.userId) return;

    const currentUserId = this.getCurrentUserId();
    if (!currentUserId) return;

    this.messages.update(msgs =>
      msgs.map(m => m.senderId === currentUserId ? { ...m, read: true } : m)
    );
  }

  private getCurrentUserId(): string | null {
    const user = this.authService.getCurrentUser();
    return user?.id ?? null;
  }

  loadConversations(): void {
    this.chatService.getConversations().subscribe({
      next: (convs) => {
        this.conversations.set(convs);
      },
      error: (error) => {
        console.error('Failed to load conversations:', error);
        this.conversations.set([]);
      },
    });
  }

  loadUsers(): void {
    this.usersService.getUsers(100, 0).subscribe({
      next: (response) => {
        this.users.set(response.data);
      },
      error: (error) => {
        console.error('Failed to load users:', error);
        this.users.set([]);
      },
    });
  }

  selectUser(user: UserProfile): void {
    const currentUserId = this.getCurrentUserId();
    if (!currentUserId || user.id === currentUserId) return;

    const existingConv = this.conversations().find(c => c.userId === user.id);

    if (existingConv) {
      this.selectedConversation.set(existingConv);
    } else {
      this.selectedConversation.set({
        userId: user.id,
        userName: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.name,
        lastMessage: '',
        lastMessageAt: new Date().toISOString(),
        lastMessageFromSelf: false,
        unreadCount: 0,
      });
    }

    this.loadMessages(user.id);
    this.composing.set(false);
    this.otherUserTyping.set(false);
    this.emitMessagesRead(user.id);
    this.requestPresence(user.id);
    // Clear unread counter when entering this conversation
    this.conversations.update((convs) =>
      convs.map((c) => (c.userId === user.id ? { ...c, unreadCount: 0 } : c))
    );
  }

  loadMessages(otherUserId: string): void {
    this.loading.set(true);
    this.chatService.getHistory(otherUserId).subscribe({
      next: (msgs) => {
        const currentUserId = this.getCurrentUserId();
        this.messages.set(
          msgs.map(
            m =>
              ({
                ...m,
                isSelf: currentUserId != null && m.senderId === currentUserId,
              }) as ExtendedChatMessage,
          ),
        );
        this.loading.set(false);
        setTimeout(() => this.scrollToBottom(), 100);
      },
      error: (error) => {
        console.error('Failed to load messages:', error);
        this.messages.set([]);
        this.loading.set(false);
      },
    });
  }

  sendMessage(): void {
    const content = this.messageInput().trim();
    const selectedConv = this.selectedConversation();
    if (!content || !selectedConv) return;

    const currentUserId = this.getCurrentUserId();
    if (!currentUserId) return;

    const optimisticMessage: ExtendedChatMessage = {
      id: `temp-${Date.now()}`,
      senderId: currentUserId,
      receiverId: selectedConv.userId,
      content,
      read: false,
      sentAt: new Date().toISOString(),
      isSelf: true,
    };

    this.messages.update(msgs => [...msgs, optimisticMessage]);
    setTimeout(() => this.scrollToBottom(), 100);

    if (this.socket && this.socketConnected) {
      this.socket.emit(
        'send_message',
        {
          receiverId: selectedConv.userId,
          content,
        },
        (response: unknown) => {
          if (response && typeof response === 'object' && 'error' in response) {
            console.error('Failed to send message:', response);
          }
        },
      );
    }

    this.messageInput.set('');
    this.composing.set(false);
    this.loadConversations();
  }

  onInputChange(): void {
    this.composing.set(true);
    this.emitTypingDebounced();
  }

  private emitTypingDebounced(): void {
    if (this.emitTypingTimeout) clearTimeout(this.emitTypingTimeout);
    const conv = this.selectedConversation();
    if (!conv || !this.socket?.connected) return;
    this.socket.emit('typing', { receiverId: conv.userId });
    this.emitTypingTimeout = setTimeout(() => {
      this.emitTypingTimeout = null;
    }, 2500);
  }

  /** All users matching search (name, email, first/last name). Used when user is searching to start a new conversation. */
  getFilteredUsers(): UserProfile[] {
    const query = this.searchQuery().toLowerCase().trim();
    const currentUserId = this.getCurrentUserId();
    if (!query) return [];
    const fullName = (u: UserProfile) =>
      `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim().toLowerCase() || u.name?.toLowerCase() || '';
    return this.users().filter(
      (user) =>
        user.id !== currentUserId &&
        (user.name?.toLowerCase().includes(query) ||
          user.email?.toLowerCase().includes(query) ||
          fullName(user).includes(query) ||
          (user.firstName?.toLowerCase().includes(query) || user.lastName?.toLowerCase().includes(query)))
    );
  }

  /** Up to 5 users that have a conversation (messages) with admin, optionally filtered by search. */
  getConversationUsersForSidebar(): UserProfile[] {
    const query = this.searchQuery().toLowerCase();
    const currentUserId = this.getCurrentUserId();
    const convs = [...this.conversations()].sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
    const result: UserProfile[] = [];
    for (const conv of convs) {
      if (conv.userId === currentUserId) continue;
      const user = this.users().find(u => u.id === conv.userId);
      const displayName = user
        ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.name || user.email
        : conv.userName;
      if (query && !displayName.toLowerCase().includes(query)) continue;
      result.push(
        user ?? ({
          id: conv.userId,
          name: conv.userName,
          firstName: '',
          lastName: '',
          email: '',
          role: '',
          avatarUrl: null,
          isActive: true,
          createdAt: new Date().toISOString(),
        } as UserProfile)
      );
      if (result.length >= 5) break;
    }
    return result;
  }

  /** Sidebar list: when searching, show any matching user (so admin can start a conversation); otherwise show up to 5 with existing messages. */
  getSidebarUsers(): UserProfile[] {
    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      return this.getFilteredUsers().slice(0, 15);
    }
    return this.getConversationUsersForSidebar();
  }

  /** True when the sidebar is showing search results (any user) vs only conversation users. */
  isShowingSearchResults(): boolean {
    return this.searchQuery().toLowerCase().trim().length > 0;
  }

  /** Initials for a user when no profile image (e.g. "JD" for John Doe). */
  getInitials(user: UserProfile): string {
    const first = user.firstName?.trim()[0] || '';
    const last = user.lastName?.trim()[0] || '';
    if (first || last) return (first + last).toUpperCase();
    if (user.name?.trim()) return user.name.trim()[0].toUpperCase();
    return '?';
  }

  markAvatarFailed(userId: string): void {
    this.avatarLoadFailed.update((set) => new Set(set).add(userId));
  }

  /** Selected user from users list (for avatar, etc.). */
  getSelectedUser(): UserProfile | undefined {
    const conv = this.selectedConversation();
    return conv ? this.users().find(u => u.id === conv.userId) : undefined;
  }

  /** Unread message count from this user (for badge in sidebar). */
  getUnreadCountForUser(userId: string): number {
    return this.conversations().find(c => c.userId === userId)?.unreadCount ?? 0;
  }

  /** Show display name (from users list) instead of email in chat header. */
  getSelectedUserName(): string {
    const conv = this.selectedConversation();
    if (!conv) return 'Select a user to chat';
    const user = this.users().find(u => u.id === conv.userId);
    if (user) {
      const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.name;
      if (name && !name.includes('@')) return name;
    }
    return conv.userName?.includes('@') ? conv.userName.split('@')[0] : (conv.userName || 'Unknown');
  }

  /** Presence label for the selected conversation: "Online" or "Last seen X ago" */
  getPresenceLabel(): string {
    const conv = this.selectedConversation();
    if (!conv) return '';

    const presence = this.presenceMap()[conv.userId];
    if (presence?.online) return 'Online';
    if (presence?.lastSeenAt) return `Last seen ${this.formatLastSeenAgo(presence.lastSeenAt)}`;
    return 'Offline';
  }

  /** Format lastSeenAt for display: "Just now", "5m ago", "2h ago", "3d ago" */
  formatLastSeenAgo(isoDate: string): string {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  scrollToBottom(): void {
    const container = this.messagesContainerRef?.nativeElement;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  formatMessageTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  isOnline(userId: string): boolean {
    return this.presenceMap()[userId]?.online ?? false;
  }
}
