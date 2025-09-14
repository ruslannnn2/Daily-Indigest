import React, { useEffect, useState } from 'react';

interface HoverInfoPanelProps {
  className?: string;
}

const HoverInfoPanel: React.FC<HoverInfoPanelProps> = ({ className }) => {
  // State to store the last hovered coordinates
  const [coordinates, setCoordinates] = useState<{
    x: number | null;
    y: number | null;
    message: string | null;
    hasData: boolean;
  }>({
    x: null,
    y: null,
    message: null,
    hasData: false
  });

  // Set up a console log listener to capture coordinates
  useEffect(() => {
    // Store the original console.log function
    const originalConsoleLog = console.log;
    
    // Override console.log to capture hover coordinates
    console.log = function(...args) {
      // Call the original console.log
      originalConsoleLog.apply(console, args);
      
      // Check if this is a hover info log
      if (args.length >= 3 && args[0] === "Hover info" && typeof args[1] === 'number' && typeof args[2] === 'number') {
        // Update state with the coordinates
        setCoordinates({
          x: args[1],
          y: args[2],
          hasData: true,
          message: args[3] || null
        });
      }
    };
    
    // Cleanup: restore the original console.log when component unmounts
    return () => {
      console.log = originalConsoleLog;
    };
  }, []);

  return (
    <div 
      className={`bg-black/10 text-white font-mon rounded-md p-4 backdrop-blur-md border border-gray-700/50 transition-opacity duration-300 ${className}`}
    >
      <h3 className="text-lg font-semibold mb-3 border-b border-gray-600 pb-2">Location Information</h3>
      
      {coordinates.hasData && coordinates.x !== null && coordinates.y !== null ? (
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-300">Longitude:</span>
            <span className="font-mono">{coordinates.x.toFixed(4)}°</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-300">Latitude:</span>
            <span className="font-mono">{coordinates.y.toFixed(4)}°</span>
          </div>
        </div>
      ) : (
        <div className="text-gray-400 text-center py-4">
          Hover over a cell to see details
        </div>
      )}
    </div>
  );
};

export default HoverInfoPanel;
