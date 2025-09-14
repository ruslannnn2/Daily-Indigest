import React, { useEffect } from 'react';
import GlobeMapbox from '../components/GlobeMapbox';
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

  // const [trends, setTrends] = useState<string[]>([]);

  // Define initial view state to set orientation
  const initialViewState = {
    longitude: -95, 
    latitude: 40,
    zoom: 4.7,
    pitch: 0, 
    bearing: 0,

    transitionDuration: 0
  };

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
            <SearchBar />
         </div>
      {/* Globe background */}
      <div className="absolute inset-0 z-0">
        <GlobeMapbox 
          brightness={1}
          data={data}
          opacity={0.8}
          cellSize={12}
          colorDomain={[0, 20]}
          aggregation="SUM"
          pickable={true}
          initialViewState={initialViewState}

          onHover={(info) => {
            if (info.coordinate) {
              console.log("Hover info", info.coordinate[0], info.coordinate[1]);
            }
            
            // Return true to keep the layer visible after hover
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
          <HoverInfoPanel className="w-64 h-auto" />
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