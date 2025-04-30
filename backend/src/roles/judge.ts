import { BaseRole, RoleConfig } from './base';
import { logger } from '../utils/logger';

export class ProjectEvaluator extends BaseRole {
  private evaluationCriteria: {
    technical: {
      score: number;
      aspects: {
        architecture: number;
        scalability: number;
        security: number;
        innovation: number;
      };
    };
    market: {
      score: number;
      aspects: {
        size: number;
        growth: number;
        competition: number;
        timing: number;
      };
    };
    team: {
      score: number;
      aspects: {
        experience: number;
        expertise: number;
        cohesion: number;
        leadership: number;
      };
    };
    business: {
      score: number;
      aspects: {
        model: number;
        monetization: number;
        defensibility: number;
        scalability: number;
      };
    };
  };

  private industryBenchmarks: {
    [key: string]: {
      technical: number;
      market: number;
      team: number;
      business: number;
    };
  };

  constructor(config: RoleConfig, web3: any) {
    super(config, web3);
    this.evaluationCriteria = {
      technical: {
        score: 0,
        aspects: {
          architecture: 0,
          scalability: 0,
          security: 0,
          innovation: 0
        }
      },
      market: {
        score: 0,
        aspects: {
          size: 0,
          growth: 0,
          competition: 0,
          timing: 0
        }
      },
      team: {
        score: 0,
        aspects: {
          experience: 0,
          expertise: 0,
          cohesion: 0,
          leadership: 0
        }
      },
      business: {
        score: 0,
        aspects: {
          model: 0,
          monetization: 0,
          defensibility: 0,
          scalability: 0
        }
      }
    };

    this.industryBenchmarks = {
      'Web3': {
        technical: 8.5,
        market: 7.5,
        team: 8.0,
        business: 7.0
      },
      'AI': {
        technical: 9.0,
        market: 8.5,
        team: 8.5,
        business: 7.5
      },
      'FinTech': {
        technical: 8.0,
        market: 8.0,
        team: 8.0,
        business: 8.0
      }
    };
  }

  async processMessage(message: string, userWallet: string): Promise<any> {
    try {
      this.addToMemory('user', message);
      
      // Analyze the project and update evaluation criteria
      await this.analyzeProject(message);
      
      // Generate evaluation response
      const response = await this.generateEvaluationResponse(message);
      
      this.addToMemory('agent', response);
      
      return {
        role: this.name,
        response: response,
        wallet: userWallet,
        action: 'ProjectEvaluation'
      };
    } catch (error) {
      logger.error('Error processing evaluation message:', error);
      throw error;
    }
  }

  private async analyzeProject(message: string) {
    const industry = this.detectIndustry(message);
    const benchmarks = this.industryBenchmarks[industry] || this.industryBenchmarks['Web3'];

    // Technical Analysis
    this.evaluationCriteria.technical.aspects = {
      architecture: this.evaluateArchitecture(message),
      scalability: this.evaluateScalability(message),
      security: this.evaluateSecurity(message),
      innovation: this.evaluateTechnicalInnovation(message)
    };
    this.evaluationCriteria.technical.score = this.calculateAverage(this.evaluationCriteria.technical.aspects);

    // Market Analysis
    this.evaluationCriteria.market.aspects = {
      size: this.evaluateMarketSize(message),
      growth: this.evaluateMarketGrowth(message),
      competition: this.evaluateCompetition(message),
      timing: this.evaluateMarketTiming(message)
    };
    this.evaluationCriteria.market.score = this.calculateAverage(this.evaluationCriteria.market.aspects);

    // Team Analysis
    this.evaluationCriteria.team.aspects = {
      experience: this.evaluateTeamExperience(message),
      expertise: this.evaluateTeamExpertise(message),
      cohesion: this.evaluateTeamCohesion(message),
      leadership: this.evaluateTeamLeadership(message)
    };
    this.evaluationCriteria.team.score = this.calculateAverage(this.evaluationCriteria.team.aspects);

    // Business Analysis
    this.evaluationCriteria.business.aspects = {
      model: this.evaluateBusinessModel(message),
      monetization: this.evaluateMonetization(message),
      defensibility: this.evaluateDefensibility(message),
      scalability: this.evaluateBusinessScalability(message)
    };
    this.evaluationCriteria.business.score = this.calculateAverage(this.evaluationCriteria.business.aspects);
  }

