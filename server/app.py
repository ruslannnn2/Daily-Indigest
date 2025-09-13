# app.py
from flask import Flask, jsonify
from flask_cors import CORS
import requests
from bs4 import BeautifulSoup

app = Flask(__name__)
CORS(app)  # allow requests from React frontend

def scrape_trends():
    url = "https://trends24.in/united-states/"
    response = requests.get(url)
    soup = BeautifulSoup(response.text, "html.parser")
    trend_links = soup.select("span.trend-name a.trend-link")
    trending_topics = [link.text.strip() for link in trend_links]
    return trending_topics[50:100]

@app.route("/api/trends", methods=["GET"])
def get_trends():
    topics = scrape_trends()
    return jsonify(topics)

if __name__ == "__main__":
    app.run(debug=True)
