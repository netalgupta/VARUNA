/* ════════════════════════════════════════════════════════════
   VARUNA Marine Telemetry Console — 2D Map & Chatbot Engine
   ════════════════════════════════════════════════════════════ */

// ──── MOCK OCEANOGRAPHIC DATASET ────────────────────────────
const WATER_BODIES = {
  arabian_sea: {
    id: 'arabian_sea',
    name: 'Arabian Sea',
    labelHtml: 'Arabian<br>Sea',
    labelClass: '',
    labelPos: [16.8, 65.5],
    status: 'High Alert',
    statusClass: 'critical',
    temperature: '29.2 °C',
    tempAnomaly: '+3.4°C',
    salinity: '35.8 PSU',
    dissolvedOxygen: '55 µmol/kg',
    chlorophyll: '0.68 mg/m³',
    marineHeatwave: 'HIGH',
    activeAnomalies: 2,
    argoFloats: 312,
    moorings: 18,
    buoys: 24,
    tideGauges: 12,
    center: [16.0, 66.0],
    zoom: 5.2,
    coords: [
      [24.5, 62.0], [25.0, 66.5], [23.5, 68.5], [20.5, 72.8], [15.0, 74.0],
      [9.0, 76.5], [6.0, 77.0], [4.5, 73.0], [5.0, 60.0], [12.0, 51.5],
      [17.5, 54.0], [22.5, 59.8]
    ],
    description: 'Experiencing a severe marine heatwave with +3.4°C thermal anomaly impacting coral habitats near Lakshadweep and coastal fisheries.'
  },
  bay_of_bengal: {
    id: 'bay_of_bengal',
    name: 'Bay of Bengal',
    labelHtml: 'Bay of<br>Bengal',
    labelClass: '',
    labelPos: [15.8, 88.5],
    status: 'Warning',
    statusClass: 'warning',
    temperature: '28.7 °C',
    tempAnomaly: '+1.8°C',
    salinity: '32.4 PSU',
    dissolvedOxygen: '48 µmol/kg',
    chlorophyll: '1.12 mg/m³',
    marineHeatwave: 'MEDIUM',
    activeAnomalies: 3,
    argoFloats: 284,
    moorings: 14,
    buoys: 19,
    tideGauges: 15,
    center: [15.0, 88.0],
    zoom: 5.2,
    coords: [
      [21.5, 87.5], [18.0, 83.5], [13.0, 80.2], [9.0, 79.8], [5.5, 80.5],
      [5.0, 92.5], [10.0, 93.0], [14.0, 94.0], [16.0, 94.2], [20.5, 92.5], [22.5, 89.5]
    ],
    description: 'Active hypoxia zone detected in the upper water column with dissolved oxygen dropping below 50 µmol/kg. Elevated chlorophyll from river runoff.'
  },
  persian_gulf: {
    id: 'persian_gulf',
    name: 'Persian Gulf',
    labelHtml: 'Persian<br>Gulf',
    labelClass: 'sm',
    labelPos: [26.8, 50.8],
    status: 'Normal',
    statusClass: 'normal',
    temperature: '28.4 °C',
    tempAnomaly: '+0.5°C',
    salinity: '40.2 PSU',
    dissolvedOxygen: '72 µmol/kg',
    chlorophyll: '0.42 mg/m³',
    marineHeatwave: 'LOW',
    activeAnomalies: 0,
    argoFloats: 45,
    moorings: 8,
    buoys: 12,
    tideGauges: 9,
    center: [27.0, 51.5],
    zoom: 6.2,
    coords: [
      [30.0, 48.0], [29.8, 50.2], [27.5, 52.5], [26.2, 56.2], [25.0, 56.5],
      [24.2, 54.5], [24.5, 51.5], [27.0, 49.5], [29.0, 48.2]
    ],
    description: 'Salinity elevated at 40.2 PSU due to high evaporation rates. Sea surface temperature and dissolved oxygen remain within normal seasonal baselines.'
  },
  laccadive_sea: {
    id: 'laccadive_sea',
    name: 'Laccadive Sea',
    labelHtml: 'Laccadive<br>Sea',
    labelClass: 'sm',
    labelPos: [9.2, 74.0],
    status: 'Alert',
    statusClass: 'warning',
    temperature: '29.8 °C',
    tempAnomaly: '+2.1°C',
    salinity: '34.9 PSU',
    dissolvedOxygen: '64 µmol/kg',
    chlorophyll: '0.55 mg/m³',
    marineHeatwave: 'MODERATE',
    activeAnomalies: 1,
    argoFloats: 92,
    moorings: 6,
    buoys: 10,
    tideGauges: 8,
    center: [8.5, 74.0],
    zoom: 6.2,
    coords: [
      [13.0, 74.5], [10.5, 76.0], [8.0, 77.2], [5.8, 80.0], [4.5, 77.0],
      [4.0, 72.0], [8.0, 71.5], [11.5, 72.0]
    ],
    description: 'Surrounding Lakshadweep archipelago and western Sri Lanka. Thermal stress threshold reached for shallow reef structures.'
  },
  gulf_of_mannar: {
    id: 'gulf_of_mannar',
    name: 'Gulf of Mannar',
    labelHtml: 'Gulf of<br>Mannar',
    labelClass: 'sm',
    labelPos: [8.4, 79.2],
    status: 'Protected',
    statusClass: 'normal',
    temperature: '29.0 °C',
    tempAnomaly: '+0.8°C',
    salinity: '35.1 PSU',
    dissolvedOxygen: '68 µmol/kg',
    chlorophyll: '0.85 mg/m³',
    marineHeatwave: 'LOW',
    activeAnomalies: 0,
    argoFloats: 38,
    moorings: 5,
    buoys: 7,
    tideGauges: 6,
    center: [8.8, 78.8],
    zoom: 7.0,
    coords: [
      [9.5, 78.8], [9.2, 79.3], [8.8, 79.8], [8.0, 79.6], [7.8, 78.5],
      [8.5, 78.0], [9.0, 78.2]
    ],
    description: 'Biosphere Reserve monitoring dugongs, sea turtles, and coral reef health. Ecosystem parameters currently stable.'
  },
  andaman_sea: {
    id: 'andaman_sea',
    name: 'Andaman Sea',
    labelHtml: 'Andaman<br>Sea',
    labelClass: 'sm',
    labelPos: [11.5, 96.0],
    status: 'Normal',
    statusClass: 'normal',
    temperature: '28.9 °C',
    tempAnomaly: '+0.6°C',
    salinity: '33.1 PSU',
    dissolvedOxygen: '62 µmol/kg',
    chlorophyll: '0.48 mg/m³',
    marineHeatwave: 'LOW',
    activeAnomalies: 0,
    argoFloats: 110,
    moorings: 9,
    buoys: 15,
    tideGauges: 7,
    center: [10.5, 96.0],
    zoom: 5.8,
    coords: [
      [15.5, 94.0], [13.5, 98.2], [8.0, 98.5], [5.5, 95.5], [6.0, 93.5],
      [10.0, 92.5], [14.0, 93.0]
    ],
    description: 'Internal wave dynamics active along the continental slope. Sea surface temperature normal, ocean acoustic channels operating within nominal range.'
  },
  eq_indian_ocean: {
    id: 'eq_indian_ocean',
    name: 'Indian Ocean',
    labelHtml: 'Indian Ocean',
    labelClass: 'main-primary',
    labelPos: [-2.5, 76.5],
    status: 'Monitored',
    statusClass: 'normal',
    temperature: '28.1 °C',
    tempAnomaly: '+0.3°C',
    salinity: '35.2 PSU',
    dissolvedOxygen: '78 µmol/kg',
    chlorophyll: '0.25 mg/m³',
    marineHeatwave: 'LOW',
    activeAnomalies: 0,
    argoFloats: 840,
    moorings: 32,
    buoys: 45,
    tideGauges: 18,
    center: [-2.5, 76.5],
    zoom: 4.5,
    coords: [
      [5.0, 55.0], [5.0, 77.0], [4.5, 95.0], [-10.0, 100.0], [-10.0, 55.0]
    ],
    description: 'Central equatorial basin tracking Indian Ocean Dipole (IOD) atmospheric-ocean coupling parameters and deep thermal structure.'
  },
  southern_indian_ocean: {
    id: 'southern_indian_ocean',
    name: 'Southern Indian Ocean',
    labelHtml: 'Southern<br>Indian Ocean',
    labelClass: 'sub-southern',
    labelPos: [-22.5, 75.0],
    status: 'Nominal',
    statusClass: 'normal',
    temperature: '22.4 °C',
    tempAnomaly: '-0.2°C',
    salinity: '35.6 PSU',
    dissolvedOxygen: '92 µmol/kg',
    chlorophyll: '0.38 mg/m³',
    marineHeatwave: 'NONE',
    activeAnomalies: 0,
    argoFloats: 620,
    moorings: 22,
    buoys: 30,
    tideGauges: 12,
    center: [-22.5, 75.0],
    zoom: 4.2,
    coords: [
      [-10.0, 45.0], [-10.0, 105.0], [-35.0, 110.0], [-35.0, 40.0]
    ],
    description: 'Subtropical gyre transition zone showing healthy oxygenation levels and steady thermocline circulation.'
  }
};

