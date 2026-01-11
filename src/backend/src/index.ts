import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createLogger } from './utils/logger';

const app = express();
const port = process.env.PORT || 3001;
const logger = createLogger();

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
  });
});

// Basic API routes
app.get('/api', (req, res) => {
  res.json({
    message: 'Kubernetes Chatbot API',
    version: '0.1.0',
    status: 'running',
  });
});

// Start server
app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
  logger.info(`Health check available at http://localhost:${port}/health`);
});

export default app;