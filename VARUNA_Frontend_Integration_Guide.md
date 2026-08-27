# VARUNA — Frontend Integration Guide for Advay
**Team: Ctrl Alt Defeat | SIH26_19 | MoES**
**Backend: Aryan | Frontend: Advay**
**Last Updated: 2026-08-22**

---

## 1. What the Backend Gives You

VARUNA exposes **two communication paths** from the frontend:

| Path | Use Case |
|:---|:---|
| **WebSocket `ws://host/ws/chat`** | Primary chat — real-time pipeline events while the answer builds |
| **REST `POST /api/v1/agent/chat`** | Fallback / SSR fetch — single call, full response |

**You should use WebSocket for the main chat UI.** It lets you show every internal step as it happens (which agent is running, SQL being generated, rows hitting the DB), giving VARUNA a "glass box AI" feel that other products don't have.

---

## 2. WebSocket Protocol — Complete Spec

### Connect
```
ws://localhost:8000/ws/chat
```

### Client → Server (one JSON frame per query)
```json
{
  "question": "What is the OMZ depth in the Arabian Sea?",
  "session": "user_session_abc123",
  "user_lat": null,
  "user_lon": null
}
```

| Field | Type | Required | Description |
|:---|:---|:---|:---|
| `question` | `string` | ✅ | The user's natural language query |
| `session` | `string` | optional | Session ID for conversation memory (default: `"default"`) |
| `user_lat` | `float\|null` | optional | User's latitude for geo-proximity queries |
| `user_lon` | `float\|null` | optional | User's longitude for geo-proximity queries |

---

### Server → Client Event Stream

The server sends a **sequence of JSON frames**, always in this order:

---

#### `pipeline_step` — Agent Status Updates

Emitted before and after every agent runs. Use these to drive your live visualization panel.

```json
{
  "type": "pipeline_step",
  "data": {
    "stage": "PLANNER",
    "status": "RUNNING",
    "message": "LLM decomposing query into Task DAG..."
  }
}
```

```json
{
  "type": "pipeline_step",
  "data": {
    "stage": "PLANNER",
    "status": "DONE",
    "message": "Plan compiled: 3 tasks across 2 parallel stages",
    "plan_id": "plan_b4a5e07d",
    "task_ids": ["task_01_sql", "task_02_retrieval", "task_03_synthesize"],
    "duration_ms": 340.5
  }
}
```

```json
{
  "type": "pipeline_step",
  "data": {
    "stage": "SQL_GEN",
    "task_id": "task_01_sql",
    "status": "RUNNING",
    "message": "SQL_GEN agent started",
    "params": { "query_goal": "What is the OMZ depth..." }
  }
}
```

```json
{
  "type": "pipeline_step",
  "data": {
    "stage": "SQL_GEN",
    "task_id": "task_01_sql",
    "status": "DONE",
    "message": "SQL_GEN completed in 820ms",
    "duration_ms": 820.3,
    "row_count": 3
  }
}
```

**All possible `stage` values:**

| `stage` | What it means |
|:---|:---|
| `PLANNER` | LLM building the Task DAG |
| `SQL_GEN` | NL→SQL + database execution |
| `RETRIEVAL` | Vector/BM25 semantic search |
| `BIODIVERSITY` | CMLRE species correlation |
| `SYNTHESIZER` | Markdown answer generation |
| `INTENT` | Fast-path smalltalk classification |

**All possible `status` values:** `RUNNING` | `DONE` | `FAILED`

---

#### `sql` — The Generated SQL Query
```json
{
  "type": "sql",
  "data": "WITH haversine AS (\n  SELECT platform_number, time, ...\n) SELECT * FROM haversine WHERE dist_km <= 300.0 ..."
}
```
Show this in a collapsible code block.

---

#### `rows` — Database Results (max 50)
```json
{
  "type": "rows",
  "data": [
    {
      "platform_number": 2902936,
      "time": "2026-08-21 08:14:33",
      "latitude": 14.42,
      "longitude": 63.32,
      "pres": 0.005,
      "temp": 27.077,
      "psal": 36.162,
      "doxy": 200.77
    }
  ]
}
```
Render these as a sortable data table. Can also drive the map.

---

#### `done` — Final Complete Payload
```json
{
  "type": "done",
  "data": {
    "trace_id": "3f8b7e21-00a1-4a89-91c2-1482847a9e10",
    "answer_markdown": "### 🌊 Oceanographic Physical State...",
    "sql": "SELECT ...",
    "row_count": 40,
    "intent": "MULTI_AGENT_DAG",
    "float_ids": ["2902936", "1902660"],
    "viz_specs": {
      "chart_type": "time_series",
      "x_variable": "time",
      "y_variable": "temp"
    },
    "agent_trace": {
      "plan_id": "plan_b4a5e07d",
      "total_latency_ms": 4580.2,
      "planner_model": "nvidia/nemotron-3-super-120b-a12b:free",
      "tasks": [
        {
          "task_id": "task_01_sql",
          "agent_type": "SQL_GEN",
          "status": "COMPLETED",
          "duration_ms": 2348.1,
          "result_summary": "Returned 40 items"
        },
        {
          "task_id": "task_04_synthesize",
          "agent_type": "SYNTHESIZER",
          "status": "COMPLETED",
          "duration_ms": 450.0,
          "result_summary": "Returned 5 items"
        }
      ]
    }
  }
}
```

