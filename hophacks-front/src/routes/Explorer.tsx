import React, { useEffect } from 'react';
import GlobeMapbox from '../components/GlobeMapbox';
import Sidebar from '../components/Sidebar';
import HoverInfoPanel from '../components/HoverInfoPanel';

// Default data URL if no specific data is provided
const DEFAULT_DATA_URL = 'https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/screen-grid/uber-pickup-locations.json';

const Explorer: React.FC = () => {
  // Using a fixed data source for now - will be updated when fetching real data
  const data = DEFAULT_DATA_URL;
  
  useEffect(() => {
    console.log("Explorer component loaded with data source:", data);
  }, [data]);
  
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gradient-to-b from-gray-800 to-black">
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
        onHover={(info) => {
            if (info.coordinate) {
              console.log("Hover info", info.coordinate[0], info.coordinate[1]);
            }

          return false;
        }}
        />
      </div>
      
      {/* Content layer with sidebar - positioned above the globe */}
      <div className="relative z-10 flex h-full w-full pointer-events-none">
        <div className="pointer-events-auto">
          <Sidebar className="rounded-md h-[80vh] m-4 p-4 bg-opacity-50 backdrop-blur-md border border-gray-700/50" />
        </div>
        
        {/* empty div to maintain flex */}
        <div className="flex-1"></div>
        
        {/* Right panel with hover info */}
        <div className="pointer-events-auto mr-4 mt-4">
          <HoverInfoPanel className="w-64 h-auto" />
        </div>
      </div>
    </div>
  );
};

export default Explorer;
