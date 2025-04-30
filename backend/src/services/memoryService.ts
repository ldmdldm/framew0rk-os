import { Redis } from 'ioredis';
import { logger } from '../utils/logger';

interface MemoryEntry {
  role: string;
  content: string;
  timestamp: Date;
  metadata?: any;
}

interface ConversationContext {
  projectId: string;
  roles: string[];
  messages: MemoryEntry[];
  metadata: any;
}

export class MemoryService {
  private static instance: MemoryService;
  private redis: Redis;
  private activeContexts: Map<string, ConversationContext>;
  private readonly CONTEXT_WINDOW_SIZE = 10;
  private readonly MEMORY_TTL = 86400; // 24 hours

  private constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0')
    });
    this.activeContexts = new Map();
  }

  static getInstance(): MemoryService {
    if (!MemoryService.instance) {
      MemoryService.instance = new MemoryService();
    }
    return MemoryService.instance;
  }

  async initializeContext(projectId: string, roles: string[], metadata: any = {}) {
    const context: ConversationContext = {
      projectId,
      roles,
      messages: [],
      metadata
    };

    this.activeContexts.set(projectId, context);
    await this.persistContext(projectId, context);
    
    logger.info(`Initialized context for project ${projectId}`);
    return context;
  }

  async addToMemory(projectId: string, entry: MemoryEntry) {
    try {
      let context = await this.getContext(projectId);
      
      if (!context) {
        throw new Error(`No context found for project ${projectId}`);
      }

      // Add new message
      context.messages.push(entry);

      // Maintain context window size
      if (context.messages.length > this.CONTEXT_WINDOW_SIZE) {
        // Before removing, persist older messages to long-term storage
        const oldMessages = context.messages.slice(0, -this.CONTEXT_WINDOW_SIZE);
        await this.archiveMessages(projectId, oldMessages);
        
        context.messages = context.messages.slice(-this.CONTEXT_WINDOW_SIZE);
      }

      // Update active context
      this.activeContexts.set(projectId, context);
      
      // Persist updated context
      await this.persistContext(projectId, context);

      return context;
    } catch (error) {
      logger.error('Error adding to memory:', error);
      throw error;
    }
  }

  async getContext(projectId: string): Promise<ConversationContext | null> {
    // Try to get from active contexts first
    if (this.activeContexts.has(projectId)) {
      return this.activeContexts.get(projectId)!;
    }

    // Try to load from Redis
    try {
      const contextData = await this.redis.get(`context:${projectId}`);
      if (contextData) {
        const context = JSON.parse(contextData);
        this.activeContexts.set(projectId, context);
        return context;
      }
    } catch (error) {
      logger.error('Error loading context from Redis:', error);
    }

    return null;
  }

  async getRelevantContext(projectId: string, role: string): Promise<MemoryEntry[]> {
    const context = await this.getContext(projectId);
    if (!context) return [];

    // Get recent messages relevant to the role
    const relevantMessages = context.messages.filter(msg => 
      msg.role === role || msg.role === 'system'
    );

    // If we have few messages, try to load some from archive
    if (relevantMessages.length < 5) {
      const archivedMessages = await this.loadArchivedMessages(projectId, role);
      return [...archivedMessages, ...relevantMessages];
    }

    return relevantMessages;
  }

  private async persistContext(projectId: string, context: ConversationContext) {
    try {
      await this.redis.set(
        `context:${projectId}`,
        JSON.stringify(context),
        'EX',
        this.MEMORY_TTL
      );
    } catch (error) {
      logger.error('Error persisting context:', error);
      throw error;
    }
  }

  private async archiveMessages(projectId: string, messages: MemoryEntry[]) {
    try {
      const key = `archive:${projectId}:${Date.now()}`;
      await this.redis.set(
        key,
        JSON.stringify(messages),
        'EX',
        this.MEMORY_TTL * 7 // Keep archived messages for 7 days
      );
    } catch (error) {
      logger.error('Error archiving messages:', error);
    }
  }

  private async loadArchivedMessages(projectId: string, role: string): Promise<MemoryEntry[]> {
    try {
      // Get keys of archived messages for this project
      const keys = await this.redis.keys(`archive:${projectId}:*`);
      const messages: MemoryEntry[] = [];

      // Load and process each archive
      for (const key of keys) {
        const archiveData = await this.redis.get(key);
        if (archiveData) {
          const archived: MemoryEntry[] = JSON.parse(archiveData);
          messages.push(...archived.filter(msg => 
            msg.role === role || msg.role === 'system'
          ));
        }
      }

      // Sort by timestamp and return most recent
      return messages
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);
    } catch (error) {
      logger.error('Error loading archived messages:', error);
      return [];
    }
  }

  async updateContextMetadata(projectId: string, metadata: any) {
    const context = await this.getContext(projectId);
    if (!context) {
      throw new Error(`No context found for project ${projectId}`);
    }

    context.metadata = { ...context.metadata, ...metadata };
    await this.persistContext(projectId, context);
  }

  async clearContext(projectId: string) {
    try {
      // Remove from active contexts
      this.activeContexts.delete(projectId);
      
      // Remove from Redis
      await this.redis.del(`context:${projectId}`);
      
      // Remove archives
      const archiveKeys = await this.redis.keys(`archive:${projectId}:*`);
      if (archiveKeys.length > 0) {
        await this.redis.del(...archiveKeys);
      }

      logger.info(`Cleared context for project ${projectId}`);
    } catch (error) {
      logger.error('Error clearing context:', error);
      throw error;
    }
  }

  async summarizeContext(projectId: string): Promise<string> {
    const context = await this.getContext(projectId);
    if (!context) return '';

    const summary = {
      projectId: context.projectId,
      roles: context.roles,
      messageCount: context.messages.length,
      lastUpdate: context.messages[context.messages.length - 1]?.timestamp,
      metadata: context.metadata
    };

    return JSON.stringify(summary, null, 2);
  }
}