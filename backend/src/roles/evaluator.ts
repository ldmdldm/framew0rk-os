import { BaseRole, RoleConfig } from './base';
import { logger } from '../utils/logger';

type EvaluationCategory = 'technical' | 'business' | 'market' | 'team' | 'risk';
type TechnicalMetric = 'architecture' | 'scalability' | 'security' | 'maintainability' | 'performance';
type BusinessMetric = 'viability' | 'revenue' | 'cost' | 'timeline' | 'resources';
type MarketMetric = 'demand' | 'competition' | 'trends' | 'barriers' | 'opportunity';
type TeamMetric = 'expertise' | 'experience' | 'size' | 'dynamics' | 'leadership';
type RiskMetric = 'technical' | 'market' | 'operational' | 'financial' | 'regulatory';

interface EvaluationMetrics {
  score: number;
  weight: number;
  factors: string[];
  recommendations: string[];
}

interface EvaluationFramework {
  technical: Record<TechnicalMetric, EvaluationMetrics>;
  business: Record<BusinessMetric, EvaluationMetrics>;
  market: Record<MarketMetric, EvaluationMetrics>;
  team: Record<TeamMetric, EvaluationMetrics>;
  risk: Record<RiskMetric, EvaluationMetrics>;
}

export class ProjectEvaluator extends BaseRole {
  private evaluationFramework: EvaluationFramework;
  private evaluationHistory: Array<{
    project: string;
    timestamp: Date;
    scores: Record<EvaluationCategory, number>;
    summary: string;
  }>;

  constructor(config: RoleConfig, web3: any) {
    super(config, web3);
    
    this.evaluationFramework = {
      technical: {
        architecture: {
          score: 0,
          weight: 0.25,
          factors: ['System Design', 'Technology Stack', 'Integration', 'Modularity'],
          recommendations: []
        },
        scalability: {
          score: 0,
          weight: 0.2,
          factors: ['Horizontal Scaling', 'Vertical Scaling', 'Load Balancing', 'Caching'],
          recommendations: []
        },
        security: {
          score: 0,
          weight: 0.2,
          factors: ['Authentication', 'Authorization', 'Data Protection', 'Compliance'],
          recommendations: []
        },
        maintainability: {
          score: 0,
          weight: 0.2,
          factors: ['Code Quality', 'Documentation', 'Testing', 'DevOps'],
          recommendations: []
        },
        performance: {
          score: 0,
          weight: 0.15,
          factors: ['Response Time', 'Throughput', 'Resource Usage', 'Optimization'],
          recommendations: []
        }
      },
      business: {
        viability: {
          score: 0,
          weight: 0.3,
          factors: ['Market Need', 'Revenue Model', 'Cost Structure', 'Growth Potential'],
          recommendations: []
        },
        revenue: {
          score: 0,
          weight: 0.25,
          factors: ['Pricing Strategy', 'Revenue Streams', 'Customer LTV', 'Market Share'],
          recommendations: []
        },
        cost: {
          score: 0,
          weight: 0.2,
          factors: ['Development Cost', 'Operational Cost', 'Marketing Cost', 'Maintenance Cost'],
          recommendations: []
        },
        timeline: {
          score: 0,
          weight: 0.15,
          factors: ['Development Time', 'Time to Market', 'Milestones', 'Dependencies'],
          recommendations: []
        },
        resources: {
          score: 0,
          weight: 0.1,
          factors: ['Team Size', 'Budget', 'Infrastructure', 'Partnerships'],
          recommendations: []
        }
      },
      market: {
        demand: {
          score: 0,
          weight: 0.3,
          factors: ['Market Size', 'Growth Rate', 'Customer Pain Points', 'Adoption Barriers'],
          recommendations: []
        },
        competition: {
          score: 0,
          weight: 0.25,
          factors: ['Competitor Analysis', 'Market Position', 'Differentiation', 'Barriers to Entry'],
          recommendations: []
        },
        trends: {
          score: 0,
          weight: 0.2,
          factors: ['Industry Trends', 'Technology Trends', 'Consumer Behavior', 'Regulatory Changes'],
          recommendations: []
        },
        barriers: {
          score: 0,
          weight: 0.15,
          factors: ['Entry Barriers', 'Switching Costs', 'Regulatory Hurdles', 'Resource Requirements'],
          recommendations: []
        },
        opportunity: {
          score: 0,
          weight: 0.1,
          factors: ['Market Gaps', 'Innovation Potential', 'Partnership Opportunities', 'Expansion Possibilities'],
          recommendations: []
        }
      },
      team: {
        expertise: {
          score: 0,
          weight: 0.3,
          factors: ['Technical Skills', 'Domain Knowledge', 'Problem Solving', 'Innovation'],
          recommendations: []
        },
        experience: {
          score: 0,
          weight: 0.25,
          factors: ['Industry Experience', 'Project History', 'Leadership Experience', 'Team Building'],
          recommendations: []
        },
        size: {
          score: 0,
          weight: 0.15,
          factors: ['Team Composition', 'Resource Allocation', 'Scalability', 'Specialization'],
          recommendations: []
        },
        dynamics: {
          score: 0,
          weight: 0.2,
          factors: ['Communication', 'Collaboration', 'Conflict Resolution', 'Culture'],
          recommendations: []
        },
        leadership: {
          score: 0,
          weight: 0.1,
          factors: ['Vision', 'Decision Making', 'Risk Management', 'Stakeholder Management'],
          recommendations: []
        }
      },
      risk: {
        technical: {
          score: 0,
          weight: 0.3,
          factors: ['Technology Risk', 'Development Risk', 'Integration Risk', 'Security Risk'],
          recommendations: []
        },
        market: {
          score: 0,
          weight: 0.25,
          factors: ['Market Risk', 'Competition Risk', 'Demand Risk', 'Pricing Risk'],
          recommendations: []
        },
        operational: {
          score: 0,
          weight: 0.2,
          factors: ['Process Risk', 'Resource Risk', 'Compliance Risk', 'Quality Risk'],
          recommendations: []
        },
        financial: {
          score: 0,
          weight: 0.15,
          factors: ['Funding Risk', 'Cash Flow Risk', 'Cost Risk', 'Revenue Risk'],
          recommendations: []
        },
        regulatory: {
          score: 0,
          weight: 0.1,
          factors: ['Legal Risk', 'Compliance Risk', 'Policy Risk', 'Ethical Risk'],
          recommendations: []
        }
      }
    };

    this.evaluationHistory = [];
  }