// State variables
let map = null;
let polygonLayers = {};
let labelMarkerElements = {};
let markerGroupLayers = { argo: null, mooring: null, buoy: null, gauge: null };
let markerVisibilityState = { argo: false, mooring: false, buoy: false, gauge: false };
let selectedRegionId = 'arabian_sea';

// ──── INITIALISATION ON DOM LOAD ────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initClock();
  initLeafletMap();
  initChatbot();
  initUIEventListeners();
  selectRegion('arabian_sea', false);
});

// ──── REAL-TIME UTC CLOCK ───────────────────────────────────
function initClock() {
  const clockEl = document.getElementById('system-time');
  function update() {
    const now = new Date();
    const hrs = String(now.getUTCHours()).padStart(2, '0');
    const mins = String(now.getUTCMinutes()).padStart(2, '0');
    const secs = String(now.getUTCSeconds()).padStart(2, '0');
    if (clockEl) clockEl.textContent = `${hrs}:${mins}:${secs} UTC`;
  }
  update();
  setInterval(update, 1000);
}

// ──── LEAFLET 2D MAP INITIALISATION ─────────────────────────
function initLeafletMap() {
  const container = document.getElementById('leaflet-map');
  if (!container) return;

  // Create Leaflet Map instance centered framing ONLY the Indian Ocean region
  map = L.map('leaflet-map', {
    center: [7.0, 78.0],
    zoom: 4.4,
    minZoom: 3,
    maxZoom: 9,
    zoomControl: false,
    attributionControl: false,
    maxBounds: [[-40, 35], [38, 115]]
  });

  // Dark Ocean Tile Layer (CartoDB Dark Matter)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    subdomains: 'abcd'
  }).addTo(map);

  // Add Water Body Polygons (Subtle thin outlines only, NO solid fills!)
  Object.keys(WATER_BODIES).forEach(id => {
    const body = WATER_BODIES[id];
    
    // Polygon for click/hover area (subtle thin outline, transparent fill)
    const poly = L.polygon(body.coords, {
      color: '#38bdf8',
      weight: 0.8,
      opacity: 0.15,
      fillColor: 'transparent',
      fillOpacity: 0.0,
      smoothFactor: 1.0
    }).addTo(map);

    // Bind floating hover tooltip
    const tooltipContent = `
      <div class="waterbody-tooltip">
        <div class="wb-tooltip-header">
          <span class="wb-tooltip-title">${body.name}</span>
          <span class="wb-status-tag ${body.statusClass}">${body.status}</span>
        </div>
        <div class="wb-metric-row">
          <span class="wb-metric-label">🌡️ Temperature</span>
          <span class="wb-metric-val">${body.temperature}</span>
        </div>
        <div class="wb-metric-row">
          <span class="wb-metric-label">💧 Salinity</span>
          <span class="wb-metric-val">${body.salinity}</span>
        </div>
        <div class="wb-metric-row">
          <span class="wb-metric-label">🫧 Dissolved Oxygen</span>
          <span class="wb-metric-val">${body.dissolvedOxygen}</span>
        </div>
        <div class="wb-metric-row">
          <span class="wb-metric-label">🌿 Chlorophyll</span>
          <span class="wb-metric-val">${body.chlorophyll}</span>
        </div>
        <div class="wb-metric-row">
          <span class="wb-metric-label">🔥 Marine Heatwave</span>
          <span class="wb-metric-val">${body.marineHeatwave}</span>
        </div>
        <span class="wb-details-link">Click to Select Region →</span>
      </div>
    `;

    poly.bindTooltip(tooltipContent, {
      sticky: true,
      direction: 'top',
      offset: [0, -10],
      className: 'waterbody-tooltip-container'
    });

    // Hover interactions
    poly.on('mouseover', () => {
      if (selectedRegionId !== id) {
        poly.setStyle({
          color: '#34e2a6',
          weight: 1.2,
          opacity: 0.5,
          fillColor: 'transparent',
          fillOpacity: 0.0
        });
      }
    });

    poly.on('mouseout', () => {
      if (selectedRegionId !== id) {
        poly.setStyle({
          color: '#38bdf8',
          weight: 0.8,
          opacity: 0.15,
          fillColor: 'transparent',
          fillOpacity: 0.0
        });
      }
    });

    // Click selection
    poly.on('click', (e) => {
      L.DomEvent.stopPropagation(e);
      selectRegion(id, true);
    });

    polygonLayers[id] = poly;

    // Add Plain Text Water Body Labels (Matching target design!)
    const labelIcon = L.divIcon({
      className: 'map-text-label-marker',
      html: `<div class="map-text-label ${body.labelClass}" id="label-${id}">${body.labelHtml}</div>`,
      iconSize: [120, 40],
      iconAnchor: [60, 20]
    });

    const labelMarker = L.marker(body.labelPos, {
      icon: labelIcon,
      interactive: true
    }).addTo(map);

    labelMarker.on('click', (e) => {
      L.DomEvent.stopPropagation(e);
      selectRegion(id, true);
    });

    labelMarker.bindTooltip(tooltipContent, {
      sticky: true,
      direction: 'top',
      offset: [0, -10],
      className: 'waterbody-tooltip-container'
    });
  });

  // Init telemetry marker layers (Hidden by default, toggled via Legend!)
  initTelemetryMarkerGroups();

  // Custom Zoom Control listeners
  document.getElementById('map-zoom-in')?.addEventListener('click', () => map.zoomIn());
  document.getElementById('map-zoom-out')?.addEventListener('click', () => map.zoomOut());
  document.getElementById('map-reset')?.addEventListener('click', () => {
    map.flyTo([7.0, 78.0], 4.4, { duration: 1.0 });
  });
}

