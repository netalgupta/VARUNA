/**
 * VARUNA Platform Constants & Oceanographic Domain Configuration
 */

export const APP_CONFIG = {
  name: "VARUNA",
  fullName: "VARUNA — National Marine Data Backbone",
  tagline: "INCOIS ARGO Physical Oceanography ⇄ CMLRE Marine Living Resources",
  organization: "Ministry of Earth Sciences (MoES) · Government of India",
  version: "2.0.0",
} as const;

export const INDIAN_OCEAN_BOUNDS = {
  minLon: 30.0,
  maxLon: 120.0,
  minLat: -45.0,
  maxLat: 30.0,
  center: {
    lon: 78.0,
    lat: 10.0,
  },
} as const;

export const OCEAN_BASINS = [
  { id: "arabian_sea", name: "Arabian Sea", bounds: [50.0, 0.0, 77.0, 25.0] },
  { id: "bay_of_bengal", name: "Bay of Bengal", bounds: [78.0, 0.0, 95.0, 23.0] },
  { id: "equatorial_io", name: "Equatorial Indian Ocean", bounds: [50.0, -10.0, 100.0, 5.0] },
  { id: "gulf_of_mannar", name: "Gulf of Mannar & Palk Bay", bounds: [77.5, 8.0, 80.0, 10.0] },
] as const;

export const DEPTH_ZONES = [
  { name: "Epipelagic (Sunlight)", minDepth: 0, maxDepth: 200, color: "#2EE6C6" },
  { name: "Mesopelagic (Twilight / OMZ)", minDepth: 200, maxDepth: 1000, color: "#38BDF8" },
  { name: "Bathypelagic (Midnight)", minDepth: 1000, maxDepth: 2000, color: "#818CF8" },
] as const;
