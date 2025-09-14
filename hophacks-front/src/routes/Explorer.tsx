import React, { useEffect, useState, useCallback, useRef } from 'react';
import { FlyToInterpolator } from '@deck.gl/core';
import SimpleMap from '../components/SimpleMap';
import Sidebar from '../components/Sidebar';
import HoverInfoPanel from '../components/HoverInfoPanel';
import SearchBar from '../components/SearchBar';
import { GeminiExplanation } from '../components/GeminiExplanation';

// Define types for better type safety
interface TweetData {
  topic: string;
  lon: number;
  lat: number;
  text: string;
  author: string;
}

interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

interface HoverInfo {
  object?: any;
  coordinate?: number[];
  pixel?: number[];
  layer?: any;
}

// Base API URL
const BASE_API_URL = 'http://localhost:3000/api/flattened';

const Explorer: React.FC = () => {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  
  // State for data management
  const [currentData, setCurrentData] = useState<TweetData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // State for hover information
  const [hoverInfo, setHoverInfo] = useState<{
    coordinate: [number, number];
    tweets: Array<{text: string; author: string; topic: string}>;
  } | null>(null);

  // Ref to store the timeout ID for clearing hover info
  const clearTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // State to force screen grid layer refresh
  const [layerRefreshKey, setLayerRefreshKey] = useState<number>(0);

  // Function to fetch data based on selected topic
  const fetchData = useCallback(async (topic: string | null) => {
    setIsLoading(true);
    try {
      const url = topic ? `${BASE_API_URL}/${topic}` : BASE_API_URL;
      console.log('Fetching data from:', url);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Filter out items without valid coordinates on client side as well
      const validData = data.filter((item) => {
        const hasValidCoords = typeof item.lat === 'number' && typeof item.lon === 'number' && 
                              !isNaN(item.lat) && !isNaN(item.lon) &&
                              item.lat !== 0 && item.lon !== 0 &&
                              Math.abs(item.lat) <= 90 && Math.abs(item.lon) <= 180;
        
        if (!hasValidCoords) {
          console.log('Filtering out invalid coordinates:', item);
        }
        return hasValidCoords;
      });
      
      setCurrentData([...validData]);
      console.log(`Loaded ${data.length} total items, ${validData.length} with valid coordinates for topic:`, topic || 'all topics');
      
      // Force layer refresh by updating the key
      setLayerRefreshKey(prev => prev + 1);
      
      // Log some sample data to debug
      if (validData.length > 0) {
        console.log('Sample valid data points:', validData.slice(0, 3));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setCurrentData([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // State for controlling the map view
  const [viewState, setViewState] = useState<ViewState>({
    longitude: -95, 
    latitude: 40,
    zoom: 4,
    pitch: 0, 
    bearing: 0
  });

  // Handle location selection from search bar
  const handleLocationSelect = useCallback((longitude: number, latitude: number) => {
    console.log(`Flying to coordinates: [${longitude}, ${latitude}]`);
    
    setViewState(prevState => ({
      ...prevState,
      longitude,
      latitude,
      zoom: 6.5, // Zoom in when selecting a location
      transitionDuration: 2000,
      transitionInterpolator: new FlyToInterpolator(),
      transitionEasing: (t: number) => t * (2 - t), // Smooth ease-out


    }));
  }, []);

  // Handle view state changes from the map
  const handleViewStateChange = useCallback((params: { viewState: ViewState }) => {
    setViewState(params.viewState);
  }, []);

  // Function to handle hover info with 5-second timeout
  const handleHover = useCallback((info: HoverInfo) => {
    // Clear any existing timeout
    if (clearTimeoutRef.current) {
      clearTimeout(clearTimeoutRef.current);
      clearTimeoutRef.current = null;
    }

    if (info && info.object && info.coordinate) {
      let tweets: Array<{text: string; author: string; topic: string}> = [];
      
      if (info.object.points && Array.isArray(info.object.points)) {
        // Extract up to 8 tweets from the aggregated points
        tweets = info.object.points.slice(0, 8).map((point: any) => ({
          text: point.text || 'No text available',
          author: point.author || 'Unknown',
          topic: point.topic || 'No topic'
        }));
      } else if (info.object.text) {
        // Single point case
        tweets = [{
          text: info.object.text || 'No text available',
          author: info.object.author || 'Unknown',
          topic: info.object.topic || 'No topic'
        }];
      }

      if (tweets.length > 0 && info.coordinate && info.coordinate.length >= 2) {
        setHoverInfo({
          coordinate: [info.coordinate[0], info.coordinate[1]],
          tweets
        });

        // Set timeout to clear hover info after 5 seconds
        clearTimeoutRef.current = setTimeout(() => {
          setHoverInfo(null);
        }, 5000);
      }
    } else {
      setHoverInfo(null);
    }
  }, []);

const handleTopicSelect = useCallback((topic: string | null) => {
  console.log('Explorer: Topic selection changed to:', topic);
  setSelectedTopic(topic);
  fetchData(topic); // This will handle the API call and data update
}, [fetchData]);

  // Initial data load
  useEffect(() => {
    fetchData(null);
  }, [fetchData]);

  // Add this useEffect after line 149 (after your initial data load useEffect)
  useEffect(() => {
    const intervalId = setInterval(() => {
      console.log('Auto-refreshing data every 5 seconds for topic:', selectedTopic || 'all topics');
      fetchData(selectedTopic);
    }, 5000);

  return () => {
    clearInterval(intervalId);
  };


}, [selectedTopic, fetchData]);

  // Log when currentData changes
  
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gradient-to-b from-gray-800 to-black">
        {/* Top search bar */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 w-1/3">
            <SearchBar onLocationSelect={handleLocationSelect} />
         </div>

        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-20 bg-black/70 text-white px-4 py-2 rounded-lg">
            Loading {selectedTopic ? `"${selectedTopic}"` : 'all'} data...
          </div>
        )}

      {/* Map background */}
      <div className="absolute inset-0 z-0">
        <SimpleMap 
          data={currentData}
          opacity={0.8}
          cellSize={12}
          colorDomain={[0, 20]}
          aggregation="SUM"
          pickable={true}
          viewState={viewState}
          onViewStateChange={handleViewStateChange}
          onHover={handleHover}
          refreshKey={layerRefreshKey}
        />
      </div>
      
      {/* Content layer with sidebar - positioned above the globe */}
      <div className="relative z-10 flex h-full w-full pointer-events-none">
        <div className="pointer-events-auto">
          <Sidebar 
            className="rounded-md h-[80vh] m-4 p-4 bg-opacity-50 backdrop-blur-md border border-gray-700/50"
            onTopicSelect={handleTopicSelect}
          />
        </div>
        
        {/* empty div to maintain flex */}
        <div className="flex-1"></div>
        
        {/* Right panel with hover info */}
        <div className="pointer-events-auto mr-4 mt-4">
          <HoverInfoPanel className="w-64" hoverInfo={hoverInfo} />
          <GeminiExplanation 
            topic={selectedTopic}
            className="mb-2"
          />
        </div>
      </div>
    </div>
  );
};

export default Explorer;