import { BaseRole, RoleConfig } from './base';
import { logger } from '../utils/logger';

export class TeamCoach extends BaseRole {
  private coachingAreas: {
    leadership: {
      skills: string[];
      assessment: number;
      recommendations: string[];
    };
    communication: {
      skills: string[];
      assessment: number;
      recommendations: string[];
    };
    collaboration: {
      skills: string[];
      assessment: number;
      recommendations: string[];
    };
    productivity: {
      skills: string[];
      assessment: number;
      recommendations: string[];
    };
  };

  private teamMetrics: {
    velocity: number;
    quality: number;
    collaboration: number;
    satisfaction: number;
  };

  constructor(config: RoleConfig, web3: any) {
    super(config, web3);
    this.coachingAreas = {
      leadership: {
        skills: [
          'Vision Setting',
          'Decision Making',
          'Conflict Resolution',
          'Team Motivation',
          'Strategic Planning'
        ],
        assessment: 0,
        recommendations: []
      },
      communication: {
        skills: [
          'Active Listening',
          'Clear Expression',
          'Feedback Delivery',
          'Meeting Facilitation',
          'Documentation'
        ],
        assessment: 0,
        recommendations: []
      },
      collaboration: {
        skills: [
          'Team Building',
          'Cross-functional Work',
          'Knowledge Sharing',
          'Conflict Management',
          'Trust Building'
        ],
        assessment: 0,
        recommendations: []
      },
      productivity: {
        skills: [
          'Time Management',
          'Task Prioritization',
          'Goal Setting',
          'Process Optimization',
          'Resource Allocation'
        ],
        assessment: 0,
        recommendations: []
      }
    };

    this.teamMetrics = {
      velocity: 0,
      quality: 0,
      collaboration: 0,
      satisfaction: 0
    };
  }

  async processMessage(message: string, userWallet: string): Promise<any> {
    try {
      this.addToMemory('user', message);
      
      // Analyze team needs and generate coaching response
      const response = await this.generateCoachingResponse(message);
      
      this.addToMemory('agent', response);
      
      return {
        role: this.name,
        response: response,
        wallet: userWallet,
        action: 'TeamCoaching'
      };
    } catch (error) {
      logger.error('Error processing coaching message:', error);
      throw error;
    }
  }

  private async generateCoachingResponse(message: string): Promise<string> {
    // Analyze team needs from message
    this.analyzeTeamNeeds(message);
    
    // Generate coaching plan
    const coachingPlan = this.generateCoachingPlan();
    
    // Generate team metrics
    const metrics = this.generateTeamMetrics();
    
    return `[Team Coach] Team Development Analysis:\n\n` +
           `Team Assessment:\n` +
           this.formatAssessment() + '\n\n' +
           `Coaching Plan:\n` +
           coachingPlan + '\n\n' +
           `Team Metrics:\n` +
           metrics + '\n\n' +
           `Action Items:\n` +
           this.generateActionItems();
  }

  private analyzeTeamNeeds(message: string) {
    const messageLower = message.toLowerCase();
    
    // Analyze leadership needs
    if (messageLower.includes('lead') || messageLower.includes('manage')) {
      this.coachingAreas.leadership.assessment = this.calculateAssessment(message, 'leadership');
    }
    
    // Analyze communication needs
    if (messageLower.includes('communicate') || messageLower.includes('talk')) {
      this.coachingAreas.communication.assessment = this.calculateAssessment(message, 'communication');
    }
    
    // Analyze collaboration needs
    if (messageLower.includes('collaborate') || messageLower.includes('work together')) {
      this.coachingAreas.collaboration.assessment = this.calculateAssessment(message, 'collaboration');
    }
    
    // Analyze productivity needs
    if (messageLower.includes('productive') || messageLower.includes('efficient')) {
      this.coachingAreas.productivity.assessment = this.calculateAssessment(message, 'productivity');
    }
  }

