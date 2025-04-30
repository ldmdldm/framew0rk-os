import { Server, Socket } from 'socket.io';
import { MetaGPTService } from './metagptService';
import { logger } from '../utils/logger';

interface TeamRoom {
  projectId: string;
  members: Set<string>;
  activeSessions: Map<string, Socket>;
}

export class WebSocketService {
  private static instance: WebSocketService;
  private io: Server;
  private metagptService: MetaGPTService;
  private teamRooms: Map<string, TeamRoom>;

  private constructor(io: Server) {
    this.io = io;
    this.metagptService = MetaGPTService.getInstance();
    this.teamRooms = new Map();
    this.setupWebSocketHandlers();
  }

  static getInstance(io?: Server): WebSocketService {
    if (!WebSocketService.instance && io) {
      WebSocketService.instance = new WebSocketService(io);
    }
    return WebSocketService.instance;
  }

  private setupWebSocketHandlers() {
    this.io.on('connection', (socket: Socket) => {
      logger.info(`New socket connection: ${socket.id}`);

      socket.on('join_team', async (data: { projectId: string, wallet: string }) => {
        try {
          await this.handleJoinTeam(socket, data);
        } catch (error) {
          logger.error('Error handling join team:', error);
          socket.emit('error', { message: 'Failed to join team' });
        }
      });

      socket.on('team_request', async (data: { projectId: string, message: string }) => {
        try {
          await this.handleTeamRequest(socket, data);
        } catch (error) {
          logger.error('Error handling team request:', error);
          socket.emit('error', { message: 'Failed to process team request' });
        }
      });

      socket.on('role_action', async (data: { projectId: string, role: string, action: string, payload: any }) => {
        try {
          await this.handleRoleAction(socket, data);
        } catch (error) {
          logger.error('Error handling role action:', error);
          socket.emit('error', { message: 'Failed to process role action' });
        }
      });

      socket.on('leave_team', (projectId: string) => {
        this.handleLeaveTeam(socket, projectId);
      });

      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  private async handleJoinTeam(socket: Socket, data: { projectId: string, wallet: string }) {
    const { projectId, wallet } = data;
    
    // Initialize team room if it doesn't exist
    if (!this.teamRooms.has(projectId)) {
      this.teamRooms.set(projectId, {
        projectId,
        members: new Set(),
        activeSessions: new Map()
      });
    }

    const room = this.teamRooms.get(projectId)!;
    room.members.add(wallet);
    room.activeSessions.set(wallet, socket);

    // Join socket.io room
    socket.join(projectId);

    // Get team status
    const status = await this.metagptService.getTeamStatus(projectId);

    // Notify room members
    this.io.to(projectId).emit('member_joined', {
      wallet,
      memberCount: room.members.size,
      status
    });
  }

  private async handleTeamRequest(socket: Socket, data: { projectId: string, message: string }) {
    const { projectId, message } = data;
    const room = this.teamRooms.get(projectId);

    if (!room) {
      socket.emit('error', { message: 'Team room not found' });
      return;
    }

    // Process the request through MetaGPT
    const response = await this.metagptService.processTeamRequest(projectId, message);

    // Broadcast response to all team members
    this.io.to(projectId).emit('team_response', {
      response,
      timestamp: new Date()
    });

    // Update team status
    const status = await this.metagptService.getTeamStatus(projectId);
    this.io.to(projectId).emit('team_status_update', status);
  }

  private async handleRoleAction(socket: Socket, data: { projectId: string, role: string, action: string, payload: any }) {
    const { projectId, role, action, payload } = data;
    const room = this.teamRooms.get(projectId);

    if (!room) {
      socket.emit('error', { message: 'Team room not found' });
      return;
    }

    // Execute role-specific action
    const actionResponse = await this.metagptService.executeAction(action, JSON.stringify(payload), {
      projectId,
      role
    });

    // Broadcast action result to team
    this.io.to(projectId).emit('role_action_complete', {
      role,
      action,
      result: actionResponse,
      timestamp: new Date()
    });
  }

  private handleLeaveTeam(socket: Socket, projectId: string) {
    const room = this.teamRooms.get(projectId);
    if (!room) return;

    // Find and remove member
    for (const [wallet, sess] of room.activeSessions.entries()) {
      if (sess.id === socket.id) {
        room.members.delete(wallet);
        room.activeSessions.delete(wallet);
        break;
      }
    }

    // Leave socket.io room
    socket.leave(projectId);

    // Notify remaining members
    this.io.to(projectId).emit('member_left', {
      memberCount: room.members.size
    });

    // Clean up empty rooms
    if (room.members.size === 0) {
      this.teamRooms.delete(projectId);
    }
  }

  private handleDisconnect(socket: Socket) {
    // Clean up all rooms this socket was part of
    this.teamRooms.forEach((room, projectId) => {
      for (const [wallet, sess] of room.activeSessions.entries()) {
        if (sess.id === socket.id) {
          this.handleLeaveTeam(socket, projectId);
          break;
        }
      }
    });
  }

  // Public methods for external interaction
  broadcastToTeam(projectId: string, event: string, data: any) {
    this.io.to(projectId).emit(event, data);
  }

  getTeamMembers(projectId: string): Set<string> | undefined {
    return this.teamRooms.get(projectId)?.members;
  }

  getActiveTeams(): string[] {
    return Array.from(this.teamRooms.keys());
  }
}