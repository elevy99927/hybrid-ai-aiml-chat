# Hybrid AI AIML Chat

A hybrid chatbot that combines AIML patterns with LLM responses, featuring a React frontend and Node.js backend.

## Features

- **3 Chat Modes**:
  - 🤖 **AIML**: Traditional pattern-based responses
  - 🧠 **LLM**: AI-powered responses via LiteLLM
  - 🔄 **Hybrid**: Smart combination (AIML first, LLM fallback)
- **Backend**: Node.js server on port 3011 with multi-mode support
- **Frontend**: React + Vite application on port 3010 with mode switching
- **LiteLLM Integration**: Connects to LiteLLM running on Kubernetes/Kind
- **Docker Support**: Full containerization with docker-compose

## Quick Start

### Prerequisites
- LiteLLM running on Kind/Kubernetes in `lite-llm` namespace
- kubectl configured to access your cluster

### Option 1: Automated Start (Recommended)
```bash
./start-with-litellm.sh
```

This script will:
1. Start LiteLLM port-forward (8080:4000)
2. Launch docker-compose
3. Clean up port-forward on exit

### Option 2: Manual Start

1. **Start LiteLLM Port-Forward**:
   ```bash
   kubectl port-forward -n lite-llm svc/lite-helm-litellm 8080:4000
   ```

2. **Start Services**:
   ```bash
   docker-compose up
   ```

3. **Access**:
   - Frontend: http://localhost:3010
   - Backend: http://localhost:3011

## Chat Modes

### AIML Mode 🤖
- Uses traditional AIML pattern matching
- Fast, deterministic responses
- Good for structured conversations

### LLM Mode 🧠  
- Uses LiteLLM for AI-powered responses
- Creative, contextual responses
- Requires LiteLLM service

### Hybrid Mode 🔄
- Tries AIML patterns first
- Falls back to LLM for unmatched inputs
- Best of both worlds

## API Endpoints

- `GET /` - Server info and configuration
- `POST /chat` - Send message with mode selection
  ```json
  {
    "message": "Hello",
    "mode": "AIML|LLM|Hybrid"
  }
  ```
- `GET /patterns` - List all AIML patterns

## Configuration

### Environment Variables
- `LITELLM_BASE_URL`: LiteLLM service URL (default: http://host.docker.internal:8080)
- `LITELLM_API_KEY`: LiteLLM API key (default: changeit)

### LiteLLM Setup
The backend connects to LiteLLM via:
- Port-forward: `kubectl port-forward -n lite-llm svc/lite-helm-litellm 8080:4000`
- Docker host networking: `host.docker.internal:8080`

## AIML Files

Add AIML patterns to `src/backend/data/`:
- `casual-chat.xml` - Basic conversational patterns
- Add more `.xml` or `.aiml` files as needed

## Development

### Manual Setup

#### Backend
```bash
cd src/backend
npm install
LITELLM_BASE_URL=http://localhost:8080 npm start
```

#### Frontend
```bash
cd src/frontend
npm install
npm run dev
```

## Docker Images

When pushed to `dev` branch, GitHub Actions builds:
- `elevy99927/hybrid-ai-aiml-chat-backend:dev`
- `elevy99927/hybrid-ai-aiml-chat-frontend:dev`

## Project Structure

```
├── src/
│   ├── backend/          # Node.js server (port 3011)
│   │   ├── server.js     # Main server file
│   │   ├── data/         # AIML files directory
│   │   │   └── casual-chat.xml
│   │   ├── package.json
│   │   └── Dockerfile
│   └── frontend/         # React + Vite (port 3010)
│       ├── src/
│       │   ├── App.jsx   # Main chat component
│       │   ├── App.css   # Styling
│       │   └── main.jsx
│       ├── package.json
│       └── Dockerfile
├── docker-compose.yml    # Container orchestration
└── README.md
```


## AIML xmls
source from:
https://github.com/hartez/XmppBot-AIML/tree/master

## License

MIT License