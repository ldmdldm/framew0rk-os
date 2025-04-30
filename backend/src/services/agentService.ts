import { ethers } from 'ethers';
import { logger } from '../utils/logger';
import { Agent } from '../models/agent';
import { Role } from '../models/role';

export interface AgentResponse {
  role: string;
  response: string;
  wallet: string;
  action: string;
}

export class AgentService {
  private static instance: AgentService;
  private provider: ethers.providers.Web3Provider | null = null;

  private constructor() {}

  static getInstance(): AgentService {
    if (!AgentService.instance) {
      AgentService.instance = new AgentService();
    }
    return AgentService.instance;
  }

  async processMessage(agentId: string, message: string, walletAddress: string): Promise<AgentResponse> {
    try {
      const agent = await Agent.findById(agentId);
      if (!agent) {
        throw new Error('Agent not found');
      }

      const role = await Role.findById(agent.roleId);
      if (!role) {
        throw new Error('Role not found');
      }

      // Add user message to memory
      agent.memory.push({
        type: 'user',
        content: message,
        timestamp: new Date()
      });

      // Process the message based on the agent's role and capabilities
      const response = await this.generateResponse(role, message, walletAddress);

      // Add agent response to memory
      agent.memory.push({
        type: 'agent',
        content: response,
        timestamp: new Date()
      });

      // Save updated memory
      await agent.save();

      return {
        role: role.name,
        response: response,
        wallet: walletAddress,
        action: 'message'
      };
    } catch (error) {
      logger.error('Error processing message:', error);
      throw error;
    }
  }

  private async generateResponse(role: any, message: string, walletAddress: string): Promise<string> {
    // This is where you would integrate with your AI/LLM service
    // For now, we'll return a simple response
    return `[${role.name}] Processing message from ${walletAddress}: ${message}`;
  }

  async verifyWalletOwnership(walletAddress: string, signature: string): Promise<boolean> {
    try {
      if (!this.provider) {
        this.provider = new ethers.providers.Web3Provider(window.ethereum as any);
      }

      const signer = this.provider.getSigner();
      const recoveredAddress = await ethers.utils.verifyMessage(
        'Verify wallet ownership',
        signature
      );

      return recoveredAddress.toLowerCase() === walletAddress.toLowerCase();
    } catch (error) {
      logger.error('Error verifying wallet ownership:', error);
      return false;
    }
  }
} 