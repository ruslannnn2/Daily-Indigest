//DEPRACATED

import React, { useRef, useMemo, useState, useEffect } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { Map, useControl } from "react-map-gl/maplibre";
import type { ViewState } from "react-map-gl/maplibre";
import { MapboxOverlay } from "@deck.gl/mapbox";
import maplibregl from "maplibre-gl";
import { Layer, COORDINATE_SYSTEM, FlyToInterpolator } from "@deck.gl/core";
import type { PickingInfo } from "@deck.gl/core";
import { ScreenGridLayer } from "@deck.gl/aggregation-layers";

// Define types
type Color = [number, number, number, number];
export type DataPoint = [longitude: number, latitude: number, count: number];

// Define API data structure
export interface APIDataPoint {
  topic: string;
  lon: number;
  lat: number;
  text: string;
  author: string;
}

// Custom view state type with transition properties
interface CustomViewState extends Partial<ViewState> {
  transitionDuration?: number;
  transitionInterpolator?: string | FlyToInterpolator;
}

// Default color range for the grid
const DEFAULT_COLOR_RANGE: Color[] = [
  [255, 255, 178, 25],
  [254, 217, 118, 85],
  [254, 178, 76, 127],
  [253, 141, 60, 170],
  [240, 59, 32, 212],
  [189, 0, 38, 255]
];

// Type definition for the DeckGLOverlay props
interface DeckGLOverlayProps {
  layers: Layer[];
  interleaved?: boolean;
  onHover?: (info: PickingInfo) => void;
}

// The DeckGLOverlay component that integrates deck.gl with MapLibre
function DeckGLOverlay(props: DeckGLOverlayProps) {
  const overlay = useControl(() => new MapboxOverlay(props));
  overlay.setProps(props);
  return null;
}

export interface GlobeMapboxProps {
  // Basic styling
  className?: string;
  style?: React.CSSProperties;
  initialViewState?: CustomViewState;
  brightness?: number;
  globeOutlineColor?: string;
  globeOutlineWidth?: number;
  
  // Data visualization
  data?: DataPoint[] | APIDataPoint[] | string; // Can be DataPoint[], APIDataPoint[], or a URL string
  colorRange?: Color[];
  opacity?: number;
  cellSize?: number;
  aggregation?: 'SUM' | 'MEAN' | 'MIN' | 'MAX';
  colorDomain?: [number, number];
  
  // Interactivity
  pickable?: boolean;
  onHover?: (info: PickingInfo) => void;
  onClick?: (info: PickingInfo) => void;
  
  // Animation
  autoRotate?: boolean;
  rotationSpeed?: number;
}

