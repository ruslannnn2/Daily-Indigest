import requests
import json
import time

def test_location_api():
    # API endpoint
    url = "http://localhost:5000/extract-location"
    
    # Example tweets with location information
    test_tweets = [
        {
            "text": "Loving the sunny weather in San Francisco today!",
            "location_values": "San Francisco, CA"
        },
        {
            "text": "Just arrived in New York City. The energy here is amazing!",
            "location_values": "New York, NY"
        },
        {
            "text": "Beautiful beaches in Miami, Florida",
            "location_values": "Miami, FL"
        },
        {
            "text": "Exploring the historic sites in Boston, Massachusetts",
            "location_values": "Boston, MA"
        },
        {
            "text": "Hiking in the mountains near Denver, Colorado",
            "location_values": "Denver, CO"
        }
    ]
    
    print("Testing Location Extraction API...")
    print("=" * 50)
    
    for i, tweet in enumerate(test_tweets, 1):
        print(f"\nTest #{i}:")
        print(f"Tweet: {tweet['text']}")
        print(f"Location Context: {tweet['location_values']}")
        
        try:
            # Send POST request to the API
            response = requests.post(url, json=tweet)
            
            # Check if the request was successful
            if response.status_code == 200:
                result = response.json()
                print("API Response:")
                print(f"  Extracted Location: {result.get('extracted_location', 'N/A')}")
                print(f"  Coordinates: {result.get('coordinates', 'N/A')}")
            else:
                print(f"Error: API returned status code {response.status_code}")
                print(f"Response: {response.text}")
                
        except requests.exceptions.ConnectionError:
            print("Error: Could not connect to the API. Make sure it's running on localhost:5000")
            break
        except Exception as e:
            print(f"Error: {e}")
            
        # Add a small delay between requests to be respectful of the API
        time.sleep(0.5)
    
    print("\n" + "=" * 50)
    print("Test completed.")

if __name__ == "__main__":
    test_location_api()