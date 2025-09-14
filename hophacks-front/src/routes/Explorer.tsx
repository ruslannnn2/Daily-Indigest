import React, { useEffect, useState, useCallback } from 'react';
import SimpleMap from '../components/SimpleMap';
import Sidebar from '../components/Sidebar';
import HoverInfoPanel from '../components/HoverInfoPanel';
import SearchBar from '../components/SearchBar';
import { GeminiExplanation } from '../components/GeminiExplanation';

// Default data URL if no specific data is provided
// const DEFAULT_DATA_URL = 'https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/screen-grid/uber-pickup-locations.json';
const DEFAULT_DATA_URL = 'http://localhost:3000/api/flattened';

const Explorer: React.FC = () => {
  // Using a fixed data source for now - will be updated when fetching real data
  const data = DEFAULT_DATA_URL;

  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  
  // State for hover information
  const [hoverInfo, setHoverInfo] = useState<{
    coordinate: [number, number];
    tweets: Array<{text: string; author: string; topic: string}>;
  } | null>(null);

  // State for controlling the map view
  const [viewState, setViewState] = useState({
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
      zoom: 10, // Zoom in when selecting a location
    }));
  }, []);

  // Handle view state changes from the map
  const handleViewStateChange = useCallback((params: any) => {
    setViewState(params.viewState);
  }, []);

  //   const fetchTrends = async () => {
  //   try {
  //     const response = await fetch("http://localhost:3000/api/tweets/Clemson");
  //     const data = await response.json();
  //     setTrends(data);
  //     console.log("Fetched tweets:", data);
  //   } catch (error) {
  //     console.error("Error fetching tweets:", error);
  //   }
  // };

  //     React.useEffect(() => {
  //       fetchTrends();
  //     }, []);



  useEffect(() => {
    console.log("Explorer component loaded with data source:", data);
  }, [data]);
  
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gradient-to-b from-gray-800 to-black">
        {/* Top search bar */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 w-1/3">
            <SearchBar onLocationSelect={handleLocationSelect} />
         </div>
      {/* Map background */}
      <div className="absolute inset-0 z-0">
        <SimpleMap 
          data={data}
          opacity={0.8}
          cellSize={12}
          colorDomain={[0, 20]}
          aggregation="SUM"
          pickable={true}
          viewState={viewState}
          onViewStateChange={handleViewStateChange}
          onHover={(info: any) => {
            if (info.coordinate) {
              console.log("Hover info", info.coordinate[0], info.coordinate[1]);
              
              // Extract tweet information from the hover data
              let tweets: Array<{text: string; author: string; topic: string}> = [];
              
              if (info.object && info.object.points) {
                // ScreenGridLayer provides aggregated points
                tweets = info.object.points.map((point: any) => ({
                  text: point.text || "Tweet content not available",
                  author: point.author || "Unknown",
                  topic: point.topic || "General"
                }));
              }
              
              setHoverInfo({
                coordinate: [info.coordinate[0], info.coordinate[1]],
                tweets: tweets
              });
            } else {
              // Clear hover info when not hovering over anything
              setHoverInfo(null);
            }
            
            return true;
          }}
        />
      </div>
      
      {/* Content layer with sidebar - positioned above the globe */}
      <div className="relative z-10 flex h-full w-full pointer-events-none">
        <div className="pointer-events-auto">
          <Sidebar 
            className="rounded-md h-[80vh] m-4 p-4 bg-opacity-50 backdrop-blur-md border border-gray-700/50"
            onTopicSelect={setSelectedTopic}
          />
        </div>
        
        {/* empty div to maintain flex */}
        <div className="flex-1"></div>
        
        {/* Right panel with hover info */}
        <div className="pointer-events-auto mr-4 mt-4">
          <HoverInfoPanel className="w-64 h-128" hoverInfo={hoverInfo} />
          <GeminiExplanation 
            topic={selectedTopic}
            className="mt-4"
          />
        </div>
      </div>
    </div>
  );
};

export default Explorer;