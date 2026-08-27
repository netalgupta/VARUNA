/**
 * VARUNA API Endpoints Directory
 * Authoritative registry of all FastAPI backend routes discovered in `backend/src/api/routes.py`
 */

export const ENDPOINTS = {
  // ⚙️ System Health
  HEALTH: "/health",

  // 🤖 Multi-Agent Orchestration & AI Copilot
  AGENT_CHAT: "/api/v1/agent/chat",
  CHAT_FAST: "/api/v1/chat",
  FEEDBACK: "/api/v1/feedback",

  // 🚨 Proactive Anomaly & Early-Warning Feed
  ANOMALIES: "/api/v1/anomalies",
  ANOMALY_DETAIL: (id: number | string) => `/api/v1/anomalies/${id}`,

  // 🐟 CMLRE Marine Living Resources & Cross-Domain Fusion
  BIODIVERSITY: "/api/v1/biodiversity",
  BIODIVERSITY_PROFILES: "/api/v1/biodiversity/profiles",
  BIODIVERSITY_OBSERVATIONS: "/api/v1/biodiversity/observations",
  CORRELATE: "/api/v1/correlate",

  // 🛰️ INCOIS ARGO Float Fleet & Depth Profiles
  FLOATS: "/api/v1/floats",
  TRAJECTORY: (platform: number | string) => `/api/v1/trajectory/${platform}`,
  PROFILE: (platform: number | string) => `/api/v1/profile/${platform}`,
  STATS: "/api/v1/stats",

  // 🧠 Predictive ML & Deep Sensor QC
  ML_FORECAST_MHW: "/api/v1/ml/forecast-mhw",
  ML_QC_DETECT: "/api/v1/ml/qc-detect",

  // 📊 Columnar Analytics & Dataset Export
  EXPORT: "/api/v1/export",

  // 🔍 Pipeline Observability & RAG Debugger
  DEBUG_TRACE: (traceId: string) => `/api/v1/debug/${traceId}`,

  // ⚡ WebSocket Streaming
  WS_CHAT: "/ws/chat",
} as const;
