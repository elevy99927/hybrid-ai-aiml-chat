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
LITELLM_MODEL = os.getenv('LITELLM_MODEL', '')
LITELLM_MAX_CONTEXT_TOKENS = int(os.getenv('LITELLM_MAX_CONTEXT_TOKENS', '1800'))
LITELLM_MAX_COMPLETION_TOKENS = int(os.getenv('LITELLM_MAX_COMPLETION_TOKENS', '150'))
LITELLM_SYSTEM_PROMPT = os.getenv('LITELLM_SYSTEM_PROMPT', 'You are a helpful and friendly chatbot assistant.')

# LLMLingua Configuration
LLMLINGUA_MODEL = os.getenv('LLMLINGUA_MODEL', 'microsoft/llmlingua-2-bert-base-multilingual-cased-meetingbank')
LLMLINGUA_DEVICE = os.getenv('LLMLINGUA_DEVICE', 'cpu')

DEBUG_LLMLINGUA = 'true' #os.getenv('DEBUG_LLMLINGUA', 'true').lower() == 'true'

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
        llmlingua_enabled = data.get("llmlingua_enabled", False)
        
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
        print(f"DEBUG: Original: '{user_message}' -> Corrected: '{question}'")
        
        # Handle different modes
        if mode == "LLM":
            # Use LLM only
            llm_result = get_llm_response(question, session_id, llmlingua_enabled)
            
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
                "session_id": session_id,
                "llmlingua_used": llm_result.get("llmlingua_used", False),
                "error": llm_result.get("error")
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
                    "session_id": session_id,
                    "llmlingua_used": False
                })
            else:
                # Use LLM as fallback
                llm_result = get_llm_response(question, session_id, llmlingua_enabled)
                
                # Update conversation history with LLM response
                session_history[session_id]['messages'][-1] = {'role': 'bot', 'text': llm_result["content"]}
                
                return jsonify({
                    "response": llm_result["content"],
                    "source": "LLM (AIML fallback)",
                    "mode": mode,
                    "tokens": llm_result["tokens"],
                    "session_id": session_id,
                    "llmlingua_used": llm_result.get("llmlingua_used", False),
                    "error": llm_result.get("error")
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
                print(f"DEBUG: History before LLM call: {session_history[session_id]['messages'][-5:]}")
                llm_result = get_llm_response(question, session_id, llmlingua_enabled)
                response = llm_result["content"]
                session_history[session_id]['messages'].append({'role': 'bot', 'text': response})
                
                return jsonify({
                    "response": response,
                    "source": "LLM (AIML fallback)",
                    "mode": mode,
                    "tokens": llm_result["tokens"],
                    "session_id": session_id,
                    "llmlingua_used": llm_result.get("llmlingua_used", False),
                    "error": llm_result.get("error")
                })
            
            # Store bot response in history (non-fallback case)
            session_history[session_id]['messages'].append({'role': 'bot', 'text': response})
            
            if response:
                return jsonify({
                    "response": response,
                    "source": "AIML",
                    "mode": mode,
                    "tokens": {"prompt": 0, "completion": 0, "total": 0},
                    "session_id": session_id,
                    "llmlingua_used": False
                })
            else:
                print(f"FALLBACK: No AIML pattern matched for: '{question}'")
                return jsonify({
                    "response": ":) (No pattern matched - using fallback)",
                    "source": "AIML-Fallback",
                    "mode": mode,
                    "tokens": {"prompt": 0, "completion": 0, "total": 0},
                    "session_id": session_id,
                    "llmlingua_used": False
                })
    
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({
            "response": "Sorry, an error occurred processing your message",
            "source": "error",
            "tokens": {"prompt": 0, "completion": 0, "total": 0},
            "session_id": session_id if 'session_id' in locals() else str(uuid.uuid4()),
            "llmlingua_used": False
        }), 500


def get_llm_response(message, session_id=None, llmlingua_enabled=False):
    """Get response from LiteLLM with conversation context and optional prompt compression"""
    try:
        llmlingua_used = False
        compressed_message = message
        
        # Apply LLMLingua compression if enabled
        if llmlingua_enabled:
            if DEBUG_LLMLINGUA:
                print("=" * 80)
                print("DEBUG LLMLINGUA: Compression ENABLED")
                print(f"DEBUG LLMLINGUA: Original message length: {len(message)} chars")
                print(f"DEBUG LLMLINGUA: Original message:\n{message}")
                print("-" * 80)
            
            try:
                from llmlingua import PromptCompressor
                
                # Initialize compressor (cached after first use)
                if not hasattr(get_llm_response, 'compressor'):
                    if DEBUG_LLMLINGUA:
                        print("DEBUG LLMLINGUA: Initializing PromptCompressor...")
                    get_llm_response.compressor = PromptCompressor(
                        model_name=LLMLINGUA_MODEL,
                        use_llmlingua2=True,
                        device_map=LLMLINGUA_DEVICE
                    )
                    if DEBUG_LLMLINGUA:
                        print("DEBUG LLMLINGUA: PromptCompressor initialized successfully")
                
                # Compress the prompt
                if DEBUG_LLMLINGUA:
                    print("DEBUG LLMLINGUA: Starting compression...")
                
                result = get_llm_response.compressor.compress_prompt(
                    message,
                    rate=0.5,  # 50% compression
                    force_tokens=['\n', '?', '!', '.']
                )
                
                compressed_message = result['compressed_prompt']
                llmlingua_used = True
                
                if DEBUG_LLMLINGUA:
                    print(f"DEBUG LLMLINGUA: Compression successful!")
                    print(f"DEBUG LLMLINGUA: Compressed message length: {len(compressed_message)} chars")
                    print(f"DEBUG LLMLINGUA: Compressed message:\n{compressed_message}")
                    print(f"DEBUG LLMLINGUA: Compression ratio: {result.get('ratio', 'N/A')}")
                    print(f"DEBUG LLMLINGUA: Original tokens: {result.get('origin_tokens', 'N/A')}")
                    print(f"DEBUG LLMLINGUA: Compressed tokens: {result.get('compressed_tokens', 'N/A')}")
                    print("=" * 80)
                else:
                    print(f"LLMLingua: Original ({len(message)} chars) -> Compressed ({len(compressed_message)} chars), Ratio: {result.get('ratio', 'N/A')}")
                    
            except Exception as e:
                print(f"ERROR: LLMLingua compression failed: {str(e)}")
                if DEBUG_LLMLINGUA:
                    import traceback
                    traceback.print_exc()
                raise  # Re-raise the exception to fail fast
        else:
            if DEBUG_LLMLINGUA:
                print("DEBUG LLMLINGUA: Compression DISABLED (llmlingua_enabled=False)")
        
        # Build messages with conversation history for context
        messages = [
            {"role": "system", "content": LITELLM_SYSTEM_PROMPT}
        ]
        
        # Add conversation history if available (budget-friendly: last 5 messages only)
        if session_id and session_id in session_history:
            history = session_history[session_id]['messages']
            print(f"DEBUG LLM: Total history length: {len(history)}")
            print(f"DEBUG LLM: Full history: {history}")
            
            # Keep only last 5 messages for budget optimization
            recent_history = history[-5:] if len(history) > 5 else history
            print(f"DEBUG LLM: Recent history (last 5): {recent_history}")
            
            # Sliding window approach: prioritize recent messages, drop oldest when exceeding limit
            total_tokens = 15  # System prompt
            context_messages = []
            
            # First pass: add all messages
            for msg in recent_history:
                # Rough estimate: 1 token ≈ 0.75 words ≈ 4 characters
                msg_tokens = len(msg['text']) // 4
                role = "user" if msg['role'] == 'user' else "assistant"
                context_messages.append({
                    "role": role, 
                    "content": msg['text'],
                    "tokens": msg_tokens
                })
                total_tokens += msg_tokens
            
            # Second pass: if exceeds limit, remove oldest messages until within budget
            while total_tokens > LITELLM_MAX_CONTEXT_TOKENS and len(context_messages) > 0:
                removed = context_messages.pop(0)  # Remove oldest message
                total_tokens -= removed['tokens']
                if DEBUG_LLMLINGUA:
                    print(f"DEBUG LLM: Removed oldest message ({removed['tokens']} tokens) to stay within budget")
            
            # Clean up: remove 'tokens' field before sending to LLM
            for msg in context_messages:
                del msg['tokens']
            
            messages.extend(context_messages)
            print(f"DEBUG LLM: Messages being sent to LLM: {messages}")
            if DEBUG_LLMLINGUA:
                print(f"DEBUG LLM: Final context size: {total_tokens} tokens (limit: {LITELLM_MAX_CONTEXT_TOKENS})")
        else:
            print(f"DEBUG LLM: No history found for session {session_id}")
        
        # Add current message (compressed if LLMLingua was used)
        messages.append({"role": "user", "content": compressed_message})
        
        # Debug: Print full prompt being sent to LiteLLM
        if DEBUG_LLMLINGUA:
            print("=" * 80)
            print("DEBUG LLM: FULL PROMPT BEING SENT TO LITELLM")
            print("-" * 80)
            for i, msg in enumerate(messages):
                print(f"Message {i} [{msg['role']}]:")
                print(f"  Content: {msg['content'][:200]}{'...' if len(msg['content']) > 200 else ''}")
                print(f"  Length: {len(msg['content'])} chars")
                print(f"  Est. tokens: {len(msg['content']) // 4}")
            total_chars = sum(len(msg['content']) for msg in messages)
            print("-" * 80)
            print(f"Total prompt length: {total_chars} chars")
            print(f"Estimated total tokens: {total_chars // 4}")
            print("=" * 80)
        
        response = requests.post(
            f"{LITELLM_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {LITELLM_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": LITELLM_MODEL,
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": LITELLM_MAX_COMPLETION_TOKENS
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
                },
                "llmlingua_used": llmlingua_used,
                "error": None
            }
        else:
            error_msg = f"Status {response.status_code}"
            try:
                error_data = response.json()
                error_msg = error_data.get('error', {}).get('message', error_msg)
            except:
                error_msg = response.text[:200] if response.text else error_msg
            
            print(f"LLM API Error: {response.status_code} - {error_msg}")
            return {
                "content": "Sorry, I'm having trouble connecting to the LLM service.",
                "tokens": {"prompt": 0, "completion": 0, "total": 0},
                "llmlingua_used": False,
                "error": error_msg
            }
    
    except requests.exceptions.Timeout:
        return {
            "content": "Sorry, the LLM service is taking too long to respond.",
            "tokens": {"prompt": 0, "completion": 0, "total": 0},
            "llmlingua_used": False,
            "error": "Request timeout (30s)"
        }
    except Exception as e:
        print(f"LLM Error: {str(e)}")
        return {
            "content": "Sorry, I couldn't get a response from the LLM service.",
            "tokens": {"prompt": 0, "completion": 0, "total": 0},
            "llmlingua_used": False,
            "error": str(e)
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
