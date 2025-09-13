# app.py
from flask import Flask, jsonify
from flask_cors import CORS
import requests
from bs4 import BeautifulSoup
from spacetimedb_sdk.spacetimedb_async_client import SpacetimeDBAsyncClient

spacetime_client = SpacetimeDBAsyncClient(module_bindings)

from apify_client import ApifyClient
import os
from dotenv import load_dotenv
import threading
import time

load_dotenv()

lock = threading.Lock()

TOKEN = os.getenv("apify_token")
actor = os.getenv("apify_actor")

client = ApifyClient(TOKEN)

app = Flask(__name__)
CORS(app)  # allow requests from React frontend

trending_topics = []

def scrape_trends():
    url = "https://trends24.in/united-states/"
    response = requests.get(url)
    soup = BeautifulSoup(response.text, "html.parser")
    trend_links = soup.select("span.trend-name a.trend-link")
    trending_topics = [link.text.strip() for link in trend_links]
    return trending_topics[:50]



def update_trends():
    global trending_topics
    while True:
        new_topics = scrape_trends()
        with lock:
            trending_topics = new_topics
        time.sleep(60)

@app.route("/api/trends", methods=["GET"])
def get_trends():
    topics = scrape_trends()
    return jsonify(topics)

if __name__ == "__main__":
    app.run(debug=True)