"""
FloatChat AI — Model Context Protocol (MCP) Server Interface

Exposes oceanographic database tools for LLM tools & MCP clients according to
the Model Context Protocol standard specification.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from src.database.postgres import run_sql, nearest_floats, float_trajectory, depth_profile
from src.utils.export_service import format_export

MCP_TOOLS = [
    {
        "name": "query_marine_data_sql",
        "description": "Execute a PostgreSQL SELECT query on the marine_data telemetry table.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "sql": {"type": "string", "description": "PostgreSQL SELECT statement"},
                "limit": {"type": "integer", "description": "Max rows to return", "default": 500}
            },
            "required": ["sql"]
        }
    },
    {
        "name": "find_nearest_floats",
        "description": "Find ARGO floats nearest to geographical latitude/longitude coordinates.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "lat": {"type": "number", "description": "Target latitude in decimal degrees"},
                "lon": {"type": "number", "description": "Target longitude in decimal degrees"},
                "radius_km": {"type": "number", "description": "Search radius in kilometers", "default": 300},
                "days_window": {"type": "integer", "description": "Lookback window in days", "default": 120}
            },
            "required": ["lat", "lon"]
        }
    },
    {
        "name": "get_depth_profile",
        "description": "Get full depth profile (pressure vs temperature, salinity, oxygen, chlorophyll) for an ARGO float.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "platform_number": {"type": "integer", "description": "ARGO float WMO ID"},
                "cycle": {"type": "integer", "description": "Cycle number (optional)"}
            },
            "required": ["platform_number"]
        }
    },
    {
        "name": "get_float_trajectory",
        "description": "Get surface drift trajectory positions for a specific ARGO float.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "platform_number": {"type": "integer", "description": "ARGO float WMO ID"},
                "days": {"type": "integer", "description": "Trajectory window in days", "default": 365}
            },
            "required": ["platform_number"]
        }
    },
    {
        "name": "export_marine_data",
        "description": "Export query results to structured file formats (ASCII, NetCDF, CSV, JSON, Parquet).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "sql": {"type": "string", "description": "SELECT query to export"},
                "format": {"type": "string", "description": "Target format: ascii, netcdf, csv, json, parquet", "default": "csv"}
            },
            "required": ["sql", "format"]
        }
    }
]


def list_mcp_tools() -> List[Dict[str, Any]]:
    """Return list of available MCP tools."""
    return MCP_TOOLS


def call_mcp_tool(name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Execute an MCP tool by name with arguments."""
    if name == "query_marine_data_sql":
        sql = arguments.get("sql", "")
        limit = arguments.get("limit", 500)
        rows = run_sql(sql, limit=limit)
        return {"content": [{"type": "text", "text": f"Returned {len(rows)} rows."}], "rows": rows}

    elif name == "find_nearest_floats":
        lat = float(arguments.get("lat", 0.0))
        lon = float(arguments.get("lon", 0.0))
        radius_km = float(arguments.get("radius_km", 300.0))
        days = int(arguments.get("days_window", 120))
        rows = nearest_floats(lat=lat, lon=lon, radius_km=radius_km, days_window=days)
        return {"content": [{"type": "text", "text": f"Found {len(rows)} nearest floats within {radius_km} km."}], "floats": rows}

    elif name == "get_depth_profile":
        pnum = int(arguments.get("platform_number", 0))
        cycle = arguments.get("cycle")
        rows = depth_profile(platform_number=pnum, cycle_number=cycle)
        return {"content": [{"type": "text", "text": f"Retrieved {len(rows)} depth profile levels for float {pnum}."}], "measurements": rows}

    elif name == "get_float_trajectory":
        pnum = int(arguments.get("platform_number", 0))
        days = int(arguments.get("days", 365))
        rows = float_trajectory(platform_number=pnum, days=days)
        return {"content": [{"type": "text", "text": f"Retrieved {len(rows)} trajectory points for float {pnum}."}], "points": rows}

    elif name == "export_marine_data":
        sql = arguments.get("sql", "SELECT * FROM public.marine_data LIMIT 100")
        fmt = arguments.get("format", "csv")
        rows = run_sql(sql, limit=1000)
        content, media_type, filename = format_export(rows, fmt)
        text_preview = content.decode("utf-8", errors="ignore") if isinstance(content, bytes) else content
        return {
            "content": [{"type": "text", "text": f"Exported {len(rows)} rows to {fmt.upper()} format."}],
            "filename": filename,
            "media_type": media_type,
            "preview": text_preview[:500]
        }

    else:
        raise ValueError(f"Unknown MCP tool: {name}")
