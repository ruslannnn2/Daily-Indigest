import React, { useState } from 'react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';


// SidebarProps interface
interface SidebarProps {
  className?: string;
  onTopicSelect?: (topic: string | null) => void;
  children?: React.ReactNode;
}
export function Sidebar({ className, onTopicSelect }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [trends, setTrends] = useState<string[]>([]);
  const [selectedTrend, setSelectedTrend] = useState<string | null>(null);
  const [contentVisible, setContentVisible] = useState(!collapsed);

  // Handle sidebar collapse/expand with content fade effects
  const toggleSidebar = () => {
    if (!collapsed) {
      // First make content invisible, then collapse
      setContentVisible(false);
      setTimeout(() => setCollapsed(true), 300);
    } else {
      // First expand, then make content visible
      setCollapsed(false);
      setTimeout(() => setContentVisible(true), 300);
    }
  };

  // Fetch trending topics from the Flask API
  const fetchTrends = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/trends");
      const data = await response.json();
      setTrends(data);
      console.log("Fetched trends:", data);
    } catch (error) {
      console.error("Error fetching trends:", error);
    }
  };

  // Handle selecting a trend
  const handleSelectTrend = (trend: string) => {
    if (selectedTrend === trend) {
      // If clicking the same trend, deselect it to show full dataset
      setSelectedTrend(null);
      if (onTopicSelect) {
        onTopicSelect(null); // Pass null to show full dataset
      }
      console.log(`Deselected trend: ${trend} - showing full dataset`);
    } else {
      // If clicking a different trend, select it
      setSelectedTrend(trend);
      if (onTopicSelect) {
        onTopicSelect(trend);
      }
      console.log(`Selected trend: ${trend}`);
    }
    
    // Removed duplicate call to buildDatasetForTrend - this should be handled by the parent component
  };

  // Call the fetchTrends function when the component mounts
  React.useEffect(() => {
    fetchTrends();
  }, []);

  return (
    <div
      className={cn(
        "flex flex-col h-full text-white transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64",
        className
      )}
    >
      {/* Header with toggle button */}
      <div className={cn(
        "flex items-center border-b border-gray-300/20 p-4",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {!collapsed && (
          <h2 
            className={cn(
              "text-xl text-left font-bold transition-opacity duration-200 ease-in-out",
              contentVisible ? "opacity-100" : "opacity-0"
            )}
          >
            Trending Topics
          </h2>
        )}
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-md hover:bg-white/10 transition-colors flex items-center justify-center"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="13 17 18 12 13 7"></polyline>
              <polyline points="6 17 11 12 6 7"></polyline>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="11 17 6 12 11 7"></polyline>
              <polyline points="18 17 13 12 18 7"></polyline>
            </svg>  
          )}
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {!collapsed && (
          <div 
            className={cn(
              "p-4 space-y-3 transition-all duration-300 ease-in-out",
              contentVisible ? "opacity-100" : "opacity-0"
            )}
          >
            {/* Trend buttons */}
            {trends.length > 0 ? (
              <div className="flex flex-col gap-2">
                {trends.map((trend, index) => (
                  <Button
                    key={index}
                    variant= "ghost"
                    className={cn(
                      "h-10 justify-start text-left text-md text-blue-500 bg-transparent hover:bg-black/10 hover:text-white border-0 transition-all",
                      selectedTrend === trend && "bg-white/20"
                    )}
                    onClick={() => handleSelectTrend(trend)}
                  >
                    <span className="truncate">{trend}</span>
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Loading trends...</p>
            )}
          </div>
        )}

        {/* Show only icons if collapsed */}
        {collapsed && (
          <div className="flex flex-col items-center gap-3 mt-4">
            {trends.slice(0, 5).map((trend, index) => (
              <div 
                key={index}
                className={cn(
                  "w-8 h-8 rounded-md bg-transparent border-white/20 flex items-center justify-center hover:bg-white/10 cursor-pointer transition-all",
                  contentVisible ? "opacity-0" : "opacity-100", 
                  selectedTrend === trend && "bg-white/20"
                )}
                title={trend}
                onClick={() => handleSelectTrend(trend)}
              >
                <span className="text-md ">{index + 1}</span>
              </div>
            ))}
            {trends.length > 5 && (
              <div className="text-xs mt-1 text-gray-400">+{trends.length - 5}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Sidebar;