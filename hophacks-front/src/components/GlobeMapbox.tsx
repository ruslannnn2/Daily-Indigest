import React, { useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { Map, useControl } from "react-map-gl/maplibre";
import type { ViewState } from "react-map-gl/maplibre";
import { MapboxOverlay } from "@deck.gl/mapbox";
import maplibregl from "maplibre-gl";
import { Layer } from "@deck.gl/core";
import type { GeoJSON } from "geojson";
import type { PickingInfo } from "@deck.gl/core";
import { ScreenGridLayer } from "deck.gl";


const DATA_URL =
  'https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/screen-grid/uber-pickup-locations.json';

type DataPoint = [longitude: number, latitude: number, count: number];

  const colorRange: Color[] = [
  [255, 255, 178, 25],
  [254, 217, 118, 85],
  [254, 178, 76, 127],
  [253, 141, 60, 170],
  [240, 59, 32, 212],
  [189, 0, 38, 255]
];


// Define hover info type

// Sample GeoJSON data (a few major cities)
// const CITIES: GeoJSON = {
//   type: "FeatureCollection",
//   features: [
//     {
//       type: "Feature",
//       properties: { name: "New York", population: 8336817 },
//       geometry: { type: "Point", coordinates: [-74.006, 40.7128] }
//     },
//     {
//       type: "Feature",
//       properties: { name: "London", population: 8982000 },
//       geometry: { type: "Point", coordinates: [-0.1276, 51.5074] }
//     },
//     {
//       type: "Feature",
//       properties: { name: "Tokyo", population: 13960000 },
//       geometry: { type: "Point", coordinates: [139.6917, 35.6895] }
//     },
//     {
//       type: "Feature",
//       properties: { name: "Sydney", population: 5312000 },
//       geometry: { type: "Point", coordinates: [151.2093, -33.8688] }
//     },
//     {
//       type: "Feature",
//       properties: { name: "Rio de Janeiro", population: 6748000 },
//       geometry: { type: "Point", coordinates: [-43.1729, -22.9068] }
//     },
//     {
//       type: "Feature",
//       properties: { name: "Cairo", population: 9500000 },
//       geometry: { type: "Point", coordinates: [31.2357, 30.0444] }
//     }
//   ]
// };

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
  // Add any custom props here
  className?: string;
  style?: React.CSSProperties;
  initialViewState?: Partial<ViewState>;
  brightness?: number;
  globeOutlineColor?: string;
  globeOutlineWidth?: number;
}

const GlobeMapbox: React.FC<GlobeMapboxProps> = (props) => {
  const {
    brightness = 1.0,
    globeOutlineColor = "#FFFFFF",
    globeOutlineWidth = 0,
    className,
    style,
    initialViewState
  } = props;
  
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const INITIAL_VIEW_STATE: ViewState = {
    longitude: -95, // Center of the US
    latitude: 37,   // Around Kansas (middle of US)
    zoom: 3.5,        // Good globe view
    bearing: 0,
    pitch: 15,
    padding: {top: 0, bottom: 0, left: 450, right: 0},
    ...initialViewState
  };

  // Create a GeoJsonLayer to show cities on the globe
  const layers = [
   new ScreenGridLayer<DataPoint>({
      id: 'grid',
      data: DATA_URL,
      opacity: 0.8,
      getPosition: d => [d[0], d[1]],
      getWeight: d => d[2],
      cellSizePixels: 8,
      colorRange,
    })
  ];



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
          initialViewState={INITIAL_VIEW_STATE}
          mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
          style={{ width: "100%", height: "100%" }}
          attributionControl={false}
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
