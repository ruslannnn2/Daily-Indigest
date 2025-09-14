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
import { GoogleGenerativeAI } from "@google/generative-ai";
import { get } from "http";

dotenv.config();

const TOKEN = process.env.apify_token;
const ACTOR = process.env.apify_actor;

const genAI = new GoogleGenerativeAI(process.env.gemini_api_key || "");

let db: any;
const topicWatchers: Map<string, NodeJS.Timeout> = new Map();
let trendingTopics: string[] = [];
let cachedTweets: any[] = [];

const app = express();
app.use(express.json());
app.use(cors());

const client = new ApifyClient({
    token: TOKEN || "",
});

// Gemini explanation endpoint
app.get("/api/explain/:topic", async (req, res) => {
    try {
        const { topic } = req.params;
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        const prompt = `Explain the current significance and context of the topic "${topic}" in 2-3 concise paragraphs. 
                       Focus on why this topic is trending or noteworthy right now. 
                       Keep the explanation informative but conversational.`;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const explanation = response.text();
        
        res.json({ explanation });
    } catch (error) {
        console.error("Gemini API error:", error);
        res.status(500).json({ error: "Failed to generate explanation" });
    }
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

async function dropTopic(db: any, topic: string) {
    await db.reducers.deleteTweetsByTopic(topic);
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

async function connectSpacetime(): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      DbConnection.builder()
        .withUri("https://maincloud.spacetimedb.com")
        .withModuleName("tweetsv2")
        .onConnect((connection, identity, token) => {
          console.log("✅ DB connected via onConnect");
          resolve(connection); // resolve the promise when ready
        })
        .build();
    } catch (err) {
      reject(err);
    }
  });
}

// Add db parameter to fetchTweets function
async function fetchTweets(db: any, topic: string) {
    const input = {
        "searchTerms": [topic],
        "maxItems": 100,
        "since_time": Date.now() - 300000,
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
                        topic.replace(/\s+/g, "_").replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '')
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

async function updateTrends() {
  try {
    const newTopics = await scrapeTrends();
    await reconcileWatchers(newTopics);
  } catch (err) {
    console.error('updateTrends error:', err);
  }
}

function startWatcherForTopic(topic: string) {
  if (topicWatchers.has(topic)) return; // already watching
  console.log(`▶️ startWatcher: ${topic}`);

  // immediate backfill (do not await — but catch errors)
  fetchTweets(db, topic).catch(err => console.error(`[watcher:${topic}] initial fetch error`, err));

  // repeating collection every minute
  const interval = setInterval(() => {
    fetchTweets(db, topic).catch(err => console.error(`[watcher:${topic}] interval fetch error`, err));
  }, 300_000);

  topicWatchers.set(topic, interval);
}

async function stopWatcherForTopic(topic: string) {
  console.log(`⏹ stopWatcher: ${topic}`);
  const interval = topicWatchers.get(topic);
  if (interval) {
    clearInterval(interval);
    topicWatchers.delete(topic);
  }

  // drop topic data from DB
  try {
    await dropTopic(db, topic);
  } catch (err) {
    console.error(`[stopWatcher:${topic}] error dropping data:`, err);
  }
}

async function reconcileWatchers(newTopics: string[]) {
  const oldSet = new Set(trendingTopics);

  // STOP watchers for topics that are no longer in newTopics
  for (const oldTopic of oldSet) {
    if (!newTopics.includes(oldTopic)) {
      await stopWatcherForTopic(oldTopic);
    }
  }

  // START watchers for topics newly appearing in newTopics
  for (const t of newTopics) {
    if (!oldSet.has(t)) {
      startWatcherForTopic(t);
    }
  }

  // replace trendingTopics with the fresh list (we keep all 50 in memory)
  trendingTopics = newTopics;
}

// API endpoint
app.get("/api/trends", async (_req: Request, res: Response) => {
  try {
    // Optionally, always scrape fresh when called:
    const topics = await scrapeTrends();
    res.json(topics.slice(0,25));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch trends" });
  }
});

app.get("/api/tweets", (_req: Request, res: Response) => {
  try {
    const tweetsTable = db.db.tweet;
    const rows = Array.from(tweetsTable.iter());
    res.json(rows);
  } catch (err) {
    console.error("/api/tweets error:", err);
    res.status(500).json({ error: "Failed to fetch tweets" });
  }
});

app.get("/api/flattened/:topic", (req: Request, res: Response) => {
  try {
    if (!db) return res.status(500).json({ error: "no db"});
    const topic = req.params.topic;
    const tweetsTable = db.db.tweet;
    const rows = Array.from(tweetsTable.iter()).filter(r => r.topic === topic.replace(/\s+/g, "_").replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, ''));
    const mapped = rows.map((r: any) => {
      const loc = r.location ?? r.geo ?? {};
      const lat = (typeof loc.lat === "number" ? loc.lat : (r.latitude ?? r.lat));
      const lon = (typeof loc.lon === "number" ? loc.lon : (r.longitude ?? r.lon));

      const text = r.text ?? r.content ?? r.body ?? r.message ?? "";
      const author = r.username ?? r.author?.userName ?? r.author?.username ?? "unknown";
      const topic = r.topic ?? "";

      return { topic, lon, lat, text, author };
    }).filter(item => {
      // Filter out items without valid coordinates
      return typeof item.lat === 'number' && typeof item.lon === 'number' && 
             !isNaN(item.lat) && !isNaN(item.lon) &&
             item.lat !== 0 && item.lon !== 0 && // Filter out 0,0 coordinates which are likely invalid
             Math.abs(item.lat) <= 90 && Math.abs(item.lon) <= 180; // Basic bounds check
    });
    
    console.log(`Topic "${topic}": Found ${rows.length} total tweets, ${mapped.length} with valid coordinates`);
    res.json(mapped);
  } catch (err) {
    console.error("/api/flattened/:topic error:", err);
    res.status(500).json({ error: "Failed to fetch flattened tweets for topic" });
  }
});

