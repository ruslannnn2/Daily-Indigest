import React, { useMemo } from 'react';
import { Map, useControl } from 'react-map-gl/maplibre';
import { MapboxOverlay } from '@deck.gl/mapbox';
import type { PickingInfo } from '@deck.gl/core';
import { ScreenGridLayer } from '@deck.gl/aggregation-layers';
import { COORDINATE_SYSTEM, Layer } from '@deck.gl/core';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

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

// Default color range for the grid
const DEFAULT_COLOR_RANGE: Color[] = [
  [255, 255, 178, 25],
  [254, 217, 118, 85],
  [254, 178, 76, 127],
  [253, 141, 60, 170],
  [240, 59, 32, 212],
  [189, 0, 38, 255]
];

export interface SimpleMapProps {
  // Basic styling
  className?: string;
  style?: React.CSSProperties;
  
  // View state
  viewState?: {
    longitude: number;
    latitude: number;
    zoom: number;
    pitch?: number;
    bearing?: number;
  };
  
  // Data visualization
  data?: DataPoint[] | APIDataPoint[] | string;
  colorRange?: Color[];
  opacity?: number;
  cellSize?: number;
  aggregation?: 'SUM' | 'MEAN' | 'MIN' | 'MAX';
  colorDomain?: [number, number];
  
  // Interactivity
  pickable?: boolean;
  onHover?: (info: PickingInfo) => void;
  onClick?: (info: PickingInfo) => void;
  onViewStateChange?: (params: any) => void;
}

const SimpleMap: React.FC<SimpleMapProps> = (props) => {
  const {
    className,
    style,
    viewState = {
      longitude: -95,
      latitude: 40,
      zoom: 4,
      pitch: 0,
      bearing: 0
    },
    data = [],
    colorRange = DEFAULT_COLOR_RANGE,
    opacity = 0.8,
    cellSize = 12,
    aggregation = 'SUM',
    colorDomain = [0, 20],
    pickable = false,
    onHover,
    onClick,
    onViewStateChange
  } = props;

  // Helper function to handle different data input types
  const getDataSource = (inputData: string | DataPoint[] | APIDataPoint[] | undefined): string | DataPoint[] | APIDataPoint[] => {
    if (!inputData || (Array.isArray(inputData) && inputData.length === 0)) {
      console.log("SimpleMap: No data provided, returning empty array");
      return [];
    }
    console.log("SimpleMap: Data source provided:", typeof inputData === 'string' ? 'URL string' : 'Data array');
    return inputData;
  };

  // Create ScreenGridLayer to visualize data
  const layers = useMemo(() => {
    const dataSource = getDataSource(data);
    
    if (Array.isArray(dataSource) && dataSource.length === 0) {
      console.log("SimpleMap: Empty data array, not creating layer");
      return [];
    }
    
    console.log("SimpleMap: Creating ScreenGridLayer with data source", 
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
        colorDomain,
        aggregation,
        pickable,
        gpuAggregation: false, // Disable GPU aggregation to access individual data points
        onHover: (info) => {
          if (onHover) {
            onHover(info);
          }
          return false;
        },
        onClick: (info) => {
          if (onClick) {
            onClick(info);
          }
          return false;
        }
      })
    ];
  }, [data, opacity, cellSize, colorRange, colorDomain, aggregation, pickable, onHover, onClick]);

  return (
    <div 
      className={className}
      style={{ 
        width: "100%", 
        height: "100%", 
        position: "relative",
        ...style 
      }}
    >
      <Map
        mapLib={maplibregl}
        {...viewState}
        onMove={(evt) => {
          // Handle view state changes
          if (onViewStateChange) {
            onViewStateChange({ viewState: evt.viewState });
          }
        }}
        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
      >
        <DeckGLOverlay layers={layers} />
      </Map>
    </div>
  );
};

export default SimpleMap;
