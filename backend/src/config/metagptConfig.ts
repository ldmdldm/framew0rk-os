import { Redis } from 'ioredis';
import * as LangChain from 'langchain';
import { ethers } from 'ethers';
import { logger } from '../utils/logger';
import { GeminiService } from '../services/geminiService';

interface DatabaseConfig {
  url: string;
  options: any;
}

interface CacheConfig {
  host: string;
  port: number;
  password?: string;
}

interface LLMConfig {
  provider: 'openai' | 'gemini' | 'anthropic' | 'local';
  model: string;
  temperature: number;
  maxTokens: number;
  apiKey: string;
}

interface BlockchainConfig {
  network: string;
  contractAddress: string;
  providerUrl: string;
}

interface ServiceConfig {
  port: number;
  host: string;
  corsOrigins: string[];
  rateLimit: {
    windowMs: number;
    max: number;
  };
}

export class MetaGPTConfig {
  private static instance: MetaGPTConfig;
  private llmInstances: Map<string, any>;
  private redisInstance: Redis | null;
  private web3Instance: ethers.providers.Provider | null;

  private constructor() {
    this.llmInstances = new Map();
    this.redisInstance = null;
    this.web3Instance = null;
  }

  static getInstance(): MetaGPTConfig {
    if (!MetaGPTConfig.instance) {
      MetaGPTConfig.instance = new MetaGPTConfig();
    }
    return MetaGPTConfig.instance;
  }

  loadConfig(): any {
    return {
      environment: process.env.NODE_ENV || 'development',
      database: this.getDatabaseConfig(),
      cache: this.getCacheConfig(),
      llm: this.getLLMConfig(),
      blockchain: this.getBlockchainConfig(),
      service: this.getServiceConfig()
    };
  }

  private getDatabaseConfig(): DatabaseConfig {
    return {
      url: process.env.DATABASE_URL || 'mongodb://localhost:27017/metagpt',
      options: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      }
    };
  }

  private getCacheConfig(): CacheConfig {
    return {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD
    };
  }

  private getLLMConfig(): LLMConfig {
    return {
      provider: (process.env.LLM_PROVIDER || 'openai') as LLMConfig['provider'],
      model: process.env.LLM_MODEL || 'gpt-4',
      temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
      maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '2000'),
      apiKey: process.env.LLM_API_KEY || ''
    };
  }

  private getBlockchainConfig(): BlockchainConfig {
    return {
      network: process.env.BLOCKCHAIN_NETWORK || 'localhost',
      contractAddress: process.env.CONTRACT_ADDRESS || '',
      providerUrl: process.env.WEB3_PROVIDER_URL || 'http://localhost:8545'
    };
  }

  private getServiceConfig(): ServiceConfig {
    return {
      port: parseInt(process.env.PORT || '3000'),
      host: process.env.HOST || 'localhost',
      corsOrigins: (process.env.CORS_ORIGINS || '*').split(','),
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
        max: parseInt(process.env.RATE_LIMIT_MAX || '100')
      }
    };
  }

  async getLLM(config?: Partial<LLMConfig>): Promise<any> {
    const llmConfig = { ...this.getLLMConfig(), ...config };
    const key = `${llmConfig.provider}:${llmConfig.model}`;

    if (!this.llmInstances.has(key)) {
      try {
        let llm;

        if (llmConfig.provider === 'gemini') {
          llm = GeminiService.getInstance();
        } else if (llmConfig.provider === 'openai') {
          llm = new LangChain.ChatOpenAI({
            modelName: llmConfig.model,
            temperature: llmConfig.temperature,
            maxTokens: llmConfig.maxTokens,
            openAIApiKey: llmConfig.apiKey
          });
        } else {
          throw new Error(`LLM provider ${llmConfig.provider} not supported`);
        }

        this.llmInstances.set(key, llm);
      } catch (error) {
        logger.error('Error initializing LLM:', error);
        throw error;
      }
    }

    return this.llmInstances.get(key);
  }

  async getRedis(): Promise<Redis> {
    if (!this.redisInstance) {
      const config = this.getCacheConfig();
      try {
        this.redisInstance = new Redis({
          host: config.host,
          port: config.port,
          password: config.password,
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          }
        });

        this.redisInstance.on('error', (error) => {
          logger.error('Redis connection error:', error);
        });

        this.redisInstance.on('connect', () => {
          logger.info('Redis connected successfully');
        });
      } catch (error) {
        logger.error('Error initializing Redis:', error);
        throw error;
      }
    }

    return this.redisInstance;
  }

  async getWeb3Provider(): Promise<ethers.providers.Provider> {
    if (!this.web3Instance) {
      const config = this.getBlockchainConfig();
      try {
        if (config.network === 'localhost') {
          this.web3Instance = new ethers.providers.JsonRpcProvider(config.providerUrl);
        } else {
          this.web3Instance = ethers.getDefaultProvider(config.network);
        }
      } catch (error) {
        logger.error('Error initializing Web3 provider:', error);
        throw error;
      }
    }

    return this.web3Instance;
  }

  async validateConfig(): Promise<boolean> {
    try {
      const config = this.loadConfig();
      
      // Validate database connection
      const mongoose = require('mongoose');
      await mongoose.connect(config.database.url, config.database.options);

      // Validate Redis connection
      const redis = await this.getRedis();
      await redis.ping();

      // Validate LLM configuration
      const llm = await this.getLLM();
      await llm.call([{ role: 'system', content: 'Test connection' }]);

      // Validate Web3 connection
      const web3 = await this.getWeb3Provider();
      await web3.getNetwork();

      return true;
    } catch (error) {
      logger.error('Configuration validation failed:', error);
      return false;
    }
  }

  async cleanup(): Promise<void> {
    try {
      // Close Redis connection
      if (this.redisInstance) {
        await this.redisInstance.quit();
        this.redisInstance = null;
      }

      // Clear LLM instances
      this.llmInstances.clear();

      // Clear Web3 instance
      this.web3Instance = null;

      logger.info('Cleanup completed successfully');
    } catch (error) {
      logger.error('Error during cleanup:', error);
      throw error;
    }
  }

  reloadConfig(): void {
    // Clear cached instances to force reinitialization with new config
    this.cleanup().catch(error => {
      logger.error('Error reloading configuration:', error);
    });
  }
}