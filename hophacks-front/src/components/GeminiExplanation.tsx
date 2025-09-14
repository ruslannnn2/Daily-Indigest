import { useState, useEffect } from "react";
import { Button } from "./ui/button";

interface GeminiExplanationProps {
  topic: string | null;
  className?: string;
}

export function GeminiExplanation({ topic, className }: GeminiExplanationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [showButton, setShowButton] = useState(true);
  const [displayText, setDisplayText] = useState("");

  const fetchExplanation = async () => {
    if (!topic) return;
    
    setIsLoading(true);
    setShowButton(false);
    
    try {
      const response = await fetch(`http://localhost:3000/api/summary/${encodeURIComponent(topic)}`);
      const data = await response.json();
      
      // Start the text reveal animation
      const fullText = data.summary;
      setExplanation(fullText);
      
      //Reveal text character by character
      let currentText = "";
      for (let i = 0; i < fullText.length; i++) {
        currentText += fullText[i];
        setDisplayText(currentText);
        await new Promise(resolve => setTimeout(resolve, 25)); // Adjust speed as needed
      }
    } catch (error) {
      console.error("Failed to fetch explanation:", error);
      setDisplayText("Failed to load explanation.");
    } finally {
      setIsLoading(false);
    }
  };

  // Reset state when topic changes
  useEffect(() => {
    setExplanation(null);
    setDisplayText("");
    setShowButton(true);
    setIsLoading(false);
  }, [topic]);

  if (!topic) return null;

  return (
    <div className={`p-4 w-64 mt-4 bg-black/50 text-sm backdrop-blur-sm rounded-lg shadow-lg transition-all duration-500 ease-in-out ${
      !showButton && explanation ? "opacity-100" : "opacity-90"
    } ${className}`}>
      {showButton ? (
        <Button 
          onClick={fetchExplanation} 
          disabled={isLoading}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white text-sm"
        >
          {isLoading ? "Loading..." : "Elaborate"}
        </Button>
      ) : (
        <div className="text-white prose prose-invert max-w-none">
          {displayText || (
            <div className="flex items-center justify-center h-20">
              <div className="animate-pulse">Generating explanation...</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}