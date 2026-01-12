const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

const app = express();
const PORT = 3011;

// Middleware
app.use(cors());
app.use(express.json());

// AIML Engine
class AIMLEngine {
  constructor() {
    this.patterns = [];
    this.loadAIMLFiles();
  }

  async loadAIMLFiles() {
    const dataDir = path.join(__dirname, 'data');
    
    try {
      const files = fs.readdirSync(dataDir);
      const aimlFiles = files.filter(file => 
        file.endsWith('.xml') || file.endsWith('.aiml')
      );

      console.log(`Found ${aimlFiles.length} AIML files:`, aimlFiles);

      for (const file of aimlFiles) {
        await this.loadAIMLFile(path.join(dataDir, file));
      }

      console.log(`Loaded ${this.patterns.length} patterns total`);
    } catch (error) {
      console.error('Error loading AIML files:', error);
    }
  }

  async loadAIMLFile(filePath) {
    try {
      const xmlData = fs.readFileSync(filePath, 'utf8');
      const parser = new xml2js.Parser();
      
      const result = await parser.parseStringPromise(xmlData);
      
      if (result.aiml && result.aiml.category) {
        const categories = Array.isArray(result.aiml.category) 
          ? result.aiml.category 
          : [result.aiml.category];

        categories.forEach(category => {
          if (category.pattern && category.template) {
            const pattern = Array.isArray(category.pattern) 
              ? category.pattern[0] 
              : category.pattern;
            const template = Array.isArray(category.template) 
              ? category.template[0] 
              : category.template;

            this.patterns.push({
              pattern: this.normalizePattern(pattern),
              template: template,
              file: path.basename(filePath)
            });
          }
        });
      }
    } catch (error) {
      console.error(`Error loading AIML file ${filePath}:`, error);
    }
  }

  normalizePattern(pattern) {
    if (typeof pattern === 'string') {
      return pattern.toUpperCase().trim();
    }
    return String(pattern).toUpperCase().trim();
  }

  normalizeInput(input) {
    return input.toUpperCase().trim();
  }

  findMatch(input) {
    const normalizedInput = this.normalizeInput(input);
    
    // First try exact matches
    for (const item of this.patterns) {
      if (item.pattern === normalizedInput) {
        return {
          response: item.template,
          matchType: 'exact',
          file: item.file
        };
      }
    }

    // Then try wildcard matches
    for (const item of this.patterns) {
      if (item.pattern.includes('*')) {
        const regex = this.patternToRegex(item.pattern);
        if (regex.test(normalizedInput)) {
          return {
            response: item.template,
            matchType: 'wildcard',
            file: item.file
          };
        }
      }
    }

    // Default fallback
    return {
      response: "I don't understand that. Try asking me 'hello', 'what is your name', 'help', or 'what can you do'.",
      matchType: 'fallback',
      file: 'system'
    };
  }

  patternToRegex(pattern) {
    // Convert AIML pattern to regex
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const withWildcards = escaped.replace(/\\\*/g, '.*');
    return new RegExp(`^${withWildcards}$`);
  }

  getResponse(input) {
    const match = this.findMatch(input);
    console.log(`Input: "${input}" -> Pattern: "${match.matchType}" from ${match.file}`);
    return match.response;
  }
}

// Initialize AIML Engine
const aimlEngine = new AIMLEngine();

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'AIML Chatbot Backend Server',
    port: PORT,
    patterns: aimlEngine.patterns.length
  });
});

app.post('/chat', (req, res) => {
  const { message } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const response = aimlEngine.getResponse(message);
  
  res.json({
    input: message,
    response: response,
    timestamp: new Date().toISOString()
  });
});

app.get('/patterns', (req, res) => {
  res.json({
    total: aimlEngine.patterns.length,
    patterns: aimlEngine.patterns.map(p => ({
      pattern: p.pattern,
      file: p.file
    }))
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`AIML Chatbot Backend running on port ${PORT}`);
  console.log(`Available endpoints:`);
  console.log(`  GET  / - Server info`);
  console.log(`  POST /chat - Send message`);
  console.log(`  GET  /patterns - List all patterns`);
});