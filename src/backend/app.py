from flask import Flask, request, jsonify, session
from flask_cors import CORS
import os
import aiml
from autocorrect import spell
import requests
import uuid

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'your-secret-key-change-in-production')
CORS(app, supports_credentials=True)

# LiteLLM Configuration
LITELLM_BASE_URL = os.getenv('LITELLM_BASE_URL', 'http://host.docker.internal:8080')
LITELLM_API_KEY = os.getenv('LITELLM_API_KEY', '')

BRAIN_FILE = "./data/aiml_pretrained_model.dump"
k = aiml.Kernel()

# Store conversation context per session
session_history = {}

def get_contextual_response(question, session_id, aiml_response):
    """
    Handle contextual responses based on conversation history
    This works around the Python AIML library's broken <that> functionality
    """
    if session_id not in session_history:
        session_history[session_id] = {'messages': []}
    
    history = session_history[session_id]['messages']
    
    # Get last bot response if exists
    last_bot_response = None
    for msg in reversed(history):
        if msg['role'] == 'bot':
            last_bot_response = msg['text']
            break
    
    # Define contextual patterns based on last bot response
    if last_bot_response:
        last_upper = last_bot_response.upper()
        question_upper = question.upper()
        
        # Pattern: "What will you be eating?" -> any food response
        if "WHAT WILL YOU BE EATING" in last_upper:
            return f"How does it taste?"
        
        # Pattern: Location mentioned -> "I want to travel there"
        if ("WANT TO TRAVEL" in question_upper or "TRAVEL THERE" in question_upper):
            # Check if last response was about a location
            if any(word in last_upper for word in ["COUNTRY", "CITY", "ISLAND", "NATION", "LOCATED", "CAPITAL"]):
                return "That sounds like a great place to visit! What interests you most about it?"
        
        # Pattern: "I want to" responses
        if question_upper.startswith("I WANT TO"):
            return "That's an interesting goal. What's your plan to achieve it?"
        
        # Pattern: Follow-up questions with "there", "it", "that"
        if any(word in question_upper for word in [" THERE", " IT ", " THAT "]):
            # This is likely a follow-up, provide a contextual response
            if "TRAVEL" in question_upper or "GO" in question_upper or "VISIT" in question_upper:
                return "That sounds exciting! When are you planning to go?"
    
    # No contextual match, return original AIML response
    return aiml_response

# Initialize AIML kernel
if os.path.exists(BRAIN_FILE):
    print("Loading from brain file: " + BRAIN_FILE)
    k.loadBrain(BRAIN_FILE)
else:
    print("Parsing aiml files")
    # Load all AIML files from data directory
    # Load files in specific order: regular files first, then 'that' files last
    # This ensures <that> patterns have higher priority
    data_dir = "./data"
    if os.path.exists(data_dir):
        all_files = [f for f in os.listdir(data_dir) if f.endswith(".aiml")]
        # Separate 'that' files from others
        that_files = [f for f in all_files if 'that' in f.lower()]
        other_files = [f for f in all_files if 'that' not in f.lower()]
        
        # Load other files first
        for filename in sorted(other_files):
            filepath = os.path.join(data_dir, filename)
            print(f"Loading {filename}")
            k.learn(filepath)
        
        # Load 'that' files last to ensure <that> patterns have priority
        for filename in sorted(that_files):
            filepath = os.path.join(data_dir, filename)
            print(f"Loading {filename} (context patterns)")
            k.learn(filepath)
            
        print("Saving brain file: " + BRAIN_FILE)
        k.saveBrain(BRAIN_FILE)
    else:
        print("Warning: data directory not found")


@app.route("/")
def home():
    return jsonify({
        "status": "running",
        "message": "AIML Chatbot Backend"
    })


