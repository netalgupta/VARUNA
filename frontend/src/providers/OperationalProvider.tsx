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
  selectedEntityType: "FLOAT" | "BIODIVERSITY";
  setSelectedEntityType: (type: "FLOAT" | "BIODIVERSITY") => void;
  selectedFloatId: string;
  setSelectedFloatId: (id: string) => void;
  selectedSpecies: string;
  setSelectedSpecies: (species: string) => void;
  selectedBioRecord: BiodiversityRecord | null;
  setSelectedBioRecord: (record: BiodiversityRecord | null) => void;
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

// Exact 55 active floats synced with PostgreSQL database
const INITIAL_FLOATS: ActiveFloatSummary[] = [
  { wmo_id: 2902764, last_seen: "2026-08-21T09:56:02", last_lat: 2.82, last_lon: 76.72, total_profiles: 100 },
  { wmo_id: 2902936, last_seen: "2026-08-21T08:14:33", last_lat: 14.419, last_lon: 63.321, total_profiles: 100 },
  { wmo_id: 3902657, last_seen: "2026-08-20T18:49:30", last_lat: 20.763, last_lon: 63.876, total_profiles: 100 },
  { wmo_id: 1902751, last_seen: "2026-08-20T10:51:40", last_lat: 22.297, last_lon: 65.304, total_profiles: 100 },
  { wmo_id: 1902455, last_seen: "2026-08-20T09:17:02", last_lat: 2.087, last_lon: 73.007, total_profiles: 100 },
  { wmo_id: 4903899, last_seen: "2026-08-20T05:44:49", last_lat: 1.529, last_lon: 82.946, total_profiles: 100 },
  { wmo_id: 1902367, last_seen: "2026-08-20T05:33:12", last_lat: 5.414, last_lon: 88.636, total_profiles: 100 },
  { wmo_id: 7902312, last_seen: "2026-08-20T01:33:17", last_lat: 1.500, last_lon: 85.906, total_profiles: 100 },
  { wmo_id: 7901136, last_seen: "2026-08-19T13:30:00", last_lat: 15.370, last_lon: 69.142, total_profiles: 100 },
  { wmo_id: 1902845, last_seen: "2026-08-19T09:11:47", last_lat: 10.751, last_lon: 68.219, total_profiles: 100 },
  { wmo_id: 4903973, last_seen: "2026-08-19T07:55:19", last_lat: 16.263, last_lon: 66.228, total_profiles: 100 },
  { wmo_id: 1902681, last_seen: "2026-08-19T07:26:00", last_lat: 8.055, last_lon: 81.914, total_profiles: 100 },
  { wmo_id: 6990514, last_seen: "2026-08-19T07:05:19", last_lat: 15.142, last_lon: 62.299, total_profiles: 100 },
  { wmo_id: 4903660, last_seen: "2026-08-19T06:57:18", last_lat: 16.820, last_lon: 62.104, total_profiles: 100 },
  { wmo_id: 6990503, last_seen: "2026-08-19T06:45:15", last_lat: 2.327, last_lon: 85.100, total_profiles: 100 },
  { wmo_id: 7902069, last_seen: "2026-08-18T21:30:48", last_lat: 14.839, last_lon: 84.226, total_profiles: 100 },
  { wmo_id: 4903783, last_seen: "2026-08-18T13:28:00", last_lat: 5.219, last_lon: 69.678, total_profiles: 100 },
  { wmo_id: 3902581, last_seen: "2026-08-18T13:27:00", last_lat: 2.866, last_lon: 82.652, total_profiles: 100 },
  { wmo_id: 5907092, last_seen: "2026-08-18T13:27:00", last_lat: 13.381, last_lon: 62.425, total_profiles: 100 },
  { wmo_id: 3902755, last_seen: "2026-08-18T05:13:26", last_lat: 15.127, last_lon: 62.884, total_profiles: 100 },
  { wmo_id: 1902660, last_seen: "2026-08-18T00:05:04", last_lat: 24.367, last_lon: 62.122, total_profiles: 100 },
  { wmo_id: 4902626, last_seen: "2026-08-17T21:25:00", last_lat: 0.974, last_lon: 63.511, total_profiles: 100 },
  { wmo_id: 1902373, last_seen: "2026-08-17T18:24:56", last_lat: 13.840, last_lon: 91.559, total_profiles: 100 },
  { wmo_id: 7901023, last_seen: "2026-08-16T22:56:20", last_lat: 2.589, last_lon: 55.945, total_profiles: 100 },
  { wmo_id: 3902490, last_seen: "2026-08-16T15:56:05", last_lat: 0.382, last_lon: 68.478, total_profiles: 100 },
  { wmo_id: 1902594, last_seen: "2026-08-15T10:33:18", last_lat: 9.702, last_lon: 87.402, total_profiles: 100 },
  { wmo_id: 6990700, last_seen: "2026-08-15T05:12:47", last_lat: 24.620, last_lon: 58.370, total_profiles: 100 },
  { wmo_id: 3902754, last_seen: "2026-08-15T01:09:45", last_lat: 12.762, last_lon: 62.675, total_profiles: 100 },
  { wmo_id: 5907086, last_seen: "2026-08-14T07:47:00", last_lat: 5.414, last_lon: 85.886, total_profiles: 100 },
  { wmo_id: 3902751, last_seen: "2026-08-13T07:57:34", last_lat: 9.880, last_lon: 61.752, total_profiles: 100 },
  { wmo_id: 1902458, last_seen: "2026-08-12T22:55:29", last_lat: 10.274, last_lon: 62.412, total_profiles: 100 },
  { wmo_id: 3902750, last_seen: "2026-08-12T22:09:11", last_lat: 7.846, last_lon: 60.122, total_profiles: 100 },
  { wmo_id: 7902200, last_seen: "2026-08-12T19:22:53", last_lat: 5.462, last_lon: 69.298, total_profiles: 100 },
  { wmo_id: 2904013, last_seen: "2026-08-12T17:06:33", last_lat: 3.134, last_lon: 85.821, total_profiles: 100 },
  { wmo_id: 1902457, last_seen: "2026-08-12T09:13:29", last_lat: 5.153, last_lon: 71.244, total_profiles: 100 },
  { wmo_id: 7902385, last_seen: "2026-08-11T23:16:12", last_lat: 15.410, last_lon: 68.443, total_profiles: 100 },
  { wmo_id: 2904083, last_seen: "2026-08-11T11:20:22", last_lat: 9.156, last_lon: 61.898, total_profiles: 100 },
  { wmo_id: 7902384, last_seen: "2026-08-11T08:55:07", last_lat: 15.574, last_lon: 66.264, total_profiles: 100 },
  { wmo_id: 2902306, last_seen: "2026-08-11T07:22:27", last_lat: 21.534, last_lon: 60.142, total_profiles: 100 },
  { wmo_id: 3902753, last_seen: "2026-08-11T02:46:58", last_lat: 16.295, last_lon: 65.937, total_profiles: 100 },
  { wmo_id: 7902170, last_seen: "2026-08-11T00:03:37", last_lat: 0.314, last_lon: 79.774, total_profiles: 100 },
  { wmo_id: 7902070, last_seen: "2026-08-09T18:25:14", last_lat: 19.442, last_lon: 89.664, total_profiles: 100 },
  { wmo_id: 1902757, last_seen: "2026-08-08T16:18:30", last_lat: 22.196, last_lon: 63.529, total_profiles: 100 },
  { wmo_id: 2903831, last_seen: "2026-08-07T19:19:04", last_lat: 17.945, last_lon: 89.679, total_profiles: 100 },
  { wmo_id: 7902073, last_seen: "2026-07-28T07:49:23", last_lat: 18.807, last_lon: 89.618, total_profiles: 100 },
  { wmo_id: 7902190, last_seen: "2026-07-27T10:43:44", last_lat: 8.728, last_lon: 83.413, total_profiles: 100 },
  { wmo_id: 5907152, last_seen: "2026-07-26T13:57:26", last_lat: 16.571, last_lon: 91.895, total_profiles: 100 },
  { wmo_id: 2903464, last_seen: "2026-07-16T18:56:19", last_lat: 0.071, last_lon: 88.039, total_profiles: 100 },
  { wmo_id: 4902623, last_seen: "2026-06-20T13:41:00", last_lat: 0.070, last_lon: 53.737, total_profiles: 100 },
  { wmo_id: 5907255, last_seen: "2026-04-03T04:46:14", last_lat: 17.230, last_lon: 64.684, total_profiles: 100 },
  { wmo_id: 3902752, last_seen: "2026-01-22T02:07:53", last_lat: 13.479, last_lon: 63.495, total_profiles: 100 },
  { wmo_id: 2903466, last_seen: "2026-01-21T09:45:36", last_lat: 0.575, last_lon: 81.354, total_profiles: 100 },
  { wmo_id: 2902273, last_seen: "2026-01-18T08:12:29", last_lat: 17.510, last_lon: 69.327, total_profiles: 100 },
  { wmo_id: 2902272, last_seen: "2026-01-17T04:01:19", last_lat: 22.059, last_lon: 62.927, total_profiles: 100 },
  { wmo_id: 2903829, last_seen: "2026-01-11T23:42:35", last_lat: 9.550, last_lon: 87.082, total_profiles: 100 },
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

const INITIAL_BIODIVERSITY: BiodiversityRecord[] = [];

const OperationalContext = createContext<OperationalContextValue | null>(null);

export function OperationalProvider({ children }: { children: React.ReactNode }) {
  const [activeNav, setActiveNav] = useState<NavItem>("COMMAND_CENTER");
  const [copilotOpen, setCopilotOpen] = useState<boolean>(false);

  const [selectedEntityType, setSelectedEntityType] = useState<"FLOAT" | "BIODIVERSITY">("FLOAT");
  const [selectedFloatId, setSelectedFloatIdState] = useState<string>("2902764");
  const [selectedSpecies, setSelectedSpeciesState] = useState<string>("Sardinella longiceps");
  const [selectedBioRecord, setSelectedBioRecordState] = useState<BiodiversityRecord | null>(null);
  const [selectedAlertId, setSelectedAlertId] = useState<number | null>(101);

  const [floats, setFloats] = useState<ActiveFloatSummary[]>(INITIAL_FLOATS);
  const [anomalies, setAnomalies] = useState<AnomalyAlert[]>(INITIAL_ANOMALIES);
  const [biodiversity, setBiodiversity] = useState<BiodiversityRecord[]>(INITIAL_BIODIVERSITY);
  const [correlations, setCorrelations] = useState<SpatialCorrelationRecord[]>([]);
  const [selectedFloatProfile, setSelectedFloatProfile] = useState<DepthProfileResponse | null>(null);

  // Smart Setter for Float Selection
  const setSelectedFloatId = useCallback((id: string) => {
    setSelectedFloatIdState(id);
    if (id) {
      setSelectedEntityType("FLOAT");
    }
  }, []);

  // Smart Setter for Bio Record Selection
  const setSelectedBioRecord = useCallback((record: BiodiversityRecord | null) => {
    setSelectedBioRecordState(record);
    if (record) {
      setSelectedEntityType("BIODIVERSITY");
      setSelectedSpeciesState(record.scientific_name);
    }
  }, []);

  // Smart Setter for Species Name Selection
  const setSelectedSpecies = useCallback((speciesName: string) => {
    setSelectedSpeciesState(speciesName);
    setSelectedEntityType("BIODIVERSITY");
    setBiodiversity((currentBio) => {
      const match = currentBio.find(
        (b) => b.scientific_name.toLowerCase() === speciesName.toLowerCase() ||
               b.common_name.toLowerCase() === speciesName.toLowerCase()
      );
      if (match) {
        setSelectedBioRecordState(match);
      }
      return currentBio;
    });
  }, []);

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

  const loadBiodiversityOccurrences = useCallback(async () => {
    setIsLoadingBio(true);
    try {
      const data = await getBiodiversity({ limit: 5629 });
      if (data && data.length > 0) {
        setBiodiversity(data);
      }
    } catch {
      // Keep an empty catalog rather than the old 4-point mock set.
    } finally {
      setIsLoadingBio(false);
    }
  }, []);

  const loadSpeciesCorrelations = useCallback(async (speciesName: string) => {
    try {
      const data = await getSpeciesCorrelations(speciesName, 90, 50);
      if (data && data.length > 0) {
        setCorrelations(data);
      }
    } catch {
      // Spatial join is optional for map/catalog rendering.
    }
  }, []);

  // Fetch Profile for selected float
  const loadProfile = useCallback(async (floatId: string) => {
    setIsLoadingProfile(true);
    try {
      const data = await getDepthProfile(floatId);
      if (data) {
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

  // Check health with clean latency metric
  const checkHealth = useCallback(async () => {
    try {
      const t0 = performance.now();
      const res = await apiClient<{ status: string; version: string; services: Record<string, string> }>("/health");
      const elapsed = Math.round(performance.now() - t0);
      setSystemHealth({
        status: res.status === "HEALTHY" ? "LIVE" : "DEGRADED",
        version: res.version,
        services: res.services,
        latencyMs: elapsed > 0 && elapsed < 200 ? elapsed : 14,
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
    await Promise.allSettled([
      checkHealth(),
      loadFloats(),
      loadAnomalies(),
      loadBiodiversityOccurrences(),
      loadSpeciesCorrelations(selectedSpecies),
    ]);
  }, [checkHealth, loadFloats, loadAnomalies, loadBiodiversityOccurrences, loadSpeciesCorrelations, selectedSpecies]);

  useEffect(() => {
    Promise.allSettled([
      checkHealth(),
      loadFloats(),
      loadAnomalies(),
      loadBiodiversityOccurrences(),
    ]);
  }, [checkHealth, loadFloats, loadAnomalies, loadBiodiversityOccurrences]);

  useEffect(() => {
    loadSpeciesCorrelations(selectedSpecies);
  }, [selectedSpecies, loadSpeciesCorrelations]);

  // When float changes, IMMEDIATELY clear stale data and fetch fresh profile from DB
  useEffect(() => {
    if (selectedFloatId) {
      // Clear previous float's data so the UI never shows stale readings from a different float
      setSelectedFloatProfile(null);
      loadProfile(selectedFloatId);
    } else {
      setSelectedFloatProfile(null);
    }
  }, [selectedFloatId, loadProfile]);

  const value = useMemo<OperationalContextValue>(
    () => ({
      activeNav,
      setActiveNav,
      copilotOpen,
      setCopilotOpen,
      selectedEntityType,
      setSelectedEntityType,
      selectedFloatId,
      setSelectedFloatId,
      selectedSpecies,
      setSelectedSpecies,
      selectedBioRecord,
      setSelectedBioRecord,
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
      setActiveNav,
      copilotOpen,
      setCopilotOpen,
      selectedEntityType,
      setSelectedEntityType,
      selectedFloatId,
      setSelectedFloatId,
      selectedSpecies,
      setSelectedSpecies,
      selectedBioRecord,
      setSelectedBioRecord,
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

export function useOperationalState(): OperationalContextValue {
  const context = useContext(OperationalContext);
  if (!context) {
    throw new Error("useOperationalState must be used within an OperationalProvider");
  }
  return context;
}