app.get("/api/flattened", (_req: Request, res: Response) => {
  try {
    if (!db) return res.status(500).json({ error: "no db"});
    const tweetsTable = db.db.tweet;
    const rows = Array.from(tweetsTable.iter());

    const mapped = rows.map((r: any) => {
      const loc = r.location ?? r.geo ?? {};
      const lat = (typeof loc.lat === "number" ? loc.lat : (r.latitude ?? r.lat));
      const lon = (typeof loc.lon === "number" ? loc.lon : (r.longitude ?? r.lon));

      const text = r.text ?? r.content ?? r.body ?? r.message ?? "";
      const author = r.username ?? r.author?.userName ?? r.author?.username ?? "unknown";
      const topic = r.topic ?? "";

      return { topic, lon, lat, text, author };
    }).filter(item => {
      // Filter out items without valid coordinates
      return typeof item.lat === 'number' && typeof item.lon === 'number' && 
             !isNaN(item.lat) && !isNaN(item.lon) &&
             item.lat !== 0 && item.lon !== 0 && // Filter out 0,0 coordinates which are likely invalid
             Math.abs(item.lat) <= 90 && Math.abs(item.lon) <= 180; // Basic bounds check
    });

    console.log(`All topics: Found ${rows.length} total tweets, ${mapped.length} with valid coordinates`);
    res.json(mapped);
  } catch (err) {
    console.error("/api/flattened error:", err);
    res.status(500).json({ error: "Failed to fetch flattened tweets" });
  }
});

app.get("/api/tweets/:topic", (req: Request, res: Response) => {
  try {
    const topic = req.params.topic;
    console.log("Requested topic:", topic);
    const tweetsTable = db.db.tweet;
    
    // Filter tweets by topic
    const rows = Array.from(tweetsTable.iter()).filter(r => r.topic === topic.replace(/\s+/g, "_").replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, ''));
    console.log(`Found ${rows.length} tweets for topic '${topic}'`);
    
    // Define a recursive function to handle nested BigInt values
    function processBigIntValues(obj: any): any {
      if (obj === null || obj === undefined) {
        return obj;
      }
      
      if (typeof obj === 'bigint') {
        return obj.toString();
      }
      
      if (Array.isArray(obj)) {
        return obj.map(item => processBigIntValues(item));
      }
      
      if (typeof obj === 'object') {
        const result: Record<string, any> = {};
        for (const [key, value] of Object.entries(obj)) {
          result[key] = processBigIntValues(value);
        }
        return result;
      }
      
      return obj;
    }
    
    // Process all rows to handle BigInt values
    const serializedRows = rows.map(row => processBigIntValues(row));
    
    // Use a custom replacer function for JSON.stringify
    const safeStringify = (obj: any) => {
      return JSON.stringify(obj, (_, value) => 
        typeof value === 'bigint' ? value.toString() : value
      );
    };
    
    // Send the response with the safe stringifier
    res.setHeader('Content-Type', 'application/json');
    res.send(safeStringify(serializedRows));
    
  } catch (err) {
    console.error(`/api/tweets/${req.params.topic} error:`, err);
    res.status(500).json({ error: "Failed to fetch topic tweets" });
  }
});

async function init() {
    try {
        db = await connectSpacetime();
        console.log("connected to spacetime");
        const tweetsTable = db.db.tweet; // table handle
        db.subscriptionBuilder()
            .onApplied((ctx: any) => {
            console.log(`Subscription applied: ${tweetsTable.count()} rows in cache`);
            })
            .onError((err: any) => {
            console.error("Tweet subscription error:", err);
            })
            .subscribe(["SELECT * FROM tweet"]);
        // await updateTrends();                    //NEEDED TO START DATA COLLECTION
        // setInterval(updateTrends, 60_000_000);  //NEEDED TO START DATA COLLECTION
        // console.log("initialized");
    } catch (err) {
        console.error('error while initializing', err);
        process.exit(1);
    }
}

function getTopicSelection(topic: string, count = 20): string[] {
  if (!db) return [];

  const tweetsTable = db.db.tweet;
  const allTweets = Array.from(tweetsTable.iter()).filter((t) => t.topic === topic.replace(/\s+/g, "_").replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, ''));

  const shuffled = allTweets.sort(() => 0.5 - Math.random());
  console.log(shuffled);
  return shuffled.slice(0, (20 > shuffled.length ? shuffled.length : 20)).map((t) => t.content);
}

async function summarizeGemini(topic: string) {
  const tweets = getTopicSelection(topic, 20);
  if (tweets.length === 0) return "No tweets available for this topic.";
  console.log(tweets);

  const prompt = `You are a helpful assistant summarizing social media activity. Summarize the following ${tweets.length} tweets about the topic "${topic}". Summarize the main themes and what people are saying. Identify the general consensus or mood (positive, negative, mixed). If there are disagreements or distinct groups of opinions, describe them briefly. Keep the maximum word count at 75. Tweets: ${tweets.join("\n")}`;
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const result = await model.generateContent(prompt);
  console.log(result);
  return result.response.text();
}

app.get("/api/summary/:topic", async (req: Request, res: Response) => {
  try {
    const topic = decodeURIComponent(req.params.topic);
    const summary = await summarizeGemini(topic);
    res.json({ topic, summary });
  } catch (err) {
    console.error("Error summarizing topic:", err);
    res.status(500).json({ error: "Failed to summarize topic" });
  }
});

// Start the Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    init().catch(err => console.error('init error:', err));
});