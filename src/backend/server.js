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

// LLM Service
class LLMService {
  constructor() {
    this.baseUrl = process.env.LITELLM_BASE_URL || 'http://host.docker.internal:8080';
    this.apiKey = process.env.LITELLM_API_KEY || 'changeit';
    this.model = 'groq/llama-3.1-8b-instant'; // Hardcoded model as requested
  }

  async sendMessage(message) {
    try {
      console.log(`LLM Service: Sending message to ${this.model}`);
      
      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: message
            }
          ],
          max_tokens: 150,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`LLM API error: ${response.status} - ${errorText}`);
        throw new Error(`LLM API error: ${response.status}`);
      }

      const data = await response.json();
      console.log(`LLM Service: Received response from ${this.model}`);
      return data.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
    } catch (error) {
      console.error('LLM Service Error:', error);
      return 'Sorry, the LLM service is currently unavailable.';
    }
  }
}

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

// Initialize AIML Engine and LLM Service
const aimlEngine = new AIMLEngine();
const llmService = new LLMService();

// Hybrid Service
class HybridService {
  constructor(aimlEngine, llmService) {
    this.aimlEngine = aimlEngine;
    this.llmService = llmService;
  }

  async getResponse(message) {
    // First try AIML
    const aimlMatch = this.aimlEngine.findMatch(message);
    
    // If AIML has a good match (not fallback), use it
    if (aimlMatch.matchType !== 'fallback') {
      return {
        response: aimlMatch.response,
        source: 'AIML',
        matchType: aimlMatch.matchType,
        file: aimlMatch.file
      };
    }

    // Otherwise, use LLM
    const llmResponse = await this.llmService.sendMessage(message);
    return {
      response: llmResponse,
      source: 'LLM',
      matchType: 'llm',
      file: 'llm-service'
    };
  }
}

const hybridService = new HybridService(aimlEngine, llmService);

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Hybrid AI AIML Chat Backend Server',
    port: PORT,
    patterns: aimlEngine.patterns.length,
    modes: ['AIML', 'LLM', 'Hybrid'],
    litellm_url: process.env.LITELLM_BASE_URL || 'http://host.docker.internal:8080',
    llm_model: 'groq/llama-3.1-8b-instant',
    aiml_data_path: './src/backend/data'
  });
});

app.post('/chat', async (req, res) => {
  const { message, mode = 'AIML' } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    let result;

    switch (mode) {
      case 'AIML':
        console.log(`AIML Mode: Processing message with local XML patterns`);
        const aimlResponse = aimlEngine.getResponse(message);
        result = {
          response: aimlResponse,
          source: 'AIML',
          mode: 'AIML'
        };
        break;

      case 'LLM':
        console.log(`LLM Mode: Processing message with ${llmService.model}`);
        const llmResponse = await llmService.sendMessage(message);
        result = {
          response: llmResponse,
          source: 'LLM',
          mode: 'LLM',
          model: llmService.model
        };
        break;

      case 'Hybrid':
        console.log(`Hybrid Mode: Trying AIML first, LLM fallback`);
        const hybridResult = await hybridService.getResponse(message);
        result = {
          response: hybridResult.response,
          source: hybridResult.source,
          mode: 'Hybrid',
          matchType: hybridResult.matchType,
          file: hybridResult.file
        };
        if (hybridResult.source === 'LLM') {
          result.model = llmService.model;
        }
        break;

      default:
        return res.status(400).json({ error: 'Invalid mode. Use AIML, LLM, or Hybrid' });
    }

    console.log(`Input: "${message}" | Mode: ${mode} | Source: ${result.source}`);

    res.json({
      input: message,
      ...result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      response: 'Sorry, I encountered an error processing your message.'
    });
  }
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