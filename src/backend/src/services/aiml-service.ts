import { AimlEngine } from './aiml-engine';
import { AimlLoader } from './aiml-loader';
import logger from '../utils/logger';

export class AimlService {
  private engine: AimlEngine;
  private loader: AimlLoader;
  private lastReload: Date;

  constructor() {
    this.engine = new AimlEngine();
    this.loader = new AimlLoader(this.engine);
    this.lastReload = new Date();
  }

  /**
   * Initialize the AIML service
   */
  async initialize(): Promise<void> {
    try {
      await this.loader.loadFromConfigMap();
      this.lastReload = new Date();
      logger.info('AIML Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize AIML Service:', error);
      throw error;
    }
  }

  /**
   * Process a user message
   */
  processMessage(message: string): string | null {
    return this.engine.processMessage(message);
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      loaded: this.engine.isLoaded(),
      patternCount: this.engine.getPatternCount(),
      lastReload: this.lastReload,
    };
  }

  /**
   * Get all patterns (for admin interface)
   */
  getPatterns() {
    return this.engine.getPatterns();
  }

  /**
   * Reload patterns
   */
  async reloadPatterns(): Promise<void> {
    await this.loader.reloadPatterns();
    this.lastReload = new Date();
  }
}