from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from typing import Optional, Tuple
import torch
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
import csv
from pathlib import Path
import time
import math
import random

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Load ML model
print("Loading FLAN model...")
device = "cuda" if torch.cuda.is_available() else "cpu"
tokenizer = AutoTokenizer.from_pretrained("google/flan-t5-base")
model = AutoModelForSeq2SeqLM.from_pretrained("google/flan-t5-base").to(device)
model.eval()
print(f"FLAN loaded on {device}")

# Constants
FEW_SHOT_PROMPT = """You are an expert at extracting location data from tweet text and metadata. Given a tweet, you will output the most relevant location from smallest-to-largest administrative units (city, state, region, country). If you can't identify it, return Unknown.

Example 1: {"text": "Just landed in Paris for the summer!", "location_values": "France"}, output: "Paris, France"

Example 2: {"text": "i am who i am", "location_values": "in your walls"}, output: "Unknown"

Example 3: {"text": "I love programming!", "location_values": "web3, metaverse"}, output: "Unknown"

Example 4: {"text": "Exploring the beautiful beaches of Bali.", "location_values": "Indonesia"}, output: "Bali, Indonesia"

Example 5: {"text": "The game today was amazing!", "location_values": "user/location: Memphis, Tennessee; media/location: San Francisco, California"}, output: "San Francisco, California, USA"
"""
CACHE_FILE = Path("geocache.csv")

# Initialize cache
_cache = {}

def add_location_noise(coords: Tuple[float, float], max_km: float = 25) -> Tuple[float, float]:
    if coords is None:
        return None

    lat, lon = coords

    max_deg_lat = max_km / 111.0

    angle = random.uniform(0, 2 * math.pi)
    radius = random.uniform(0, max_deg_lat)
    dlat = radius * math.cos(angle)
    dlon = (radius * math.sin(angle)) / math.cos(math.radians(lat))

    return lat + dlat, lon + dlon

def load_cache():
    global _cache
    if CACHE_FILE.exists():
        with open(CACHE_FILE, newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    _cache[row['location_text']] = (
                        float(row['lat']),
                        float(row['lon'])
                    )
                except (ValueError, KeyError):  
                    continue   
    else:
        CACHE_FILE.touch()
    print(f"Loaded {len(_cache)} items from cache")

def lookup(location_text: str) -> Optional[Tuple[float, float]]:
    """Return cached coordinates if they exist."""
    return _cache.get(location_text)

def save_to_cache(location_text: str, coords: Tuple[float, float]) -> None:
    """Append a new location + coordinates to cache CSV and memory."""
    _cache[location_text] = coords
    write_header = not CACHE_FILE.exists() or CACHE_FILE.stat().st_size == 0
    with open(CACHE_FILE, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["location_text", "lat", "lon"])
        if write_header:
            writer.writeheader()
        writer.writerow({
            "location_text": location_text,
            "lat": coords[0],
            "lon": coords[1],
        })
    print(f"[Cache] Stored: {location_text} -> {coords}")

def extract_location(text: str, location_context: str = "") -> str:
    # Combine tweet text with location context if available
    full_text = text
    if location_context:
        full_text = f"{text} [Location context: {location_context}]"
    
    prompt = FEW_SHOT_PROMPT + f"Tweet: {full_text}\nLocation:"
    inputs = tokenizer(prompt, return_tensors="pt").to(device)
    with torch.no_grad():
        outputs = model.generate(**inputs, max_new_tokens=64)
    location = tokenizer.decode(outputs[0], skip_special_tokens=True).strip()
    return location if location else "Unknown"

def geocode_coordinates(location: str) -> Optional[Tuple[float, float]]:
    if location == "Unknown":
        return None
        
    # Rate limiting - be respectful to Nominatim's servers
    time.sleep(1)
    
    url = "https://nominatim.openstreetmap.org/search"
    params = {
        "q": location,
        "format": "json",
        "limit": 1,
        "addressdetails": 1
    }
    try:
        response = requests.get(
            url, 
            params=params, 
            headers={"User-Agent": "location-extraction-api/1.0"}
        )
        response.raise_for_status()
        data = response.json()
        if data:
            return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception as e:
        print(f"Error fetching coordinates for {location}: {e}")
    return None

# Load cache on startup
load_cache()

@app.route('/extract-location', methods=['POST'])
def extract_location_endpoint():
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    # Extract tweet text and location context
    tweet_text = data.get('tweet_text', '')
    location_context = data.get('location_context', '')
    
    if not tweet_text:
        return jsonify({'error': 'No tweet text provided'}), 400
    
    try:
        # Extract location from text
        location = extract_location(tweet_text, location_context)
        
        # Check cache first
        coords = lookup(location)
        
        # If not in cache, geocode
        if coords is None:
            coords = geocode_coordinates(location)
            if coords:
                save_to_cache(location, coords)
        
        response_data = {
            'extracted_location': location,
            'coordinates': add_location_noise(coords, max_km=25),
            'tweet_text': tweet_text,
            'location_context': location_context
        }
        
        return jsonify(response_data)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'device': device,
        'cache_size': len(_cache)
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)