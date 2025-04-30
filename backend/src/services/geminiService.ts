import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { logger } from '../utils/logger';

export class GeminiService {
  private static instance: GeminiService;
  private model: GenerativeModel;

  private constructor() {
    const genAI = new GoogleGenerativeAI(process.env.LLM_API_KEY || '');
    this.model = genAI.getGenerativeModel({ model: process.env.LLM_MODEL || 'gemini-pro' });
  }

  static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService();
    }
    return GeminiService.instance;
  }

  async generateResponse(prompt: string): Promise<string> {
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      logger.error('Error generating Gemini response:', error);
      throw error;
    }
  }

  async generateChat(messages: Array<{ role: string; content: string }>): Promise<string> {
    try {
      const chat = this.model.startChat({
        history: messages.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        }))
      });
      
      const result = await chat.sendMessage(messages[messages.length - 1].content);
      return result.response.text();
    } catch (error) {
      logger.error('Error in Gemini chat:', error);
      throw error;
    }
  }
}