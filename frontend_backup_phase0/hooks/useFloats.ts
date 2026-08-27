import { useState, useEffect } from 'react';

/**
 * Core interface for ARGO float geographic marker data
 */
export interface FloatPoint {
  id: string; // WMO ID
  wmo_id: string;
  lat: number;
  lon: number;
  last_seen: string;
  total_profiles: number;
  status: 'active' | 'inactive';
}

/**
 * Fetch float positions initially from the backend
 */
export function useFloats() {
  const [floats, setFloats] = useState<FloatPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFloats = async () => {
      try {
        setLoading(true);
        // We route through the gateway
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        
        // Use the Python backend endpoint: /api/v1/floats
        const res = await fetch(`${apiUrl}/api/v1/floats`);
        
        if (!res.ok) {
          throw new Error(`HTTP Error: ${res.status}`);
        }
        
        const data = await res.json();
        
        // Map backend columns to frontend schema
        // Expected from backend: { wmo_id, last_lat, last_lon, last_seen, total_profiles }
        const mapped = data.map((f: any) => ({
          id: f.wmo_id,
          wmo_id: f.wmo_id,
          lat: f.last_lat,
          lon: f.last_lon,
          last_seen: f.last_seen,
          total_profiles: f.total_profiles,
          status: isRecentlySeen(f.last_seen) ? 'active' : 'inactive'
        }));
        
        setFloats(mapped);
      } catch (err: any) {
        console.error("Failed to fetch fleet data", err);
        setError(err.message);
        
        // --- FALLBACK DEV DATA (for UI testing before DB is loaded) ---
        // Generates 200 random points mostly in the Indian Ocean
        if (process.env.NODE_ENV === 'development') {
          console.log("Loading fallback dev float data.");
          setFloats(Array.from({length: 200}).map((_, i) => ({
            id: `dev-${i}`,
            wmo_id: `190${2000+i}`,
            lat: 10 + (Math.random() * 20 - 10), // ~0 to 20 eq
            lon: 60 + (Math.random() * 30),     // ~Arabian Sea to Bay of Bengal
            last_seen: new Date().toISOString(),
            total_profiles: Math.floor(Math.random() * 120),
            status: Math.random() > 0.8 ? 'inactive' : 'active'
          })));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchFloats();
  }, []);

  return { floats, loading, error };
}

/** Utility to determine if float is active (pinged in last 14 days) */
function isRecentlySeen(dateString: string) {
  if (!dateString) return false;
  const d = new Date(dateString);
  const now = new Date();
  const diffDays = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
  return diffDays <= 14;
}
