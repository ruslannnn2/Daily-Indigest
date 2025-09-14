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
// Update your DataPoint type
export type DataPoint = {
  latitude: number;
  longitude: number;
  intensity: number;
  trend?: string; 
};

// Function to extract location data from a tweet
function extractLocationData(tweet: Tweet, trendName: string): DataPoint | null {
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
    intensity: Math.floor(Math.random() * 3) + 1, // Random intensity between 1-3
    trend: trendName // Include the trend name
  };
}

// Build dataset for a specific trend
export async function buildDatasetForTrend(trendName: string): Promise<DataPoint[]> {
  try {
    const response = await fetch(`http://localhost:3000/api/flattened/${trendName}`);
    const tweets: Tweet[] = await response.json();
    
    console.log(`Processing ${tweets.length} tweets for trend: ${trendName}`);
    
    const dataPoints: DataPoint[] = [];
    
    for (const tweet of tweets) {
      const point = extractLocationData(tweet, trendName);
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
// Updated to support trend filtering
export function convertToScreenGridFormat(
  dataPoints: DataPoint[], 
  selectedTrends: string[] = []
): [number, number, number][] {
  // If no trends are selected, show all points
  if (selectedTrends.length === 0) {
    return dataPoints.map(point => [
      point.longitude,
      point.latitude,
      point.intensity
    ]);
  }
  

  return dataPoints
    .filter(point => point.trend && selectedTrends.includes(point.trend))
    .map(point => [
      point.longitude,
      point.latitude,
      point.intensity
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