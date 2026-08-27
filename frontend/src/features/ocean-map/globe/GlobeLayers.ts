import * as THREE from "three";
import { latLonToVector3, LANDMARK_COORDINATES } from "@/lib/geo/latLonToVector3";
import {
  createPointTexture,
  createCoastlineMaterial,
  createGraticuleMaterial,
} from "./GlobeMaterials";
import type { ActiveFloatSummary } from "@/types/argo";
import type { AnomalyAlert } from "@/types/anomalies";
import type { BiodiversityRecord } from "@/types/biodiversity";

/**
 * 1. Build authentic Coastlines from GeoJSON
 */
export function createCoastlinesFromGeoJSON(geojson: any, radius = 100): THREE.Group {
  const group = new THREE.Group();
  group.name = "coastlines";

  const coastlineMaterial = createCoastlineMaterial();

  if (!geojson || !geojson.features) return group;

  geojson.features.forEach((feature: any) => {
    const geometry = feature.geometry;
    if (!geometry) return;

    const processPolygon = (coords: number[][]) => {
      const points: THREE.Vector3[] = [];
      coords.forEach(([lon, lat]) => {
        points.push(latLonToVector3(lat, lon, radius, 0.15));
      });
      if (points.length > 1) {
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(lineGeo, coastlineMaterial);
        group.add(line);
      }
    };

    if (geometry.type === "Polygon") {
      geometry.coordinates.forEach(processPolygon);
    } else if (geometry.type === "MultiPolygon") {
      geometry.coordinates.forEach((poly: number[][][]) => {
        poly.forEach(processPolygon);
      });
    }
  });

  return group;
}

/**
 * 2. Build subtle Tactical Lat/Lon Coordinate Graticule Grid
 */
export function createTacticalGraticule(radius = 100): THREE.Group {
  const group = new THREE.Group();
  group.name = "graticule";

  const graticuleMaterial = createGraticuleMaterial();
  const equatorMaterial = new THREE.LineBasicMaterial({
    color: new THREE.Color("#00FFC6"),
    transparent: true,
    opacity: 0.35,
  });

  // Latitude parallels: [-75°, +75°] every 15°
  for (let lat = -75; lat <= 75; lat += 15) {
    const points: THREE.Vector3[] = [];
    const isEquator = lat === 0;
    const segments = 72;

    for (let i = 0; i <= segments; i++) {
      const lon = (i / segments) * 360 - 180;
      points.push(latLonToVector3(lat, lon, radius, 0.08));
    }

    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geo, isEquator ? equatorMaterial : graticuleMaterial);
    group.add(line);
  }

  // Longitude meridians: every 30°, plus 78°E (Indian Ocean reference meridian)
  const meridians = [-180, -150, -120, -90, -60, -30, 0, 30, 60, 78, 90, 120, 150, 180];
  meridians.forEach((lon) => {
    const points: THREE.Vector3[] = [];
    const segments = 60;
    const isIndianOceanRef = lon === 78;

    for (let i = 0; i <= segments; i++) {
      const lat = (i / segments) * 160 - 80;
      points.push(latLonToVector3(lat, lon, radius, 0.08));
    }

    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(
      geo,
      isIndianOceanRef ? equatorMaterial : graticuleMaterial
    );
    group.add(line);
  });

  // ── Landmark Verification Pins (Chennai & Kochi) ──────────────────────────
  const landmarkGeo = new THREE.SphereGeometry(0.8, 16, 16);
  const landmarkMat = new THREE.MeshBasicMaterial({ color: 0x00ffc6 });

  [LANDMARK_COORDINATES.CHENNAI, LANDMARK_COORDINATES.KOCHI].forEach((lm) => {
    const pinPos = latLonToVector3(lm.lat, lm.lon, radius, 0.3);
    const pin = new THREE.Mesh(landmarkGeo, landmarkMat);
    pin.position.copy(pinPos);
    pin.name = lm.label;
    group.add(pin);
  });

  return group;
}

/**
 * 3. Build High-Performance ARGO Float Fleet using THREE.InstancedMesh (60fps at scale)
 */
export function createArgoInstancedLayer(
  floats: ActiveFloatSummary[],
  selectedFloatId: string | null,
  radius = 100
): { group: THREE.Group; instancedMesh: THREE.InstancedMesh; floatMap: ActiveFloatSummary[] } {
  const group = new THREE.Group();
  group.name = "argo-floats-layer";

  const count = floats.length;
  if (count === 0) {
    const dummy = new THREE.InstancedMesh(new THREE.BufferGeometry(), new THREE.Material(), 0);
    return { group, instancedMesh: dummy, floatMap: [] };
  }

  // Base marker geometry: Low-poly sphere / circle
  const sphereGeo = new THREE.SphereGeometry(1.2, 12, 12);
  const sphereMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.95,
  });

  const instancedMesh = new THREE.InstancedMesh(sphereGeo, sphereMat, count);
  instancedMesh.name = "argo-instanced-mesh";

  const dummy = new THREE.Object3D();
  const aquaColor = new THREE.Color("#2EE6C6");
  const selectedColor = new THREE.Color("#00FFC6");

  floats.forEach((f, idx) => {
    const isSelected = String(f.wmo_id) === selectedFloatId;
    const pos = latLonToVector3(f.last_lat, f.last_lon, radius, isSelected ? 1.4 : 0.6);

    dummy.position.copy(pos);
    dummy.scale.set(isSelected ? 1.8 : 1.0, isSelected ? 1.8 : 1.0, isSelected ? 1.8 : 1.0);
    dummy.updateMatrix();

    instancedMesh.setMatrixAt(idx, dummy.matrix);
    instancedMesh.setColorAt(idx, isSelected ? selectedColor : aquaColor);

    // If selected, add beacon ring and depth pin
    if (isSelected) {
      const ringGeo = new THREE.RingGeometry(2.5, 3.4, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x00ffc6,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(pos);
      ring.lookAt(0, 0, 0);
      group.add(ring);
    }
  });

  instancedMesh.instanceMatrix.needsUpdate = true;
  if (instancedMesh.instanceColor) {
    instancedMesh.instanceColor.needsUpdate = true;
  }

  group.add(instancedMesh);

  return { group, instancedMesh, floatMap: floats };
}

