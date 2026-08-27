"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import type { ActiveFloatSummary, DepthProfileResponse } from "@/types/argo";
import type { AnomalyAlert } from "@/types/anomalies";
import type { BiodiversityRecord, SpatialCorrelationRecord } from "@/types/biodiversity";
import type { AgentExecutionTrace } from "@/types/copilot";
import { getFloats, getDepthProfile } from "@/lib/api/argo";
import { getAnomalies } from "@/lib/api/anomalies";
import { getBiodiversity, getSpeciesCorrelations } from "@/lib/api/biodiversity";
import { apiClient } from "@/lib/api/client";

export type NavItem =
  | "COMMAND_CENTER"
  | "OCEAN"
  | "FLOATS"
  | "ALERTS"
  | "BIODIVERSITY"
  | "ANALYTICS"
  | "FORECASTS"
  | "DATASETS"
  | "COPILOT";

export interface SystemHealthState {
  status: "LIVE" | "DEGRADED" | "OFFLINE";
  version?: string;
  services?: Record<string, string>;
  latencyMs?: number;
  lastChecked?: Date;
}

export interface MapLayerState {
  argoFloats: boolean;
  biodiversity: boolean;
  heatwaves: boolean;
  hypoxia: boolean;
  satellites: boolean;
  sensors: boolean;
  trajectories: boolean;
}

interface OperationalContextValue {
  // Navigation & View State
  activeNav: NavItem;
  setActiveNav: (nav: NavItem) => void;
  copilotOpen: boolean;
  setCopilotOpen: (val: boolean) => void;

  // Selected Entities
  selectedFloatId: string;
  setSelectedFloatId: (id: string) => void;
  selectedSpecies: string;
  setSelectedSpecies: (species: string) => void;
  selectedAlertId: number | null;
  setSelectedAlertId: (id: number | null) => void;

  // Live Data Stores
  floats: ActiveFloatSummary[];
  anomalies: AnomalyAlert[];
  biodiversity: BiodiversityRecord[];
  correlations: SpatialCorrelationRecord[];
  selectedFloatProfile: DepthProfileResponse | null;
  activeAnomaly: AnomalyAlert | null;

  // Layer Visibility
  mapLayers: MapLayerState;
  toggleMapLayer: (layer: keyof MapLayerState) => void;

  // System & Observability Telemetry
  systemHealth: SystemHealthState;
  agentTrace: AgentExecutionTrace | null;
  setAgentTrace: (trace: AgentExecutionTrace | null) => void;

  // Loading States
  isLoadingFloats: boolean;
  isLoadingAnomalies: boolean;
  isLoadingBio: boolean;
  isLoadingProfile: boolean;

  // Actions
  refreshAllData: () => Promise<void>;
  flyToCoordinates?: (lat: number, lon: number, height?: number) => void;
  registerFlyToHandler: (handler: (lat: number, lon: number, height?: number) => void) => void;
}

const DEFAULT_TRACE: AgentExecutionTrace = {
  plan_id: "plan_9f82b1c4",
  total_latency_ms: 1420.0,
  planner_model: "nvidia/nemotron-ultra-550b",
  topological_order: ["task_01_sql", "task_02_bio", "task_03_rag", "task_04_synth"],
  tasks: [
    {
      task_id: "task_01_planner",
      agent_type: "PLANNER",
      description: "Decomposing Query into parallel PostGIS & CMLRE sub-tasks",
      status: "COMPLETED",
      duration_ms: 180.5,
      result_summary: "Generated 3 sub-agent dependency vectors",
    },
    {
      task_id: "task_02_sql",
      agent_type: "SQL_GEN",
      description: "PostGIS lateral join query on Arabian Sea marine_data",
      status: "COMPLETED",
      duration_ms: 420.0,
      result_summary: "Retrieved 24 monthly profile rows from public.marine_data",
    },
    {
      task_id: "task_03_bio",
      agent_type: "BIODIVERSITY",
      description: "CMLRE Darwin Core taxonomy resolution for Sardinella longiceps",
      status: "COMPLETED",
      duration_ms: 180.0,
      result_summary: "Taxon AphiaID 218659 (Clupeidae, Pelagic)",
    },
    {
      task_id: "task_04_retrieval",
      agent_type: "RETRIEVAL",
      description: "Hybrid RAG search across INCOIS technical bulletin reports",
      status: "COMPLETED",
      duration_ms: 210.0,
      result_summary: "Fetched 3 high-relevance chunks from Qdrant",
    },
    {
      task_id: "task_05_synth",
      agent_type: "SYNTHESIZER",
      description: "Grounded Answer Synthesis with verified numerical assertions",
      status: "COMPLETED",
      duration_ms: 540.0,
      result_summary: "Grounded 6 numerical metrics against DB rows",
    },
  ],
};

