from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import aiml
from autocorrect import spell
import requests

app = Flask(__name__)
CORS(app)

# LiteLLM Configuration
LITELLM_BASE_URL = os.getenv('LITELLM_BASE_URL', 'http://host.docker.internal:8080')
LITELLM_API_KEY = os.getenv('LITELLM_API_KEY', '')

BRAIN_FILE = "./data/aiml_pretrained_model.dump"
k = aiml.Kernel()

# Initialize AIML kernel
if os.path.exists(BRAIN_FILE):
    print("Loading from brain file: " + BRAIN_FILE)
    k.loadBrain(BRAIN_FILE)
else:
    print("Parsing aiml files")
    # Load all AIML files from data directory
    data_dir = "./data"
    if os.path.exists(data_dir):
        for filename in os.listdir(data_dir):
            if filename.endswith(".aiml"):
                filepath = os.path.join(data_dir, filename)
                print(f"Loading {filename}")
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
        
        if not user_message:
            return jsonify({
                "response": "Please provide a message",
                "source": "error"
            }), 400
        
        # Apply spell correction
        corrected_words = [spell(w) for w in user_message.split()]
        question = " ".join(corrected_words)
        
        # Handle different modes
        if mode == "LLM":
            # Use LLM only
            llm_result = get_llm_response(question)
            return jsonify({
                "response": llm_result["content"],
                "source": "LLM",
                "mode": mode,
                "tokens": llm_result["tokens"]
            })
        
        elif mode == "Hybrid":
            # Try AIML first, fallback to LLM
            aiml_response = k.respond(question)
            
            # Check if it's a fallback response (starts with "Fallback:")
            if aiml_response and not aiml_response.startswith("Fallback:"):
                return jsonify({
                    "response": aiml_response,
                    "source": "AIML",
                    "mode": mode,
                    "tokens": {"prompt": 0, "completion": 0, "total": 0}
                })
            else:
                # Use LLM as fallback
                llm_result = get_llm_response(question)
                return jsonify({
                    "response": llm_result["content"],
                    "source": "LLM (AIML fallback)",
                    "mode": mode,
                    "tokens": llm_result["tokens"]
                })
        
        else:  # AIML mode (default)
            # Get AIML response
            response = k.respond(question)
            
            if response:
                return jsonify({
                    "response": response,
                    "source": "AIML",
                    "mode": mode,
                    "tokens": {"prompt": 0, "completion": 0, "total": 0}
                })
            else:
                print(f"FALLBACK: No AIML pattern matched for: '{question}'")
                return jsonify({
                    "response": ":) (No pattern matched - using fallback)",
                    "source": "AIML-Fallback",
                    "mode": mode,
                    "tokens": {"prompt": 0, "completion": 0, "total": 0}
                })
    
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({
            "response": "Sorry, an error occurred processing your message",
            "source": "error",
            "tokens": {"prompt": 0, "completion": 0, "total": 0}
        }), 500


def get_llm_response(message):
    """Get response from LiteLLM"""
    try:
        response = requests.post(
            f"{LITELLM_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {LITELLM_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "groq/llama-3.1-8b-instant",
                "messages": [
                    {"role": "system", "content": "You are a helpful and friendly chatbot assistant."},
                    {"role": "user", "content": message}
                ],
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


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=3011, debug=True)
