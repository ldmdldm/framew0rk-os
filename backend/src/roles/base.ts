import { ethers } from 'ethers';
import { logger } from '../utils/logger';

export interface RoleConfig {
  name: string;
  profile: string;
  goal: string;
  wallet: string;
}

export abstract class BaseRole {
  protected name: string;
  protected profile: string;
  protected goal: string;
  protected wallet: string;
  protected memory: Array<{ type: string; content: string; timestamp: Date }>;
  protected web3: ethers.providers.Web3Provider;

  constructor(config: RoleConfig, web3: ethers.providers.Web3Provider) {
    this.name = config.name;
    this.profile = config.profile;
    this.goal = config.goal;
    this.wallet = config.wallet;
    this.memory = [];
    this.web3 = web3;
  }

  abstract processMessage(message: string, userWallet: string): Promise<any>;

  protected async verifySignature(signature: string, message: string, wallet: string): Promise<boolean> {
    try {
      const recoveredAddress = await ethers.utils.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === wallet.toLowerCase();
    } catch (error) {
      logger.error('Error verifying signature:', error);
      return false;
    }
  }

  protected addToMemory(type: string, content: string) {
    this.memory.push({
      type,
      content,
      timestamp: new Date()
    });
  }

  getMemory(): Array<{ type: string; content: string; timestamp: Date }> {
    return this.memory;
  }

  getName(): string {
    return this.name;
  }

  getProfile(): string {
    return this.profile;
  }

  getGoal(): string {
    return this.goal;
  }

  getWallet(): string {
    return this.wallet;
  }
}