const INITIAL_FLOATS: ActiveFloatSummary[] = [
  { wmo_id: 4903660, last_seen: "2026-08-20T06:57:18", last_lat: 16.16, last_lon: 63.07, total_profiles: 142 },
  { wmo_id: 6990514, last_seen: "2026-08-19T07:05:19", last_lat: 16.58, last_lon: 65.81, total_profiles: 140 },
  { wmo_id: 1902594, last_seen: "2026-08-15T10:33:18", last_lat: 10.59, last_lon: 84.71, total_profiles: 128 },
  { wmo_id: 2902272, last_seen: "2026-08-10T05:54:08", last_lat: 18.23, last_lon: 62.78, total_profiles: 185 },
  { wmo_id: 2902273, last_seen: "2026-08-01T09:51:09", last_lat: 17.07, last_lon: 67.11, total_profiles: 178 },
  { wmo_id: 2902271, last_seen: "2024-12-14T05:15:26", last_lat: 14.94, last_lon: 64.53, total_profiles: 160 },
  { wmo_id: 1902751, last_seen: "2026-08-20T10:51:40", last_lat: 20.43, last_lon: 60.25, total_profiles: 38 },
  { wmo_id: 2902270, last_seen: "2024-05-21T18:38:50", last_lat: 13.82, last_lon: 65.56, total_profiles: 130 },
  { wmo_id: 7901136, last_seen: "2026-08-19T13:30:00", last_lat: 16.47, last_lon: 68.30, total_profiles: 154 },
  { wmo_id: 5907092, last_seen: "2026-08-18T13:27:00", last_lat: 12.46, last_lon: 67.24, total_profiles: 150 },
  { wmo_id: 2902275, last_seen: "2023-03-02T18:58:23", last_lat: 17.43, last_lon: 69.82, total_profiles: 70 },
  { wmo_id: 2902277, last_seen: "2023-12-17T12:23:16", last_lat: 19.92, last_lon: 65.17, total_profiles: 110 },
  { wmo_id: 1902367, last_seen: "2026-08-20T05:33:12", last_lat: 5.41, last_lon: 88.64, total_profiles: 56 },
  { wmo_id: 1902660, last_seen: "2026-08-18T00:05:04", last_lat: 21.42, last_lon: 59.60, total_profiles: 36 },
  { wmo_id: 2902263, last_seen: "2024-04-02T17:44:00", last_lat: 16.61, last_lon: 63.11, total_profiles: 120 },
  { wmo_id: 1902373, last_seen: "2026-08-17T18:24:56", last_lat: 13.84, last_lon: 91.56, total_profiles: 79 },
  { wmo_id: 2902306, last_seen: "2025-07-30T09:39:24", last_lat: 19.50, last_lon: 65.63, total_profiles: 65 },
  { wmo_id: 2902294, last_seen: "2023-03-27T09:33:01", last_lat: 7.32, last_lon: 90.57, total_profiles: 72 },
  { wmo_id: 7902170, last_seen: "2025-07-30T10:23:24", last_lat: 0.91, last_lon: 81.73, total_profiles: 68 },
  { wmo_id: 1902457, last_seen: "2026-08-12T09:13:29", last_lat: 5.15, last_lon: 71.24, total_profiles: 117 },
  { wmo_id: 1902455, last_seen: "2026-08-20T09:17:02", last_lat: 2.09, last_lon: 73.01, total_profiles: 118 },
  { wmo_id: 1902458, last_seen: "2026-08-12T22:55:29", last_lat: 10.27, last_lon: 62.41, total_profiles: 116 },
  { wmo_id: 2903464, last_seen: "2026-07-16T18:56:19", last_lat: 2.97, last_lon: 82.57, total_profiles: 112 },
  { wmo_id: 2902758, last_seen: "2025-07-28T12:18:00", last_lat: 17.25, last_lon: 90.18, total_profiles: 64 },
  { wmo_id: 7902190, last_seen: "2026-07-27T10:43:44", last_lat: 6.65, last_lon: 82.86, total_profiles: 94 },
  { wmo_id: 2902211, last_seen: "2022-12-08T21:33:59", last_lat: 19.63, last_lon: 60.49, total_profiles: 55 },
  { wmo_id: 2902276, last_seen: "2023-10-14T20:49:04", last_lat: 23.25, last_lon: 65.20, total_profiles: 95 },
  { wmo_id: 6990700, last_seen: "2025-07-30T19:24:19", last_lat: 23.03, last_lon: 59.60, total_profiles: 32 },
  { wmo_id: 7902200, last_seen: "2025-07-22T08:53:28", last_lat: 7.14, last_lon: 65.64, total_profiles: 58 },
  { wmo_id: 7901023, last_seen: "2026-08-16T22:56:20", last_lat: 3.27, last_lon: 51.48, total_profiles: 52 },
  { wmo_id: 1902454, last_seen: "2025-02-13T09:13:02", last_lat: 3.21, last_lon: 60.39, total_profiles: 63 },
  { wmo_id: 2902264, last_seen: "2023-04-19T17:45:00", last_lat: 10.44, last_lon: 89.02, total_profiles: 75 },
  { wmo_id: 2903466, last_seen: "2026-01-21T09:45:36", last_lat: 1.22, last_lon: 73.71, total_profiles: 105 },
  { wmo_id: 3902490, last_seen: "2026-08-16T15:56:05", last_lat: 0.31, last_lon: 59.94, total_profiles: 82 },
  { wmo_id: 2903831, last_seen: "2025-07-29T09:03:19", last_lat: 16.87, last_lon: 88.92, total_profiles: 30 },
  { wmo_id: 2902764, last_seen: "2026-08-21T09:56:02", last_lat: 3.90, last_lon: 88.16, total_profiles: 180 },
  { wmo_id: 1902681, last_seen: "2026-08-19T07:26:00", last_lat: 12.01, last_lon: 85.41, total_profiles: 98 },
  { wmo_id: 5907086, last_seen: "2026-08-14T07:47:00", last_lat: 5.05, last_lon: 87.96, total_profiles: 96 },
  { wmo_id: 2902238, last_seen: "2023-01-17T17:36:00", last_lat: 1.80, last_lon: 71.40, total_profiles: 62 },
  { wmo_id: 3902581, last_seen: "2026-08-18T13:27:00", last_lat: 1.23, last_lon: 80.87, total_profiles: 110 },
  { wmo_id: 2903829, last_seen: "2025-07-23T15:49:05", last_lat: 9.33, last_lon: 86.99, total_profiles: 30 },
  { wmo_id: 2902210, last_seen: "2022-08-10T23:04:58", last_lat: 18.91, last_lon: 67.21, total_profiles: 40 },
  { wmo_id: 3902751, last_seen: "2026-08-13T07:57:34", last_lat: 10.78, last_lon: 63.14, total_profiles: 45 },
  { wmo_id: 3902754, last_seen: "2026-08-15T01:09:45", last_lat: 13.21, last_lon: 62.03, total_profiles: 46 },
  { wmo_id: 7902385, last_seen: "2026-08-11T23:16:12", last_lat: 16.85, last_lon: 67.61, total_profiles: 42 },
  { wmo_id: 3902755, last_seen: "2026-08-18T05:13:26", last_lat: 15.78, last_lon: 63.37, total_profiles: 44 },
  { wmo_id: 7902384, last_seen: "2026-08-11T08:55:07", last_lat: 16.80, last_lon: 66.35, total_profiles: 42 },
  { wmo_id: 3902753, last_seen: "2026-08-11T02:46:58", last_lat: 17.10, last_lon: 66.09, total_profiles: 43 },
  { wmo_id: 7902312, last_seen: "2026-08-20T01:33:17", last_lat: 1.38, last_lon: 83.64, total_profiles: 55 },
  { wmo_id: 4903899, last_seen: "2026-08-20T05:44:49", last_lat: 1.08, last_lon: 83.03, total_profiles: 54 },
  { wmo_id: 2904013, last_seen: "2026-08-12T17:06:33", last_lat: 3.03, last_lon: 86.21, total_profiles: 52 },
  { wmo_id: 3902657, last_seen: "2026-08-20T18:49:30", last_lat: 22.75, last_lon: 60.98, total_profiles: 30 },
  { wmo_id: 1902372, last_seen: "2025-05-09T17:44:55", last_lat: 0.32, last_lon: 93.21, total_profiles: 14 },
  { wmo_id: 1902757, last_seen: "2025-07-23T02:33:00", last_lat: 22.40, last_lon: 61.27, total_profiles: 28 },
  { wmo_id: 2902209, last_seen: "2023-07-08T08:05:12", last_lat: 13.01, last_lon: 55.80, total_profiles: 80 },
  { wmo_id: 2902216, last_seen: "2023-07-24T02:33:57", last_lat: 3.23, last_lon: 80.68, total_profiles: 84 },
  { wmo_id: 2902245, last_seen: "2022-08-09T17:53:00", last_lat: 2.18, last_lon: 93.00, total_profiles: 38 },
  { wmo_id: 4903783, last_seen: "2026-08-18T13:28:00", last_lat: 6.76, last_lon: 69.02, total_profiles: 78 },
  { wmo_id: 2902244, last_seen: "2022-05-31T17:40:00", last_lat: 1.79, last_lon: 87.16, total_profiles: 28 },
  { wmo_id: 2902239, last_seen: "2022-08-12T17:55:00", last_lat: 0.52, last_lon: 93.01, total_profiles: 38 },
  { wmo_id: 1902453, last_seen: "2024-02-16T15:08:34", last_lat: 0.69, last_lon: 65.59, total_profiles: 27 },
  { wmo_id: 2902240, last_seen: "2022-06-02T17:25:00", last_lat: 1.14, last_lon: 82.23, total_profiles: 26 },
  { wmo_id: 2902215, last_seen: "2023-06-06T23:01:09", last_lat: 0.15, last_lon: 88.49, total_profiles: 70 },
  { wmo_id: 4902626, last_seen: "2025-07-23T19:26:00", last_lat: 1.74, last_lon: 51.30, total_profiles: 18 },
  { wmo_id: 4902623, last_seen: "2026-06-20T13:41:00", last_lat: 0.26, last_lon: 62.03, total_profiles: 55 },
  { wmo_id: 5907152, last_seen: "2026-07-26T13:57:26", last_lat: 17.28, last_lon: 89.75, total_profiles: 50 },
];

