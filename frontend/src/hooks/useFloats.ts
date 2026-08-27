"use client";

import { useState, useEffect } from "react";
import type { FloatPoint, ActiveFloatSummary } from "@/types/argo";
import { getFloats } from "@/lib/api/argo";

export type { FloatPoint };

export function useFloats() {
  const [floats, setFloats] = useState<FloatPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchFleet = async () => {
      try {
        setLoading(true);
        const data = await getFloats(200);

        if (!isMounted) return;

        // Map backend columns to frontend schema
        const mapped: FloatPoint[] = data.map((f: ActiveFloatSummary) => ({
          id: String(f.wmo_id),
          wmo_id: String(f.wmo_id),
          lat: f.last_lat,
          lon: f.last_lon,
          last_seen: f.last_seen,
          total_profiles: f.total_profiles,
          status: isRecentlySeen(f.last_seen) ? "active" : "inactive",
        }));

        setFloats(mapped);
      } catch (err: any) {
        if (!isMounted) return;
        console.warn("Could not fetch live float fleet, using fallback telemetry:", err.message);
        setError(err.message);

        // Fallback dev dataset for preview
        setFloats(
          Array.from({ length: 80 }).map((_, i) => ({
            id: `dev-${i}`,
            wmo_id: `190${2000 + i}`,
            lat: 5 + (Math.random() * 20 - 5),
            lon: 60 + Math.random() * 30,
            last_seen: new Date().toISOString(),
            total_profiles: Math.floor(Math.random() * 120),
            status: Math.random() > 0.8 ? "inactive" : "active",
          }))
        );
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchFleet();

    return () => {
      isMounted = false;
    };
  }, []);

  return { floats, loading, error };
}

function isRecentlySeen(dateString?: string) {
  if (!dateString) return false;
  const d = new Date(dateString);
  const now = new Date();
  const diffDays = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
  return diffDays <= 14;
}