  async processMessage(message: string, userWallet: string): Promise<any> {
    try {
      this.addToMemory('user', message);
      
      // Analyze project and generate evaluation
      const evaluation = await this.generateEvaluation(message);
      
      this.addToMemory('agent', evaluation);
      
      return {
        role: this.name,
        response: evaluation,
        wallet: userWallet,
        action: 'ProjectEvaluation'
      };
    } catch (error) {
      logger.error('Error processing evaluation message:', error);
      throw error;
    }
  }

  private async generateEvaluation(message: string): Promise<string> {
    // Analyze project details
    this.analyzeProject(message);
    
    // Calculate scores
    const scores = this.calculateScores();
    
    // Generate recommendations
    const recommendations = this.generateRecommendations();
    
    // Generate risk assessment
    const riskAssessment = this.generateRiskAssessment();
    
    return `[Project Evaluator] Comprehensive Project Analysis:\n\n` +
           `Project Overview:\n` +
           this.formatProjectOverview() + '\n\n' +
           `Evaluation Scores:\n` +
           this.formatScores(scores) + '\n\n' +
           `Risk Assessment:\n` +
           riskAssessment + '\n\n' +
           `Recommendations:\n` +
           recommendations + '\n\n' +
           `Next Steps:\n` +
           this.generateNextSteps();
  }

  private analyzeProject(message: string) {
    const messageLower = message.toLowerCase();
    
    // Analyze technical aspects
    if (messageLower.includes('tech') || messageLower.includes('code')) {
      this.analyzeTechnicalAspects(message);
    }
    
    // Analyze business aspects
    if (messageLower.includes('business') || messageLower.includes('revenue')) {
      this.analyzeBusinessAspects(message);
    }
    
    // Analyze market aspects
    if (messageLower.includes('market') || messageLower.includes('competition')) {
      this.analyzeMarketAspects(message);
    }
    
    // Analyze team aspects
    if (messageLower.includes('team') || messageLower.includes('skills')) {
      this.analyzeTeamAspects(message);
    }
    
    // Analyze risk aspects
    if (messageLower.includes('risk') || messageLower.includes('challenge')) {
      this.analyzeRiskAspects(message);
    }
  }