  private calculateAssessment(message: string, area: keyof typeof this.coachingAreas): number {
    const keywords = {
      leadership: ['vision', 'lead', 'manage', 'decide', 'motivate'],
      communication: ['communicate', 'listen', 'speak', 'meeting', 'document'],
      collaboration: ['team', 'work together', 'share', 'trust', 'conflict'],
      productivity: ['efficient', 'productive', 'time', 'task', 'goal']
    };

    const matches = keywords[area].filter(k => 
      message.toLowerCase().includes(k.toLowerCase())
    ).length;

    return Math.min(10, matches * 2);
  }

  private formatAssessment(): string {
    return Object.entries(this.coachingAreas)
      .map(([area, data]) => 
        `${area.charAt(0).toUpperCase() + area.slice(1)} (${data.assessment}/10):\n` +
        `Skills:\n` +
        data.skills.map(skill => `- ${skill}`).join('\n') + '\n' +
        `Recommendations:\n` +
        data.recommendations.map(rec => `- ${rec}`).join('\n')
      )
      .join('\n\n');
  }

  private generateCoachingPlan(): string {
    return Object.entries(this.coachingAreas)
      .map(([area, data]) => {
        if (data.assessment < 7) {
          return `${area.charAt(0).toUpperCase() + area.slice(1)} Development:\n` +
                 `- Focus on ${data.skills.slice(0, 2).join(' and ')}\n` +
                 `- Implement regular ${area} workshops\n` +
                 `- Set measurable improvement goals\n` +
                 `- Schedule one-on-one coaching sessions`;
        }
        return '';
      })
      .filter(plan => plan !== '')
      .join('\n\n');
  }

  private generateTeamMetrics(): string {
    return `Velocity: ${this.teamMetrics.velocity}/10\n` +
           `Quality: ${this.teamMetrics.quality}/10\n` +
           `Collaboration: ${this.teamMetrics.collaboration}/10\n` +
           `Satisfaction: ${this.teamMetrics.satisfaction}/10\n\n` +
           `Trend Analysis:\n` +
           `- Team performance is ${this.getPerformanceTrend()}\n` +
           `- Collaboration levels are ${this.getCollaborationTrend()}\n` +
           `- Overall team health is ${this.getTeamHealth()}`;
  }

  private getPerformanceTrend(): string {
    const avg = (this.teamMetrics.velocity + this.teamMetrics.quality) / 2;
    return avg >= 8 ? 'excellent' : avg >= 6 ? 'good' : 'needs improvement';
  }

  private getCollaborationTrend(): string {
    return this.teamMetrics.collaboration >= 8 ? 'strong' : 
           this.teamMetrics.collaboration >= 6 ? 'moderate' : 'weak';
  }

  private getTeamHealth(): string {
    const avg = (this.teamMetrics.velocity + this.teamMetrics.quality + 
                this.teamMetrics.collaboration + this.teamMetrics.satisfaction) / 4;
    return avg >= 8 ? 'excellent' : avg >= 6 ? 'good' : 'needs attention';
  }

  private generateActionItems(): string {
    const actions = [];
    
    // Leadership actions
    if (this.coachingAreas.leadership.assessment < 7) {
      actions.push(
        '- Schedule leadership training workshops',
        '- Implement regular one-on-one meetings',
        '- Develop clear team vision and goals',
        '- Establish decision-making frameworks'
      );
    }
    
    // Communication actions
    if (this.coachingAreas.communication.assessment < 7) {
      actions.push(
        '- Implement structured communication channels',
        '- Schedule regular team sync meetings',
        '- Create documentation templates',
        '- Establish feedback mechanisms'
      );
    }
    
    // Collaboration actions
    if (this.coachingAreas.collaboration.assessment < 7) {
      actions.push(
        '- Organize team-building activities',
        '- Implement pair programming sessions',
        '- Create knowledge sharing sessions',
        '- Establish cross-functional teams'
      );
    }
    
    // Productivity actions
    if (this.coachingAreas.productivity.assessment < 7) {
      actions.push(
        '- Implement agile methodologies',
        '- Set up project management tools',
        '- Create performance metrics',
        '- Establish regular retrospectives'
      );
    }
    
    return actions.join('\n');
  }
} 