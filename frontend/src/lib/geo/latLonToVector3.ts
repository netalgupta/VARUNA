import * as THREE from "three";

/**
 * VARUNA Authoritative Geographic-to-Cartesian Projection
 * WGS84 Decimal Degrees Standard:
 * - Latitude:  -90° (South Pole) to +90° (North Pole)
 * - Longitude: -180° (West) to +180° (East), 0° = Prime Meridian
 *
 * Mathematical Transformation:
 * - Colatitude (phi): 0 at North Pole, PI/2 at Equator, PI at South Pole
 * - Longitude (theta): 0 at Antimeridian (-180°), PI at Prime Meridian (0°), 2*PI at Antimeridian (+180°)
 */
export function latLonToVector3(
  lat: number,
  lon: number,
  radius: number,
  altitudeOffset = 0
): THREE.Vector3 {
  const r = radius + altitudeOffset;
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

/**
 * Reverse Transformation: Cartesian Vector3 to WGS84 (Latitude, Longitude)
 */
export function vector3ToLatLon(
  point: THREE.Vector3,
  radius?: number
): { lat: number; lon: number } {
  const norm = point.clone().normalize();

  // Latitude from Y axis
  const phi = Math.acos(Math.max(-1, Math.min(1, norm.y)));
  const lat = 90 - (phi * 180) / Math.PI;

  // Longitude from X-Z plane
  const theta = Math.atan2(norm.z, -norm.x);
  let lon = (theta * 180) / Math.PI - 180;

  if (lon < -180) lon += 360;
  if (lon > 180) lon -= 360;

  return {
    lat: Math.round(lat * 10000) / 10000,
    lon: Math.round(lon * 10000) / 10000,
  };
}

/**
 * Standard Landmark Ground Truth Coordinates
 */
export const LANDMARK_COORDINATES = {
  CHENNAI: { lat: 13.0827, lon: 80.2707, label: "Chennai (Bay of Bengal Coast)" },
  KOCHI: { lat: 9.9312, lon: 76.2673, label: "Kochi (CMLRE HQ / Arabian Sea Coast)" },
  EQUATOR_PRIME_MERIDIAN: { lat: 0, lon: 0, label: "Null Island (0°, 0°)" },
  NORTH_POLE: { lat: 90, lon: 0, label: "North Pole (90°N)" },
  SOUTH_POLE: { lat: -90, lon: 0, label: "South Pole (90°S)" },
};

/**
 * Basin Preset Camera Positions
 */
export const BASIN_PRESETS = {
  INDIAN_OCEAN: { lat: 5.0, lon: 78.0, distance: 240, label: "Indian Ocean" },
  ARABIAN_SEA: { lat: 15.0, lon: 65.0, distance: 180, label: "Arabian Sea" },
  BAY_OF_BENGAL: { lat: 15.0, lon: 88.0, distance: 180, label: "Bay of Bengal" },
  GULF_OF_MANNAR: { lat: 9.0, lon: 79.0, distance: 150, label: "Gulf of Mannar" },
};
