import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createLogger } from './utils/logger';
import { AimlService } from './services/aiml-service';

const app = express();
const port = process.env.PORT || 3001;
const logger = createLogger();

// Initialize AIML service
const aimlService = new AimlService();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    aiml: aimlService.getStatus(),
  });
});

// Basic API routes
app.get('/api', (req, res) => {
  res.json({
    message: 'Kubernetes Chatbot API with AIML',
    version: '0.1.0',
    status: 'running',
    aiml: aimlService.getStatus(),
  });
});

// Chat endpoint
app.post('/api/chat', (req, res) => {
  try {
    const { message, sessionId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Try AIML first
    const aimlResponse = aimlService.processMessage(message);
    
    if (aimlResponse) {
      logger.info(`AIML response for "${message}": ${aimlResponse}`);
      res.json({
        response: aimlResponse,
        source: 'aiml',
        sessionId: sessionId || `session_${Date.now()}`,
      });
    } else {
      // Fallback response (later we'll integrate with liteLLM)
      logger.info(`No AIML match for "${message}", using fallback`);
      res.json({
        response: "I don't have a specific answer for that in my AIML patterns. In the future, I'll use AI to help answer your question!",
        source: 'fallback',
        sessionId: sessionId || `session_${Date.now()}`,
      });
    }
  } catch (error) {
    logger.error('Chat endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin endpoints
app.get('/api/admin/patterns', (req, res) => {
  try {
    const patterns = aimlService.getPatterns();
    res.json({ patterns });
  } catch (error) {
    logger.error('Admin patterns endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/admin/status', (req, res) => {
  try {
    res.json({
      aimlEngine: aimlService.getStatus(),
      liteLLM: {
        connected: false,
        lastCheck: new Date(),
        responseTime: null,
      },
      uptime: process.uptime(),
    });
  } catch (error) {
    logger.error('Admin status endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Initialize AIML service and start server
async function startServer() {
  try {
    logger.info('Initializing AIML service...');
    await aimlService.initialize();
    logger.info('AIML service initialized successfully');
    
    app.listen(port, () => {
      logger.info(`🚀 Kubernetes Chatbot Server running on port ${port}`);
      logger.info(`📋 Health check: http://localhost:${port}/health`);
      logger.info(`💬 Chat API: http://localhost:${port}/api/chat`);
      logger.info(`⚙️  Admin API: http://localhost:${port}/api/admin/status`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;