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
            response = get_llm_response(question)
            return jsonify({
                "response": response,
                "source": "LLM",
                "mode": mode
            })
        
        elif mode == "Hybrid":
            # Try AIML first, fallback to LLM
            aiml_response = k.respond(question)
            
            # Check if it's a fallback response (starts with "Fallback:")
            if aiml_response and not aiml_response.startswith("Fallback:"):
                return jsonify({
                    "response": aiml_response,
                    "source": "AIML",
                    "mode": mode
                })
            else:
                # Use LLM as fallback
                llm_response = get_llm_response(question)
                return jsonify({
                    "response": llm_response,
                    "source": "LLM (AIML fallback)",
                    "mode": mode
                })
        
        else:  # AIML mode (default)
            # Get AIML response
            response = k.respond(question)
            
            if response:
                return jsonify({
                    "response": response,
                    "source": "AIML",
                    "mode": mode
                })
            else:
                print(f"FALLBACK: No AIML pattern matched for: '{question}'")
                return jsonify({
                    "response": ":) (No pattern matched - using fallback)",
                    "source": "AIML-Fallback",
                    "mode": mode
                })
    
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({
            "response": "Sorry, an error occurred processing your message",
            "source": "error"
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
            return data['choices'][0]['message']['content']
        else:
            print(f"LLM API Error: {response.status_code} - {response.text}")
            return "Sorry, I'm having trouble connecting to the LLM service."
    
    except requests.exceptions.Timeout:
        return "Sorry, the LLM service is taking too long to respond."
    except Exception as e:
        print(f"LLM Error: {str(e)}")
        return "Sorry, I couldn't get a response from the LLM service."


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