// ──── TELEMETRY MARKER GROUPS (TOGGLED VIA LEGEND) ─────────
function initTelemetryMarkerGroups() {
  const points = {
    argo: [
      { lat: 18.5, lng: 68.2 }, { lat: 14.2, lng: 70.1 }, { lat: 12.0, lng: 64.5 },
      { lat: 16.8, lng: 85.4 }, { lat: 11.2, lng: 89.0 }, { lat: 7.5, lng: 75.8 },
      { lat: 26.5, lng: 52.8 }, { lat: 9.8, lng: 95.2 }, { lat: -5.0, lng: 72.0 }
    ],
    mooring: [
      { lat: 15.0, lng: 69.0 }, { lat: 13.5, lng: 84.0 }, { lat: 8.2, lng: 73.5 }, { lat: -2.0, lng: 80.0 }
    ],
    buoy: [
      { lat: 19.2, lng: 71.5 }, { lat: 17.5, lng: 88.2 }, { lat: 27.2, lng: 50.8 }, { lat: 5.5, lng: 90.0 }
    ],
    gauge: [
      { lat: 18.9, lng: 72.8 }, { lat: 13.0, lng: 80.3 }, { lat: 9.9, lng: 76.2 }, { lat: 6.9, lng: 79.8 }
    ]
  };

  const colors = { argo: '#38bdf8', mooring: '#34e2a6', buoy: '#ffb454', gauge: '#a855f7' };

  Object.keys(points).forEach(type => {
    const layerGroup = L.layerGroup();
    points[type].forEach(pt => {
      const marker = L.circleMarker([pt.lat, pt.lng], {
        radius: 4,
        color: colors[type],
        weight: 1.5,
        fillColor: colors[type],
        fillOpacity: 0.85
      });
      layerGroup.addLayer(marker);
    });
    markerGroupLayers[type] = layerGroup;
    // Hidden by default!
  });
}

