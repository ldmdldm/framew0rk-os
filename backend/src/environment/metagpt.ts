import { Redis } from 'ioredis';
import { Agent } from '../models/agent';
import { logger } from '../utils/logger';
import { GeminiService } from '../services/geminiService';

export interface RoleDefinition {
  name: string;
  profile: string;
  goal: string;
}

interface ActionDefinition {
  name: string;
  description: string;
  requiredRoles: string[];
}

export class MetaGPTEnvironment {
  private static instance: MetaGPTEnvironment;
  private roles: Map<string, RoleDefinition>;
  private actions: Map<string, ActionDefinition>;
  private redis: Redis;
  private llm: GeminiService;

  private constructor() {
    this.roles = new Map();
    this.actions = new Map();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0')
    });
    this.llm = GeminiService.getInstance();
  }

  static getInstance(): MetaGPTEnvironment {
    if (!MetaGPTEnvironment.instance) {
      MetaGPTEnvironment.instance = new MetaGPTEnvironment();
    }
    return MetaGPTEnvironment.instance;
  }

  async initializeRoles(roles: RoleDefinition[]) {
    for (const roleData of roles) {
      this.roles.set(roleData.name, roleData);
    }
  }

  async processTeamAction(action: string, message: string, context: any = {}) {
    const relevantRoles = this.getRelevantRoles(action, message);
    const responses = new Map<string, any>();

    for (const [roleName, role] of relevantRoles) {
      const response = await this.processRoleMessage(roleName, role, message, context);
      responses.set(roleName, response);
    }

    const synthesis = await this.synthesizeResponses(action, responses, context);
    await this.cacheInteraction(action, message, synthesis);

    return synthesis;
  }

  private getRelevantRoles(action: string, message: string): Map<string, RoleDefinition> {
    const actionDef = this.actions.get(action);
    if (!actionDef) {
      return this.roles;
    }
    const relevantRoles = new Map<string, RoleDefinition>();
    actionDef.requiredRoles.forEach(roleName => {
      const role = this.roles.get(roleName);
      if (role) {
        relevantRoles.set(roleName, role);
      }
    });
    return relevantRoles;
  }

  private async processRoleMessage(roleName: string, role: RoleDefinition, message: string, context: any) {
    try {
      const prompt = await this.constructRolePrompt(role, message, context);
      const response = await this.llm.generateChat([
        { role: 'system', content: role.profile },
        { role: 'user', content: prompt }
      ]);
      return { content: response, role: roleName };
    } catch (error) {
      logger.error(`Error processing message for role ${roleName}:`, error);
      throw error;
    }
  }

  private async constructRolePrompt(role: RoleDefinition, message: string, context: any): Promise<string> {
    const roleMemory = await this.getRoleMemory(role.name);
    return `As ${role.profile}, with the goal to ${role.goal}, address this message:
    
${message}

Context:
${JSON.stringify(context)}

Previous interactions:
${JSON.stringify(roleMemory)}

Provide your response based on your expertise and role.`;
  }

  private async synthesizeResponses(action: string, responses: Map<string, any>, context: any) {
    const responseList = Array.from(responses.values());
    const prompt = `Synthesize these role-specific responses into a cohesive team output:

${responseList.map(r => `${r.role}: ${r.content}`).join('\n\n')}

Context:
${JSON.stringify(context)}

Provide a unified response that incorporates the key insights from each role.`;

    try {
      const synthesis = await this.llm.generateResponse(prompt);
      return {
        action,
        synthesis,
        roleResponses: Object.fromEntries(responses)
      };
    } catch (error) {
      logger.error('Error synthesizing responses:', error);
      throw error;
    }
  }

  private async getRoleMemory(roleName: string): Promise<unknown[]> {
    const memory = await this.redis.lrange(`memory:${roleName}`, 0, -1);
    return memory.map(item => JSON.parse(item));
  }

  private async cacheInteraction(action: string, message: string, synthesis: any) {
    const interaction = {
      timestamp: new Date(),
      action,
      message,
      synthesis
    };

    await this.redis.lpush('interactions', JSON.stringify(interaction));
    await this.redis.ltrim('interactions', 0, 99); // Keep last 100 interactions
  }
}