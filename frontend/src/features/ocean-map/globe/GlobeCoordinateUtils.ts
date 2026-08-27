import * as THREE from "three";

/**
 * VARUNA Authoritative Geographic Coordinate Transformations (WGS84 Spherical Projection)
 *
 * Mathematical Projection Standard:
 * - Latitude: [-90°, +90°] (South to North)
 * - Longitude: [-180°, +180°] (West to East)
 * - Colatitude phi = (90 - lat) * (PI / 180)
 * - Longitude theta = (lon + 180) * (PI / 180)
 *
 * Cartesian conversion:
 * x = - (radius + alt) * sin(phi) * cos(theta)
 * y =   (radius + alt) * cos(phi)
 * z =   (radius + alt) * sin(phi) * sin(theta)
 */

export function latLonToGlobePosition(
  lat: number,
  lon: number,
  radius = 100,
  altitudeOffset = 0
): THREE.Vector3 {
  const r = radius + altitudeOffset;
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  const x = -r * Math.sin(phi) * Math.cos(theta);
  const y = r * Math.cos(phi);
  const z = r * Math.sin(phi) * Math.sin(theta);

  return new THREE.Vector3(x, y, z);
}

/**
 * Reverse Transformation: 3D Cartesian Position to (Latitude, Longitude)
 */
export function globePositionToLatLon(
  point: THREE.Vector3,
  radius = 100
): { lat: number; lon: number } {
  const norm = point.clone().normalize();

  // Latitude from Y-axis
  const phi = Math.acos(Math.max(-1, Math.min(1, norm.y)));
  const lat = 90 - (phi * 180) / Math.PI;

  // Longitude from X-Z plane
  const theta = Math.atan2(norm.z, -norm.x);
  let lon = (theta * 180) / Math.PI - 180;

  // Normalize longitude to [-180, +180]
  if (lon < -180) lon += 360;
  if (lon > 180) lon -= 360;

  return {
    lat: Math.round(lat * 100) / 100,
    lon: Math.round(lon * 100) / 100,
  };
}

/**
 * Great-Circle Interpolation between two Lat/Lon points
 */
export function interpolateGreatCircle(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  numSegments = 16,
  radius = 100,
  altitudeOffset = 0.5
): THREE.Vector3[] {
  const p1 = latLonToGlobePosition(lat1, lon1, radius, altitudeOffset);
  const p2 = latLonToGlobePosition(lat2, lon2, radius, altitudeOffset);

  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= numSegments; i++) {
    const t = i / numSegments;
    // Slerp on normalized sphere
    const v = new THREE.Vector3().copy(p1).lerp(p2, t).normalize().multiplyScalar(radius + altitudeOffset);
    points.push(v);
  }
  return points;
}
