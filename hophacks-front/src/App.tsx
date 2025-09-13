import React from "react";
import Explorer from "./routes/Explorer";

const App: React.FC = () => {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gradient-to-b from-gray-800 to-black">
      <Explorer />
    </div>
  );
};

export default App;