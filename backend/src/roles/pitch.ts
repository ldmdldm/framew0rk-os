import { BaseRole, RoleConfig } from './base';
import { logger } from '../utils/logger';

export class PitchAgent extends BaseRole {
  private personality: {
    tone: 'persuasive' | 'analytical' | 'visionary';
    style: 'formal' | 'casual' | 'technical';
    focus: 'market' | 'technology' | 'team';
  };

  constructor(config: RoleConfig, web3: any) {
    super(config, web3);
    this.personality = {
      tone: 'persuasive',
      style: 'formal',
      focus: 'market'
    };
  }

  async processMessage(message: string, userWallet: string): Promise<any> {
    try {
      this.addToMemory('user', message);
      
      // Analyze the message and adapt personality
      this.adaptPersonality(message);
      
      // Generate pitch response
      const response = await this.generatePitchResponse(message);
      
      this.addToMemory('agent', response);
      
      return {
        role: this.name,
        response: response,
        wallet: userWallet,
        action: 'GeneratePitch'
      };
    } catch (error) {
      logger.error('Error processing pitch message:', error);
      throw error;
    }
  }

  private adaptPersonality(message: string) {
    // Analyze message content and adjust personality
    if (message.toLowerCase().includes('tech') || message.toLowerCase().includes('code')) {
      this.personality.focus = 'technology';
      this.personality.style = 'technical';
    } else if (message.toLowerCase().includes('team') || message.toLowerCase().includes('people')) {
      this.personality.focus = 'team';
      this.personality.style = 'casual';
    }
  }

  private async generatePitchResponse(message: string): Promise<string> {
    const sections = [
      this.generateExecutiveSummary(message),
      this.generateProblemStatement(),
      this.generateSolution(),
      this.generateMarketAnalysis(),
      this.generateTeamOverview(),
      this.generateAsk()
    ];

    return sections.join('\n\n');
  }

  private generateExecutiveSummary(message: string): string {
    return `[Pitch Agent] Executive Summary:\n\n` +
           `Based on your input "${message}", I've crafted a compelling pitch that highlights:\n` +
           `- Clear value proposition\n` +
           `- Market opportunity\n` +
           `- Unique differentiators\n` +
           `- Strong team capabilities`;
  }

  private generateProblemStatement(): string {
    return `Problem Statement:\n\n` +
           `In today's rapidly evolving market, businesses face:\n` +
           `- Increasing competition\n` +
           `- Changing customer expectations\n` +
           `- Technological disruption\n` +
           `- Resource constraints`;
  }

  private generateSolution(): string {
    return `Our Solution:\n\n` +
           `We propose an innovative approach that:\n` +
           `- Leverages cutting-edge technology\n` +
           `- Addresses market pain points\n` +
           `- Creates sustainable competitive advantage\n` +
           `- Delivers measurable ROI`;
  }

  private generateMarketAnalysis(): string {
    return `Market Analysis:\n\n` +
           `Market Size: $XX billion\n` +
           `Growth Rate: XX% CAGR\n` +
           `Key Trends:\n` +
           `- Digital transformation\n` +
           `- AI/ML adoption\n` +
           `- Blockchain integration\n` +
           `- Remote work solutions`;
  }

  private generateTeamOverview(): string {
    return `Team Overview:\n\n` +
           `Our team brings together:\n` +
           `- Industry veterans\n` +
           `- Technical experts\n` +
           `- Business strategists\n` +
           `- Market specialists`;
  }

  private generateAsk(): string {
    return `Investment Ask:\n\n` +
           `We are seeking:\n` +
           `- $XX million in funding\n` +
           `- Strategic partnerships\n` +
           `- Market access\n` +
           `- Technical expertise`;
  }
} 