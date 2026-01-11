import { parseString } from 'xml2js';
import { promisify } from 'util';
import { AimlPattern, AimlCategory } from '../types';
import logger from '../utils/logger';

const parseXML = promisify(parseString);

export class AimlEngine {
  private patterns: AimlPattern[] = [];
  private loaded = false;

  /**
   * Load and parse AIML patterns from XML content
   */
  async loadAimlFromString(xmlContent: string): Promise<void> {
    try {
      const result = await parseXML(xmlContent);
      
      if (!result.aiml || !result.aiml.category) {
        throw new Error('Invalid AIML format: missing aiml or category elements');
      }

      const categories = Array.isArray(result.aiml.category) 
        ? result.aiml.category 
        : [result.aiml.category];

      this.patterns = [];
      
      for (let i = 0; i < categories.length; i++) {
        const category = categories[i];
        
        if (!category.pattern || !category.template) {
          logger.warn(`Skipping invalid category at index ${i}: missing pattern or template`);
          continue;
        }

        const pattern = this.extractTextContent(category.pattern[0]);
        const template = this.extractTextContent(category.template[0]);
        
        if (!pattern || !template) {
          logger.warn(`Skipping category at index ${i}: empty pattern or template`);
          continue;
        }

        const aimlPattern: AimlPattern = {
          id: `pattern_${i}`,
          pattern: pattern.toUpperCase().trim(),
          template: template.trim(),
          priority: this.calculatePatternPriority(pattern),
          category: category.$ && category.$.topic ? category.$.topic : undefined
        };

        this.patterns.push(aimlPattern);
      }

      // Sort patterns by priority (higher priority first)
      this.patterns.sort((a, b) => b.priority - a.priority);
      
      this.loaded = true;
      logger.info(`Loaded ${this.patterns.length} AIML patterns`);
      
    } catch (error) {
      logger.error('Failed to load AIML patterns:', error);
      throw error;
    }
  }

  /**
   * Extract text content from XML element, handling both string and object formats
   */
  private extractTextContent(element: any): string {
    if (typeof element === 'string') {
      return element;
    }
    
    if (element && typeof element === 'object') {
      // Handle nested elements like <srai>
      if (element._) {
        return element._;
      }
      
      // Handle elements with nested content
      if (typeof element === 'object' && element.constructor === Object) {
        return Object.values(element).join(' ').trim();
      }
    }
    
    return String(element || '');
  }

  /**
   * Calculate pattern priority based on specificity
   * More specific patterns (fewer wildcards) get higher priority
   */
  private calculatePatternPriority(pattern: string): number {
    const wildcardCount = (pattern.match(/\*/g) || []).length + (pattern.match(/_/g) || []).length;
    const wordCount = pattern.split(/\s+/).length;
    
    // Base priority on word count, reduce for wildcards
    return wordCount * 10 - wildcardCount * 5;
  }

  /**
   * Match user input against loaded patterns
   */
  matchPattern(input: string): AimlPattern | null {
    if (!this.loaded || this.patterns.length === 0) {
      return null;
    }

    const normalizedInput = input.toUpperCase().trim();
    
    for (const pattern of this.patterns) {
      if (this.isPatternMatch(normalizedInput, pattern.pattern)) {
        return pattern;
      }
    }
    
    return null;
  }

  /**
   * Check if input matches a pattern with wildcard support
   */
  private isPatternMatch(input: string, pattern: string): boolean {
    // Convert AIML pattern to regex
    // * matches one or more words
    // _ matches exactly one word
    let regexPattern = pattern
      .replace(/\*/g, '(.+)')  // * matches one or more words
      .replace(/_/g, '(\\S+)') // _ matches one word
      .replace(/\s+/g, '\\s+'); // normalize whitespace
    
    // Ensure exact match
    regexPattern = `^${regexPattern}$`;
    
    try {
      const regex = new RegExp(regexPattern);
      return regex.test(input);
    } catch (error) {
      logger.warn(`Invalid regex pattern: ${regexPattern}`, error);
      return false;
    }
  }

  /**
   * Generate response from template with variable substitution
   */
  generateResponse(pattern: AimlPattern, input: string): string {
    let response = pattern.template;
    
    // Extract wildcards from input using the pattern
    const wildcards = this.extractWildcards(input, pattern.pattern);
    
    // Replace wildcard placeholders in template
    wildcards.forEach((wildcard, index) => {
      const placeholder = `<star index="${index + 1}"/>`;
      const simplePlaceholder = `<star/>`;
      
      response = response.replace(new RegExp(placeholder, 'g'), wildcard);
      if (index === 0) {
        response = response.replace(new RegExp(simplePlaceholder, 'g'), wildcard);
      }
    });
    
    // Handle basic AIML tags
    response = this.processSraiTags(response);
    
    return response.trim();
  }

  /**
   * Extract wildcard values from input based on pattern
   */
  private extractWildcards(input: string, pattern: string): string[] {
    const wildcards: string[] = [];
    
    // Convert pattern to regex with capture groups
    let regexPattern = pattern
      .replace(/\*/g, '(.+)')
      .replace(/_/g, '(\\S+)')
      .replace(/\s+/g, '\\s+');
    
    regexPattern = `^${regexPattern}$`;
    
    try {
      const regex = new RegExp(regexPattern);
      const match = input.match(regex);
      
      if (match) {
        // Skip the full match (index 0) and return capture groups
        wildcards.push(...match.slice(1));
      }
    } catch (error) {
      logger.warn(`Failed to extract wildcards: ${regexPattern}`, error);
    }
    
    return wildcards;
  }

  /**
   * Process SRAI tags (symbolic reduction)
   */
  private processSraiTags(template: string): string {
    // Simple SRAI processing - in a full implementation, this would recursively call the engine
    const sraiRegex = /<srai>(.*?)<\/srai>/gi;
    
    return template.replace(sraiRegex, (match, content) => {
      // For now, just return the content without recursive processing
      // In a full implementation, this would call matchPattern recursively
      return content.trim();
    });
  }

  /**
   * Get all loaded patterns
   */
  getPatterns(): AimlPattern[] {
    return [...this.patterns];
  }

  /**
   * Check if engine is loaded
   */
  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Get pattern count
   */
  getPatternCount(): number {
    return this.patterns.length;
  }

  /**
   * Process a user message and return response
   */
  processMessage(message: string): string | null {
    const matchedPattern = this.matchPattern(message);
    
    if (matchedPattern) {
      return this.generateResponse(matchedPattern, message);
    }
    
    return null;
  }
}