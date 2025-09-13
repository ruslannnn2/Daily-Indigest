from apify_client import ApifyClient
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

TOKEN = os.getenv("apify_token")
actor = os.getenv("apify_actor")

client = ApifyClient(TOKEN)











run_input = {
    "searchTerms": [
        "UCLA"
    ],
    "maxItems": 20
}

run = client.actor(actor).call(run_input=run_input)

for item in client.dataset(run["defaultDatasetId"]).iterate_items():
    print(item)