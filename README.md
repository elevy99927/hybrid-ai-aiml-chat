# AIML Chatbot

A simple AIML-based chatbot with a React frontend and Node.js backend.

## Features

- **Backend**: Node.js server on port 3011 that loads all AIML files from `src/backend/data/`
- **Frontend**: React + Vite application on port 3010 with a clean chatbox interface
- **AIML Engine**: Processes XML/AIML files with pattern matching and wildcard support
- **Docker Support**: Full containerization with docker-compose

## Quick Start

### Using Docker Compose (Recommended)

```bash
docker-compose up
```

This will start both services:
- Frontend: http://localhost:3010
- Backend: http://localhost:3011

### Manual Setup

#### Backend
```bash
cd src/backend
npm install
npm start
```

#### Frontend
```bash
cd src/frontend
npm install
npm run dev
```

## API Endpoints

- `GET /` - Server info and pattern count
- `POST /chat` - Send message to chatbot
- `GET /patterns` - List all loaded patterns

## AIML Files

The backend automatically loads all `.xml` and `.aiml` files from `src/backend/data/`. Currently includes:
- `casual-chat.xml` - Basic conversational patterns

## Adding New AIML Patterns

1. Create or edit `.xml` files in `src/backend/data/`
2. Use standard AIML 2.0 format
3. Restart the backend to reload patterns

## Example AIML Pattern

```xml
<category>
  <pattern>HELLO</pattern>
  <template>Hi there! How can I help you?</template>
</category>
```

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

## License

MIT License