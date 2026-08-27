/**
 * VARUNA Cesium 3D Geospatial Integration Layer (Architecture Stub)
 * Isolated client-side abstraction for 3D bathymetry, ocean currents, and ARGO float trajectory rendering.
 */

export interface CesiumViewerConfig {
  ionAccessToken?: string;
  terrainProvider?: "cesium-world-terrain" | "ellipsoid";
  enableLighting?: boolean;
  enableAtmosphere?: boolean;
  initialCamera?: {
    longitude: number;
    latitude: number;
    height: number;
    heading?: number;
    pitch?: number;
    roll?: number;
  };
}

export const DEFAULT_CESIUM_CONFIG: CesiumViewerConfig = {
  ionAccessToken: process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN || "",
  terrainProvider: "ellipsoid",
  enableLighting: false,
  enableAtmosphere: true,
  initialCamera: {
    longitude: 78.0,
    latitude: 10.0,
    height: 12000000, // 12,000 km altitude over Indian Ocean
    pitch: -90,
  },
};