function toggleMarkerType(type) {
  if (!markerGroupLayers[type]) return;
  markerVisibilityState[type] = !markerVisibilityState[type];
  const isVisible = markerVisibilityState[type];
  
  if (isVisible) {
    map.addLayer(markerGroupLayers[type]);
  } else {
    map.removeLayer(markerGroupLayers[type]);
  }

  const toggleEl = document.getElementById(`toggle-${type}`);
  if (toggleEl) {
    toggleEl.classList.toggle('active', isVisible);
  }
}

// ──── REGION SELECTION LOGIC ────────────────────────────────
function selectRegion(regionId, userInitiated = false) {
  if (!WATER_BODIES[regionId]) return;
  const region = WATER_BODIES[regionId];

  // Reset previously selected polygon styling
  if (selectedRegionId && polygonLayers[selectedRegionId]) {
    polygonLayers[selectedRegionId].setStyle({
      color: '#38bdf8',
      weight: 0.8,
      opacity: 0.15,
      fillColor: 'transparent',
      fillOpacity: 0.0
    });
  }

  // Reset previously selected label text
  document.querySelectorAll('.map-text-label').forEach(lbl => lbl.classList.remove('selected'));

  // Update state
  selectedRegionId = regionId;

  // Highlight selected text label
  const labelEl = document.getElementById(`label-${regionId}`);
  if (labelEl) labelEl.classList.add('selected');

  // Fly map to region view if user initiated
  if (map && userInitiated) {
    map.flyTo(region.center, region.zoom, { duration: 1.2 });
  }

  // Update Header Title
  const titleEl = document.getElementById('map-title-text');
  if (titleEl) titleEl.textContent = `${region.name} Region`;

  // Update Modal content
  const modalTitle = document.getElementById('modal-region-title');
  if (modalTitle) modalTitle.textContent = `SELECTED REGION: ${region.name.toUpperCase()}`;

  const valSst = document.getElementById('val-sst');
  if (valSst) valSst.textContent = region.temperature;
  const valSal = document.getElementById('val-salinity');
  if (valSal) valSal.textContent = region.salinity;
  const valOxy = document.getElementById('val-oxygen');
  if (valOxy) valOxy.textContent = region.dissolvedOxygen;

  // Update active sidebar sub-menu item
  document.querySelectorAll('#ocean-sub-menu .sub-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.region === regionId);
  });

  // Notify Chatbot if user initiated selection
  if (userInitiated) {
    appendBotMessage(`📍 <strong>Map Focus Changed:</strong> Selected <strong>${region.name}</strong>.<br>` +
      `Temperature: <code>${region.temperature}</code> | Salinity: <code>${region.salinity}</code><br>` +
      `Dissolved Oxygen: <code>${region.dissolvedOxygen}</code> | Heatwave Status: <strong>${region.marineHeatwave}</strong>`);
  }
}

