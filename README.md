# Simple AIML Chatbot

A simple chatbot built with AIML (Artificial Intelligence Markup Language) patterns, featuring a React frontend and Node.js backend.

## Features

- 🤖 **AIML Engine**: 10 predefined Q&A patterns
- 💬 **Chat Interface**: Clean React UI with real-time responses
- 🐳 **Docker Support**: Full containerization with Docker Compose
- 🚀 **CI/CD**: GitHub Actions for automated testing and deployment
- 📦 **Multi-platform**: Supports AMD64 and ARM64 architectures

## Quick Start

### Local Development

1. **Start Backend**:
   ```bash
   cd src/backend
   node simple-server.js
   ```

2. **Start Frontend**:
   ```bash
   cd src/frontend
   npm install
   npm run dev
   ```

3. **Access**: http://localhost:3000

### Docker Compose

1. **Build and Run**:
   ```bash
   docker-compose up --build
   ```

2. **Access**: 
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

## AIML Patterns

The chatbot responds to these patterns:
- `hello` / `hi`
- `what is your name`
- `how are you`
- `what can you do`
- `help`
- `thank you`
- `bye`
- `what time is it`
- `what is the weather`

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/chat` - Send message to chatbot
- `GET /api/patterns` - View loaded patterns

## Docker Images

Images are automatically built and pushed to Docker Hub:
- `elevy99927/aiml-chatbot-backend:latest`
- `elevy99927/aiml-chatbot-frontend:latest`

## GitHub Actions Setup

To enable automatic Docker image builds, add this secret to your GitHub repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add new repository secret:
   - **Name**: `DOCKER_PASSWORD`
   - **Value**: Your Docker Hub access token

### Creating Docker Hub Access Token

1. Login to [Docker Hub](https://hub.docker.com)
2. Go to **Account Settings** → **Security**
3. Click **New Access Token**
4. Name: `github-actions`
5. Permissions: **Read, Write, Delete**
6. Copy the generated token

## Project Structure

```
├── .github/workflows/     # GitHub Actions
├── src/
│   ├── backend/          # Node.js API server
│   │   ├── simple-server.js
│   │   └── Dockerfile
│   └── frontend/         # React chat UI
│       ├── src/
│       └── Dockerfile
├── simple-patterns.xml   # AIML patterns
├── docker-compose.yml    # Container orchestration
└── README.md
```

## Development

### Adding New AIML Patterns

Edit `simple-patterns.xml`:

```xml
<category>
  <pattern>YOUR PATTERN</pattern>
  <template>Bot response here</template>
</category>
```

### Testing

```bash
# Backend tests
cd src/backend && npm test

# Frontend tests  
cd src/frontend && npm test

# Docker Compose test
docker-compose up -d
curl -X POST localhost:3001/api/chat -H "Content-Type: application/json" -d '{"message": "hello"}'
```

## License

MIT License