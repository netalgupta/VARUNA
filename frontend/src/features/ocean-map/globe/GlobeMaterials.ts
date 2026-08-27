import * as THREE from "three";

/**
 * In-memory glowing circular sprite texture for data markers
 */
export function createPointTexture(colorHex = "#00FFC6", innerRadius = 0.45): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const center = size / 2;
  const grad = ctx.createRadialGradient(center, center, 0, center, center, center);
  grad.addColorStop(0, "#FFFFFF");
  grad.addColorStop(innerRadius, colorHex);
  grad.addColorStop(1, "rgba(0,0,0,0)");

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Realistic Earth Atmosphere Rayleigh Limb Glow Shader
 */
export function createAtmosphereMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      color: { value: new THREE.Color("#4ac7ff") },
      viewVector: { value: new THREE.Vector3(0, 0, 1) },
      coef: { value: 0.7 },
      power: { value: 3.0 },
    },
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      varying vec3 vNormal;
      void main() {
        float intensity = pow(0.7 - dot(vNormal, vec3(0, 0, 1.0)), 2.8);
        gl_FragColor = vec4(color, intensity * 0.9);
      }
    `,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
}

/**
 * Realistic Earth High-Resolution Surface Material
 */
export function createRealisticEarthMaterial(textureLoader: THREE.TextureLoader): THREE.MeshStandardMaterial {
  const dayMap = textureLoader.load("/assets/earth/earth_day.jpg");
  const normalMap = textureLoader.load("/assets/earth/earth_normal.jpg");
  const specularMap = textureLoader.load("/assets/earth/earth_specular.jpg");

  dayMap.colorSpace = THREE.SRGBColorSpace;

  return new THREE.MeshStandardMaterial({
    map: dayMap,
    normalMap: normalMap,
    normalScale: new THREE.Vector2(0.85, 0.85),
    roughnessMap: specularMap,
    roughness: 0.6,
    metalness: 0.1,
  });
}

/**
 * Realistic Dynamic Clouds Material
 */
export function createRealisticCloudsMaterial(textureLoader: THREE.TextureLoader): THREE.MeshStandardMaterial {
  const cloudsMap = textureLoader.load("/assets/earth/earth_clouds.png");
  cloudsMap.colorSpace = THREE.SRGBColorSpace;

  return new THREE.MeshStandardMaterial({
    map: cloudsMap,
    transparent: true,
    opacity: 0.65,
    blending: THREE.NormalBlending,
    depthWrite: false,
  });
}

/**
 * Coastline Outline Material
 */
export function createCoastlineMaterial(): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({
    color: new THREE.Color("#2EE6C6"),
    transparent: true,
    opacity: 0.45,
  });
}

/**
 * Tactical Lat/Lon Graticule Grid Material
 */
export function createGraticuleMaterial(): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({
    color: new THREE.Color("#00FFC6"),
    transparent: true,
    opacity: 0.18,
  });
}