  private analyzeTechnicalAspects(message: string) {
    const technicalMetrics = this.evaluationFramework.technical;
    Object.keys(technicalMetrics).forEach(metric => {
      const keywords = this.getTechnicalKeywords(metric as TechnicalMetric);
      const score = this.calculateMetricScore(message, keywords);
      technicalMetrics[metric as TechnicalMetric].score = score;
    });
  }

  private analyzeBusinessAspects(message: string) {
    const businessMetrics = this.evaluationFramework.business;
    Object.keys(businessMetrics).forEach(metric => {
      const keywords = this.getBusinessKeywords(metric as BusinessMetric);
      const score = this.calculateMetricScore(message, keywords);
      businessMetrics[metric as BusinessMetric].score = score;
    });
  }

  private analyzeMarketAspects(message: string) {
    const marketMetrics = this.evaluationFramework.market;
    Object.keys(marketMetrics).forEach(metric => {
      const keywords = this.getMarketKeywords(metric as MarketMetric);
      const score = this.calculateMetricScore(message, keywords);
      marketMetrics[metric as MarketMetric].score = score;
    });
  }

  private analyzeTeamAspects(message: string) {
    const teamMetrics = this.evaluationFramework.team;
    Object.keys(teamMetrics).forEach(metric => {
      const keywords = this.getTeamKeywords(metric as TeamMetric);
      const score = this.calculateMetricScore(message, keywords);
      teamMetrics[metric as TeamMetric].score = score;
    });
  }

  private analyzeRiskAspects(message: string) {
    const riskMetrics = this.evaluationFramework.risk;
    Object.keys(riskMetrics).forEach(metric => {
      const keywords = this.getRiskKeywords(metric as RiskMetric);
      const score = this.calculateMetricScore(message, keywords);
      riskMetrics[metric as RiskMetric].score = score;
    });
  }

  private getTechnicalKeywords(metric: TechnicalMetric): string[] {
    const keywords: Record<TechnicalMetric, string[]> = {
      architecture: ['architecture', 'design', 'structure', 'system', 'framework'],
      scalability: ['scale', 'performance', 'load', 'traffic', 'capacity'],
      security: ['security', 'auth', 'encryption', 'protection', 'compliance'],
      maintainability: ['maintain', 'code', 'document', 'test', 'devops'],
      performance: ['speed', 'response', 'throughput', 'optimize', 'efficient']
    };
    return keywords[metric];
  }

  private getBusinessKeywords(metric: BusinessMetric): string[] {
    const keywords: Record<BusinessMetric, string[]> = {
      viability: ['viable', 'sustainable', 'feasible', 'practical', 'workable'],
      revenue: ['revenue', 'income', 'profit', 'sales', 'earnings'],
      cost: ['cost', 'expense', 'budget', 'investment', 'spending'],
      timeline: ['timeline', 'schedule', 'deadline', 'milestone', 'delivery'],
      resources: ['resource', 'team', 'budget', 'infrastructure', 'tool']
    };
    return keywords[metric];
  }

  private getMarketKeywords(metric: MarketMetric): string[] {
    const keywords: Record<MarketMetric, string[]> = {
      demand: ['demand', 'need', 'market', 'customer', 'user'],
      competition: ['competitor', 'rival', 'market', 'share', 'position'],
      trends: ['trend', 'pattern', 'direction', 'change', 'evolution'],
      barriers: ['barrier', 'obstacle', 'challenge', 'hurdle', 'block'],
      opportunity: ['opportunity', 'potential', 'growth', 'expansion', 'market']
    };
    return keywords[metric];
  }

  private getTeamKeywords(metric: TeamMetric): string[] {
    const keywords: Record<TeamMetric, string[]> = {
      expertise: ['expert', 'skill', 'knowledge', 'ability', 'capability'],
      experience: ['experience', 'background', 'history', 'track', 'record'],
      size: ['size', 'number', 'count', 'team', 'member'],
      dynamics: ['dynamic', 'culture', 'collaborate', 'work', 'team'],
      leadership: ['lead', 'manage', 'direct', 'guide', 'vision']
    };
    return keywords[metric];
  }