// ──── VARUNA AI CHATBOT IMPLEMENTATION ──────────────────────
function initChatbot() {
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const resetBtn = document.getElementById('chat-reset');
  const toggleBtn = document.getElementById('chat-toggle');
  const panel = document.getElementById('chatbot-panel');

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      handleUserMessage();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const messagesContainer = document.getElementById('chat-messages');
      if (messagesContainer) {
        messagesContainer.innerHTML = `
          <div class="chat-msg bot-msg">
            <div class="msg-bubble">
              Hello! I'm <strong>VARUNA</strong>, your AI marine intelligence assistant.<br><br>
              Ask me anything about ocean data, marine ecosystems, anomalies, or biodiversity.
            </div>
            <span class="msg-time">Just now</span>
          </div>
        `;
      }
    });
  }

  if (toggleBtn && panel) {
    toggleBtn.addEventListener('click', () => {
      panel.classList.toggle('collapsed');
    });
  }

  // Quick Action Buttons
  document.querySelectorAll('.qaction-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      handleQuickAction(action);
    });
  });
}

function handleUserMessage() {
  const input = document.getElementById('chat-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  // Clear input
  input.value = '';

  // Append User message
  appendUserMessage(text);

  // Generate Response after short delay
  setTimeout(() => {
    const reply = generateAiResponse(text);
    appendBotMessage(reply);
  }, 400);
}

function appendUserMessage(text) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const msgDiv = document.createElement('div');
  msgDiv.className = 'chat-msg user-msg';
  msgDiv.innerHTML = `
    <div class="msg-bubble">${escapeHtml(text)}</div>
    <span class="msg-time">${timeStr}</span>
  `;
  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}

