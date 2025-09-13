from apify_client import ApifyClient

TOKEN = "apify_api_HoUK0czSrNJqYWrZ3ecdar4gZwrja10qCR9s"

client = ApifyClient(TOKEN)

run_input = {
    "searchTerms": [
        "UCLA"
    ],
    "maxItems": 20
}

run = client.actor("61RPP7dywgiy0JPD0").call(run_input=run_input)

for item in client.dataset(run["defaultDatasetId"]).iterate_items():
    print(item)