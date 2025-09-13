type Trend = {
  name: string;
};

// Updated to match your API response structure
type Tweet = {
  rowId: string;
  tweetId: string;
  content: string;
  location: {
    lat: number;
    lon: number;
  };
  createdAt: {
    __timestamp_micros_since_unix_epoch__: string;
  };
  // Add other fields as needed
};

// Your existing DataPoint type
type DataPoint = {
  latitude: number;
  longitude: number;
  intensity: number;
};

// Function to extract location data from a tweet
function extractLocationData(tweet: Tweet): DataPoint | null {
  // Check if the tweet has valid location data
  if (!tweet.location || 
      typeof tweet.location.lat !== 'number' || 
      typeof tweet.location.lon !== 'number' ||
      isNaN(tweet.location.lat) || 
      isNaN(tweet.location.lon)) {
    return null;
  }

  return {
    latitude: tweet.location.lat,
    longitude: tweet.location.lon,
    intensity: 1 // Default intensity, you can adjust based on some other metric if needed
  };
}

// Build dataset for a specific trend
export async function buildDatasetForTrend(trendName: string): Promise<DataPoint[]> {
  try {
    const response = await fetch(`http://localhost:3000/api/tweets/${trendName}`);
    const tweets: Tweet[] = await response.json();
    console.log(`Fetched ${tweets.length} tweets for trend: ${trendName}`);
    
    const dataPoints: DataPoint[] = [];
    
    for (const tweet of tweets) {
      const point = extractLocationData(tweet);
      if (point) {
        dataPoints.push(point);
      }
    }
    
    console.log(`Generated ${dataPoints.length} data points for trend: ${trendName}`);
    return dataPoints;
  } catch (error) {
    console.error(`Error building dataset for trend ${trendName}:`, error);
    return [];
  }
}

// Your existing function, now updated to use the extractLocationData function
export async function buildDataset(): Promise<DataPoint[]> {
  try {
    const response = await fetch('http://localhost:3000/api/trends');
    const trends: Trend[] = await response.json();
    console.log(`Fetched ${trends.length} trends`);
    
    const dataset: DataPoint[] = [];
    
    for (const trend of trends) {
      const trendDataPoints = await buildDatasetForTrend(trend.name);
      dataset.push(...trendDataPoints);
    }
    
    console.log(`Total dataset contains ${dataset.length} points`);
    return dataset;
  } catch (error) {
    console.error("Error building complete dataset:", error);
    return [];
  }
}

// Utility function to convert dataset to the format expected by ScreenGridLayer
export function convertToScreenGridFormat(dataPoints: DataPoint[]): [number, number, number][] {
  return dataPoints.map(point => [
    point.longitude,  // longitude first for ScreenGridLayer
    point.latitude,   // latitude second
    point.intensity   // weight/intensity third
  ]);
}

// Function to get the center point of a dataset
export function getDatasetCenter(dataPoints: DataPoint[]): [number, number] {
  if (dataPoints.length === 0) {
    // Default to center of US if no data points
    return [-95, 40];
  }
  
  const sumLat = dataPoints.reduce((sum, point) => sum + point.latitude, 0);
  const sumLon = dataPoints.reduce((sum, point) => sum + point.longitude, 0);
  
  return [
    sumLon / dataPoints.length,
    sumLat / dataPoints.length
  ];
}

// Function to create initial view state from dataset
export function createViewStateFromDataset(dataPoints: DataPoint[]) {
  const [longitude, latitude] = getDatasetCenter(dataPoints);
  
  return {
    longitude,
    latitude,
    zoom: dataPoints.length > 0 ? 4.7 : 3, // Zoom out more if no data
    pitch: 0,
    bearing: 0,
    transitionDuration: 0
  };
}