function appendBotMessage(htmlContent) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const msgDiv = document.createElement('div');
  msgDiv.className = 'chat-msg bot-msg';
  msgDiv.innerHTML = `
    <div class="msg-bubble">${htmlContent}</div>
    <span class="msg-time">${timeStr}</span>
  `;
  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}

function generateAiResponse(prompt) {
  const query = prompt.toLowerCase();
  const currentRegion = WATER_BODIES[selectedRegionId] || WATER_BODIES.arabian_sea;

  // Check for water body names
  for (let key in WATER_BODIES) {
    const wb = WATER_BODIES[key];
    if (query.includes(wb.name.toLowerCase()) || query.includes(key.replace('_', ' '))) {
      selectRegion(key, true);
      return `Here is the current status of <strong>${wb.name}</strong>:<br><br>` +
             `🌡️ <strong>Temperature:</strong> ${wb.temperature} (Anomaly: ${wb.tempAnomaly})<br>` +
             `💧 <strong>Salinity:</strong> ${wb.salinity}<br>` +
             `🫧 <strong>Dissolved Oxygen:</strong> ${wb.dissolvedOxygen}<br>` +
             `🌿 <strong>Chlorophyll:</strong> ${wb.chlorophyll}<br>` +
             `🔥 <strong>Marine Heatwave:</strong> ${wb.marineHeatwave}<br>` +
             `📡 <strong>Active ARGO Floats:</strong> ${wb.argoFloats}<br><br>` +
             `<em>${wb.description}</em>`;
    }
  }

  // Check for specific queries
  if (query.includes('heatwave') || query.includes('hot') || query.includes('warm')) {
    selectRegion('arabian_sea', true);
    return `🔥 <strong>Marine Heatwave Report:</strong><br><br>` +
           `The <strong>Arabian Sea</strong> is currently experiencing a severe Marine Heatwave (+3.4°C anomaly). ` +
           `Laccadive Sea also shows moderate thermal stress (+2.1°C). Shallow coral reefs near Lakshadweep are under high alert.`;
  }

  if (query.includes('oxygen') || query.includes('hypoxia') || query.includes('dox')) {
    selectRegion('bay_of_bengal', true);
    return `🫧 <strong>Hypoxia Zone Alert:</strong><br><br>` +
           `The <strong>Bay of Bengal</strong> has an active hypoxia zone with Dissolved Oxygen dropping below 60 µmol/kg (currently 48 µmol/kg). ` +
           `This oxygen minimum zone is driven by heavy seasonal river runoff and water column stratification.`;
  }

  if (query.includes('argo') || query.includes('float') || query.includes('sensor')) {
    return `📡 <strong>ARGO Telemetry Status:</strong><br><br>` +
           `There are currently <strong>3,842 active ARGO floats</strong> deployed across the Indian Ocean Region.<br>` +
           `• Arabian Sea: 312 floats<br>` +
           `• Bay of Bengal: 284 floats<br>` +
           `• Central Indian Ocean: 840 floats<br>` +
           `Real-time PostGIS sync latency is running at <strong>14ms</strong>.`;
  }

  if (query.includes('species') || query.includes('biodiversity') || query.includes('turtle')) {
    return `🪸 <strong>Marine Biodiversity Telemetry:</strong><br><br>` +
           `Active species tracking in <strong>${currentRegion.name}</strong> shows 12 key species monitored via acoustic tag nodes.<br>` +
           `Monitored fauna include Olive Ridley Sea Turtles, Whale Sharks, Blue Whales, and Dugongs in the Gulf of Mannar.`;
  }

  // Default response using selected region context
  return `Analyzing query regarding <strong>${currentRegion.name}</strong>:<br><br>` +
         `Current SST is <strong>${currentRegion.temperature}</strong> with salinity at <strong>${currentRegion.salinity}</strong>. ` +
         `${currentRegion.description}<br><br>` +
         `Would you like to run a detailed multi-parameter analysis or view related charts?`;
}

