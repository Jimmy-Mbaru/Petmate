import { Component, Inject, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { io, Socket } from 'socket.io-client';
import { lucideMessageCircle, lucideSend, lucideUser, lucideX, lucideShieldAlert } from '@ng-icons/lucide';
import { ChatService, type Conversation, type ChatMessage } from '../../core/services/chat.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/auth/auth.service';
import { environment } from '../../../environments/environment';
import { ReportUserModalComponent, type ReportModalData } from '../../shared/components/report-user-modal/report-user-modal.component';

@Component({
  selector: 'app-host-chat',
  standalone: true,
  imports: [RouterLink, FormsModule, NgIcon, ReportUserModalComponent],
  providers: [provideIcons({ lucideMessageCircle, lucideSend, lucideUser, lucideX, lucideShieldAlert })],
  templateUrl: './host-chat.component.html',
  styleUrl: './host-chat.component.css',
})
export class HostChatComponent implements OnInit, AfterViewInit, OnDestroy {
  conversations: Conversation[] = [];
  messages: ChatMessage[] = [];
  selectedConversation: Conversation | null = null;
  isLoading = false;
  isSending = false;
  newMessage = '';
  currentUserId = '';
  showReportModal = false;

  /** Presence for the currently selected conversation user */
  selectedUserPresence: { online: boolean; lastSeenAt: string | null } | null = null;
  otherUserTyping = false;

  private socket: Socket | null = null;
  private socketConnected = false;
  private typingTimeout: ReturnType<typeof setTimeout> | null = null;
  private emitTypingTimeout: ReturnType<typeof setTimeout> | null = null;

  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLDivElement>;

  constructor(
    @Inject(ChatService) private chatService: ChatService,
    private toast: ToastService,
    private auth: AuthService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    const user = this.auth.getCurrentUser();
    if (user) {
      this.currentUserId = user.id;
    }
    this.loadConversations();
    this.connectSocket();
  }

  ngAfterViewInit(): void {
    if (this.messages.length > 0) {
      this.scrollToBottom();
    }
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
  }

  private connectSocket(): void {
    const token = this.auth.getToken();
    if (!token) return;

    this.socket = io(environment.apiUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      this.socketConnected = true;
      if (this.selectedConversation) this.requestPresence(this.selectedConversation.userId);
    });

    this.socket.on('new_message', (message: ChatMessage) => {
      this.handleNewMessage(message);
    });

    this.socket.on('messages_read', (data: { readerId: string }) => {
      this.handleMessagesRead(data);
    });

    this.socket.on('presence', (data: { userId: string; online: boolean; lastSeenAt: string | null }) => {
      if (this.selectedConversation?.userId === data.userId) {
        this.selectedUserPresence = { online: data.online, lastSeenAt: data.lastSeenAt };
      }
    });

    this.socket.on('user_typing', (data: { userId: string }) => {
      if (this.selectedConversation?.userId !== data.userId) return;
      this.otherUserTyping = true;
      if (this.typingTimeout) clearTimeout(this.typingTimeout);
      this.typingTimeout = setTimeout(() => {
        this.otherUserTyping = false;
        this.typingTimeout = null;
      }, 3000);
    });
  }

  private requestPresence(userId: string): void {
    if (!this.socket?.connected || !userId) return;
    this.socket.emit('get_presence', { userId }, (res: { userId?: string; online?: boolean; lastSeenAt?: string | null } | { error?: string }) => {
      const success = res && !('error' in res) ? (res as { userId?: string; online?: boolean; lastSeenAt?: string | null }) : null;
      if (success?.userId != null && this.selectedConversation?.userId === success.userId) {
        this.selectedUserPresence = { online: success.online ?? false, lastSeenAt: success.lastSeenAt ?? null };
      }
    });
  }

  private emitMessagesRead(otherUserId: string): void {
    if (!this.socket || !this.socketConnected) return;
    this.socket.emit('messages_read', { senderId: otherUserId });
  }

  private handleNewMessage(message: ChatMessage): void {
    const currentUserId = this.currentUserId;
    this.loadConversations();

    const currentConv = this.selectedConversation;
    if (!currentConv || !currentUserId) {
      return;
    }

    const otherUserId = currentConv.userId;

    if (message.senderId === otherUserId || message.receiverId === otherUserId) {
      this.messages = [...this.messages, { ...message }];
      setTimeout(() => this.scrollToBottom(), 100);

      if (message.senderId === otherUserId && !message.read) {
        this.emitMessagesRead(otherUserId);
      }
    }
  }

  private handleMessagesRead(data: { readerId: string }): void {
    if (!this.selectedConversation || data.readerId !== this.selectedConversation.userId) return;
    const currentUserId = this.currentUserId;
    if (!currentUserId) return;

    this.messages = this.messages.map(m =>
      m.senderId === currentUserId ? { ...m, read: true } : m
    );
  }

  loadConversations(): void {
    this.isLoading = true;
    this.chatService.getConversations().subscribe({
      next: (conversations) => {
        this.conversations = conversations;
        this.isLoading = false;
        this.maybeOpenConversationFromRoute();
      },
      error: (error: unknown) => {
        this.isLoading = false;
        this.toast.error('Error', 'Failed to load conversations');
        console.error('Error loading conversations:', error);
      },
    });
  }

  private maybeOpenConversationFromRoute(): void {
    const params = this.route.snapshot.queryParamMap;
    const userId = params.get('userId');
    if (!userId) return;

    const userName = params.get('userName') ?? 'User';

    let conversation = this.conversations.find((c) => c.userId === userId);
    if (!conversation) {
      conversation = {
        userId,
        userName,
        lastMessage: '',
        lastMessageAt: new Date(0).toISOString(),
        lastMessageFromSelf: false,
        unreadCount: 0,
      };
      this.conversations = [conversation, ...this.conversations];
    }

    this.selectConversation(conversation);
  }

  selectConversation(conv: Conversation): void {
    this.selectedConversation = conv;
    this.selectedUserPresence = null;
    this.otherUserTyping = false;
    this.loadMessages(conv.userId);
    this.emitMessagesRead(conv.userId);
    this.requestPresence(conv.userId);
    this.conversations = this.conversations.map((c) =>
      c.userId === conv.userId ? { ...c, unreadCount: 0 } : c
    );
  }

  onInputChange(): void {
    this.emitTypingDebounced();
  }

  private emitTypingDebounced(): void {
    if (this.emitTypingTimeout) clearTimeout(this.emitTypingTimeout);
    if (!this.selectedConversation || !this.socket?.connected) return;
    this.socket.emit('typing', { receiverId: this.selectedConversation.userId });
    this.emitTypingTimeout = setTimeout(() => {
      this.emitTypingTimeout = null;
    }, 2500);
  }

  loadMessages(otherUserId: string): void {
    this.chatService.getHistory(otherUserId).subscribe({
      next: (messages) => {
        this.messages = messages;
        setTimeout(() => this.scrollToBottom(), 100);
      },
      error: (error: unknown) => {
        this.toast.error('Error', 'Failed to load messages');
        console.error('Error loading messages:', error);
      },
    });
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || !this.selectedConversation || !this.currentUserId) return;

    const content = this.newMessage.trim();
    const receiverId = this.selectedConversation.userId;
    this.newMessage = '';

    const optimistic: ChatMessage = {
      id: `temp-${Date.now()}`,
      senderId: this.currentUserId,
      receiverId,
      content,
      read: false,
      sentAt: new Date().toISOString(),
    };

    this.messages = [...this.messages, optimistic];
    setTimeout(() => this.scrollToBottom(), 100);

    if (this.socket && this.socketConnected) {
      this.socket.emit(
        'send_message',
        { receiverId, content },
        (response: unknown) => {
          if (response && typeof response === 'object' && 'error' in response) {
            this.toast.error('Error', 'Failed to send message');
            console.error('Error sending message:', response);
          }
        },
      );
    }

    this.loadConversations();
  }

  closeMessages(): void {
    this.selectedConversation = null;
    this.selectedUserPresence = null;
    this.messages = [];
  }

  openReportModal(): void {
    if (!this.selectedConversation) return;
    this.showReportModal = true;
  }

  closeReportModal(): void {
    this.showReportModal = false;
  }

  getReportModalData(): ReportModalData | null {
    if (!this.selectedConversation) return null;
    return {
      reportedUserId: this.selectedConversation.userId,
      reportedUserName: this.selectedConversation.userName,
    };
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  }

  /** Presence label: "Online" or "Last seen X ago" */
  getPresenceLabel(): string {
    const conv = this.selectedConversation;
    if (!conv) return '';

    const p = this.selectedUserPresence;
    if (p?.online) return 'Online';
    if (p?.lastSeenAt) return `Last seen ${this.formatLastSeenAgo(p.lastSeenAt)}`;
    return 'Offline';
  }

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

  formatMessageTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  scrollToBottom(): void {
    if (this.messagesContainer) {
      this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
    }
  }
}