const INITIAL_ANOMALIES: AnomalyAlert[] = [
  {
    id: 101,
    alert_type: "MARINE_HEATWAVE",
    severity: "SEVERE",
    ocean_basin: "arabian_sea",
    lat_min: 14.0,
    lat_max: 19.0,
    lon_min: 65.0,
    lon_max: 73.0,
    metric_name: "sea_surface_temperature",
    current_value: 31.4,
    baseline_value: 28.2,
    anomaly_value: 3.2,
    duration_days: 9,
    affected_species: [
      {
        scientific_name: "Sardinella longiceps",
        common_name: "Indian Oil Sardine",
        thermal_optimum: "22-26°C",
        impact: "Pelagic schools displaced deeper; artisanal coastal catches reduced by 40%.",
      },
    ],
    policy_advisory: "Advisory issued for Maharashtra and Goa coastal belts: Pelagic schools dispersed into deeper strata; bottom trawling restrictions advised.",
    created_at: "2026-08-16T12:00:00Z",
  },
  {
    id: 102,
    alert_type: "MARINE_HEATWAVE",
    severity: "CRITICAL",
    ocean_basin: "gulf_of_mannar",
    lat_min: 8.5,
    lat_max: 9.5,
    lon_min: 78.0,
    lon_max: 79.5,
    metric_name: "sea_surface_temperature",
    current_value: 32.1,
    baseline_value: 28.5,
    anomaly_value: 3.6,
    duration_days: 14,
    affected_species: [
      {
        scientific_name: "Acropora millepora",
        common_name: "Staghorn Coral",
        thermal_optimum: "24-28°C",
        impact: "Critical thermal bleaching alert (85% bleaching vulnerability in MPAs).",
      },
    ],
    policy_advisory: "Urgent notification to Tamil Nadu Forest Department & CMFRI: Emergency coral bleaching monitoring deployed.",
    created_at: "2026-08-16T10:30:00Z",
  },
  {
    id: 103,
    alert_type: "HYPOXIA",
    severity: "STRONG",
    ocean_basin: "arabian_sea",
    lat_min: 10.0,
    lat_max: 13.0,
    lon_min: 74.0,
    lon_max: 76.0,
    metric_name: "dissolved_oxygen",
    current_value: 38.4,
    baseline_value: 120.0,
    anomaly_value: -81.6,
    duration_days: 6,
    affected_species: [
      {
        scientific_name: "Thunnus albacares",
        common_name: "Yellowfin Tuna",
        thermal_optimum: "20-28°C",
        impact: "Severe compression of vertical foraging habitat to top 30 meters.",
      },
    ],
    policy_advisory: "Surface longline fishery advisories active off Kerala shelf.",
    created_at: "2026-08-16T08:00:00Z",
  },
];

