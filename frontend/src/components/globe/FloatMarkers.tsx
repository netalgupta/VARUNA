"use client";

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Points, PointMaterial } from '@react-three/drei';

interface FloatPoint {
  platform_number: string;
  lat: number;
  lon: number;
}

// Map lat/lon to 3D sphere coordinates
function latLonToVector3(lat: number, lon: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return new THREE.Vector3(x, y, z);
}

export function FloatMarkers({ floats = [] }: { floats?: FloatPoint[] }) {
  // Sample data if none provided
  const points = useMemo(() => {
    const data = floats.length > 0 ? floats : [
      { platform_number: "F1", lat: 19.0, lon: 72.8 }, // Near Mumbai
      { platform_number: "F2", lat: -10.5, lon: 80.2 },
      { platform_number: "F3", lat: 5.2, lon: 60.1 },
      { platform_number: "F4", lat: -30.0, lon: 110.0 },
      { platform_number: "F5", lat: 12.4, lon: 92.7 },
    ];

    const positions = new Float32Array(data.length * 3);
    data.forEach((f, i) => {
      const vec = latLonToVector3(f.lat, f.lon, 2.05); // Slightly above surface
      positions[i * 3] = vec.x;
      positions[i * 3 + 1] = vec.y;
      positions[i * 3 + 2] = vec.z;
    });
    return positions;
  }, [floats]);

  return (
    <group>
      <Points positions={points} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          color="#00F0FF"
          size={0.1}
          sizeAttenuation={true}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </Points>
      
      {/* Dynamic pulse markers for selected floats could go here */}
    </group>
  );
}
