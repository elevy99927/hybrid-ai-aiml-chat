import fs from 'fs/promises';
import path from 'path';
import { AimlEngine } from './aiml-engine';
import logger from '../utils/logger';

export class AimlLoader {
  private aimlEngine: AimlEngine;

  constructor(aimlEngine: AimlEngine) {
    this.aimlEngine = aimlEngine;
  }

  /**
   * Load AIML patterns from a file
   */
  async loadFromFile(filePath: string): Promise<void> {
    try {
      const xmlContent = await fs.readFile(filePath, 'utf-8');
      await this.aimlEngine.loadAimlFromString(xmlContent);
      logger.info(`Successfully loaded AIML patterns from ${filePath}`);
    } catch (error) {
      logger.error(`Failed to load AIML patterns from ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Load AIML patterns from a directory
   */
  async loadFromDirectory(dirPath: string): Promise<void> {
    try {
      const files = await fs.readdir(dirPath);
      const aimlFiles = files.filter(file => file.endsWith('.xml') || file.endsWith('.aiml'));
      
      if (aimlFiles.length === 0) {
        logger.warn(`No AIML files found in directory: ${dirPath}`);
        return;
      }

      // For now, load the first AIML file found
      // In a full implementation, we might want to merge multiple files
      const firstFile = aimlFiles[0];
      const filePath = path.join(dirPath, firstFile);
      
      await this.loadFromFile(filePath);
      
      if (aimlFiles.length > 1) {
        logger.info(`Found ${aimlFiles.length} AIML files, loaded: ${firstFile}`);
      }
      
    } catch (error) {
      logger.error(`Failed to load AIML patterns from directory ${dirPath}:`, error);
      throw error;
    }
  }

  /**
   * Load default sample patterns
   */
  async loadSamplePatterns(): Promise<void> {
    const samplePath = path.join(__dirname, '../data/sample-patterns.xml');
    await this.loadFromFile(samplePath);
  }

  /**
   * Load patterns from ConfigMap mount point (for Kubernetes deployment)
   */
  async loadFromConfigMap(mountPath: string = '/etc/aiml'): Promise<void> {
    try {
      // Check if ConfigMap mount exists
      await fs.access(mountPath);
      await this.loadFromDirectory(mountPath);
      logger.info(`Loaded AIML patterns from ConfigMap at ${mountPath}`);
    } catch (error) {
      logger.warn(`ConfigMap not found at ${mountPath}, falling back to sample patterns`);
      await this.loadSamplePatterns();
    }
  }

  /**
   * Reload patterns (useful for hot-reloading)
   */
  async reloadPatterns(source?: string): Promise<void> {
    logger.info('Reloading AIML patterns...');
    
    if (source) {
      if (source.endsWith('.xml') || source.endsWith('.aiml')) {
        await this.loadFromFile(source);
      } else {
        await this.loadFromDirectory(source);
      }
    } else {
      // Try ConfigMap first, then fallback to samples
      await this.loadFromConfigMap();
    }
    
    logger.info('AIML patterns reloaded successfully');
  }
}