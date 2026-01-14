import aiml
import os

# Create a test kernel
k = aiml.Kernel()

# Load only the necessary files
k.learn("./data/client.aiml")
k.learn("./data/that.aiml")
k.learn("./data/std-that.aiml")

session_id = "test-session-123"

# Test conversation
print("Test 1:")
response1 = k.respond("I AM HUNGRY", sessionID=session_id)
print(f"User: I AM HUNGRY")
print(f"Bot: {response1}")

print("\nTest 2:")
response2 = k.respond("APPLE", sessionID=session_id)
print(f"User: APPLE")
print(f"Bot: {response2}")
print(f"Expected: How does it taste?")
