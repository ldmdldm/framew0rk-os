import { Role } from '../models/role';
import { MemoryService } from './memoryService';
import { PromptService } from './promptService';
import { GeminiService } from './geminiService';
import { logger } from '../utils/logger';

interface RoleCapability {
  name: string;
  description: string;
  confidence: number;
  examples: string[];
}

interface RoleExpertise {
  domain: string;
  skills: string[];
  level: number;
  capabilities: RoleCapability[];
  profile: string;
  goal: string;
}

export class RoleManager {
  private static instance: RoleManager;
  private roles: Map<string, RoleExpertise>;
  private memoryService: MemoryService;
  private promptService: PromptService;
  private llm: GeminiService;

  private constructor() {
    this.roles = new Map();
    this.memoryService = MemoryService.getInstance();
    this.promptService = PromptService.getInstance();
    this.llm = GeminiService.getInstance();
    this.initializeRoleExpertise();
  }

  static getInstance(): RoleManager {
    if (!RoleManager.instance) {
      RoleManager.instance = new RoleManager();
    }
    return RoleManager.instance;
  }

  private initializeRoleExpertise() {
    // Initialize Architect expertise
    this.roles.set('architect', {
      domain: 'Software Architecture',
      skills: [
        'system design',
        'design patterns',
        'scalability',
        'performance optimization',
        'security architecture'
      ],
      level: 5,
      capabilities: [
        {
          name: 'architecture_design',
          description: 'Design comprehensive software architectures',
          confidence: 0.9,
          examples: [
            'Microservices architecture for e-commerce platform',
            'Serverless architecture for real-time analytics',
            'Event-driven architecture for messaging system'
          ]
        },
        {
          name: 'technical_decision',
          description: 'Make informed technical decisions',
          confidence: 0.85,
          examples: [
            'Technology stack selection',
            'Database architecture design',
            'API design patterns'
          ]
        }
      ],
      profile: 'Expert in software architecture with a focus on scalability and performance.',
      goal: 'Design and optimize software systems for high performance and reliability.'
    });

    // Initialize Developer expertise
    this.roles.set('developer', {
      domain: 'Software Development',
      skills: [
        'coding',
        'testing',
        'debugging',
        'code optimization',
        'documentation'
      ],
      level: 5,
      capabilities: [
        {
          name: 'implementation',
          description: 'Implement software solutions',
          confidence: 0.9,
          examples: [
            'REST API development',
            'Frontend components',
            'Database integration'
          ]
        },
        {
          name: 'code_quality',
          description: 'Maintain code quality standards',
          confidence: 0.85,
          examples: [
            'Clean code practices',
            'Code refactoring',
            'Performance optimization'
          ]
        }
      ],
      profile: 'Skilled software developer with expertise in coding and debugging.',
      goal: 'Develop high-quality software solutions that meet user requirements.'
    });

    // Initialize Reviewer expertise
    this.roles.set('reviewer', {
      domain: 'Code Review',
      skills: [
        'code analysis',
        'best practices',
        'security review',
        'performance review',
        'documentation review'
      ],
      level: 5,
      capabilities: [
        {
          name: 'code_review',
          description: 'Comprehensive code review',
          confidence: 0.9,
          examples: [
            'Security vulnerability detection',
            'Performance bottleneck identification',
            'Code quality assessment'
          ]
        },
        {
          name: 'improvement_suggestions',
          description: 'Provide actionable improvements',
          confidence: 0.85,
          examples: [
            'Code optimization suggestions',
            'Best practices recommendations',
            'Architecture improvements'
          ]
        }
      ],
      profile: 'Experienced code reviewer with a focus on quality and security.',
      goal: 'Ensure code quality and provide actionable feedback for improvement.'
    });
  }

  async processRoleMessage(role: string, message: string, context: any = {}): Promise<any> {
    const roleConfig = this.roles.get(role);
    if (!roleConfig) {
      throw new Error(`Role ${role} not found`);
    }

    try {
      const promptTemplate = await this.promptService.getRolePrompt(role);
      const memory = await this.memoryService.getContext(role);

      const fullPrompt = this.constructPrompt(promptTemplate, {
        role: roleConfig,
        message,
        memory,
        context
      });

      const response = await this.llm.generateChat([
        { role: 'system', content: roleConfig.profile },
        { role: 'user', content: fullPrompt }
      ]);

      await this.memoryService.addToMemory(role, {
        role,
        content: message,
        timestamp: new Date(),
        metadata: {
          type: 'interaction',
          input: message,
          output: response
        }
      });

      return {
        role,
        response,
        action: this.determineAction(response)
      };
    } catch (error) {
      logger.error(`Error processing message for role ${role}:`, error);
      throw error;
    }
  }

