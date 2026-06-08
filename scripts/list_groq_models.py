import requests
import os
import json

api_key = os.environ.get("GROQ_API_KEY")

if not api_key:
    print("Error: GROQ_API_KEY not set")
    print("Run: GROQ_API_KEY=gsk_xxx python scripts/list_groq_models.py")
    exit(1)

url = "https://api.groq.com/openai/v1/models"
headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()

print(f"Status: {response.status_code}\n")
print("Available models:")
for model in sorted(data.get("data", []), key=lambda x: x["id"]):
    print(f"  - {model['id']}")