---

#### `error` — Any Failure
```json
{
  "type": "error",
  "data": "Rate limit exceeded on OpenRouter free tier"
}
```

---

### Complete Message Timeline (One Query)

```
CLIENT                              SERVER
  |                                   |
  |--- {"question": "..."} ---------> |
  |                                   |  [plan_and_execute starts]
  | <-- pipeline_step PLANNER RUNNING-|
  | <-- pipeline_step PLANNER DONE ---|  (includes task_ids)
  | <-- pipeline_step SQL_GEN RUNNING |
  | <-- sql "SELECT ..." -------------|  (as soon as generated)
  | <-- rows [{...}] ----------------|  (as soon as DB responds)
  | <-- pipeline_step SQL_GEN DONE ---|
  | <-- pipeline_step RETRIEVAL RUN --|  (parallel)
  | <-- pipeline_step RETRIEVAL DONE -|
  | <-- pipeline_step SYNTHESIZER RUN |
  | <-- pipeline_step SYNTHESIZER DONE|
  | <-- done {answer_markdown, ...} --|  (final)
  |                                   |
```

---

## 3. REST API — Quick Reference

Base URL: `http://localhost:8000`

| Method | Endpoint | Description |
|:---|:---|:---|
| `POST` | `/api/v1/agent/chat` | Full multi-agent query (same as WS but blocking) |
| `POST` | `/api/v1/chat` | Fast single-shot query |
| `GET` | `/api/v1/floats` | All active ARGO float positions |
| `GET` | `/api/v1/trajectory/{wmo}` | Float drift path (for map trail) |
| `GET` | `/api/v1/profile/{wmo}` | Vertical CTD depth profile |
| `GET` | `/api/v1/anomalies` | Active MHW & hypoxia alerts |
| `GET` | `/api/v1/anomalies/{id}` | Detailed alert with species impact |
| `GET` | `/api/v1/biodiversity` | CMLRE species catalog |
| `GET` | `/api/v1/correlate` | Species ↔ Float spatial join |
| `GET` | `/api/v1/stats` | Basin-level oceanographic stats |
| `POST` | `/api/v1/ml/forecast-mhw` | 7-day MHW forecast |
| `GET` | `/health` | System health check |

**Swagger UI:** `http://localhost:8000/docs` — interactive, all schemas documented.

---

## 4. Suggested Chat UI Component Architecture

```
<ChatPage>
  ├── <MessageList>
  │     ├── <UserMessage>          text bubble
  │     └── <AssistantMessage>
  │           ├── <PipelinePanel>  ← KEY DIFFERENTIATOR
  │           │     ├── <AgentStep stage="PLANNER" status="DONE" ms={340} />
  │           │     ├── <AgentStep stage="SQL_GEN" status="DONE" ms={820} />
  │           │     ├── <AgentStep stage="RETRIEVAL" status="DONE" ms={210} />
  │           │     └── <AgentStep stage="SYNTHESIZER" status="DONE" ms={450} />
  │           ├── <SQLCodeBlock sql={...} />
  │           ├── <DataTable rows={...} />
  │           ├── <MarkdownAnswer markdown={...} />
  │           └── <VizChart specs={viz_specs} rows={rows} />
  │
  └── <ChatInput onSubmit={sendWsMessage} />
```

---

## 5. `PipelinePanel` — Implementation Hints

This is the most impactful UI component. When you get a `pipeline_step` event:

```typescript
type PipelineStep = {
  stage: 'PLANNER' | 'SQL_GEN' | 'RETRIEVAL' | 'BIODIVERSITY' | 'SYNTHESIZER'
  status: 'RUNNING' | 'DONE' | 'FAILED'
  task_id?: string
  message?: string
  duration_ms?: number
  row_count?: number
  plan_id?: string
  task_ids?: string[]
}
```

**Suggested visual treatment:**
- Each agent gets a row: icon + name + spinner (RUNNING) or checkmark + `{ms}ms` (DONE)
- Show them appearing one by one as events arrive
- Animate: fade-in each row, spinner → tick on DONE
- Color: `RUNNING` → blue pulse, `DONE` → green, `FAILED` → red