/**
 * 4. Build Biodiversity Observations Layer
 */
export function createBiodiversityLayer(
  records: BiodiversityRecord[],
  radius = 100
): { group: THREE.Group; interactiveObjects: THREE.Object3D[] } {
  const group = new THREE.Group();
  group.name = "biodiversity";
  const interactiveObjects: THREE.Object3D[] = [];

  const bioTexture = createPointTexture("#1ECBE1", 0.4);

  records.forEach((b) => {
    const pos = latLonToVector3(b.latitude, b.longitude, radius, 0.45);

    const material = new THREE.SpriteMaterial({
      map: bioTexture,
      color: 0x1ecbe1,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
    });

    const sprite = new THREE.Sprite(material);
    sprite.position.copy(pos);
    sprite.scale.set(1.6, 1.6, 1);

    sprite.userData = {
      type: "BIODIVERSITY",
      speciesName: b.scientific_name,
      commonName: b.common_name,
      lat: b.latitude,
      lon: b.longitude,
    };

    group.add(sprite);
    interactiveObjects.push(sprite);
  });

  return { group, interactiveObjects };
}

/**
 * 5. Build Marine Heatwaves & Hypoxia Bounding Regions (Connected 4-Corner Geometry)
 */
export function createAnomalyRegionsLayer(
  anomalies: AnomalyAlert[],
  selectedAlertId: number | null,
  mapLayers: { heatwaves: boolean; hypoxia: boolean },
  radius = 100
): { group: THREE.Group; interactiveObjects: THREE.Object3D[] } {
  const group = new THREE.Group();
  group.name = "anomalies";
  const interactiveObjects: THREE.Object3D[] = [];

  anomalies.forEach((a) => {
    const isMHW = a.alert_type === "MARINE_HEATWAVE";
    if (isMHW && !mapLayers.heatwaves) return;
    if (!isMHW && !mapLayers.hypoxia) return;

    const isSelected = a.id === selectedAlertId;
    const colorHex = isMHW ? 0xff4b4b : 0xf59e0b;

    // Curved surface quad covering [lat_min..lat_max, lon_min..lon_max]
    const latSteps = 6;
    const lonSteps = 6;
    const vertices: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= latSteps; i++) {
      const lat = a.lat_min + (i / latSteps) * (a.lat_max - a.lat_min);
      for (let j = 0; j <= lonSteps; j++) {
        const lon = a.lon_min + (j / lonSteps) * (a.lon_max - a.lon_min);
        const v = latLonToVector3(lat, lon, radius, 0.4);
        vertices.push(v.x, v.y, v.z);
      }
    }

    for (let i = 0; i < latSteps; i++) {
      for (let j = 0; j < lonSteps; j++) {
        const row1 = i * (lonSteps + 1);
        const row2 = (i + 1) * (lonSteps + 1);
        indices.push(row1 + j, row2 + j, row1 + j + 1);
        indices.push(row1 + j + 1, row2 + j, row2 + j + 1);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: isSelected ? 0.45 : 0.25,
      side: THREE.DoubleSide,
      depthTest: true,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData = {
      type: "ANOMALY",
      alertId: a.id,
      alertType: a.alert_type,
    };

    group.add(mesh);
    interactiveObjects.push(mesh);

    // Connected 4-corner glowing boundary outline
    const perimeterLats = [a.lat_min, a.lat_max, a.lat_max, a.lat_min, a.lat_min];
    const perimeterLons = [a.lon_min, a.lon_min, a.lon_max, a.lon_max, a.lon_min];
    const borderPoints: THREE.Vector3[] = [];

    for (let k = 0; k < 4; k++) {
      const startLat = perimeterLats[k];
      const startLon = perimeterLons[k];
      const endLat = perimeterLats[k + 1];
      const endLon = perimeterLons[k + 1];

      for (let s = 0; s <= 6; s++) {
        const t = s / 6;
        const curLat = startLat + t * (endLat - startLat);
        const curLon = startLon + t * (endLon - startLon);
        borderPoints.push(latLonToVector3(curLat, curLon, radius, 0.45));
      }
    }

    const borderGeo = new THREE.BufferGeometry().setFromPoints(borderPoints);
    const borderMat = new THREE.LineBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.85,
    });
    const borderLine = new THREE.Line(borderGeo, borderMat);
    group.add(borderLine);
  });

  return { group, interactiveObjects };
}