const GlobeMapbox: React.FC<GlobeMapboxProps> = (props) => {
  const {
    // Styling props
    brightness = 1.0,
    globeOutlineColor = "#FFFFFF",
    globeOutlineWidth = 0,
    className,
    style,
    initialViewState,
    
    // Data visualization props
    data = [],
    colorRange = DEFAULT_COLOR_RANGE,
    opacity = 0.8,
    cellSize = 12,
    aggregation = 'SUM',
    colorDomain = [0, 20],
    
    // Interactivity props
    pickable = false,
    onHover,
  } = props;
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  
  // Local state for view state management
  const [viewState, setViewState] = useState<any>(() => ({
    longitude: initialViewState?.longitude ?? 0, 
    latitude: initialViewState?.latitude ?? 20,
    zoom: initialViewState?.zoom ?? 2,
    pitch: initialViewState?.pitch ?? 0,
    bearing: initialViewState?.bearing ?? 0,
    padding: initialViewState?.padding ?? {top: 0, bottom: 0, left: 0, right: 0},
  }));
  
  // Update view state when initialViewState prop changes
  useEffect(() => {
    if (initialViewState) {
      const newViewState: Partial<ViewState> & { transitionDuration?: number; transitionInterpolator?: FlyToInterpolator } = {
        longitude: initialViewState.longitude ?? 0, 
        latitude: initialViewState.latitude ?? 20,
        zoom: initialViewState.zoom ?? 2,
        pitch: initialViewState.pitch ?? 0,
        bearing: initialViewState.bearing ?? 0,
        padding: initialViewState.padding ?? {top: 0, bottom: 0, left: 0, right: 0},
      };
      
      // Add transition properties if needed
      if (initialViewState.transitionDuration && initialViewState.transitionInterpolator === 'FlyToInterpolator') {
        newViewState.transitionDuration = initialViewState.transitionDuration;
        newViewState.transitionInterpolator = new FlyToInterpolator();
      }
      
      setViewState(newViewState);
    }
  }, [initialViewState]);

  // Helper function to handle different data input types
  const getDataSource = (inputData: string | DataPoint[] | APIDataPoint[] | undefined): string | DataPoint[] | APIDataPoint[] => {
    if (!inputData || (Array.isArray(inputData) && inputData.length === 0)) {
      console.log("GlobeMapbox: No data provided, returning empty array");
      return []; // Return empty array if no data
    }
    console.log("GlobeMapbox: Data source provided:", typeof inputData === 'string' ? 'URL string' : 'Data array');
    return inputData; // Return as is (either URL string or data array)
  };

  // Create ScreenGridLayer to visualize data on the globe
  const layers = useMemo(() => {
    const dataSource = getDataSource(data);
    
    // If no data or empty array, return empty layers array
    if (Array.isArray(dataSource) && dataSource.length === 0) {
      console.log("GlobeMapbox: Empty data array, not creating layer");
      return [];
    }
    
    console.log("GlobeMapbox: Creating ScreenGridLayer with data source", 
                typeof dataSource === 'string' ? dataSource : `Array with ${dataSource.length} items`);
    
    return [
      new ScreenGridLayer({
        id: 'grid',
        data: dataSource,
        opacity,
        getPosition: d => {
          // Handle different data structures
          if (Array.isArray(d)) {
            // If it's our original array format [lon, lat, intensity]
            return [d[0], d[1]];
          } else if (d.lon !== undefined && d.lat !== undefined) {
            // If it's from the API with lon/lat properties
            return [d.lon, d.lat];
          }
          return [0, 0]; // Fallback
        },
        getWeight: d => {
          // Generate a random but consistent weight between 1-3 based on a property of the data
          // Use the last character of text or author as a seed for randomness
          if (Array.isArray(d)) {
            return d[2] || Math.floor(Math.random() * 3) + 1;
          } else if (d.author) {
            // Use the last character of the author's name to generate a consistent random number
            const lastChar = d.author.charCodeAt(d.author.length - 1) || 1;
            return (lastChar % 3) + 1; // Will return 1, 2, or 3
          }
          return Math.floor(Math.random() * 3) + 1; // Default random weight
        },
        cellSizePixels: cellSize,
        colorRange,
        coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
        wrapLongitude: true,
        gpuAggregation: true,
        colorDomain,
        aggregation,
        pickable,

        onHover: (info) => {
          // Call the external onHover callback if provided
          if (onHover) {
            onHover(info);
          }
          
          return false;
        },
      })
    ];
  }, [data, opacity, cellSize, colorRange, colorDomain, aggregation, pickable, onHover]);

  return (
    <div 
      style={{ 
        width: "100%", 
        height: "100%", 
        position: "relative",
        ...style 
      }}
      className={className}
      ref={mapContainerRef}
    >
      {/* Map container */}
      <div 
        style={{ 
          width: "100%", 
          height: "100%", 
          position: "absolute",
          filter: `brightness(${brightness})` // Apply brightness filter
        }}
      >
        <Map
          reuseMaps
          projection="globe"
          mapLib={maplibregl}
          {...viewState}
          mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
          style={{ width: "100%", height: "100%" }}
          attributionControl={false}
          renderWorldCopies={false}
          onMove={(evt) => {
            // Update local view state when user interacts with map
            setViewState(evt.viewState);
          }}
          onLoad={(evt: { target: maplibregl.Map }) => {
            mapRef.current = evt.target;
          }}
        >
          <DeckGLOverlay layers={layers} interleaved />
        </Map>
      </div>
      
      {/* Globe outline overlay (conditional) */}
      {globeOutlineWidth > 0 && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "calc(100% - 40px)",
            height: "calc(100% - 40px)",
            borderRadius: "50%",
            border: `${globeOutlineWidth}px solid ${globeOutlineColor}`,
            pointerEvents: "none",
            zIndex: 10,
            boxSizing: "border-box"
          }}
        />
      )}
    </div>
  );
};

export default GlobeMapbox;
