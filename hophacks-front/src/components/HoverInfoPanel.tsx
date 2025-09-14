import React from 'react';

interface TweetInfo {
  text: string;
  author: string;
  topic: string;
}

interface HoverInfoPanelProps {
  className?: string;
  hoverInfo?: {
    coordinate: [number, number];
    tweets: TweetInfo[];
  } | null;
}

const HoverInfoPanel: React.FC<HoverInfoPanelProps> = ({ className, hoverInfo }) => {
  return (
    <div 
      className={`bg-black/10 text-white font-mon rounded-md p-4 backdrop-blur-md border border-gray-700/50 transition-opacity duration-300 ${className}`}
    >
      <h3 className="text-lg font-semibold mb-3 border-b border-gray-600 pb-2">Location Information</h3>
      
      {hoverInfo ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-300">Longitude:</span>
              <span className="font-mono">{hoverInfo.coordinate[0].toFixed(4)}°</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-300">Latitude:</span>
              <span className="font-mono">{hoverInfo.coordinate[1].toFixed(4)}°</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-300">Tweets:</span>
              <span className="font-mono">{hoverInfo.tweets.length}</span>
            </div>
          </div>
          
          {hoverInfo.tweets.length > 0 && (
            <div className="border-t border-gray-600 pt-3">
              <h4 className="text-sm font-semibold mb-2 text-gray-200">Tweet Details</h4>
              <div className="space-y-2 max-h-32 ">
                {hoverInfo.tweets.slice(0, 3).map((tweet, index) => (
                  <div key={index} className="bg-gray-800/50 rounded p-2 text-xs">
                    <div className="text-blue-300 font-semibold">@{tweet.author}</div>
                    <div className="text-green-300 text-xs">#{tweet.topic}</div>
                    <div className="text-gray-100 mt-1 line-clamp-2">{tweet.text}</div>
                  </div>
                ))}
                {hoverInfo.tweets.length > 3 && (
                  <div className="text-gray-400 text-xs text-center">
                    +{hoverInfo.tweets.length - 3} more tweets
                  </div>
                )}
              </div>
            </div>
          )}
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
