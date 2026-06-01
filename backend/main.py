"""
Procurement Intelligence Dashboard — FastAPI Backend

Proxies requests to the USAspending.gov public API (v2) and adds:
  • 1-hour in-memory response caching
  • Unified error handling with fallback empty responses
  • CSV export for award data
"""

from __future__ import annotations

import csv
import io
import time
from typing import Any, Optional

import httpx
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(title="Procurement Intelligence API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
USA_SPENDING_BASE = "https://api.usaspending.gov/api/v2"
CACHE_TTL_SECONDS = 3600  # 1 hour

# Default time period – current fiscal year
DEFAULT_TIME_PERIOD = [{"start_date": "2024-10-01", "end_date": "2025-09-30"}]

# Award type codes grouped the way USAspending requires them.
# IMPORTANT: the spending_by_award endpoint requires all codes belong
# to the *same* group.  When no category filter is set we default to
# "contracts" so the call is valid.
CATEGORY_MAP: dict[str, list[str]] = {
    "contracts": ["A", "B", "C", "D"],
    "idvs": [
        "IDV_A", "IDV_B", "IDV_B_A", "IDV_B_B",
        "IDV_B_C", "IDV_C", "IDV_D", "IDV_E",
    ],
    "grants": ["02", "03", "04", "05"],
    "loans": ["07", "08"],
    "other": ["06", "09", "10", "11"],
}

DEFAULT_CATEGORY = "contracts"

# Fields we want back from spending_by_award
AWARD_FIELDS = [
    "Award ID",
    "Recipient Name",
    "Award Amount",
    "Start Date",
    "End Date",
    "Awarding Agency",
    "Award Type",
    "Description",
    "Place of Performance State Code",
    "generated_internal_id",
]

# US State centroids for the /api/states endpoint
STATE_CENTROIDS: dict[str, dict[str, float]] = {
    "AL": {"lat": 32.806671, "lng": -86.791130},
    "AK": {"lat": 61.370716, "lng": -152.404419},
    "AZ": {"lat": 33.729759, "lng": -111.431221},
    "AR": {"lat": 34.969704, "lng": -92.373123},
    "CA": {"lat": 36.116203, "lng": -119.681564},
    "CO": {"lat": 39.059811, "lng": -105.311104},
    "CT": {"lat": 41.597782, "lng": -72.755371},
    "DE": {"lat": 39.318523, "lng": -75.507141},
    "FL": {"lat": 27.766279, "lng": -81.686783},
    "GA": {"lat": 33.040619, "lng": -83.643074},
    "HI": {"lat": 21.094318, "lng": -157.498337},
    "ID": {"lat": 44.240459, "lng": -114.478828},
    "IL": {"lat": 40.349457, "lng": -88.986137},
    "IN": {"lat": 39.849426, "lng": -86.258278},
    "IA": {"lat": 42.011539, "lng": -93.210526},
    "KS": {"lat": 38.526600, "lng": -96.726486},
    "KY": {"lat": 37.668140, "lng": -84.670067},
    "LA": {"lat": 31.169546, "lng": -91.867805},
    "ME": {"lat": 44.693947, "lng": -69.381927},
    "MD": {"lat": 39.063946, "lng": -76.802101},
    "MA": {"lat": 42.230171, "lng": -71.530106},
    "MI": {"lat": 43.326618, "lng": -84.536095},
    "MN": {"lat": 45.694454, "lng": -93.900192},
    "MS": {"lat": 32.741646, "lng": -89.678696},
    "MO": {"lat": 38.456085, "lng": -92.288368},
    "MT": {"lat": 46.921925, "lng": -110.454353},
    "NE": {"lat": 41.125370, "lng": -98.268082},
    "NV": {"lat": 38.313515, "lng": -117.055374},
    "NH": {"lat": 43.452492, "lng": -71.563896},
    "NJ": {"lat": 40.298904, "lng": -74.521011},
    "NM": {"lat": 34.840515, "lng": -106.248482},
    "NY": {"lat": 42.165726, "lng": -74.948051},
    "NC": {"lat": 35.630066, "lng": -79.806419},
    "ND": {"lat": 47.528912, "lng": -99.784012},
    "OH": {"lat": 40.388783, "lng": -82.764915},
    "OK": {"lat": 35.565342, "lng": -96.928917},
    "OR": {"lat": 44.572021, "lng": -122.070938},
    "PA": {"lat": 40.590752, "lng": -77.209755},
    "RI": {"lat": 41.680893, "lng": -71.511780},
    "SC": {"lat": 33.856892, "lng": -80.945007},
    "SD": {"lat": 44.299782, "lng": -99.438828},
    "TN": {"lat": 35.747845, "lng": -86.692345},
    "TX": {"lat": 31.054487, "lng": -97.563461},
    "UT": {"lat": 40.150032, "lng": -111.862434},
    "VT": {"lat": 44.045876, "lng": -72.710686},
    "VA": {"lat": 37.769337, "lng": -78.169968},
    "WA": {"lat": 47.400902, "lng": -121.490494},
    "WV": {"lat": 38.491226, "lng": -80.954456},
    "WI": {"lat": 44.268543, "lng": -89.616508},
    "WY": {"lat": 42.755966, "lng": -107.302490},
    "DC": {"lat": 38.897438, "lng": -77.026817},
    "PR": {"lat": 18.220833, "lng": -66.590149},
    "VI": {"lat": 18.335765, "lng": -64.896335},
    "GU": {"lat": 13.444304, "lng": 144.793731},
    "AS": {"lat": -14.270972, "lng": -170.132217},
    "MP": {"lat": 15.097900, "lng": 145.673900},
}

# ---------------------------------------------------------------------------
# Simple in-memory cache
# ---------------------------------------------------------------------------
_cache: dict[str, tuple[float, Any]] = {}


def _cache_get(key: str) -> Any | None:
    """Return cached value if it exists and hasn't expired, else None."""
    entry = _cache.get(key)
    if entry is None:
        return None
    ts, value = entry
    if time.time() - ts > CACHE_TTL_SECONDS:
        del _cache[key]
        return None
    return value


def _cache_set(key: str, value: Any) -> None:
    _cache[key] = (time.time(), value)


# ---------------------------------------------------------------------------
# HTTP client (reused across requests)
# ---------------------------------------------------------------------------
_client: httpx.AsyncClient | None = None


async def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(timeout=30.0)
    return _client


@app.on_event("shutdown")
async def _shutdown_client() -> None:
    global _client
    if _client and not _client.is_closed:
        await _client.aclose()


async def _post(path: str, payload: dict) -> dict:
    """POST to USAspending API and return parsed JSON."""
    client = await _get_client()
    url = f"{USA_SPENDING_BASE}{path}"
    resp = await client.post(url, json=payload)
    resp.raise_for_status()
    return resp.json()


async def _get(path: str, params: dict | None = None) -> Any:
    """GET from USAspending API and return parsed JSON."""
    client = await _get_client()
    url = f"{USA_SPENDING_BASE}{path}"
    resp = await client.get(url, params=params)
    resp.raise_for_status()
    return resp.json()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _resolve_award_type_codes(category: str | None) -> list[str]:
    """
    Resolve a category name to valid award_type_codes.
    The USAspending API requires all codes to belong to one group,
    so when no category is specified we default to "contracts".
    """
    if category and category in CATEGORY_MAP:
        return CATEGORY_MAP[category]
    return CATEGORY_MAP[DEFAULT_CATEGORY]


def _build_filters(
    agency: str | None = None,
    category: str | None = None,
    state: str | None = None,
) -> dict:
    """Build the USAspending ``filters`` object from our query params."""
    filters: dict[str, Any] = {
        "time_period": DEFAULT_TIME_PERIOD,
        "award_type_codes": _resolve_award_type_codes(category),
    }

    if agency:
        filters["agencies"] = [
            {"type": "awarding", "tier": "toptier", "name": agency}
        ]

    if state:
        filters["place_of_performance_locations"] = [
            {"country": "USA", "state": state}
        ]

    return filters


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/api/health")
def health_check():
    return {"status": "ok"}


# ── 1. Awards ──────────────────────────────────────────────────────────────

@app.get("/api/awards")
async def get_awards(
    agency: Optional[str] = Query(None, description="Awarding agency name"),
    category: Optional[str] = Query(
        None,
        description="Award category: contracts, grants, loans, idvs, other",
    ),
    state: Optional[str] = Query(None, description="Two-letter state code"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(25, ge=1, le=100, description="Results per page"),
):
    """Return paginated award results from USAspending."""
    cache_key = f"awards:{agency}:{category}:{state}:{page}:{limit}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    try:
        filters = _build_filters(agency=agency, category=category, state=state)
        payload = {
            "filters": filters,
            "fields": AWARD_FIELDS,
            "page": page,
            "limit": limit,
            "sort": "Award Amount",
            "order": "desc",
            "subawards": False,
        }
        raw = await _post("/search/spending_by_award/", payload)

        results = []
        for r in raw.get("results", []):
            results.append({
                "award_id": r.get("Award ID"),
                "internal_id": r.get("generated_internal_id"),
                "vendor": r.get("Recipient Name"),
                "amount": r.get("Award Amount"),
                "start_date": r.get("Start Date"),
                "end_date": r.get("End Date"),
                "agency": r.get("Awarding Agency"),
                "category": r.get("Award Type"),
                "description": r.get("Description"),
                "state": r.get("Place of Performance State Code"),
            })

        response = {
            "results": results,
            "page": page,
            "limit": limit,
            "has_next": raw.get("page_metadata", {}).get("hasNext", False),
            "total": raw.get("page_metadata", {}).get("total", 0),
        }
        _cache_set(cache_key, response)
        return response

    except Exception as exc:
        return {
            "results": [],
            "page": page,
            "limit": limit,
            "has_next": False,
            "total": 0,
            "error": str(exc),
        }


# ── 2. Vendors (Top 20) ───────────────────────────────────────────────────

@app.get("/api/vendors")
async def get_vendors(
    agency: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
):
    """
    Return the top 20 vendors by total award value.

    Fetches a large page of awards sorted by amount descending, then
    aggregates by recipient name in Python.
    """
    cache_key = f"vendors:{agency}:{category}:{state}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    try:
        filters = _build_filters(agency=agency, category=category, state=state)
        payload = {
            "filters": filters,
            "fields": ["Recipient Name", "Award Amount"],
            "page": 1,
            "limit": 100,
            "sort": "Award Amount",
            "order": "desc",
            "subawards": False,
        }
        raw = await _post("/search/spending_by_award/", payload)

        vendor_totals: dict[str, float] = {}
        vendor_counts: dict[str, int] = {}
        for r in raw.get("results", []):
            name = r.get("Recipient Name") or "Unknown"
            amount = r.get("Award Amount") or 0
            vendor_totals[name] = vendor_totals.get(name, 0) + amount
            vendor_counts[name] = vendor_counts.get(name, 0) + 1

        sorted_vendors = sorted(
            vendor_totals.items(), key=lambda x: x[1], reverse=True
        )[:20]
        results = [
            {
                "vendor": name,
                "total_amount": total,
                "award_count": vendor_counts[name],
            }
            for name, total in sorted_vendors
        ]

        response = {"results": results}
        _cache_set(cache_key, response)
        return response

    except Exception as exc:
        return {"results": [], "error": str(exc)}


# ── 3. States (geographic aggregation) ─────────────────────────────────────

@app.get("/api/states")
async def get_states(
    agency: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
):
    """
    Return award totals aggregated by state, including lat/lng centroids
    for map display.
    """
    cache_key = f"states:{agency}:{category}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    try:
        filters = _build_filters(agency=agency, category=category)
        payload = {
            "scope": "place_of_performance",
            "geo_layer": "state",
            "filters": filters,
            "subawards": False,
        }
        raw = await _post("/search/spending_by_geography/", payload)

        results = []
        for r in raw.get("results", []):
            code = r.get("shape_code", "")
            centroid = STATE_CENTROIDS.get(code, {})
            results.append({
                "state_code": code,
                "state_name": r.get("display_name", ""),
                "amount": r.get("aggregated_amount", 0),
                "population": r.get("population", 0),
                "per_capita": r.get("per_capita", 0),
                "lat": centroid.get("lat"),
                "lng": centroid.get("lng"),
            })

        response = {"results": results}
        _cache_set(cache_key, response)
        return response

    except Exception as exc:
        return {"results": [], "error": str(exc)}


# ── 4. Agencies (for filter dropdown) ──────────────────────────────────────

@app.get("/api/agencies")
async def get_agencies():
    """Return list of toptier agencies for use in filter dropdowns."""
    cache_key = "agencies"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    try:
        raw = await _get("/references/toptier_agencies/")

        results = []
        for a in raw.get("results", []):
            results.append({
                "id": a.get("agency_id"),
                "code": a.get("toptier_code"),
                "name": a.get("agency_name"),
                "abbreviation": a.get("abbreviation"),
                "budget": a.get("congressional_justification_url"),
                "active_fy": a.get("active_fy"),
                "active_fq": a.get("active_fq"),
            })

        # Sort alphabetically by name
        results.sort(key=lambda x: (x.get("name") or "").lower())

        response = {"results": results}
        _cache_set(cache_key, response)
        return response

    except Exception as exc:
        return {"results": [], "error": str(exc)}


# ── 5. CSV Export ──────────────────────────────────────────────────────────

@app.get("/api/awards/csv")
async def get_awards_csv(
    agency: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
):
    """
    Download the full award results as a CSV file.
    Fetches multiple pages to get a comprehensive export (up to 500 rows).
    """
    cache_key = f"csv:{agency}:{category}:{state}"
    cached = _cache_get(cache_key)
    if cached is not None:
        csv_content = cached
    else:
        try:
            filters = _build_filters(agency=agency, category=category, state=state)
            all_results: list[dict] = []
            page = 1
            max_pages = 5  # 5 pages × 100 = 500 max rows

            while page <= max_pages:
                payload = {
                    "filters": filters,
                    "fields": AWARD_FIELDS,
                    "page": page,
                    "limit": 100,
                    "sort": "Award Amount",
                    "order": "desc",
                    "subawards": False,
                }
                raw = await _post("/search/spending_by_award/", payload)
                results = raw.get("results", [])
                if not results:
                    break
                all_results.extend(results)
                if not raw.get("page_metadata", {}).get("hasNext", False):
                    break
                page += 1

            # Build CSV content
            output = io.StringIO()
            csv_columns = [
                "Award ID", "Recipient Name", "Award Amount",
                "Start Date", "End Date", "Awarding Agency",
                "Award Type", "Description",
                "Place of Performance State Code",
            ]
            writer = csv.DictWriter(
                output, fieldnames=csv_columns, extrasaction="ignore"
            )
            writer.writeheader()
            for row in all_results:
                writer.writerow(row)

            csv_content = output.getvalue()
            _cache_set(cache_key, csv_content)

        except Exception:
            # Return an empty CSV on error
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(["Error", "No data available"])
            csv_content = output.getvalue()

    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=procurement_awards.csv"
        },
    )
