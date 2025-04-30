import { Request, Response, NextFunction } from 'express';
import { MetaGPTConfig } from '../config/metagptConfig';
import { logger } from '../utils/logger';
import Joi from 'joi';

interface ValidationSchema {
  [key: string]: Joi.ObjectSchema;
}

export class MetaGPTMiddleware {
  private static instance: MetaGPTMiddleware;
  private config: MetaGPTConfig;
  private validationSchemas: ValidationSchema;

  private constructor() {
    this.config = MetaGPTConfig.getInstance();
    this.initializeValidationSchemas();
  }

  static getInstance(): MetaGPTMiddleware {
    if (!MetaGPTMiddleware.instance) {
      MetaGPTMiddleware.instance = new MetaGPTMiddleware();
    }
    return MetaGPTMiddleware.instance;
  }

  private initializeValidationSchemas() {
    this.validationSchemas = {
      project: Joi.object({
        name: Joi.string().required().min(3).max(100),
        type: Joi.string().required(),
        requirements: Joi.array().items(Joi.string()).min(1).required()
      }),

      teamRequest: Joi.object({
        projectId: Joi.string().required(),
        message: Joi.string().required()
      }),

      roleAction: Joi.object({
        projectId: Joi.string().required(),
        role: Joi.string().required(),
        action: Joi.string().required(),
        payload: Joi.object().required()
      })
    };
  }

  validateRequest(schemaName: keyof ValidationSchema) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const schema = this.validationSchemas[schemaName];
        if (!schema) {
          throw new Error(`Validation schema '${schemaName}' not found`);
        }

        const { error } = schema.validate(req.body);
        if (error) {
          return res.status(400).json({
            error: 'Validation error',
            details: error.details.map(detail => detail.message)
          });
        }

        next();
      } catch (error) {
        logger.error('Validation middleware error:', error);
        next(error);
      }
    };
  }

  async errorHandler(error: any, req: Request, res: Response, next: NextFunction) {
    logger.error('MetaGPT error:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.message
      });
    }

    if (error.name === 'UnauthorizedError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    if (error.name === 'NotFoundError') {
      return res.status(404).json({
        error: 'Not Found',
        message: error.message
      });
    }

    // Handle specific MetaGPT errors
    if (error.name === 'MetaGPTError') {
      return res.status(error.status || 500).json({
        error: error.name,
        message: error.message,
        details: error.details
      });
    }

    // Default error response
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred'
    });
  }

  async configValidator(req: Request, res: Response, next: NextFunction) {
    try {
      const isValid = await this.config.validateConfig();
      if (!isValid) {
        throw new Error('Invalid MetaGPT configuration');
      }
      next();
    } catch (error) {
      logger.error('Configuration validation error:', error);
      next(error);
    }
  }

  async rateLimiter(req: Request, res: Response, next: NextFunction) {
    try {
      const config = this.config.loadConfig().service.rateLimit;
      const redis = await this.config.getRedis();
      
      const key = `ratelimit:${req.ip}`;
      const requests = await redis.incr(key);
      
      if (requests === 1) {
        await redis.expire(key, Math.floor(config.windowMs / 1000));
      }

      if (requests > config.max) {
        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded'
        });
      }

      next();
    } catch (error) {
      logger.error('Rate limiter error:', error);
      next(error);
    }
  }

  async requestLogger(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info('Request processed', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration: `${duration}ms`
      });
    });
    next();
  }

  async performanceMonitor(req: Request, res: Response, next: NextFunction) {
    const start = process.hrtime();

    res.on('finish', () => {
      const [seconds, nanoseconds] = process.hrtime(start);
      const duration = seconds * 1000 + nanoseconds / 1000000;

      if (duration > 1000) { // Log slow requests (over 1 second)
        logger.warn('Slow request detected', {
          method: req.method,
          path: req.path,
          duration: `${duration.toFixed(2)}ms`
        });
      }

      // Store performance metrics
      this.storePerformanceMetrics(req.path, duration).catch(error => {
        logger.error('Error storing performance metrics:', error);
      });
    });

    next();
  }

  private async storePerformanceMetrics(path: string, duration: number) {
    try {
      const redis = await this.config.getRedis();
      const key = `metrics:${path}:${new Date().toISOString().split('T')[0]}`;

      await redis.multi()
        .lpush(`${key}:durations`, duration.toString())
        .ltrim(`${key}:durations`, 0, 999) // Keep last 1000 samples
        .hincrby(`${key}:stats`, 'count', 1)
        .hincrbyfloat(`${key}:stats`, 'total_duration', duration)
        .exec();
    } catch (error) {
      logger.error('Error storing performance metrics:', error);
    }
  }

  async contextInjector(req: Request, res: Response, next: NextFunction) {
    try {
      // Inject configuration
      req.metagptConfig = this.config.loadConfig();

      // Inject request context
      req.context = {
        startTime: Date.now(),
        requestId: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        user: req.user // If using authentication
      };

      next();
    } catch (error) {
      logger.error('Context injector error:', error);
      next(error);
    }
  }

  async securityHeaders(_: Request, res: Response, next: NextFunction) {
    // Set security headers
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self'",
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    });

    next();
  }
}