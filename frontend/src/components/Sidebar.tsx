"use test";
"use client";

import React, { useEffect, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";

interface StateData {
  state_code: string;
  state_name: string;
  amount: number;
  population: number;
  per_capita: number;
  lat: number | null;
  lng: number | null;
}

interface VendorData {
  vendor: string;
  total_amount: number;
  award_count: number;
}

interface StateAward {
  award_id: string;
  vendor: string;
  amount: number;
  agency: string;
}

interface SidebarProps {
  agency: string;
  category: string;
  state: string;
  selectedStateData: StateData | null;
  onCloseStateDetail: () => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

const formatterCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
});

const formatterFull = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default function Sidebar({
  agency,
  category,
  state,
  selectedStateData,
  onCloseStateDetail,
}: SidebarProps) {
  // Aggregate states total metric
  const [totalObligation, setTotalObligation] = useState<number>(0);
  const [statesCount, setStatesCount] = useState<number>(0);
  const [isStatesLoading, setIsStatesLoading] = useState(false);

  // Vendor table data
  const [vendors, setVendors] = useState<VendorData[]>([]);
  const [isVendorsLoading, setIsVendorsLoading] = useState(false);

  // State Detail Awards
  const [stateAwards, setStateAwards] = useState<StateAward[]>([]);
  const [isAwardsLoading, setIsAwardsLoading] = useState(false);

  // Fetch /api/states to aggregate total metric
  useEffect(() => {
    const controller = new AbortController();
    setIsStatesLoading(true);

    const fetchStates = async () => {
      try {
        const queryParams = new URLSearchParams();
        if (agency) queryParams.append("agency", agency);
        if (category) queryParams.append("category", category);

        const res = await fetch(
          `${API_BASE_URL}/api/states?${queryParams.toString()}`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error("Failed to load states for sidebar");
        const data = await res.json();
        
        const list: StateData[] = data.results || [];
        const sum = list.reduce((acc, curr) => acc + curr.amount, 0);
        setTotalObligation(sum);
        setStatesCount(list.filter((s) => s.amount > 0).length);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error(err);
          setTotalObligation(0);
          setStatesCount(0);
        }
      } finally {
        setIsStatesLoading(false);
      }
    };

    fetchStates();

    return () => {
      controller.abort();
    };
  }, [agency, category]);

  // Fetch /api/vendors for the Top 10 Table
  useEffect(() => {
    const controller = new AbortController();
    setIsVendorsLoading(true);

    const fetchVendors = async () => {
      try {
        const queryParams = new URLSearchParams();
        if (agency) queryParams.append("agency", agency);
        if (category) queryParams.append("category", category);
        if (state) queryParams.append("state", state);

        const res = await fetch(
          `${API_BASE_URL}/api/vendors?${queryParams.toString()}`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error("Failed to load vendors");
        const data = await res.json();
        setVendors((data.results || []).slice(0, 10));
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error(err);
          setVendors([]);
        }
      } finally {
        setIsVendorsLoading(false);
      }
    };

    fetchVendors();

    return () => {
      controller.abort();
    };
  }, [agency, category, state]);

  // Fetch /api/awards for Selected State Detail
  useEffect(() => {
    if (!selectedStateData) return;

    const controller = new AbortController();
    setIsAwardsLoading(true);

    const fetchStateAwards = async () => {
      try {
        const queryParams = new URLSearchParams();
        queryParams.append("state", selectedStateData.state_code);
        if (agency) queryParams.append("agency", agency);
        if (category) queryParams.append("category", category);
        queryParams.append("limit", "5");

        const res = await fetch(
          `${API_BASE_URL}/api/awards?${queryParams.toString()}`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error("Failed to load state awards");
        const data = await res.json();
        setStateAwards(data.results || []);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error(err);
          setStateAwards([]);
        }
      } finally {
        setIsAwardsLoading(false);
      }
    };

    fetchStateAwards();

    return () => {
      controller.abort();
    };
  }, [selectedStateData, agency, category]);

  // Setup TanStack Table
  const columnHelper = createColumnHelper<VendorData>();
  const columns = [
    columnHelper.accessor("vendor", {
      header: () => <span className="text-left select-none">Vendor</span>,
      cell: (info) => {
        const val = info.getValue();
        return (
          <span className="block truncate text-text-primary max-w-40 font-medium">
            {val}
          </span>
        );
      },
    }),
    columnHelper.accessor("total_amount", {
      header: () => <span className="text-right select-none">Obligation</span>,
      cell: (info) => (
        <span className="text-right block font-mono text-cyan-custom font-semibold">
          {formatterCompact.format(info.getValue())}
        </span>
      ),
    }),
    columnHelper.accessor("award_count", {
      header: () => <span className="text-right select-none">Count</span>,
      cell: (info) => (
        <span className="text-right block font-mono text-text-primary">
          {info.getValue()}
        </span>
      ),
    }),
  ];

  const table = useReactTable({
    data: vendors,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // Build Download Link URL
  const downloadUrl = () => {
    const params = new URLSearchParams();
    if (agency) params.append("agency", agency);
    if (category) params.append("category", category);
    if (state) params.append("state", state);
    return `${API_BASE_URL}/api/awards/csv?${params.toString()}`;
  };

  return (
    <aside className="w-full h-full border-l border-border bg-surface flex flex-col justify-between overflow-hidden">
      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Section A — Header metric */}
        <div className="border border-border bg-bg/50 p-4 rounded-md">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-1.5">
            Total Federal Awards
          </div>
          {isStatesLoading ? (
            <div className="h-7 w-48 bg-surface rounded animate-pulse" />
          ) : (
            <div className="text-xl font-bold text-text-primary font-mono tracking-tight">
              {formatterFull.format(totalObligation)}
            </div>
          )}
          <div className="text-[10px] text-text-muted mt-1">
            Aggregated across <span className="font-semibold text-text-primary">{statesCount}</span> jurisdictions
          </div>
        </div>

        {/* Section B — Why This Matters */}
        <div className="space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted border-b border-border/50 pb-1">
            Why This Matters
          </div>
          <p className="text-[11px] leading-relaxed text-text-muted">
            Public procurement is the largest capital-allocation rail most citizens never see. Federal contracts
            shape which industries grow, which regions receive investment, and which vendors gain structural advantage.
            This dashboard makes the rail visible.
          </p>
        </div>

        {/* Section D — Selected State Detail (Conditional) */}
        {selectedStateData && (
          <div className="border border-cyan-custom/30 bg-cyan-custom/5 p-3.5 rounded-md space-y-3 relative">
            {/* Close button */}
            <button
              onClick={onCloseStateDetail}
              className="absolute top-2.5 right-2.5 text-text-muted hover:text-text-primary"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <div>
              <div className="text-[9px] uppercase font-bold tracking-wider text-cyan-custom">
                Selected Jurisdiction
              </div>
              <div className="text-sm font-bold text-text-primary mt-0.5">
                {selectedStateData.state_name} ({selectedStateData.state_code})
              </div>
            </div>

            <div className="flex justify-between border-t border-border/30 pt-2">
              <span className="text-[10px] text-text-muted">Total Obligations</span>
              <span className="text-[11px] font-bold text-text-primary font-mono">
                {formatterFull.format(selectedStateData.amount)}
              </span>
            </div>

            <div className="space-y-1.5 border-t border-border/30 pt-2">
              <div className="text-[9px] uppercase font-bold tracking-wider text-text-muted">
                Top State Awards
              </div>
              {isAwardsLoading ? (
                <div className="space-y-1 animate-pulse">
                  <div className="h-3 w-full bg-border rounded" />
                  <div className="h-3 w-4/5 bg-border rounded" />
                </div>
              ) : stateAwards.length === 0 ? (
                <div className="text-[10px] text-text-muted italic">No state awards found</div>
              ) : (
                <div className="space-y-1.5">
                  {stateAwards.map((aw) => (
                    <div key={aw.award_id} className="flex flex-col text-[10px] bg-bg/50 p-1.5 rounded border border-border/40">
                      <div className="flex justify-between font-medium">
                        <span className="text-text-primary truncate max-w-36">{aw.vendor}</span>
                        <span className="text-cyan-custom font-mono">{formatterCompact.format(aw.amount)}</span>
                      </div>
                      <span className="text-[9px] text-text-muted truncate mt-0.5">{aw.agency}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section C — Who Controls the Rail */}
        <div className="space-y-2.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted border-b border-border/50 pb-1">
            Who Controls the Rail
          </div>
          {isVendorsLoading ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-6 w-full bg-bg/50 rounded" />
              <div className="h-6 w-full bg-bg/50 rounded" />
              <div className="h-6 w-full bg-bg/50 rounded" />
            </div>
          ) : vendors.length === 0 ? (
            <div className="text-[11px] text-text-muted italic text-center py-4 bg-bg/20 rounded border border-border">
              No allocation data available
            </div>
          ) : (
            <div className="overflow-hidden border border-border rounded-md">
              <table className="w-full border-collapse text-[10px]">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id} className="border-b border-border bg-bg/40 text-text-muted">
                      {headerGroup.headers.map((header) => (
                        <th key={header.id} className="p-2 font-medium text-left">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row, idx) => (
                    <tr
                      key={row.id}
                      className={`border-b border-border last:border-0 hover:bg-bg/25 transition-colors ${
                        idx === 0 ? "bg-cyan-custom/5 border-l border-l-cyan-custom" : ""
                      }`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="p-2">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Section E — Download Button (Sticky at bottom) */}
      <div className="p-4 border-t border-border bg-surface">
        <a
          href={downloadUrl()}
          download
          className="flex h-10 w-full items-center justify-center rounded border border-border bg-bg text-[11px] font-bold uppercase tracking-wider text-text-primary transition-colors hover:border-cyan-custom hover:bg-cyan-custom/5 hover:text-cyan-custom"
        >
          Download Sample Data
        </a>
      </div>
    </aside>
  );
}