  private getRiskKeywords(metric: RiskMetric): string[] {
    const keywords: Record<RiskMetric, string[]> = {
      technical: ['technical', 'technology', 'system', 'code', 'development'],
      market: ['market', 'competition', 'demand', 'customer', 'trend'],
      operational: ['operation', 'process', 'procedure', 'workflow', 'system'],
      financial: ['financial', 'money', 'cost', 'budget', 'revenue'],
      regulatory: ['regulatory', 'legal', 'compliance', 'law', 'regulation']
    };
    return keywords[metric];
  }

  private calculateMetricScore(message: string, keywords: string[]): number {
    const matches = keywords.filter(k => 
      message.toLowerCase().includes(k.toLowerCase())
    ).length;
    return Math.min(10, matches * 2);
  }

  private calculateScores(): Record<EvaluationCategory, number> {
    const scores: Record<EvaluationCategory, number> = {
      technical: this.calculateCategoryScore('technical'),
      business: this.calculateCategoryScore('business'),
      market: this.calculateCategoryScore('market'),
      team: this.calculateCategoryScore('team'),
      risk: this.calculateCategoryScore('risk')
    };
    return scores;
  }

  private calculateCategoryScore(category: EvaluationCategory): number {
    const metrics = this.evaluationFramework[category];
    let totalScore = 0;
    let totalWeight = 0;
    
    Object.values(metrics).forEach(metric => {
      totalScore += metric.score * metric.weight;
      totalWeight += metric.weight;
    });
    
    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  private formatProjectOverview(): string {
    return `Project Name: ${this.name}\n` +
           `Evaluation Date: ${new Date().toISOString()}\n` +
           `Evaluation Framework: Comprehensive Project Analysis\n` +
           `Evaluation Scope: Technical, Business, Market, Team, and Risk Assessment`;
  }

  private formatScores(scores: Record<EvaluationCategory, number>): string {
    return Object.entries(scores)
      .map(([category, score]) => 
        `${category.charAt(0).toUpperCase() + category.slice(1)}: ${score.toFixed(1)}/10`
      )
      .join('\n');
  }

  private generateRiskAssessment(): string {
    const riskMetrics = this.evaluationFramework.risk;
    return Object.entries(riskMetrics)
      .map(([metric, data]) => 
        `${metric.charAt(0).toUpperCase() + metric.slice(1)} Risk (${data.score.toFixed(1)}/10):\n` +
        `Factors:\n` +
        data.factors.map(factor => `- ${factor}`).join('\n') + '\n' +
        `Recommendations:\n` +
        data.recommendations.map(rec => `- ${rec}`).join('\n')
      )
      .join('\n\n');
  }

  private generateRecommendations(): string {
    const recommendations: string[] = [];
    
    // Technical recommendations
    const technicalMetrics = this.evaluationFramework.technical;
    Object.entries(technicalMetrics).forEach(([metric, data]) => {
      if (data.score < 7) {
        recommendations.push(`- Improve ${metric} by focusing on ${data.factors.join(', ')}`);
      }
    });
    
    // Business recommendations
    const businessMetrics = this.evaluationFramework.business;
    Object.entries(businessMetrics).forEach(([metric, data]) => {
      if (data.score < 7) {
        recommendations.push(`- Enhance ${metric} by addressing ${data.factors.join(', ')}`);
      }
    });
    
    // Market recommendations
    const marketMetrics = this.evaluationFramework.market;
    Object.entries(marketMetrics).forEach(([metric, data]) => {
      if (data.score < 7) {
        recommendations.push(`- Strengthen ${metric} by focusing on ${data.factors.join(', ')}`);
      }
    });
    
    // Team recommendations
    const teamMetrics = this.evaluationFramework.team;
    Object.entries(teamMetrics).forEach(([metric, data]) => {
      if (data.score < 7) {
        recommendations.push(`- Develop ${metric} by improving ${data.factors.join(', ')}`);
      }
    });
    
    return recommendations.join('\n');
  }

  private generateNextSteps(): string {
    const nextSteps = [
      'Review detailed evaluation report',
      'Schedule follow-up meeting with stakeholders',
      'Develop action plan for key recommendations',
      'Monitor progress on critical improvements',
      'Update evaluation metrics regularly'
    ];
    
    return nextSteps.map(step => `- ${step}`).join('\n');
  }
} 