**Example agent icons:**
| Stage | Icon |
|:---|:---|
| PLANNER | 🧠 |
| SQL_GEN | 🗄️ |
| RETRIEVAL | 🔍 |
| BIODIVERSITY | 🐟 |
| SYNTHESIZER | ✍️ |

---

## 6. WebSocket Connection Hook (TypeScript)

```typescript
// hooks/useVarunaWS.ts
import { useState, useEffect, useRef, useCallback } from 'react'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8000/ws/chat'

export type VarunaEvent =
  | { type: 'pipeline_step'; data: PipelineStep }
  | { type: 'sql';           data: string }
  | { type: 'rows';          data: Record<string, unknown>[] }
  | { type: 'done';          data: DonePayload }
  | { type: 'error';         data: string }

export function useVarunaWS() {
  const ws = useRef<WebSocket | null>(null)
  const [events, setEvents] = useState<VarunaEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const socket = new WebSocket(WS_URL)
    socket.onopen  = () => setIsConnected(true)
    socket.onclose = () => setIsConnected(false)
    socket.onmessage = (e) => {
      const evt: VarunaEvent = JSON.parse(e.data)
      setEvents(prev => [...prev, evt])
      if (evt.type === 'done' || evt.type === 'error') setIsLoading(false)
    }
    ws.current = socket
    return () => socket.close()
  }, [])

  const sendQuery = useCallback((question: string, session = 'default') => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) return
    setEvents([])      // clear previous run
    setIsLoading(true)
    ws.current.send(JSON.stringify({ question, session }))
  }, [])

  return { sendQuery, events, isConnected, isLoading }
}
```

---

## 7. Environment Variables

```env
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws/chat
```

For production (if deployed):
```env
NEXT_PUBLIC_API_URL=https://api.varuna.incois.gov.in
NEXT_PUBLIC_WS_URL=wss://api.varuna.incois.gov.in/ws/chat
```

---

## 8. CORS

All origins are whitelisted (`allow_origins=["*"]`) in the backend CORS middleware. No preflight issues.

---

## 9. Data Types Reference

### `DonePayload`
```typescript
interface DonePayload {
  trace_id:        string
  answer_markdown: string          // GitHub-flavored Markdown, render with react-markdown
  sql:             string | null   // Show in <code> block
  row_count:       number
  intent:          string          // "MULTI_AGENT_DAG" | "SMALLTALK" | etc.
  float_ids:       string[] | null // WMO numbers for map highlighting
  viz_specs:       VizSpecs | null
  agent_trace:     AgentTrace | null
}

interface VizSpecs {
  chart_type: 'time_series' | 'scatter' | 'bar' | 'depth_profile' | 'heatmap'
  x_variable: string
  y_variable: string
  z_variable?: string
  title?: string
}

interface AgentTrace {
  plan_id:         string
  total_latency_ms: number
  planner_model:   string
  tasks:           TaskStep[]
  topological_order: string[]
}

interface TaskStep {
  task_id:        string
  agent_type:     string
  status:         'COMPLETED' | 'FAILED'
  duration_ms:    number
  result_summary: string
}
```

---

## 10. Live Fleet Map Data

For the interactive map (Leaflet / Mapbox):

```typescript
// GET /api/v1/floats
const { data: { floats } } = await fetch(`${API_URL}/api/v1/floats?limit=500`).then(r => r.json())
// floats: Array<{ platform_number, time, latitude, longitude }>

// GET /api/v1/trajectory/{wmo}
const { data: { points } } = await fetch(`${API_URL}/api/v1/trajectory/1902303?days=90`).then(r => r.json())
// points: Array<{ time, latitude, longitude }>
```

---

## 11. Anomaly Alert Sidebar

```typescript
// GET /api/v1/anomalies
const alerts = await fetch(`${API_URL}/api/v1/anomalies`).then(r => r.json())
// Array<AnomalyAlert>

interface AnomalyAlert {
  id:              number
  alert_type:      'MARINE_HEATWAVE' | 'HYPOXIA' | 'SALINITY_ANOMALY'
  severity:        'MODERATE' | 'STRONG' | 'SEVERE' | 'CRITICAL'
  ocean_basin:     string
  current_value:   number
  baseline_value:  number
  anomaly_value:   number   // departure from climatology
  duration_days:   number
  affected_species: SpeciesImpact[]
  policy_advisory: string
  created_at:      string
}
```

---

## 12. Quick Start

```bash
# Start backend
cd backend
.\venv\Scripts\activate
uvicorn src.api.app:app --reload --port 8000

# Start frontend
cd frontend
npm run dev
```

**Health check:** `GET http://localhost:8000/health`

**Swagger:** `http://localhost:8000/docs`

---

> **Questions for Aryan:** Ping on WhatsApp for anything not documented here — specifically viz_specs chart rendering and the float map clustering strategy.
