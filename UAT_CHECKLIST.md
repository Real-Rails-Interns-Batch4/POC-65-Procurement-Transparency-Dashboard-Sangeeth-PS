# User Acceptance Testing (UAT) Checklist

This **UAT Checklist** documents all verified user flows, interface interactions, and fallback behaviors for the **Procurement Transparency Dashboard**, confirming complete correctness for final submission.

---

## 📋 1. Core Verification Matrix

| Use Case | Test Steps | Expected Result | Status |
| :--- | :--- | :--- | :---: |
| **Initial Loading** | Launch backend on port `8000`, frontend on port `3000`. | Dashboard renders immediately with a fixed 70/30 split layout. US Map centers correctly. Global Obligation values load. | **PASS** |
| **Dynamic Selects** | Select an awarding agency (e.g., *Dept. of Defense*) in the Filter Bar. | Dropdown displays selected outline glowing. Map state points and sidebar Obligation values update immediately with no page refresh. | **PASS** |
| **Active Reset** | Select multiple filters, then click the `Clear Filters` button. | All dropdown options are restored to defaults. Active obligation totals reset to global aggregates. Map centroids refresh immediately. | **PASS** |
| **Geographic Hover** | Hover the cursor over a state point centroid on the Map Stage. | Custom tooltip displays state name,obligation value, and per-capita data with no coordinate flickering or loop triggers. | **PASS** |
| **Map Drilldown** | Click on a state circle point (e.g., *Texas*). | Sidebar opens the **Selected Jurisdiction** panel immediately, displaying state-specific metrics and listing top 5 contract awards. | **PASS** |
| **Drilldown Close** | Click the close button (X) in the Selected Jurisdiction panel. | Selected Jurisdiction panel dismisses cleanly. Sidebar returns to global summary state immediately. Map selection is cleared. | **PASS** |
| **TanStack Highlighting** | View the **Who Controls the Rail** table in the sidebar. | List displays top 10 vendor obligations. The lead vendor is styled with a distinct background fill and cyan indicator border. | **PASS** |
| **CSV Download** | Click the `Download Sample Data` button at the bottom of the sidebar. | Browser downloads a formatted `.csv` spreadsheet matching all currently selected filter values. | **PASS** |
| **System Info Modal** | Click the info icon in the Topbar. | Centered modal panel opens cleanly, listing Sangeeth PS as Architect, Real Rails Batch 4, and the technology stack. | **PASS** |
| **Visual Obligations Modal** | Click the 'Show Charts' button in the bottom-right corner of the Map Stage. | Centered modal panel opens cleanly with a backdrop blur overlay. Obligations by Category and Top Vendor Allocations load live aggregated obligations and render in vertical horizontal ECharts bars. | **PASS** |

---

## 🛠️ 2. Automated & Responsive Layout Verification

* **Desktop Layout**: Verified. Follows the strict 70/30 split layout grid, preventing scroll overflows or element clipping.
* **Tablet Layout**: Verified. Columns automatically stack cleanly in single column layouts under 768px viewports while keeping Map stage aspect ratio correct.
* **Mobile Layout**: Verified. Compact margins and compact text headers guarantee zero horizontal scrolling. Custom scrollbars scroll cleanly on mobile touch viewports.
* **Console Warnings**: Verified. Tested inside Chrome DevTools; all calls return standard HTTP 200 with zero console logs, errors, or failed endpoints.

---

## 🛡️ 3. Simulated Fallback Test Script

To verify resilience against rate limits or server outages, we simulated API failure:

1. **Test Procedure**: Simulated a `503 Service Unavailable` on the USAspending proxy backend thread.
2. **System Behavior**: Backend endpoints caught the connection timeout within `httpx.AsyncClient` inside standard try-catch fallback limits.
3. **Frontend Integration**: UI rendered default values (e.g., $0 Obligation metrics and "No state awards found" guides) cleanly without locking or freezing the client UI.
4. **Conclusion**: Graceful fallbacks prevent blank pages, unhandled promise rejections, or script crashes.
