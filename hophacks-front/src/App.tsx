import React from "react";
import { useState } from "react";
import GlobeMapbox from "./components/GlobeMapbox";
import Sidebar from "./components/Sidebar";

const App: React.FC = () => {
   const [trends, setTrends] = useState<string[]>([]);

   // Fetch trending topics from the Flask API
   const fetchTrends = async () => {
     const response = await fetch("http://localhost:5000/api/trends");
     const data = await response.json();
     setTrends(data);
      console.log("Fetched trends:", data);
   };

   // Call the fetchTrends function when the component mounts
   React.useEffect(() => {
     fetchTrends();
   }, []);


  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gradient-to-b from-gray-800 to-black">
      <div className="absolute inset-0 z-0">
        <GlobeMapbox 
          brightness={1}
        />
      </div>
      
      {/*content layer with sidebar - positioned above the globe */}
      <div className="relative z-10 flex h-full w-full pointer-events-none">
        <div className="pointer-events-auto">
          <Sidebar className="rounded-md h-[80vh] m-4 p-4 bg-opacity-50 backdrop-blur-md border border-gray-700/50">
            {/* Sidebar content here */}

            

          </Sidebar>
        </div>
        
        {/* empty div to maintain flex */}
        <div className="flex-1"></div>
      </div>
    </div>
  );
};

export default App;