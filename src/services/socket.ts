import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.VITE_SOCKET_URL || 'http://localhost:3000';

export interface TeamMember {
  wallet: string;
  role: string;
}

export class SocketService {
  private static instance: SocketService;
  private socket: Socket | null = null;
  private messageHandlers: Map<string, (data: any) => void> = new Map();

  private constructor() {}

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  connect(token: string | null): void {
    if (!token) {
      throw new Error('Authentication token required');
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket']
    });

    this.setupEventHandlers();
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinAgentRoom(role: string): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    this.socket.emit('join_team', {
      projectId: 'default', // You might want to make this dynamic
      role
    });
  }

  onTeamMessage(handler: (data: any) => void): void {
    this.messageHandlers.set('team_message', handler);
  }

  onRoleAction(handler: (data: any) => void): void {
    this.messageHandlers.set('role_action_complete', handler);
  }

  onError(handler: (error: Error) => void): void {
    this.messageHandlers.set('error', handler);
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('member_joined', (data: { wallet: string; memberCount: number }) => {
      console.log('Member joined:', data);
    });

    this.socket.on('team_message', (data: any) => {
      const handler = this.messageHandlers.get('team_message');
      if (handler) handler(data);
    });

    this.socket.on('role_action_complete', (data: any) => {
      const handler = this.messageHandlers.get('role_action_complete');
      if (handler) handler(data);
    });

    this.socket.on('error', (error: any) => {
      const handler = this.messageHandlers.get('error');
      if (handler) handler(new Error(error.message));
    });
  }
}