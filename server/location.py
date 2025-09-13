import requests
from typing import Optional, Tuple

from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
import torch

print("Loading FLAN model...")
device = "cuda" if torch.cuda.is_available() else "cpu"

tokenizer = AutoTokenizer.from_pretrained("google/flan-t5-base")
model = AutoModelForSeq2SeqLM.from_pretrained("google/flan-t5-base").to(device)
model.eval()
print(f"FLAN loaded on {device}")

FEW_SHOT_PROMPT = """You are an expert at extracting location data from tweet text and metadata. Given a tweet, you will output the most relevant location from smallest-to-largest administrative units (city, state, region, country). If you can't identify it, return Unknown.

"""

def extract_location(text: str) -> str:
    prompt = FEW_SHOT_PROMPT + f"Tweet: {text}\nLocation:"
    inputs = tokenizer(prompt, return_tensors="pt").to(device)
    with torch.no_grad():
        outputs = model.generate(**inputs, max_new_tokens=64)
    location = tokenizer.decode(outputs[0], skip_special_tokens=True).strip()
    return location if location else "Unknown"

def geocode_coordinates(location: str) -> Optional[Tuple[float, float, float, float]]:
    url = "https://nominatim.openstreetmap.org/search"
    params = {
        "q": location,
        "format": "json",
        "limit": 1
    }
    try:
        response = requests.get(url, params=params, headers={"User-Agent": "hophacks-app"})
        response.raise_for_status()
        data = response.json()
        if data:
            boundingbox = data[0]['boundingbox']
            if boundingbox:
                s, n, w, e  = map(float, boundingbox)
                return s, n, w, e
            else:
                lat, lon = float(data[0]["lat"]), float(data[0]["lon"])
                delta = 0.01
                return lat - delta, lat + delta, lon - delta, lon + delta
    except Exception as e:
        print(f"Error fetching coordinates for {location}: {e}")
    return None