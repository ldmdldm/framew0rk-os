import { ethers } from 'ethers';
import { Agent } from '../models/agent';
import { Role } from '../models/role';
import { logger } from '../utils/logger';

export class FrameworkEnvironment {
  private web3: ethers.providers.Web3Provider;
  private contractAddress: string;
  private registeredRoles: Map<string, Role>;
  private agents: Map<string, Agent>;

  constructor(web3: ethers.providers.Web3Provider, contractAddress: string) {
    this.web3 = web3;
    this.contractAddress = contractAddress;
    this.registeredRoles = new Map();
    this.agents = new Map();
  }

  async initializeRoles() {
    try {
      // Initialize core roles from MetaGPT
      const roles = [
        {
          name: 'ProductManager',
          profile: 'Product Manager with expertise in software development lifecycle',
          goal: 'Define product requirements and manage development process',
          wallet: '0xProductManager'
        },
        {
          name: 'Architect',
          profile: 'Software Architect with expertise in system design',
          goal: 'Design system architecture and technical specifications',
          wallet: '0xArchitect'
        },
        {
          name: 'ProjectManager',
          profile: 'Project Manager with expertise in agile methodologies',
          goal: 'Manage project timeline and resources',
          wallet: '0xProjectManager'
        },
        {
          name: 'Engineer',
          profile: 'Software Engineer with expertise in development',
          goal: 'Implement and test software solutions',
          wallet: '0xEngineer'
        }
      ];

      for (const roleData of roles) {
        const role = new Role(roleData);
        await role.save();
        this.registeredRoles.set(roleData.name, role);
      }

      logger.info('Roles initialized successfully');
    } catch (error) {
      logger.error('Error initializing roles:', error);
      throw error;
    }
  }

  async processRequest(roleName: string, message: string, userWallet: string): Promise<any> {
    try {
      if (!this.registeredRoles.has(roleName)) {
        throw new Error(`Role ${roleName} not found`);
      }

      // Verify user has permission to interact with the role
      if (!await this.verifyPermission(userWallet, roleName)) {
        throw new Error('User does not have permission to interact with this role');
      }

      const role = this.registeredRoles.get(roleName);
      if (!role) {
        throw new Error('Role not found');
      }

      // Process the request through the role
      const result = await role.processMessage(message, userWallet);

      // Record the interaction on blockchain
      await this.recordInteraction(userWallet, roleName, message);

      return result;
    } catch (error) {
      logger.error('Error processing request:', error);
      throw error;
    }
  }

  private async verifyPermission(userWallet: string, roleName: string): Promise<boolean> {
    try {
      // Implement blockchain-based permission verification
      // This would typically involve checking a smart contract
      return true; // Placeholder
    } catch (error) {
      logger.error('Error verifying permission:', error);
      return false;
    }
  }

  private async recordInteraction(userWallet: string, roleName: string, message: string): Promise<void> {
    try {
      // Implement blockchain transaction recording
      // This would typically involve calling a smart contract
    } catch (error) {
      logger.error('Error recording interaction:', error);
    }
  }

  getAvailableRoles(): Array<{ name: string; profile: string; goal: string; wallet: string }> {
    return Array.from(this.registeredRoles.values()).map(role => ({
      name: role.name,
      profile: role.profile,
      goal: role.goal,
      wallet: role.wallet
    }));
  }
} 