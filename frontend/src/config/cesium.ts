/**
 * VARUNA Cesium 3D Geospatial Engine Configuration
 * Standardized configuration for Indian Ocean framing, Ion token resolution, and terrain/imagery presets.
 */

export interface CesiumCameraPreset {
  longitude: number;
  latitude: number;
  height: number;
  heading: number;
  pitch: number;
  roll: number;
}

export const INDIAN_OCEAN_CAMERA: CesiumCameraPreset = {
  longitude: 78.0, // Centered over Indian peninsula & Sri Lanka basin
  latitude: 10.0,  // Northern Indian Ocean framing Arabian Sea & Bay of Bengal
  height: 5600000, // 5,600 km provides clean 3D Earth curvature and basin coverage
  heading: 0.0,
  pitch: -85.0,    // Tactical top-down ops perspective
  roll: 0.0,
};

export const ARABIAN_SEA_CAMERA: CesiumCameraPreset = {
  longitude: 68.5,
  latitude: 16.5,
  height: 2500000,
  heading: 0.0,
  pitch: -80.0,
  roll: 0.0,
};

export const BAY_OF_BENGAL_CAMERA: CesiumCameraPreset = {
  longitude: 87.5,
  latitude: 14.5,
  height: 2500000,
  heading: 0.0,
  pitch: -80.0,
  roll: 0.0,
};

export const GULF_OF_MANNAR_CAMERA: CesiumCameraPreset = {
  longitude: 79.2,
  latitude: 9.1,
  height: 800000,
  heading: 0.0,
  pitch: -75.0,
  roll: 0.0,
};

export const CESIUM_ION_DEFAULT_TOKEN =
  process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IjlMbGotWEdsLVRhNkptSGEiLCJqdGkiOiJiMjI0YjVhOC00OWM3LTQ1ZWUtOTkxNC1iNWU3YzVlOGFkNjYiLCJpZCI6NDcwNjA5LCJpc3MiOiJodHRwczovL2FwaS5jZXNpdW0uY29tIiwiYXVkIjoidW5kZWZpbmVkX2RlZmF1bHQiLCJpYXQiOjE3ODczODQ5MDV9.QGOMv_B100U8iGdpy0_G6SpAOC3HM_YLGsLvF9hWH0Q";
