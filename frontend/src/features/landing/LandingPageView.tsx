"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Bot, Globe2, Radio, Waves, ShieldCheck, Sparkles, Activity } from "lucide-react";
import * as THREE from "three";

export function LandingPageView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shipContainerRef = useRef<HTMLDivElement>(null);

  // ── 1. WebGL Procedural Ocean Surface Shader ──────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl");
    if (!gl) return;

    function syncSize() {
      if (!canvas) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }
    syncSize();

    const vs = `
      attribute vec2 a_position;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fs = `
      precision highp float;
      uniform float u_time;
      uniform vec2 u_resolution;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), f.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
          f.y
        );
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        vec2 shift = vec2(100.0);
        mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
        for (int i = 0; i < 5; ++i) {
          v += a * noise(p);
          p = rot * p * 2.0 + shift;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        float t = u_time * 0.45;

        vec2 wv1 = uv * 3.5 + vec2(t * 0.4, t * 0.25);
        vec2 wv2 = uv * 6.0 - vec2(t * 0.3, t * 0.5);
        vec2 wv3 = uv * 11.0 + vec2(t * 0.6, -t * 0.35);

        float wave1 = sin(wv1.x * 2.2 + fbm(wv1) * 3.5) * 0.5 + 0.5;
        float wave2 = cos(wv2.y * 2.8 + fbm(wv2) * 2.8) * 0.5 + 0.5;
        float wave3 = sin((wv3.x + wv3.y) * 1.6 + fbm(wv3) * 2.0) * 0.5 + 0.5;

        float wave = wave1 * 0.45 + wave2 * 0.35 + wave3 * 0.20;
        float crest = pow(wave, 4.0);
        float turbulence = fbm(uv * 14.0 + vec2(t * 0.8));

        vec3 abyss = vec3(0.012, 0.040, 0.080);
        vec3 deep = vec3(0.024, 0.075, 0.145);
        vec3 mid = vec3(0.040, 0.150, 0.260);
        vec3 surface = vec3(0.070, 0.320, 0.480);
        vec3 cyanGlow = vec3(0.00, 0.90, 0.72);
        vec3 mintFoam = vec3(0.00, 1.00, 0.78);
        vec3 whiteBreak = vec3(0.85, 0.98, 1.00);

        float depth = uv.y;
        vec3 color = mix(abyss, deep, depth * 0.7);
        color = mix(color, mid, wave * 0.7);
        color = mix(color, surface, wave1 * wave2 * 0.6);

        float shimmer = pow(noise(wv3 * 3.0 + t * 0.9), 18.0);
        color += shimmer * cyanGlow * 0.55;
        color = mix(color, mintFoam, turbulence * 0.45);
        color = mix(color, whiteBreak, crest * 0.35);

        float horizonGlow = pow(1.0 - uv.y, 3.5) * 0.18;
        color += horizonGlow * vec3(0.1, 0.5, 0.7);
        color = mix(color, abyss, pow(uv.y, 2.2) * 0.5);

        float vign = length((uv - 0.5) * vec2(0.7, 1.0));
        color *= 1.0 - vign * 0.35;
        color *= 1.15;

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    function createShader(type: number, src: string) {
      if (!gl) return null;
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    }

    const prog = gl.createProgram();
    const vShader = createShader(gl.VERTEX_SHADER, vs);
    const fShader = createShader(gl.FRAGMENT_SHADER, fs);
    if (!prog || !vShader || !fShader) return;

    gl.attachShader(prog, vShader);
    gl.attachShader(prog, fShader);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(prog, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, "u_time");
    const uRes = gl.getUniformLocation(prog, "u_resolution");

    let animId: number;
    function render(t: number) {
      if (!gl || !canvas) return;
      syncSize();
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (uTime) gl.uniform1f(uTime, t * 0.001);
      if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animId = requestAnimationFrame(render);
    }
    animId = requestAnimationFrame(render);

    const onResize = () => syncSize();
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // ── 2. Three.js Research Vessel Undulating Pitch/Roll Scene ───────────────
  useEffect(() => {
    const container = shipContainerRef.current;
    if (!container) return;

    const width = Math.max(1, container.clientWidth || window.innerWidth);
    const height = Math.max(1, container.clientHeight || window.innerHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, Math.max(0.1, width / height), 0.1, 1000);
    camera.position.set(0, 0.25, 4.2);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const cyanSpot = new THREE.SpotLight(0x2ee6c6, 2.5);
    cyanSpot.position.set(3, 8, 5);
    scene.add(cyanSpot);

    const shipGroup = new THREE.Group();
    scene.add(shipGroup);

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load("/assets/hd_research_vessel.png", (texture) => {
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      const aspect = texture.image.width / texture.image.height;
      const planeGeometry = new THREE.PlaneGeometry(1, 1, 24, 24);
      let currentScaleX = 1;
      let currentScaleY = 1;

      function fitVesselToViewport() {
        const visibleHeight = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        const visibleWidth = visibleHeight * camera.aspect;
        const coverHeight = Math.max(visibleHeight, visibleWidth / aspect) * 1.08;
        const coverWidth = coverHeight * aspect;
        planeGeometry.scale(coverWidth / currentScaleX, coverHeight / currentScaleY, 1);
        currentScaleX = coverWidth;
        currentScaleY = coverHeight;
      }

      fitVesselToViewport();

      const material = new THREE.MeshPhongMaterial({
        map: texture,
        transparent: true,
        opacity: 0.95,
        shininess: 45,
        specular: 0x2ee6c6,
        side: THREE.DoubleSide,
      });

      const shipMesh = new THREE.Mesh(planeGeometry, material);
      shipGroup.add(shipMesh);

      window.addEventListener("resize", fitVesselToViewport);

      const basePositions = (planeGeometry.attributes.position.array as Float32Array).slice();
      shipMesh.userData.basePositions = basePositions;
    });

    let time = 0;
    let frame = 0;
    let animId: number;

    function animate() {
      animId = requestAnimationFrame(animate);
      time += 0.022;
      frame += 1;

      shipGroup.position.y = Math.sin(time * 0.8) * 0.14 + Math.cos(time * 1.3) * 0.06;
      shipGroup.position.x = Math.sin(time * 0.37) * 0.035;
      shipGroup.rotation.x = Math.sin(time * 0.6) * 0.045;
      shipGroup.rotation.y = Math.cos(time * 0.5) * 0.025;
      shipGroup.rotation.z = Math.cos(time * 0.7) * 0.035;

      const shipMesh = shipGroup.children[0] as THREE.Mesh | undefined;
      if (shipMesh && frame % 2 === 0) {
        const positions = shipMesh.geometry.attributes.position;
        const basePositions = shipMesh.userData.basePositions;
        if (basePositions) {
          for (let i = 0; i < positions.count; i++) {
            const offset = i * 3;
            const x = basePositions[offset];
            const y = basePositions[offset + 1];
            positions.setZ(
              i,
              basePositions[offset + 2] +
                Math.sin(x * 2.6 + time * 1.8) * 0.025 +
                Math.cos(y * 3.2 + time * 1.25) * 0.018
            );
          }
          positions.needsUpdate = true;
        }
      }

      if (frame % 2 === 0) renderer.render(scene, camera);
    }
    animate();

    const handleResize = () => {
      const w = Math.max(1, container.clientWidth || window.innerWidth);
      const h = Math.max(1, container.clientHeight || window.innerHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      container.innerHTML = "";
    };
  }, []);

  return (
    <div className="relative w-screen h-screen min-h-screen overflow-hidden bg-[#051422] text-[#D5E4F7] flex flex-col justify-between select-none font-sans">
      {/* ── WebGL Ocean Surface Shader Canvas ────────────────────────────── */}
      <div className="absolute inset-0 w-full h-full z-0 pointer-events-none">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* ── Three.js 3D Research Vessel Scene ─────────────────────────────── */}
      <div className="absolute inset-0 w-full h-full z-10 pointer-events-none">
        <div ref={shipContainerRef} className="w-full h-full" />
      </div>

      {/* ── Ambient Scanlines & Vignette ──────────────────────────────────── */}
      <div className="absolute inset-0 z-15 pointer-events-none bg-[linear-gradient(to_bottom,rgba(255,255,255,0)_0%,rgba(255,255,255,0)_50%,rgba(46,230,198,0.03)_50%,rgba(46,230,198,0.03)_100%)] bg-[length:100%_4px]" />
      <div className="absolute top-0 left-0 right-0 h-28 z-16 pointer-events-none bg-gradient-to-b from-[#051422]/90 to-transparent" />
      <div className="absolute inset-0 z-16 pointer-events-none bg-gradient-to-r from-transparent via-[#051422]/30 to-[#051422]/90" />

      {/* ── 1. Master Top Header ──────────────────────────────────────────── */}
      <header className="relative z-30 w-full h-16 px-6 sm:px-12 flex items-center justify-between backdrop-blur-md bg-[#051422]/70 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl overflow-hidden border border-[#2EE6C6]/50 shadow-[0_0_20px_rgba(46,230,198,0.55)] shrink-0 bg-[#040914]">
            <Image
              src="/assets/varuna_logo.png"
              alt="Varuna Logo"
              width={44}
              height={44}
              className="w-full h-full object-cover"
              priority
            />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white font-mono leading-none">
              VARUNA
            </h1>
            <p className="text-[10px] font-mono text-[#84948F] tracking-wider uppercase mt-0.5">
              INCOIS × CMLRE
            </p>
          </div>
        </div>

        {/* Quick Launch Buttons */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#12212E]/80 border border-[#2EE6C6]/30 text-[#2EE6C6]">
            <span className="w-2 h-2 rounded-full bg-[#00FFC6] animate-ping" />
            <span>LIVE 14:32:08 UTC</span>
          </div>

          <Link
            href="/chatbot"
            className="px-4 py-2 rounded-lg bg-[#0B1D2C]/80 hover:bg-[#2EE6C6]/20 border border-[#2EE6C6]/40 text-[#83FFE3] font-bold flex items-center gap-1.5 transition-all shadow-lg backdrop-blur-md"
          >
            <Bot size={14} />
            <span>AI Chatbot</span>
          </Link>

          <Link
            href="/command-center"
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#2EE6C6]/30 to-[#00FFC6]/20 hover:from-[#2EE6C6] hover:to-[#00FFC6] text-[#83FFE3] hover:text-black border border-[#2EE6C6]/70 font-bold flex items-center gap-1.5 transition-all shadow-[0_0_25px_rgba(46,230,198,0.4)] backdrop-blur-md"
          >
            <span>Command Center</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </header>

      {/* ── 2. Main Hero Text & Triple Catchphrase ────────────────────────── */}
      <main className="relative z-20 flex-1 flex flex-col justify-center items-start px-6 sm:px-14 lg:px-20 text-left">
        <div className="max-w-xl w-full flex flex-col items-start">
          {/* Tactical Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#051224]/85 border border-[#2EE6C6]/50 text-[#83FFE3] text-xs font-mono mb-4 shadow-xl backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-[#00FFC6] shadow-[0_0_8px_#00FFC6] animate-pulse" />
            <span className="uppercase tracking-widest font-bold">
              National Marine Intelligence Backbone
            </span>
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tight leading-[1.0] mb-4 drop-shadow-[0_6px_24px_rgba(0,0,0,1)] bg-gradient-to-br from-white via-[#E8F4FF] to-[#83FFE3] bg-clip-text text-transparent">
            Understand.<br />
            Predict. Protect.
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-zinc-300 max-w-lg leading-relaxed mb-6 font-sans drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
            Autonomous Oceanographic Intelligence Platform fusing <b>INCOIS ARGO</b> physical ocean observations with <b>CMLRE</b> marine biodiversity records.
          </p>

          {/* Basin Tags */}
          <div className="flex flex-wrap justify-start gap-2 mb-8 text-[10px] font-mono text-[#809AAB]">
            <span className="px-2 py-0.5 rounded bg-black/50 border border-white/10">Arabian Sea</span>
            <span className="px-2 py-0.5 rounded bg-black/50 border border-white/10">Bay of Bengal</span>
            <span className="px-2 py-0.5 rounded bg-black/50 border border-white/10">Equatorial Indian Ocean</span>
            <span className="px-2 py-0.5 rounded bg-black/50 border border-white/10">Gulf of Mannar</span>
          </div>

          {/* CTA Action Row */}
          <div className="flex items-center gap-3 font-mono text-xs">
            <Link
              href="/chatbot"
              className="px-5 py-2.5 rounded-xl bg-[#0B1D2C]/90 hover:bg-[#2EE6C6]/20 border border-[#2EE6C6]/50 text-[#83FFE3] font-bold flex items-center gap-2 shadow-2xl backdrop-blur-xl transition-all"
            >
              <Bot size={15} />
              <span>Ask AI Chatbot</span>
            </Link>

            <Link
              href="/command-center"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#2EE6C6] to-[#00FFC6] text-black font-black flex items-center gap-2 shadow-[0_0_35px_rgba(46,230,198,0.6)] hover:scale-105 transition-all"
            >
              <span>Launch Command Center</span>
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </main>

      {/* ── 3. Bottom Live Statistics Row ─────────────────────────────────── */}
      <footer className="relative z-20 w-full px-6 sm:px-14 lg:px-20 pb-8 flex flex-wrap items-center justify-start gap-4 font-mono text-xs">
        <div className="bg-[#051224]/85 backdrop-blur-xl border border-white/10 px-4 py-2.5 rounded-xl border-l-4 border-l-[#83FFE3] shadow-xl">
          <div className="text-xl sm:text-2xl font-black text-[#83FFE3] leading-tight">3,842</div>
          <div className="text-[10px] text-[#A0B8C8] uppercase tracking-wider">Active ARGO Floats</div>
        </div>

        <div className="bg-[#051224]/85 backdrop-blur-xl border border-white/10 px-4 py-2.5 rounded-xl border-l-4 border-l-[#FFA500] shadow-xl">
          <div className="text-xl sm:text-2xl font-black text-[#FFA500] leading-tight">07</div>
          <div className="text-[10px] text-[#A0B8C8] uppercase tracking-wider">Active Alerts (MHW &amp; OMZ)</div>
        </div>

        <div className="bg-[#051224]/85 backdrop-blur-xl border border-white/10 px-4 py-2.5 rounded-xl border-l-4 border-l-[#00FFC6] shadow-xl">
          <div className="text-xl sm:text-2xl font-black text-[#00FFC6] leading-tight">99.8%</div>
          <div className="text-[10px] text-[#A0B8C8] uppercase tracking-wider">Model Accuracy</div>
        </div>

        <div className="bg-[#051224]/85 backdrop-blur-xl border border-white/10 px-4 py-2.5 rounded-xl border-l-4 border-l-[#4ADE80] shadow-xl">
          <div className="text-xl sm:text-2xl font-black text-[#4ADE80] leading-tight">14ms</div>
          <div className="text-[10px] text-[#A0B8C8] uppercase tracking-wider">PostGIS Query Latency</div>
        </div>
      </footer>
    </div>
  );
}
