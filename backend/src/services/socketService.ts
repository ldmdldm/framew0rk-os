import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import { AgentService } from './agentService';
import { Agent } from '../models/agent';

export const setupSocketHandlers = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    logger.info(`Client connected: ${socket.id}`);

    socket.on('join_agent_room', (agentId: string) => {
      socket.join(agentId);
      logger.info(`Client ${socket.id} joined agent room: ${agentId}`);
    });

    socket.on('agent_message', async (data: { agentId: string; message: string; walletAddress: string }) => {
      try {
        const { agentId, message, walletAddress } = data;
        const response = await AgentService.getInstance().processMessage(agentId, message, walletAddress);
        
        // Emit response to the specific agent room
        io.to(agentId).emit('agent_response', response);
        
        // Also emit to the specific client
        socket.emit('agent_response', response);
      } catch (error) {
        logger.error('Error processing agent message:', error);
        socket.emit('error', { message: 'Failed to process agent message' });
      }
    });

    socket.on('get_agent_memory', async (agentId: string) => {
      try {
        const agent = await Agent.findById(agentId);
        if (!agent) {
          socket.emit('error', { message: 'Agent not found' });
          return;
        }
        
        socket.emit('agent_memory', agent.memory || []);
      } catch (error) {
        logger.error('Error fetching agent memory:', error);
        socket.emit('error', { message: 'Failed to fetch agent memory' });
      }
    });

    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });
}; 