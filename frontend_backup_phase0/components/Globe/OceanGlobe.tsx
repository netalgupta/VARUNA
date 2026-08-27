"use client";

import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  PerspectiveCamera,
  Float,
  Sphere,
  ContactShadows,
} from "@react-three/drei";
import * as THREE from "three";

// Simulated ARGO float surface coordinates focused on the Indian Ocean basin
const ARGO_LOCATIONS = [
  // Arabian Sea
  { lat: 18.5, lon: 68.2, id: "1902303", name: "Arabian Sea Float 1902303" },
  { lat: 15.2, lon: 71.8, id: "2901742", name: "Konkan Basin Float 2901742" },
  { lat: 12.8, lon: 65.4, id: "1902304", name: "Central Arabian Sea Float 1902304" },
  { lat: 21.0, lon: 64.0, id: "1902305", name: "Northern Arabian Shelf Float 1902305" },

  // Bay of Bengal
  { lat: 14.5, lon: 85.0, id: "2902306", name: "Central Bay of Bengal Float 2902306" },
  { lat: 11.2, lon: 82.4, id: "2902307", name: "Coromandel Trench Float 2902307" },
  { lat: 18.0, lon: 88.5, id: "2902308", name: "North Bay of Bengal Float 2902308" },
  { lat: 8.5,  lon: 86.2, id: "2902309", name: "Sri Lanka Dome Float 2902309" },

  // Equatorial Indian Ocean & Lakshadweep
  { lat: 10.5, lon: 72.6, id: "2901750", name: "Lakshadweep MPA Float 2901750" },
  { lat: 2.0,  lon: 78.0, id: "2901755", name: "Equatorial Jet Float 2901755" },
  { lat: -4.5, lon: 75.0, id: "2901760", name: "Chagos-Laccadive Ridge Float 2901760" },
  { lat: 6.8,  lon: 93.5, id: "2901765", name: "Andaman Basin Float 2901765" },
];

function latLonToVector3(lat: number, lon: number, radius: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return [x, y, z];
}

// ── Bioluminescent Float Markers ─────────────────────────────────────────────
function FloatFleetMarkers({ radius = 2.02 }: { radius?: number }) {
  const points = useMemo(() => {
    return ARGO_LOCATIONS.map((f) => ({
      ...f,
      pos: latLonToVector3(f.lat, f.lon, radius),
    }));
  }, [radius]);

  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const scale = 1 + Math.sin(clock.getElapsedTime() * 3) * 0.15;
      groupRef.current.children.forEach((child) => {
        child.scale.set(scale, scale, scale);
      });
    }
  });

  return (
    <group ref={groupRef}>
      {points.map((p) => (
        <group key={p.id} position={p.pos}>
          {/* Glowing pulse sphere */}
          <mesh>
            <sphereGeometry args={[0.035, 16, 16]} />
            <meshBasicMaterial color="#00FFC6" />
          </mesh>
          {/* Outer halo */}
          <mesh>
            <sphereGeometry args={[0.07, 16, 16]} />
            <meshBasicMaterial
              color="#2EE6C6"
              transparent
              opacity={0.35}
              wireframe
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ── Depth Bathymetry Mesh with Continental Slopes ────────────────────────────
function BathymetryOceanMesh() {
  const globeGroupRef = useRef<THREE.Group>(null);

  // Subtle continuous planetary rotation around the Indian Ocean axis
  useFrame((_, delta) => {
    if (globeGroupRef.current) {
      globeGroupRef.current.rotation.y += delta * 0.04;
    }
  });

  // Custom Bathymetry Depth Shader / Procedural Bump Material
  const bathymetryMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color("#071A2D"), // Midnight Water
      roughness: 0.25,
      metalness: 0.85,
      emissive: new THREE.Color("#051421"),
      emissiveIntensity: 0.6,
      wireframe: false,
    });
  }, []);

  return (
    <group ref={globeGroupRef}>
      {/* Outer Atmospheric Glow / Rayleigh Scattering */}
      <Sphere args={[2.22, 48, 48]}>
        <meshBasicMaterial
          color="#1ECBE1"
          transparent
          opacity={0.06}
          side={THREE.BackSide}
        />
      </Sphere>

      {/* Bathymetry Relief Shell (Mid-depth stratification) */}
      <Sphere args={[2.08, 48, 48]}>
        <meshBasicMaterial
          color="#2EE6C6"
          transparent
          opacity={0.04}
          wireframe
        />
      </Sphere>

      {/* Main Ocean Bathymetry Sphere */}
      <mesh material={bathymetryMaterial}>
        <sphereGeometry args={[2.0, 64, 64]} />
      </mesh>

      {/* Depth Trench Grid / Bathymetric Contours (0-2000m) */}
      <Sphere args={[1.98, 32, 32]}>
        <meshBasicMaterial
          color="#00FFC6"
          transparent
          opacity={0.08}
          wireframe
        />
      </Sphere>

      {/* Inner Abyssal Core */}
      <Sphere args={[1.85, 24, 24]}>
        <meshBasicMaterial color="#051421" />
      </Sphere>

      {/* Bioluminescent Float Fleet Points */}
      <FloatFleetMarkers radius={2.02} />
    </group>
  );
}

export function OceanGlobe() {
  return (
    <div className="w-full h-full relative cursor-grab active:cursor-grabbing select-none">
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        {/* Camera positioned facing Indian Ocean Basin (~12°N, 78°E) */}
        <PerspectiveCamera makeDefault position={[1.8, 1.2, 4.8]} fov={42} />

        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={3.5}
          maxDistance={7.0}
          autoRotate={false}
          maxPolarAngle={Math.PI / 1.4}
          minPolarAngle={Math.PI / 3.2}
          rotateSpeed={0.6}
        />

        {/* Dynamic Oceanographic Lighting */}
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} intensity={2.0} color="#00FFC6" />
        <pointLight position={[-10, -5, -10]} intensity={1.2} color="#1ECBE1" />
        <spotLight
          position={[0, 15, 8]}
          angle={0.25}
          penumbra={1}
          intensity={2.5}
          color="#2EE6C6"
        />

        <Float speed={1.2} rotationIntensity={0.2} floatIntensity={0.3}>
          <BathymetryOceanMesh />
        </Float>

        <ContactShadows
          position={[0, -2.6, 0]}
          opacity={0.45}
          scale={9}
          blur={2.5}
          far={4}
        />
      </Canvas>

      {/* ── Overlay Telemetry Card ────────────────────────────────────────── */}
      <div className="absolute top-6 left-6 p-4 glass rounded-2xl max-w-xs pointer-events-none backdrop-blur-xl border border-white/10 shadow-2xl">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-glow animate-ping" />
          <span className="text-[10px] font-mono font-bold text-glow uppercase tracking-widest">
            Indian Ocean Basin Telemetry
          </span>
        </div>
        <h2 className="text-sm font-mono font-bold text-text mb-1">
          INCOIS ARGO Float Fleet (3,842 Active)
        </h2>
        <p className="text-[11px] font-sans text-text-muted leading-relaxed">
          Depth bathymetry &amp; in-situ surface CTD nodes. Real-time salinity,
          temperature (0–2000m), and dissolved oxygen monitoring.
        </p>
      </div>
    </div>
  );
}

export default OceanGlobe;