  private constructPrompt(template: string, data: any): string {
    return template
      .replace('{{ROLE_PROFILE}}', data.role.profile)
      .replace('{{ROLE_GOAL}}', data.role.goal)
      .replace('{{MESSAGE}}', data.message)
      .replace('{{CONTEXT}}', JSON.stringify(data.context))
      .replace('{{MEMORY}}', JSON.stringify(data.memory));
  }

  private determineAction(response: string): string {
    // Simple action detection - can be enhanced
    if (response.includes('architecture') || response.includes('design')) {
      return 'DesignArchitecture';
    }
    return 'GeneralResponse';
  }

  async analyzeRequirement(projectId: string, requirement: string): Promise<Map<string, number>> {
    const roleMatches = new Map<string, number>();

    try {
      for (const [roleName, expertise] of this.roles.entries()) {
        const relevance = await this.calculateRoleRelevance(requirement, expertise);
        roleMatches.set(roleName, relevance);
      }

      return roleMatches;
    } catch (error) {
      logger.error('Error analyzing requirement:', error);
      throw error;
    }
  }

  private async calculateRoleRelevance(requirement: string, expertise: RoleExpertise): Promise<number> {
    try {
      const prompt = `
Analyze the relevance of this requirement for a ${expertise.domain} expert:
Requirement: ${requirement}

Consider the following skills:
${expertise.skills.join(', ')}

And these capabilities:
${expertise.capabilities.map(c => c.name).join(', ')}

Rate the relevance from 0 to 1, where:
0 = Not relevant at all
1 = Highly relevant

Provide only the numerical score.`;

      const response = await this.llm.generateChat([
        { role: 'user', content: prompt }
      ]);

      const score = parseFloat(response) || 0;
      return Math.min(Math.max(score, 0), 1);
    } catch (error) {
      logger.error('Error calculating role relevance:', error);
      return 0;
    }
  }

  async getRoleExpertise(roleName: string): Promise<RoleExpertise | null> {
    return this.roles.get(roleName) || null;
  }

  async updateRoleCapability(
    roleName: string,
    capabilityName: string,
    update: Partial<RoleCapability>
  ) {
    const expertise = this.roles.get(roleName);
    if (!expertise) {
      throw new Error(`Role ${roleName} not found`);
    }

    const capability = expertise.capabilities.find(c => c.name === capabilityName);
    if (!capability) {
      throw new Error(`Capability ${capabilityName} not found for role ${roleName}`);
    }

    Object.assign(capability, update);
    this.roles.set(roleName, expertise);
  }

  async addRoleExample(roleName: string, capabilityName: string, example: string) {
    const expertise = this.roles.get(roleName);
    if (!expertise) {
      throw new Error(`Role ${roleName} not found`);
    }

    const capability = expertise.capabilities.find(c => c.name === capabilityName);
    if (!capability) {
      throw new Error(`Capability ${capabilityName} not found for role ${roleName}`);
    }

    capability.examples.push(example);
    this.roles.set(roleName, expertise);
  }

  async getRelevantRoles(projectId: string, requirement: string): Promise<string[]> {
    const roleMatches = await this.analyzeRequirement(projectId, requirement);
    const relevantRoles: string[] = [];

    for (const [role, relevance] of roleMatches.entries()) {
      if (relevance >= 0.6) { // Threshold for role relevance
        relevantRoles.push(role);
      }
    }

    return relevantRoles;
  }

  async getRoleInsights(roleName: string, projectId: string): Promise<any> {
    const expertise = await this.getRoleExpertise(roleName);
    if (!expertise) {
      throw new Error(`Role ${roleName} not found`);
    }

    const context = await this.memoryService.getRelevantContext(projectId, roleName);

    return {
      expertise,
      recentInteractions: context.length,
      lastActive: context[context.length - 1]?.timestamp,
      topCapabilities: expertise.capabilities
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3)
    };
  }
}