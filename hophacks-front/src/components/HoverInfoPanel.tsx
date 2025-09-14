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
  // Calculate dynamic height based on number of tweets
  const calculateMaxHeight = () => {
    if (!hoverInfo || hoverInfo.tweets.length === 0) {
      return 'max-h-32'; // Default height for empty state
    }
    
    // Base height for coordinates and header + dynamic height per tweet
    const baseHeight = 160; // pixels for header, coordinates, etc.
    const tweetHeight = 120; // approximate pixels per tweet
    const maxTweets = Math.min(hoverInfo.tweets.length, 8); // Show max 8 tweets
    const totalHeight = baseHeight + (maxTweets * tweetHeight);
    
    // Convert to Tailwind classes or use inline style
    if (totalHeight <= 200) return 'max-h-72';
    if (totalHeight <= 300) return 'max-h-72';
    if (totalHeight <= 400) return 'max-h-96';
    return 'max-h-[32rem]'; // Cap at a reasonable max height
  };

  const maxHeightClass = calculateMaxHeight();
  const tweetsToShow = hoverInfo ? Math.min(hoverInfo.tweets.length, 8) : 0;

  return (
    <div 
      className={`bg-black/10 text-white font-mon rounded-md p-4 backdrop-blur-md border border-gray-700/50 transition-all duration-500 ${maxHeightClass} flex flex-col ${className}`}
      style={{ maxHeight: hoverInfo && hoverInfo.tweets.length > 8 ? '32rem' : 'auto' }}
    >
      <h3 className="text-lg font-semibold mb-3 border-b border-gray-600 pb-2">Location Information</h3>
      
      {hoverInfo ? (
        <div className="space-y-3 flex-1 overflow-hidden">
          <div className="space-y-2 flex-shrink-0">
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
            <div className="border-t border-gray-600 pt-3 flex-1 overflow-hidden flex flex-col">
              <h4 className="text-sm font-semibold mb-2 text-gray-200 flex-shrink-0">Tweet Details</h4>
              <div className="space-y-2 overflow-y-auto overflow-x-hidden flex-1 pr-1" style={{ scrollbarWidth: 'thin' }}>
                {hoverInfo.tweets.slice(0, tweetsToShow).map((tweet, index) => (
                  <div key={index} className="bg-gray-800/50 rounded p-2 text-xs flex-shrink-0">
                    <div className="text-blue-300 font-semibold">@{tweet.author}</div>
                    <div className="text-green-300 text-xs">#{tweet.topic}</div>
                    <div className="text-gray-100 mt-1 break-words leading-relaxed">{tweet.text}</div>
                  </div>
                ))}
                {hoverInfo.tweets.length > tweetsToShow && (
                  <div className="text-gray-400 text-xs text-center py-1 flex-shrink-0 sticky bottom-0 bg-gradient-to-t from-black/20 to-transparent">
                    +{hoverInfo.tweets.length - tweetsToShow} more tweets
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
