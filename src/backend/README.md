# AIML Chatbot Backend

Python Flask backend for the AIML chatbot, based on Easy-Chatbot implementation.

## Features

- AIML pattern matching for conversational responses
- Spell correction for user input
- REST API endpoint for frontend integration
- Brain file caching for faster startup
- Comprehensive AIML knowledge base

## Installation

```bash
pip install -r requirements.txt
```

## Running the Server

```bash
python app.py
```

The server will start on `http://localhost:3011`

## Running Console Mode

For testing AIML responses in the console:

```bash
python conversation.py
```

## API Endpoints

### POST /chat
Main endpoint for chatbot interactions.

**Request:**
```json
{
  "message": "Hello",
  "mode": "AIML"
}
```

**Response:**
```json
{
  "response": "Hi there!",
  "source": "AIML",
  "mode": "AIML"
}
```

### GET /get
Legacy endpoint for compatibility.

**Query Parameter:**
- `msg`: The user message

**Response:** Plain text response

### GET /
Health check endpoint.

## AIML Data

The `data/` directory contains 100+ AIML files covering various topics:
- General conversation
- Knowledge (science, history, geography)
- Personality and emotions
- Entertainment (movies, music)
- And much more

On first run, all AIML files are parsed and saved to a brain file (`data/aiml_pretrained_model.dump`) for faster subsequent startups.

## Docker

Build:
```bash
docker build -t aiml-backend .
```

Run:
```bash
docker run -p 3011:3011 aiml-backend
```
