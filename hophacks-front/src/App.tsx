import React from "react";
import GlobeMapbox from "./components/GlobeMapbox";

const App: React.FC = () => {
  return (
    <div className="bg-gradient-to-b from-gray-800 to-black" style={{ width: "100vw", height: "100vh", position: "absolute" }}>
      <GlobeMapbox 
        brightness={1}            
      />
    </div>
  );
};

export default App;