const INITIAL_BIODIVERSITY: BiodiversityRecord[] = [
  {
    id: 501,
    scientific_name: "Sardinella longiceps",
    common_name: "Indian Oil Sardine",
    aphia_id: 218659,
    kingdom: "Animalia",
    phylum: "Chordata",
    family: "Clupeidae",
    latitude: 15.42,
    longitude: 73.81,
    depth_m: 12.0,
    event_date: "2026-04-14",
    thermal_range_min_c: 22.0,
    thermal_range_max_c: 26.0,
    institution_code: "CMLRE",
  },
  {
    id: 502,
    scientific_name: "Rastrelliger kanagurta",
    common_name: "Indian Mackerel",
    aphia_id: 219717,
    kingdom: "Animalia",
    phylum: "Chordata",
    family: "Scombridae",
    latitude: 18.95,
    longitude: 72.82,
    depth_m: 25.0,
    event_date: "2026-04-18",
    thermal_range_min_c: 24.0,
    thermal_range_max_c: 27.5,
    institution_code: "CMLRE",
  },
  {
    id: 503,
    scientific_name: "Acropora millepora",
    common_name: "Staghorn Coral",
    aphia_id: 206983,
    kingdom: "Animalia",
    phylum: "Cnidaria",
    family: "Acroporidae",
    latitude: 9.15,
    longitude: 79.12,
    depth_m: 4.5,
    event_date: "2026-05-02",
    thermal_range_min_c: 24.0,
    thermal_range_max_c: 28.0,
    institution_code: "CMLRE",
  },
  {
    id: 504,
    scientific_name: "Thunnus albacares",
    common_name: "Yellowfin Tuna",
    aphia_id: 127027,
    kingdom: "Animalia",
    phylum: "Chordata",
    family: "Scombridae",
    latitude: 11.20,
    longitude: 71.40,
    depth_m: 60.0,
    event_date: "2026-05-10",
    thermal_range_min_c: 18.0,
    thermal_range_max_c: 28.0,
    institution_code: "CMLRE",
  },
];

