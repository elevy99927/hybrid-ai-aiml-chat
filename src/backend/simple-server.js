const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { parseString } = require('xml2js');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Simple AIML Engine
class SimpleAimlEngine {
  constructor() {
    this.patterns = [];
    this.loaded = false;
  }

  async loadPatternsFromFile(filePath) {
    try {
      const xmlContent = fs.readFileSync(filePath, 'utf8');
      await this.loadPatternsFromString(xmlContent);
    } catch (error) {
      console.error('Failed to load patterns from file:', error);
      throw error;
    }
  }

  async loadPatternsFromString(xmlContent) {
    return new Promise((resolve, reject) => {
      parseString(xmlContent, (err, result) => {
        if (err) {
          reject(err);
          return;
        }

        try {
          if (!result.aiml || !result.aiml.category) {
            throw new Error('Invalid AIML format');
          }

          const categories = Array.isArray(result.aiml.category) 
            ? result.aiml.category 
            : [result.aiml.category];

          this.patterns = [];
          
          categories.forEach((category, index) => {
            if (category.pattern && category.template) {
              const pattern = this.extractText(category.pattern[0]);
              const template = this.extractText(category.template[0]);
              
              if (pattern && template) {
                this.patterns.push({
                  id: `pattern_${index}`,
                  pattern: pattern.toUpperCase().trim(),
                  template: template.trim(),
                  priority: this.calculatePriority(pattern)
                });
              }
            }
          });

          // Sort by priority (higher first)
          this.patterns.sort((a, b) => b.priority - a.priority);
          this.loaded = true;
          
          console.log(`Loaded ${this.patterns.length} AIML patterns`);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  extractText(element) {
    if (typeof element === 'string') {
      return element;
    }
    if (element && element._) {
      return element._;
    }
    return String(element || '');
  }

  calculatePriority(pattern) {
    const wildcardCount = (pattern.match(/\*/g) || []).length + (pattern.match(/_/g) || []).length;
    const wordCount = pattern.split(/\s+/).length;
    return wordCount * 10 - wildcardCount * 5;
  }

  processMessage(input) {
    if (!this.loaded || this.patterns.length === 0) {
      return null;
    }

    const normalizedInput = input.toUpperCase().trim();
    
    for (const pattern of this.patterns) {
      if (this.matchPattern(normalizedInput, pattern.pattern)) {
        return pattern.template;
      }
    }
    
    return null;
  }

  matchPattern(input, pattern) {
    // Simple exact match for now
    if (input === pattern) {
      return true;
    }
    
    // Handle wildcards
    let regexPattern = pattern
      .replace(/\*/g, '(.+)')
      .replace(/_/g, '(\\S+)')
      .replace(/\s+/g, '\\s+');
    
    regexPattern = `^${regexPattern}$`;
    
    try {
      const regex = new RegExp(regexPattern);
      return regex.test(input);
    } catch (error) {
      return false;
    }
  }

  getStatus() {
    return {
      loaded: this.loaded,
      patternCount: this.patterns.length
    };
  }
}

// Initialize AIML engine
const aimlEngine = new SimpleAimlEngine();

// Load patterns on startup
async function initializeServer() {
  try {
    const patternsPath = path.join(__dirname, 'simple-patterns.xml');
    await aimlEngine.loadPatternsFromFile(patternsPath);
    console.log('AIML engine initialized successfully');
  } catch (error) {
    console.error('Failed to initialize AIML engine:', error);
    process.exit(1);
  }
}

// Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    aiml: aimlEngine.getStatus()
  });
});

app.post('/api/chat', (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ 
        error: 'Message is required and must be a string' 
      });
    }

    console.log(`User message: "${message}"`);
    
    const response = aimlEngine.processMessage(message);
    
    if (response) {
      console.log(`AIML response: "${response}"`);
      res.json({
        response,
        source: 'aiml',
        timestamp: new Date().toISOString()
      });
    } else {
      const fallbackResponse = "I don't understand that. Try asking me 'hello', 'what is your name', 'help', or 'what can you do'.";
      console.log(`Fallback response: "${fallbackResponse}"`);
      res.json({
        response: fallbackResponse,
        source: 'fallback',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      response: 'Sorry, something went wrong. Please try again.',
      source: 'error'
    });
  }
});

app.get('/api/patterns', (req, res) => {
  res.json({
    patterns: aimlEngine.patterns,
    count: aimlEngine.patterns.length,
    loaded: aimlEngine.loaded
  });
});

// Start server
initializeServer().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Simple AIML Chatbot Backend running on port ${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
    console.log(`💬 Chat endpoint: http://localhost:${PORT}/api/chat`);
    console.log(`📝 Patterns: http://localhost:${PORT}/api/patterns`);
  });
});