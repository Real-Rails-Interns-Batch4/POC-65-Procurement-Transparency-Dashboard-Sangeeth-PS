# Visual & Architecture Review (VAR) Report

This **Visual & Architecture Review (VAR) Report** certifies that the **Procurement Transparency Dashboard** conforms with all strict engineering designs, visual DNA parameters, and API integration specifications of the **Real Rails** dashboard system.

---

## 🎨 1. Visual DNA & Color Mapping

All interface components strictly map to the required HSL/RGB parameters, enforcing a cohesive dark layout across all viewports. Custom UI elements are styled manually without using heavy external styling libraries or default widgets.

| Visual Property | Target Parameter | Implementation Detail |
| :--- | :---: | :--- |
| **Canvas Background** | `#030712` | Declared globally via `--bg` variable in `:root` and bound to the root HTML body element. |
| **Panel Surface / Card** | `#0B1117` | Card components, sidebar containers, headers, and modal overlays utilize `--surface` background fills. |
| **Primary Accent** | `#38BDF8` | Cyan-custom accents highlight selected filtering options, active map coordinate points, and key metrics. |
| **Secondary Accent** | `#818CF8` | Indigo-custom accents represent base states, default marker outlines, and standard icons. |
| **Component Borders** | `#1F2937` | Declared as `--border` token across all layouts, menus, sidebars, and rows. |
| **Typography Hierarchy** | Inter / Geist | Mapped to Geist Sans variables with fallback system sans-serif font weights to ensure optimal legibility. |
| **Borders & Radii** | Max `6px` | Bound globally through Tailwind's `rounded-md` class. Absolute shadow offsets provide depth without borders. |
| **Interactions / Glow** | Cyan outline | Filter components apply solid borders and subtle glow highlights to active values. |

---

## 📐 2. Viewport Layout & Core Structure

The workspace follows a strict vertical layout divided by two standard sub-headers:

```
+-----------------------------------------------------------------------------------+
| Topbar.tsx (Height: 48px, Border Bottom, Branding, Pulse Indicators, System Info)  |
+-----------------------------------------------------------------------------------+
| FilterBar.tsx (Height: 48px, Dropdowns, Selection Glow outlines, Reset Action)    |
+-----------------------------------------------------------------------------------+
| Main Container (h-[calc(100vh-96px)], Overflow Hidden)                           |
|                                                                                   |
|  +-------------------------------------------------+---------------------------+  |
|  | MapStage.tsx (70% Width)                         | Sidebar.tsx (30% Width)   |  |
|  | MapLibre GL Dark Matter vector tiles             | Aggregated Metrics Panel  |  |
|  | Point coordinate scaled markers                  | Why This Matters Panel    |  |
|  | Flicker-Free absolute Tooltip (+12px, -40px)     | TanStack Table rankings   |  |
|  |                                                  | State drilldowns / CSV    |  |
|  +-------------------------------------------------+---------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 🗺️ 3. Geographic Visual Canvas (`MapStage.tsx`)

* **Projection Engine**: Projects geographic circle vectors on coordinate centroids dynamically using standard GeoJSON collections, bypassing browser DOM hit-testing bottleneck limits.
* **Obligation Scalability**: Centroid circles scale in radius dynamically from `6px` (min) to `24px` (max) using linear allocation ratios relative to obligation amounts. Color ranges interpolate gracefully between `#818CF8` and `#38BDF8`.
* **Flicker-Free Tooltips**: Attaches listeners directly to MapLibre's canvas layer, projecting custom HTML React tooltips offset by `+12px` right and `-40px` up relative to the mouse. This prevents cursor collisions and infinite hover loops.

---

## 💻 4. Microservice API Architecture (`backend/main.py`)

* **Client Pooling**: Re-uses a single async `httpx.AsyncClient` instance for connection pooling across all request threads, preventing socket exhaustion.
* **1-Hour In-Memory Caching**: Implements an optimized caching layer that holds fetched payloads for exactly 3600 seconds, bypassing upstream USAspending rate-limit throttling.
* **Drilldown Data Orchestration**:
  * `/api/agencies`: Retreives toptier federal agencies, pre-sorted alphabetically.
  * `/api/states`: Aggregates places of performance location totals, populations, and per-capita indicators.
  * `/api/vendors`: Summarizes contract amounts and award counts for the top 20 vendors.
  * `/api/awards`: Delivers paginated individual awards sorted descending by obligation totals.
  * `/api/awards/csv`: Direct streaming download handler outputting dynamic CSV spreadsheets.
