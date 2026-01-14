from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import aiml
from autocorrect import spell

app = Flask(__name__)
CORS(app)

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
        
        # Get AIML response
        response = k.respond(question)
        
        if response:
            return jsonify({
                "response": response,
                "source": "AIML",
                "mode": mode
            })
        else:
            return jsonify({
                "response": ":)",
                "source": "AIML",
                "mode": mode
            })
    
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({
            "response": "Sorry, an error occurred processing your message",
            "source": "error"
        }), 500


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