  private calculateAverage(aspects: { [key: string]: number }): number {
    const values = Object.values(aspects);
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private evaluateArchitecture(message: string): number {
    const keywords = ['microservices', 'serverless', 'distributed', 'scalable', 'resilient'];
    const matches = keywords.filter(k => message.toLowerCase().includes(k.toLowerCase())).length;
    return Math.min(10, matches * 2);
  }

  private evaluateScalability(message: string): number {
    const keywords = ['horizontal', 'vertical', 'load balancing', 'caching', 'CDN'];
    const matches = keywords.filter(k => message.toLowerCase().includes(k.toLowerCase())).length;
    return Math.min(10, matches * 2);
  }

  private evaluateSecurity(message: string): number {
    const keywords = ['encryption', 'authentication', 'authorization', 'compliance', 'audit'];
    const matches = keywords.filter(k => message.toLowerCase().includes(k.toLowerCase())).length;
    return Math.min(10, matches * 2);
  }

  private evaluateTechnicalInnovation(message: string): number {
    const keywords = ['novel', 'innovative', 'unique', 'patent', 'proprietary'];
    const matches = keywords.filter(k => message.toLowerCase().includes(k.toLowerCase())).length;
    return Math.min(10, matches * 2);
  }

  private evaluateMarketSize(message: string): number {
    const keywords = ['TAM', 'market size', 'billion', 'million', 'users'];
    const matches = keywords.filter(k => message.toLowerCase().includes(k.toLowerCase())).length;
    return Math.min(10, matches * 2);
  }

  private evaluateMarketGrowth(message: string): number {
    const keywords = ['growth', 'CAGR', 'expanding', 'increasing', 'trend'];
    const matches = keywords.filter(k => message.toLowerCase().includes(k.toLowerCase())).length;
    return Math.min(10, matches * 2);
  }

  private evaluateCompetition(message: string): number {
    const keywords = ['competition', 'competitors', 'market share', 'differentiation', 'moat'];
    const matches = keywords.filter(k => message.toLowerCase().includes(k.toLowerCase())).length;
    return Math.min(10, matches * 2);
  }

  private evaluateMarketTiming(message: string): number {
    const keywords = ['timing', 'trend', 'adoption', 'maturity', 'cycle'];
    const matches = keywords.filter(k => message.toLowerCase().includes(k.toLowerCase())).length;
    return Math.min(10, matches * 2);
  }

  private evaluateTeamExperience(message: string): number {
    const keywords = ['experience', 'background', 'track record', 'success', 'achievement'];
    const matches = keywords.filter(k => message.toLowerCase().includes(k.toLowerCase())).length;
    return Math.min(10, matches * 2);
  }

  private evaluateTeamExpertise(message: string): number {
    const keywords = ['expertise', 'skills', 'knowledge', 'proficiency', 'capability'];
    const matches = keywords.filter(k => message.toLowerCase().includes(k.toLowerCase())).length;
    return Math.min(10, matches * 2);
  }

  private evaluateTeamCohesion(message: string): number {
    const keywords = ['team', 'collaboration', 'culture', 'values', 'alignment'];
    const matches = keywords.filter(k => message.toLowerCase().includes(k.toLowerCase())).length;
    return Math.min(10, matches * 2);
  }

  private evaluateTeamLeadership(message: string): number {
    const keywords = ['leadership', 'vision', 'strategy', 'direction', 'management'];
    const matches = keywords.filter(k => message.toLowerCase().includes(k.toLowerCase())).length;
    return Math.min(10, matches * 2);
  }

  private evaluateBusinessModel(message: string): number {
    const keywords = ['revenue', 'pricing', 'subscription', 'freemium', 'monetization'];
    const matches = keywords.filter(k => message.toLowerCase().includes(k.toLowerCase())).length;
    return Math.min(10, matches * 2);
  }

  private evaluateMonetization(message: string): number {
    const keywords = ['revenue', 'profit', 'margin', 'ROI', 'LTV'];
    const matches = keywords.filter(k => message.toLowerCase().includes(k.toLowerCase())).length;
    return Math.min(10, matches * 2);
  }

  private evaluateDefensibility(message: string): number {
    const keywords = ['moat', 'barrier', 'competitive', 'advantage', 'unique'];
    const matches = keywords.filter(k => message.toLowerCase().includes(k.toLowerCase())).length;
    return Math.min(10, matches * 2);
  }

  private evaluateBusinessScalability(message: string): number {
    const keywords = ['scale', 'growth', 'expansion', 'efficiency', 'automation'];
    const matches = keywords.filter(k => message.toLowerCase().includes(k.toLowerCase())).length;
    return Math.min(10, matches * 2);
  }

  private async generateEvaluationResponse(message: string): Promise<string> {
    const industry = this.detectIndustry(message);
    const benchmarks = this.industryBenchmarks[industry] || this.industryBenchmarks['Web3'];
    const totalScore = (this.evaluationCriteria.technical.score + 
                       this.evaluationCriteria.market.score + 
                       this.evaluationCriteria.team.score + 
                       this.evaluationCriteria.business.score) / 4;

    return `[Project Evaluator] Detailed Analysis:\n\n` +
           `Project: ${message}\n` +
           `Industry: ${industry}\n\n` +
           `Technical Evaluation (${this.evaluationCriteria.technical.score.toFixed(1)}/10):\n` +
           `- Architecture: ${this.evaluationCriteria.technical.aspects.architecture}/10\n` +
           `  * System design and structure\n` +
           `  * Technology stack selection\n` +
           `  * Integration capabilities\n\n` +
           `- Scalability: ${this.evaluationCriteria.technical.aspects.scalability}/10\n` +
           `  * Performance under load\n` +
           `  * Resource optimization\n` +
           `  * Growth potential\n\n` +
           `- Security: ${this.evaluationCriteria.technical.aspects.security}/10\n` +
           `  * Data protection\n` +
           `  * Access control\n` +
           `  * Compliance measures\n\n` +
           `- Innovation: ${this.evaluationCriteria.technical.aspects.innovation}/10\n` +
           `  * Technical novelty\n` +
           `  * Competitive advantage\n` +
           `  * Future-proofing\n\n` +
           `Market Evaluation (${this.evaluationCriteria.market.score.toFixed(1)}/10):\n` +
           `- Market Size: ${this.evaluationCriteria.market.aspects.size}/10\n` +
           `  * Total addressable market\n` +
           `  * Serviceable market\n` +
           `  * Market penetration potential\n\n` +
           `- Growth Potential: ${this.evaluationCriteria.market.aspects.growth}/10\n` +
           `  * Market trends\n` +
           `  * Growth rate\n` +
           `  * Expansion opportunities\n\n` +
           `- Competition: ${this.evaluationCriteria.market.aspects.competition}/10\n` +
           `  * Competitive landscape\n` +
           `  * Market positioning\n` +
           `  * Differentiation\n\n` +
           `- Timing: ${this.evaluationCriteria.market.aspects.timing}/10\n` +
           `  * Market readiness\n` +
           `  * Adoption curve\n` +
           `  * Window of opportunity\n\n` +
           `Team Evaluation (${this.evaluationCriteria.team.score.toFixed(1)}/10):\n` +
           `- Experience: ${this.evaluationCriteria.team.aspects.experience}/10\n` +
           `  * Industry background\n` +
           `  * Track record\n` +
           `  * Domain expertise\n\n` +
           `- Expertise: ${this.evaluationCriteria.team.aspects.expertise}/10\n` +
           `  * Technical skills\n` +
           `  * Business acumen\n` +
           `  * Industry knowledge\n\n` +
           `- Cohesion: ${this.evaluationCriteria.team.aspects.cohesion}/10\n` +
           `  * Team dynamics\n` +
           `  * Culture fit\n` +
           `  * Collaboration\n\n` +
           `- Leadership: ${this.evaluationCriteria.team.aspects.leadership}/10\n` +
           `  * Vision and strategy\n` +
           `  * Decision-making\n` +
           `  * Execution capability\n\n` +
           `Business Evaluation (${this.evaluationCriteria.business.score.toFixed(1)}/10):\n` +
           `- Business Model: ${this.evaluationCriteria.business.aspects.model}/10\n` +
           `  * Revenue streams\n` +
           `  * Cost structure\n` +
           `  * Value proposition\n\n` +
           `- Monetization: ${this.evaluationCriteria.business.aspects.monetization}/10\n` +
           `  * Pricing strategy\n` +
           `  * Revenue potential\n` +
           `  * Profit margins\n\n` +
           `- Defensibility: ${this.evaluationCriteria.business.aspects.defensibility}/10\n` +
           `  * Competitive moat\n` +
           `  * Barriers to entry\n` +
           `  * IP protection\n\n` +
           `- Scalability: ${this.evaluationCriteria.business.aspects.scalability}/10\n` +
           `  * Growth potential\n` +
           `  * Operational efficiency\n` +
           `  * Market expansion\n\n` +
           `Overall Score: ${totalScore.toFixed(1)}/10\n\n` +
           `Industry Benchmarks:\n` +
           `- Technical: ${benchmarks.technical}/10\n` +
           `- Market: ${benchmarks.market}/10\n` +
           `- Team: ${benchmarks.team}/10\n` +
           `- Business: ${benchmarks.business}/10\n\n` +
           `Recommendations:\n` +
           this.generateRecommendations();
  }

  private generateRecommendations(): string {
    const recommendations = [];
    
    // Technical recommendations
    if (this.evaluationCriteria.technical.score < 8) {
      recommendations.push('- Strengthen technical architecture and implementation plan');
      if (this.evaluationCriteria.technical.aspects.scalability < 8) {
        recommendations.push('  * Implement scalable architecture patterns');
        recommendations.push('  * Add performance monitoring and optimization');
      }
      if (this.evaluationCriteria.technical.aspects.security < 8) {
        recommendations.push('  * Enhance security measures and compliance');
        recommendations.push('  * Implement comprehensive testing');
      }
    }

    // Market recommendations
    if (this.evaluationCriteria.market.score < 8) {
      recommendations.push('- Conduct deeper market research and validation');
      if (this.evaluationCriteria.market.aspects.competition < 8) {
        recommendations.push('  * Strengthen competitive differentiation');
        recommendations.push('  * Develop unique value proposition');
      }
      if (this.evaluationCriteria.market.aspects.timing < 8) {
        recommendations.push('  * Reassess market entry timing');
        recommendations.push('  * Consider phased rollout strategy');
      }
    }

    // Team recommendations
    if (this.evaluationCriteria.team.score < 8) {
      recommendations.push('- Build or strengthen team with relevant expertise');
      if (this.evaluationCriteria.team.aspects.expertise < 8) {
        recommendations.push('  * Add technical specialists');
        recommendations.push('  * Enhance business development capabilities');
      }
      if (this.evaluationCriteria.team.aspects.leadership < 8) {
        recommendations.push('  * Strengthen leadership team');
        recommendations.push('  * Develop clear vision and strategy');
      }
    }

    // Business recommendations
    if (this.evaluationCriteria.business.score < 8) {
      recommendations.push('- Enhance business model and strategy');
      if (this.evaluationCriteria.business.aspects.monetization < 8) {
        recommendations.push('  * Refine pricing strategy');
        recommendations.push('  * Develop additional revenue streams');
      }
      if (this.evaluationCriteria.business.aspects.defensibility < 8) {
        recommendations.push('  * Build stronger competitive moat');
        recommendations.push('  * Develop proprietary technology');
      }
    }

    return recommendations.join('\n');
  }

  private detectIndustry(message: string): string {
    const messageLower = message.toLowerCase();
    if (messageLower.includes('web3') || messageLower.includes('blockchain')) {
      return 'Web3';
    } else if (messageLower.includes('ai') || messageLower.includes('machine learning')) {
      return 'AI';
    } else if (messageLower.includes('fintech') || messageLower.includes('financial')) {
      return 'FinTech';
    }
    return 'Web3'; // Default to Web3 if no specific industry detected
  }
} 