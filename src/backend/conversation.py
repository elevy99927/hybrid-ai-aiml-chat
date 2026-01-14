import os
import aiml
from autocorrect import spell

BRAIN_FILE = "./data/aiml_pretrained_model.dump"

k = aiml.Kernel()

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
        print("Error: data directory not found")
        exit(1)


while True:
    query = input("User > ")
    if query.lower() in ['quit', 'exit', 'bye']:
        print("Goodbye!")
        break
    query = [spell(w) for w in query.split()]
    question = " ".join(query)
    response = k.respond(question)
    if response:
        print("bot > ", response)
    else:
        print("bot > :)")