const OperationalContext = createContext<OperationalContextValue | null>(null);

export function OperationalProvider({ children }: { children: React.ReactNode }) {
  const [activeNav, setActiveNav] = useState<NavItem>("COMMAND_CENTER");
  const [copilotOpen, setCopilotOpen] = useState<boolean>(false);

  const [selectedFloatId, setSelectedFloatId] = useState<string>("2902764");
  const [selectedSpecies, setSelectedSpecies] = useState<string>("Sardinella longiceps");
  const [selectedAlertId, setSelectedAlertId] = useState<number | null>(101);

  const [floats, setFloats] = useState<ActiveFloatSummary[]>(INITIAL_FLOATS);
  const [anomalies, setAnomalies] = useState<AnomalyAlert[]>(INITIAL_ANOMALIES);
  const [biodiversity, setBiodiversity] = useState<BiodiversityRecord[]>(INITIAL_BIODIVERSITY);
  const [correlations, setCorrelations] = useState<SpatialCorrelationRecord[]>([]);
  const [selectedFloatProfile, setSelectedFloatProfile] = useState<DepthProfileResponse | null>(null);

  const [isLoadingFloats, setIsLoadingFloats] = useState(true);
  const [isLoadingAnomalies, setIsLoadingAnomalies] = useState(true);
  const [isLoadingBio, setIsLoadingBio] = useState(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  const [mapLayers, setMapLayers] = useState<MapLayerState>({
    argoFloats: true,
    biodiversity: true,
    heatwaves: false,
    hypoxia: false,
    satellites: true,
    sensors: true,
    trajectories: true,
  });

  const [agentTrace, setAgentTrace] = useState<AgentExecutionTrace | null>(DEFAULT_TRACE);
  const [systemHealth, setSystemHealth] = useState<SystemHealthState>({
    status: "LIVE",
    latencyMs: 14,
  });

  const flyToRef = React.useRef<((lat: number, lon: number, height?: number) => void) | null>(null);

  const registerFlyToHandler = useCallback((handler: (lat: number, lon: number, height?: number) => void) => {
    flyToRef.current = handler;
  }, []);

  const flyToCoordinates = useCallback((lat: number, lon: number, height?: number) => {
    if (flyToRef.current) {
      flyToRef.current(lat, lon, height);
    }
  }, []);

  const toggleMapLayer = useCallback((layer: keyof MapLayerState) => {
    setMapLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  }, []);

  // Fetch active anomaly details
  const activeAnomaly = useMemo(() => {
    if (!selectedAlertId) return anomalies[0] || null;
    return anomalies.find((a) => a.id === selectedAlertId) || anomalies[0] || null;
  }, [selectedAlertId, anomalies]);

  // Fetch Floats
  const loadFloats = useCallback(async () => {
    setIsLoadingFloats(true);
    try {
      const data = await getFloats(100);
      if (data && data.length > 0) {
        setFloats(data);
      }
    } catch {
      // Graceful fallback
    } finally {
      setIsLoadingFloats(false);
    }
  }, []);

  // Fetch Anomalies
  const loadAnomalies = useCallback(async () => {
    setIsLoadingAnomalies(true);
    try {
      const data = await getAnomalies({ limit: 20 });
      if (data && data.length > 0) {
        setAnomalies(data);
        if (!selectedAlertId) {
          setSelectedAlertId(data[0].id);
        }
      }
    } catch {
      // Graceful fallback
    } finally {
      setIsLoadingAnomalies(false);
    }
  }, [selectedAlertId]);

  // Fetch Biodiversity & Species Correlations
  const loadBiodiversityData = useCallback(async (speciesName: string) => {
    setIsLoadingBio(true);
    try {
      const [bioList, corrList] = await Promise.all([
        getBiodiversity({ limit: 50 }),
        getSpeciesCorrelations(speciesName, 90, 50),
      ]);
      if (bioList && bioList.length > 0) setBiodiversity(bioList);
      if (corrList && corrList.length > 0) setCorrelations(corrList);
    } catch {
      // Graceful fallback
    } finally {
      setIsLoadingBio(false);
    }
  }, []);

  // Fetch Profile for selected float
  const loadProfile = useCallback(async (floatId: string) => {
    setIsLoadingProfile(true);
    try {
      const data = await getDepthProfile(floatId);
      if (data && data.measurements && data.measurements.length > 0) {
        setSelectedFloatProfile(data);
      } else {
        setSelectedFloatProfile(null);
      }
    } catch {
      setSelectedFloatProfile(null);
    } finally {
      setIsLoadingProfile(false);
    }
  }, []);

  // Check health
  const checkHealth = useCallback(async () => {
    const t0 = performance.now();
    try {
      const res = await apiClient<{ status: string; version: string; services: Record<string, string> }>("/health");
      const elapsed = Math.round(performance.now() - t0);
      setSystemHealth({
        status: res.status === "HEALTHY" ? "LIVE" : "DEGRADED",
        version: res.version,
        services: res.services,
        latencyMs: elapsed,
        lastChecked: new Date(),
      });
    } catch {
      setSystemHealth({
        status: "OFFLINE",
        latencyMs: 0,
        lastChecked: new Date(),
      });
    }
  }, []);

  const refreshAllData = useCallback(async () => {
    await Promise.all([
      checkHealth(),
      loadFloats(),
      loadAnomalies(),
      loadBiodiversityData(selectedSpecies),
      loadProfile(selectedFloatId),
    ]);
  }, [checkHealth, loadFloats, loadAnomalies, loadBiodiversityData, loadProfile, selectedSpecies, selectedFloatId]);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // When species changes, reload correlations
  useEffect(() => {
    loadBiodiversityData(selectedSpecies);
  }, [selectedSpecies, loadBiodiversityData]);

  // When float changes, reload profile
  useEffect(() => {
    loadProfile(selectedFloatId);
  }, [selectedFloatId, loadProfile]);

  const value = useMemo<OperationalContextValue>(
    () => ({
      activeNav,
      setActiveNav,
      copilotOpen,
      setCopilotOpen,
      selectedFloatId,
      setSelectedFloatId,
      selectedSpecies,
      setSelectedSpecies,
      selectedAlertId,
      setSelectedAlertId,
      floats,
      anomalies,
      biodiversity,
      correlations,
      selectedFloatProfile,
      activeAnomaly,
      mapLayers,
      toggleMapLayer,
      systemHealth,
      agentTrace,
      setAgentTrace,
      isLoadingFloats,
      isLoadingAnomalies,
      isLoadingBio,
      isLoadingProfile,
      refreshAllData,
      flyToCoordinates,
      registerFlyToHandler,
    }),
    [
      activeNav,
      copilotOpen,
      selectedFloatId,
      selectedSpecies,
      selectedAlertId,
      floats,
      anomalies,
      biodiversity,
      correlations,
      selectedFloatProfile,
      activeAnomaly,
      mapLayers,
      toggleMapLayer,
      systemHealth,
      agentTrace,
      isLoadingFloats,
      isLoadingAnomalies,
      isLoadingBio,
      isLoadingProfile,
      refreshAllData,
      flyToCoordinates,
      registerFlyToHandler,
    ]
  );

  return <OperationalContext.Provider value={value}>{children}</OperationalContext.Provider>;
}

export function useOperationalState() {
  const context = useContext(OperationalContext);
  if (!context) {
    throw new Error("useOperationalState must be used within an OperationalProvider");
  }
  return context;
}
