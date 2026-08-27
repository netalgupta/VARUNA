/**
 * VARUNA Geospatial Map Engine Configuration
 * Authoritative Coordinate System: WGS84 (EPSG:4326) / Web Mercator (EPSG:3857)
 */

export interface BasinPreset {
  label: string;
  lon: number;
  lat: number;
  zoom: number;
}

export const MAP_CONFIG = {
  // Initial framing centered over India & Northern Indian Ocean Basin matching Google Maps reference
  INITIAL_CENTER: {
    lon: 78.0,
    lat: 18.0,
  } as const,
  INITIAL_ZOOM: 3.5,
  MIN_ZOOM: 2.0,
  MAX_ZOOM: 16.0,

  // Geospatial bounds restricting camera to the Greater Indian Ocean & Indo-Pacific theater
  MAX_BOUNDS: [
    [15.0, -45.0], // Southwest: Southern Ocean / East Africa coast
    [145.0, 50.0], // Northeast: East Asia / Himalayas
  ] as [[number, number], [number, number]],

  // MapTiler / Open-Source Tile Endpoints
  MAPTILER_TOKEN: process.env.NEXT_PUBLIC_MAPTILER_TOKEN || "",
  MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "",
};

// Strategic Marine Basin Focus Presets
export const BASIN_PRESETS: Record<string, BasinPreset> = {
  INDIAN_OCEAN: {
    label: "Indian Ocean",
    lon: 78.0,
    lat: 18.0,
    zoom: 3.5,
  },
  ARABIAN_SEA: {
    label: "Arabian Sea",
    lon: 66.0,
    lat: 17.0,
    zoom: 4.8,
  },
  BAY_OF_BENGAL: {
    label: "Bay of Bengal",
    lon: 88.0,
    lat: 16.0,
    zoom: 4.8,
  },
  GULF_OF_MANNAR: {
    label: "Gulf of Mannar",
    lon: 79.2,
    lat: 9.0,
    zoom: 6.2,
  },
};
