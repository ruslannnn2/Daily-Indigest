import express, { type Request, type Response } from "express";
import axios from "axios";
import { DbConnection } from './module_bindings/index.ts';
import {
  Identity, ConnectionId, Timestamp
} from '@clockworklabs/spacetimedb-sdk';
import { ApifyClient } from 'apify-client';
import cors from "cors";
import * as cheerio from "cheerio";
import dotenv from "dotenv";

dotenv.config();

const TOKEN = process.env.apify_token;
const ACTOR = process.env.apify_actor;

const app = express();
app.use(express.json());
app.use(cors());

const client = new ApifyClient({
    token: TOKEN || "",
});

console.log("started");

// Define location-related field names (case-insensitive)
const LOCATION_FIELDS = new Set([
    'location', 'place', 'city', 'state', 'country', 'address', 
    'geo', 'coordinates', 'lat', 'lon', 'latitude', 'longitude',
    'zip', 'zipcode', 'postalcode', 'countrycode', 'region',
    'county', 'district', 'neighborhood', 'borough'
]);

// Interface for location field results
interface LocationField {
    path: string;
    value: any;
}

// Function to perform DFS and find location-related fields
function findLocationFields(obj: any, currentPath: string = ""): LocationField[] {
    const results: LocationField[] = [];
    
    if (typeof obj === 'object' && obj !== null) {
        if (Array.isArray(obj)) {
            // Handle arrays
            for (let i = 0; i < obj.length; i++) {
                const newPath = `${currentPath}[${i}]`;
                results.push(...findLocationFields(obj[i], newPath));
            }
        } else {
            // Handle objects
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    const newPath = currentPath ? `${currentPath}.${key}` : key;
                    
                    // Check if this key is a location-related field
                    if (LOCATION_FIELDS.has(key.toLowerCase())) {
                        results.push({ path: newPath, value: obj[key] });
                    }
                    
                    // Recursively search nested objects
                    results.push(...findLocationFields(obj[key], newPath));
                }
            }
        }
    }
    
    return results;
}

// Function to extract text from tweet (handling different field names)
function extractTweetText(tweet: any): string {
    // Try different possible field names for tweet text
    const textFields = ['text', 'full_text', 'content', 'body', 'message'];
    
    for (const field of textFields) {
        if (tweet[field] && typeof tweet[field] === 'string') {
            return tweet[field];
        }
    }
    
    // If no text field found, try to stringify the entire tweet
    try {
        return JSON.stringify(tweet);
    } catch (error) {
        return "Unable to extract text from tweet";
    }
}

// Function to send tweet data to Python API
async function sendToPythonAPI(tweet: any, locationData: LocationField[]): Promise<any> {
    try {
        // Extract tweet text
        const tweetText = extractTweetText(tweet);
        
        // Extract location values from the fields
        const locationValues = locationData
            .map(field => field.value)
            .filter(value => value && typeof value === 'string');
        
        // Prepare data to send to Python API
        const requestData = {
            tweet_text: tweetText,
            location_context: locationValues.join(', ')
        };
        
        // Send to Python API
        const response = await axios.post('http://localhost:5000/extract-location', requestData);
        
        return response.data;
    } catch (error) {
        console.error('Error calling Python API:', error);
        return null;
    }
}

async function connectSpacetime() {
    const db = await DbConnection.builder()
        .withUri("https://maincloud.spacetimedb.com")
        .withModuleName("hophack")
        .build();
    console.log("connected to SpacetimeDB");
    return db;
}

// Add db parameter to fetchTweets function
async function fetchTweets(db: any, topic: string) {
    const input = {
        "searchTerms": [topic],
        "maxItems": 100,
        "since_time": Date.now() - 60,
    };
    
    try {
        const run = await client.actor(ACTOR || "").call(input);
        console.log("Fetching tweet results");
        
        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        
        // Process each tweet
        for (const item of items) {
            // Find location fields in the tweet
            const locationFields = findLocationFields(item);
            console.log(item);
            // Extract tweet text
            const tweetText = extractTweetText(item);
            console.log(`Tweet text: ${tweetText.substring(0, 100)}...`);
            
            if (locationFields.length > 0) {
                console.log(`Found ${locationFields.length} location fields in tweet:`);
                
                // Log the location fields
                locationFields.forEach(field => {
                    console.log(`  ${field.path}: ${field.value}`);
                });
                
                // Send to Python API for processing
                const pythonApiResult = await sendToPythonAPI(item, locationFields);
                
                if (pythonApiResult) {
                    console.log('Python API result:', pythonApiResult);
                    const tweet_id = item.id;
                    console.log("before text");
                    const text = item.text;
                    console.log("before username, after text");
                    const username = item.author?.userName || "unknown";
                    console.log(username);
                    const createdAtMicros = Timestamp.fromDate(new Date(item.createdAt || Date.now()));
                    console.log(createdAtMicros, typeof createdAtMicros, "hi");
                    const lat = pythonApiResult.coordinates?.[0] || 0;
                    const lon = pythonApiResult.coordinates?.[1] || 0;
                    if (lat ===0 && lon === 0) {
                        console.log('no coords');
                        continue;
                    }
                    await db.reducers.insertTweet(
                        tweet_id,
                        text,
                        username,
                        lat, 
                        lon,
                        createdAtMicros,
                        topic
                    );
                }
            } else {
                console.log('No location fields found in tweet, sending text only');
                
                // Send to Python API with just the tweet text
                const pythonApiResult = await sendToPythonAPI(item, []);
                
                if (pythonApiResult) {
                    console.log('Python API result:', pythonApiResult);
                }
            }
        }
    } catch (error) {
        console.error('Error fetching tweets:', error);
    }
}

// Initialize and start the process
async function main() {
    try {
        const db = await connectSpacetime();
        // Pass db to fetchTweets
        // await fetchTweets(db, "UCLA");
    } catch (error) {
        console.error('Error in main process:', error);
    }
}

let trendingTopics: string[] = [];

// Scrape function
async function scrapeTrends(): Promise<string[]> {
  try {
    const url = "https://trends24.in/united-states/";
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    const trendLinks: string[] = [];
    $("span.trend-name a.trend-link").each((_, el) => {
      trendLinks.push($(el).text().trim());
    });

    return trendLinks.slice(0, 50);
  } catch (error) {
    console.error("Error scraping trends:", error);
    return [];
  }
}

// Background updater
async function updateTrends() {
  try {
    const newTopics = await scrapeTrends();
    trendingTopics = newTopics;
  } catch (error) {
    console.error("Failed to update trends:", error);
  }
}

// Schedule updates every 60s
setInterval(updateTrends, 60_000);

// API endpoint
app.get("/api/trends", async (_req: Request, res: Response) => {
  try {
    // Optionally, always scrape fresh when called:
    const topics = await scrapeTrends();
    res.json(topics);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch trends" });
  }
});

// Start the Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    updateTrends();
});

// Start the main process
main();