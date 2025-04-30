import { ActionDefinition } from '../environment/metagpt';
import { logger } from '../utils/logger';
import * as LangChain from 'langchain';

const llm = new LangChain.ChatOpenAI({
  modelName: 'gpt-4',
  temperature: 0.7,
  maxTokens: 2000
});

export const designArchitectureAction: ActionDefinition = {
  name: 'design',
  description: 'Design software architecture and system components',
  handler: async (message: string, context: any) => {
    try {
      const prompt = `As a software architect, design the architecture for this requirement:
Project Type: ${context.projectType}
Requirement: ${message}

Consider:
1. System components and their interactions
2. Technology stack selection
3. Design patterns and best practices
4. Scalability and performance considerations
5. Security measures

Provide a detailed architectural design document.`;

      const response = await llm.call([
        { role: 'system', content: 'You are an expert software architect.' },
        { role: 'user', content: prompt }
      ]);

      return {
        type: 'architecture',
        content: response,
        metadata: {
          timestamp: new Date(),
          context: context
        }
      };
    } catch (error) {
      logger.error('Error in design architecture action:', error);
      throw error;
    }
  }
};

export const implementationAction: ActionDefinition = {
  name: 'implement',
  description: 'Generate implementation code and technical specifications',
  handler: async (message: string, context: any) => {
    try {
      const prompt = `As a software developer, implement the following requirement:
Project Type: ${context.projectType}
Requirement: ${message}

Provide:
1. Implementation code
2. Technical specifications
3. Dependencies and requirements
4. Setup instructions
5. Usage examples`;

      const response = await llm.call([
        { role: 'system', content: 'You are an expert software developer.' },
        { role: 'user', content: prompt }
      ]);

      return {
        type: 'implementation',
        content: response,
        metadata: {
          timestamp: new Date(),
          context: context
        }
      };
    } catch (error) {
      logger.error('Error in implementation action:', error);
      throw error;
    }
  }
};

export const reviewAction: ActionDefinition = {
  name: 'review',
  description: 'Review code and provide feedback',
  handler: async (message: string, context: any) => {
    try {
      const prompt = `As a code reviewer, analyze this code/component:
Project Type: ${context.projectType}
Content: ${message}

Provide:
1. Code quality assessment
2. Best practices compliance
3. Potential improvements
4. Security considerations
5. Performance optimizations`;

      const response = await llm.call([
        { role: 'system', content: 'You are an expert code reviewer.' },
        { role: 'user', content: prompt }
      ]);

      return {
        type: 'review',
        content: response,
        metadata: {
          timestamp: new Date(),
          context: context
        }
      };
    } catch (error) {
      logger.error('Error in review action:', error);
      throw error;
    }
  }
};

export const testingAction: ActionDefinition = {
  name: 'test',
  description: 'Generate test cases and validation scenarios',
  handler: async (message: string, context: any) => {
    try {
      const prompt = `As a QA engineer, create test cases for:
Project Type: ${context.projectType}
Component: ${message}

Include:
1. Unit test scenarios
2. Integration test cases
3. End-to-end test flows
4. Performance test plans
5. Security test cases`;

      const response = await llm.call([
        { role: 'system', content: 'You are an expert QA engineer.' },
        { role: 'user', content: prompt }
      ]);

      return {
        type: 'testing',
        content: response,
        metadata: {
          timestamp: new Date(),
          context: context
        }
      };
    } catch (error) {
      logger.error('Error in testing action:', error);
      throw error;
    }
  }
};

export const optimizationAction: ActionDefinition = {
  name: 'optimize',
  description: 'Optimize code and improve performance',
  handler: async (message: string, context: any) => {
    try {
      const prompt = `As a performance optimization expert, analyze and optimize:
Project Type: ${context.projectType}
Component: ${message}

Focus on:
1. Performance bottlenecks
2. Resource utilization
3. Code efficiency
4. Memory management
5. Response time improvements`;

      const response = await llm.call([
        { role: 'system', content: 'You are an expert in software optimization.' },
        { role: 'user', content: prompt }
      ]);

      return {
        type: 'optimization',
        content: response,
        metadata: {
          timestamp: new Date(),
          context: context
        }
      };
    } catch (error) {
      logger.error('Error in optimization action:', error);
      throw error;
    }
  }
};