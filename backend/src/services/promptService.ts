import { logger } from '../utils/logger';

export class PromptService {
  private static instance: PromptService;
  private rolePrompts: Map<string, string>;

  private constructor() {
    this.rolePrompts = new Map();
    this.initializePrompts();
  }

  static getInstance(): PromptService {
    if (!PromptService.instance) {
      PromptService.instance = new PromptService();
    }
    return PromptService.instance;
  }

  private initializePrompts() {
    // Architect prompts optimized for Gemini
    this.rolePrompts.set('architect', `You are a Software Architect focusing on system design and technical decisions.
Context: {{CONTEXT}}
Previous discussions: {{MEMORY}}

User request: {{MESSAGE}}

Analyze the request and provide:
1. Architectural considerations
2. Technical recommendations
3. Implementation approach
4. Potential challenges and solutions

Base your response on software architecture best practices and scalable design patterns.`);

    // Product Manager prompts
    this.rolePrompts.set('productManager', `You are a Product Manager guiding product development.
Context: {{CONTEXT}}
Previous discussions: {{MEMORY}}

User request: {{MESSAGE}}

Provide:
1. Requirements analysis
2. Feature prioritization
3. User impact assessment
4. Development recommendations

Focus on user value and business impact.`);

    // Engineer prompts
    this.rolePrompts.set('engineer', `You are a Software Engineer implementing solutions.
Context: {{CONTEXT}}
Previous discussions: {{MEMORY}}

User request: {{MESSAGE}}

Provide:
1. Technical implementation details
2. Code structure recommendations
3. Testing approach
4. Best practices to follow

Focus on clean, maintainable, and efficient code.`);

    // Project Manager prompts
    this.rolePrompts.set('projectManager', `You are a Project Manager organizing development work.
Context: {{CONTEXT}}
Previous discussions: {{MEMORY}}

User request: {{MESSAGE}}

Provide:
1. Timeline estimation
2. Resource allocation
3. Risk assessment
4. Milestone planning

Focus on efficient project delivery and risk mitigation.`);
  }

  async getRolePrompt(role: string): Promise<string> {
    const prompt = this.rolePrompts.get(role);
    if (!prompt) {
      logger.warn(`No specific prompt template found for role ${role}, using default`);
      return this.getDefaultPrompt();
    }
    return prompt;
  }

  private getDefaultPrompt(): string {
    return `Context: {{CONTEXT}}
Previous discussions: {{MEMORY}}

User request: {{MESSAGE}}

Please analyze the request and provide a detailed response based on your expertise.`;
  }

  async updateRolePrompt(role: string, template: string): Promise<void> {
    this.rolePrompts.set(role, template);
    logger.info(`Updated prompt template for role ${role}`);
  }

  getPromptVariables(): string[] {
    return ['{{CONTEXT}}', '{{MEMORY}}', '{{MESSAGE}}'];
  }

  async validatePromptTemplate(template: string): Promise<boolean> {
    const requiredVariables = this.getPromptVariables();
    return requiredVariables.every(variable => template.includes(variable));
  }
}