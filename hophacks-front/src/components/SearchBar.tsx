import React, { useState, useEffect, useRef } from 'react';

// Type definitions
export interface AutocompleteSuggestion {
  placeId: string;
  name: string;
  city?: string;
  state?: string;
  country: string;
  geometry: {
    coordinates: [number, number]; // [longitude, latitude]
  };
}

const api_key = import.meta.env.VITE_GEOCODE_API_KEY || '';

interface SearchBarProps {
  onLocationSelect?: (longitude: number, latitude: number) => void;
  className?: string;
}

// Function to fetch autocomplete suggestions from Pelias
async function fetchPeliasSuggestions(query: string): Promise<AutocompleteSuggestion[]> {
  if (query.length < 3) {
    return [];
  }

  // You may need to replace this with your Pelias endpoint
  const endpoint = `https://api.geocode.earth/v1/autocomplete?api_key=${api_key}&text=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`API call failed with status: ${response.status}`);
    }
    const data = await response.json();

    // Define the type for Pelias feature
    type PeliasFeature = {
      properties: {
        id: string;
        name: string;
        locality?: string;
        region?: string;
        country: string;
      };
      geometry: {
        coordinates: [number, number];
      };
    };

    // Map the Pelias response to our suggestion format
    return data.features.map((feature: PeliasFeature) => ({
      placeId: feature.properties.id,
      name: feature.properties.name,
      city: feature.properties.locality,
      state: feature.properties.region,
      country: feature.properties.country,
      geometry: feature.geometry
    }));
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    
    // For demo purposes, return mock data if the API fails
    
    return [];
  }
}

const SearchBar: React.FC<SearchBarProps> = ({ onLocationSelect, className }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [searchRef]);

  // Fetch suggestions when query changes
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.length < 3) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      const results = await fetchPeliasSuggestions(query);
      setSuggestions(results);
      setIsLoading(false);
    };

    // Debounce the API calls
    const timeoutId = setTimeout(() => {
      fetchSuggestions();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleSelectSuggestion = (suggestion: AutocompleteSuggestion) => {
    setQuery(suggestion.name);
    setShowSuggestions(false);
    
    // Extract coordinates and call the callback
    const [longitude, latitude] = suggestion.geometry.coordinates;
    
    if (onLocationSelect) {
      onLocationSelect(longitude, latitude);
    }
    
    console.log(`Selected location: ${suggestion.name} at [${longitude}, ${latitude}]`);
  };

  return (
    <div 
      ref={searchRef} 
      className={`relative ${className || ''}`}
    >
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Search for a location"
          className="w-full bg-black/30 backdrop-blur-md border border-gray-700/50 text-white p-3 pl-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        />
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-black/70 backdrop-blur-md border border-gray-700/50 rounded-lg shadow-lg max-h-60 overflow-auto no-scrollbar">
          {suggestions.map((suggestion) => (
            <li
              key={suggestion.placeId}
              onClick={() => handleSelectSuggestion(suggestion)}
              className="px-4 py-3 hover:bg-gray-700/50 cursor-pointer text-white transition-colors flex flex-col"
            >
              <span className="font-semibold">{suggestion.name}</span>
              <span className="text-xs text-gray-400">
                {[suggestion.city, suggestion.state, suggestion.country]
                  .filter(Boolean)
                  .join(', ')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SearchBar;