@app.route("/stats", methods=["GET"])
def get_stats():
    """Get token usage and spend statistics from LiteLLM"""
    try:
        # Fetch spend logs from LiteLLM
        response = requests.get(
            f"{LITELLM_BASE_URL}/spend/logs",
            headers={
                "Authorization": f"Bearer {LITELLM_API_KEY}"
            },
            params={
                "summarize": "true"
            },
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            # Extract total spend and tokens
            total_spend = 0
            total_tokens = 0
            
            if isinstance(data, list) and len(data) > 0:
                for entry in data:
                    total_spend += entry.get('spend', 0)
                    total_tokens += entry.get('total_tokens', 0)
            
            return jsonify({
                "total_tokens": total_tokens,
                "total_spend": round(total_spend, 6),
                "currency": "USD"
            })
        else:
            return jsonify({
                "total_tokens": 0,
                "total_spend": 0,
                "currency": "USD",
                "error": "Could not fetch stats from LiteLLM"
            })
    
    except Exception as e:
        print(f"Stats Error: {str(e)}")
        return jsonify({
            "total_tokens": 0,
            "total_spend": 0,
            "currency": "USD",
            "error": str(e)
        })


@app.route("/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json()
        user_message = data.get("message", "")
        mode = data.get("mode", "AIML")
        session_id = data.get("session_id", None)
        
        # Generate or use existing session ID
        if not session_id:
            session_id = str(uuid.uuid4())
        
        if not user_message:
            return jsonify({
                "response": "Please provide a message",
                "source": "error",
                "session_id": session_id
            }), 400
        
        # Apply spell correction
        corrected_words = [spell(w) for w in user_message.split()]
        question = " ".join(corrected_words)
        
        # Handle different modes
        if mode == "LLM":
            # Use LLM only
            llm_result = get_llm_response(question, session_id)
            
            # Store conversation history
            if session_id not in session_history:
                session_history[session_id] = {'messages': []}
            session_history[session_id]['messages'].append({'role': 'user', 'text': question})
            session_history[session_id]['messages'].append({'role': 'bot', 'text': llm_result["content"]})
            
            return jsonify({
                "response": llm_result["content"],
                "source": "LLM",
                "mode": mode,
                "tokens": llm_result["tokens"],
                "session_id": session_id
            })
        
        elif mode == "Hybrid":
            # Try AIML first, fallback to LLM
            print(f"DEBUG: Session ID: {session_id}, Question: {question}")
            
            # Get base AIML response
            aiml_response = k.respond(question, sessionID=session_id)
            print(f"DEBUG: AIML Response: {aiml_response}")
            
            # Apply contextual response handling
            contextual_response = get_contextual_response(question, session_id, aiml_response)
            print(f"DEBUG: Contextual Response: {contextual_response}")
            
            # Store conversation history
            if session_id not in session_history:
                session_history[session_id] = {'messages': []}
            session_history[session_id]['messages'].append({'role': 'user', 'text': question})
            session_history[session_id]['messages'].append({'role': 'bot', 'text': contextual_response})
            
            # Check if it's a fallback response (contains "Fallback:" anywhere)
            if contextual_response and "Fallback:" not in contextual_response:
                return jsonify({
                    "response": contextual_response,
                    "source": "AIML",
                    "mode": mode,
                    "tokens": {"prompt": 0, "completion": 0, "total": 0},
                    "session_id": session_id
                })
            else:
                # Use LLM as fallback
                llm_result = get_llm_response(question, session_id)
                
                # Update conversation history with LLM response
                session_history[session_id]['messages'][-1] = {'role': 'bot', 'text': llm_result["content"]}
                
                return jsonify({
                    "response": llm_result["content"],
                    "source": "LLM (AIML fallback)",
                    "mode": mode,
                    "tokens": llm_result["tokens"],
                    "session_id": session_id
                })
        
        else:  # AIML mode (default)
            # Get AIML response with session ID for context
            print(f"DEBUG: Session ID: {session_id}, Question: {question}")
            
            # Get base AIML response
            aiml_response = k.respond(question, sessionID=session_id)
            print(f"DEBUG: AIML Response: {aiml_response}")
            
            # Apply contextual response handling
            response = get_contextual_response(question, session_id, aiml_response)
            print(f"DEBUG: Final Response: {response}")
            
            # Check if it's a fallback response (contains "Fallback:" anywhere)
            is_fallback = response and "Fallback:" in response
            
            # Store conversation history
            if session_id not in session_history:
                session_history[session_id] = {'messages': []}
            session_history[session_id]['messages'].append({'role': 'user', 'text': question})
            
            # If AIML hit fallback, use LLM instead
            if is_fallback:
                print(f"DEBUG: AIML fallback detected, using LLM with context")
                llm_result = get_llm_response(question, session_id)
                response = llm_result["content"]
                session_history[session_id]['messages'].append({'role': 'bot', 'text': response})
                
                return jsonify({
                    "response": response,
                    "source": "LLM (AIML fallback)",
                    "mode": mode,
                    "tokens": llm_result["tokens"],
                    "session_id": session_id
                })
            
            # Store bot response in history
            session_history[session_id]['messages'].append({'role': 'bot', 'text': response})
            
            if response:
                return jsonify({
                    "response": response,
                    "source": "AIML",
                    "mode": mode,
                    "tokens": {"prompt": 0, "completion": 0, "total": 0},
                    "session_id": session_id
                })
            else:
                print(f"FALLBACK: No AIML pattern matched for: '{question}'")
                return jsonify({
                    "response": ":) (No pattern matched - using fallback)",
                    "source": "AIML-Fallback",
                    "mode": mode,
                    "tokens": {"prompt": 0, "completion": 0, "total": 0},
                    "session_id": session_id
                })
    
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({
            "response": "Sorry, an error occurred processing your message",
            "source": "error",
            "tokens": {"prompt": 0, "completion": 0, "total": 0},
            "session_id": session_id if 'session_id' in locals() else str(uuid.uuid4())
        }), 500


def get_llm_response(message, session_id=None):
    """Get response from LiteLLM with conversation context"""
    try:
        # Build messages with conversation history for context
        messages = [
            {"role": "system", "content": "You are a helpful and friendly chatbot assistant."}
        ]
        
        # Add conversation history if available
        if session_id and session_id in session_history:
            history = session_history[session_id]['messages']
            # Add last 5 exchanges for context (10 messages total)
            recent_history = history[-10:] if len(history) > 10 else history
            for msg in recent_history:
                role = "user" if msg['role'] == 'user' else "assistant"
                messages.append({"role": role, "content": msg['text']})
        
        # Add current message
        messages.append({"role": "user", "content": message})
        
        response = requests.post(
            f"{LITELLM_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {LITELLM_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "groq/llama-3.1-8b-instant",
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 150
            },
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            usage = data.get('usage', {})
            return {
                "content": data['choices'][0]['message']['content'],
                "tokens": {
                    "prompt": usage.get('prompt_tokens', 0),
                    "completion": usage.get('completion_tokens', 0),
                    "total": usage.get('total_tokens', 0)
                }
            }
        else:
            print(f"LLM API Error: {response.status_code} - {response.text}")
            return {
                "content": "Sorry, I'm having trouble connecting to the LLM service.",
                "tokens": {"prompt": 0, "completion": 0, "total": 0}
            }
    
    except requests.exceptions.Timeout:
        return {
            "content": "Sorry, the LLM service is taking too long to respond.",
            "tokens": {"prompt": 0, "completion": 0, "total": 0}
        }
    except Exception as e:
        print(f"LLM Error: {str(e)}")
        return {
            "content": "Sorry, I couldn't get a response from the LLM service.",
            "tokens": {"prompt": 0, "completion": 0, "total": 0}
        }


@app.route("/get")
def get_bot_response():
    """Legacy endpoint for compatibility"""
    query = request.args.get('msg', '')
    query = [spell(w) for w in query.split()]
    question = " ".join(query)
    response = k.respond(question)
    if response:
        return str(response)
    else:
        return ":)"


@app.route("/session/<session_id>", methods=["GET"])
def get_session_info(session_id):
    """Debug endpoint to check session predicates"""
    try:
        # Get session predicates
        predicates = {}
        # Note: pyAIML doesn't expose a direct way to get all predicates
        # but we can test if session exists by trying to get a predicate
        test_pred = k.getPredicate("topic", sessionID=session_id)
        return jsonify({
            "session_id": session_id,
            "topic": test_pred,
            "message": "Session exists" if test_pred else "Session may be new"
        })
    except Exception as e:
        return jsonify({
            "session_id": session_id,
            "error": str(e)
        })


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=3011, debug=True)