function handleQuickAction(action) {
  const currentRegion = WATER_BODIES[selectedRegionId] || WATER_BODIES.arabian_sea;

  if (action === 'analysis') {
    appendBotMessage(`⚡ <strong>Multi-Parameter Diagnostic Run:</strong><br><br>` +
      `Region: <strong>${currentRegion.name}</strong><br>` +
      `• SST Anomaly Index: <code>${currentRegion.tempAnomaly}</code><br>` +
      `• Thermocline Depth: <code>74m</code><br>` +
      `• Primary Productivity: <code>${currentRegion.chlorophyll}</code><br>` +
      `• Active Telemetry Nodes: <code>${currentRegion.argoFloats + currentRegion.moorings} units</code><br>` +
      `Status: Diagnostic completed cleanly with 99.8% model confidence.`);
  } else if (action === 'charts') {
    const modal = document.getElementById('details-modal');
    if (modal) modal.classList.remove('hidden');
    appendBotMessage(`📊 Opened detailed metrics & charts modal for <strong>${currentRegion.name}</strong>.`);
  } else if (action === 'alerts') {
    appendBotMessage(`⚠️ <strong>Active Region Alerts (${currentRegion.name}):</strong><br><br>` +
      `• Heatwave Threat: <strong>${currentRegion.marineHeatwave}</strong><br>` +
      `• Active Anomaly Flagged: <strong>${currentRegion.activeAnomalies}</strong><br>` +
      `• Current Status: <span class="${currentRegion.statusClass}">${currentRegion.status}</span>`);
  } else if (action === 'species') {
    appendBotMessage(`🪸 <strong>Species Impact Profile (${currentRegion.name}):</strong><br><br>` +
      `• Protected Reef Coral Index: <code>68%</code><br>` +
      `• Telemetry Acoustic Tags Online: <code>14 Active Tracks</code><br>` +
      `• Primary Fauna Monitored: Sea Turtles, Pelagic Sharks, Phytoplankton Blooms.`);
  }
}

// ──── GENERAL UI EVENT LISTENERS ────────────────────────────
function initUIEventListeners() {
  // Sidebar Ocean Sub-menu items
  document.querySelectorAll('#ocean-sub-menu .sub-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const regionId = btn.dataset.region;
      if (regionId) selectRegion(regionId, true);
    });
  });

  // Legend Marker Toggles
  ['argo', 'mooring', 'buoy', 'gauge'].forEach(type => {
    document.getElementById(`toggle-${type}`)?.addEventListener('click', () => {
      toggleMarkerType(type);
    });
  });

  // Region List Button
  document.getElementById('btn-region-list')?.addEventListener('click', () => {
    const menu = document.getElementById('ocean-sub-menu');
    if (menu) menu.classList.toggle('open');
  });

  // Alert cards click handlers
  document.querySelectorAll('.alert-card-h').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('ach-close')) {
        card.style.display = 'none';
        return;
      }
      const regionId = card.dataset.region;
      if (regionId) selectRegion(regionId, true);
    });
  });

  // Modal Close Button
  document.getElementById('modal-close-btn')?.addEventListener('click', () => {
    document.getElementById('details-modal')?.classList.add('hidden');
  });

  // Modal Tab Switching
  document.querySelectorAll('.mtab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.mtab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const targetPane = document.getElementById(tab.dataset.tab);
      if (targetPane) targetPane.classList.add('active');
    });
  });

  // Ocean Sub-menu Toggle
  document.getElementById('nav-ocean-trigger')?.addEventListener('click', () => {
    const menu = document.getElementById('ocean-sub-menu');
    menu?.classList.toggle('open');
  });
}

// Helper to escape HTML characters
function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
