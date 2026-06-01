"use test";
"use client";

import React, { useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import FilterBar from "@/components/FilterBar";
import MapStage from "@/components/MapStage";
import Charts from "@/components/Charts";
import Sidebar from "@/components/Sidebar";

interface Agency {
  id: number;
  code: string | null;
  name: string;
  abbreviation: string | null;
}

interface StateData {
  state_code: string;
  state_name: string;
  amount: number;
  population: number;
  per_capita: number;
  lat: number | null;
  lng: number | null;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function Home() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  
  // Active Filter states
  const [selectedAgency, setSelectedAgency] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedState, setSelectedState] = useState<string>("");

  // Map click drilldown state
  const [selectedStateData, setSelectedStateData] = useState<StateData | null>(null);

  // Toggle to collapse/expand bottom charts stage
  const [showCharts, setShowCharts] = useState(true);

  // Fetch agencies on mount
  useEffect(() => {
    const controller = new AbortController();

    const fetchAgencies = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/agencies`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Failed to fetch agencies");
        const data = await res.json();
        setAgencies(data.results || []);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Error fetching agencies:", err);
        }
      }
    };

    fetchAgencies();

    return () => {
      controller.abort();
    };
  }, []);

  const handleClearFilters = () => {
    setSelectedAgency("");
    setSelectedCategory("");
    setSelectedState("");
    setSelectedStateData(null);
  };

  const handleStateClick = (stateData: StateData) => {
    setSelectedStateData(stateData);
    setSelectedState(stateData.state_code);
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-bg text-text-primary">
      {/* Top Header */}
      <Topbar />

      {/* Filter Row */}
      <FilterBar
        agencies={agencies}
        selectedAgency={selectedAgency}
        selectedCategory={selectedCategory}
        selectedState={selectedState}
        onAgencyChange={setSelectedAgency}
        onCategoryChange={setSelectedCategory}
        onStateChange={setSelectedState}
        onClearFilters={handleClearFilters}
      />

      {/* Main Split Layout */}
      <div className="grid grid-cols-[70%_30%] w-full h-[calc(100vh-96px)] overflow-hidden">
        {/* Left Side: Map + Charts (70%) */}
        <div className="flex flex-col h-full w-full border-r border-border overflow-hidden relative">
          {/* Map Section (70% split or 100% full height) */}
          <div
            className={`w-full border-b border-border relative transition-all duration-300 ${
              showCharts ? "h-[70%]" : "h-[100%] border-b-0"
            }`}
          >
            <MapStage
              agency={selectedAgency}
              category={selectedCategory}
              onStateClick={handleStateClick}
            />

            {/* Toggle Button in bottom-right corner of Map to expand/collapse charts */}
            <button
              onClick={() => setShowCharts(!showCharts)}
              className="absolute bottom-3 right-3 flex items-center space-x-1.5 border border-border bg-surface px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-text-muted hover:text-text-primary hover:border-cyan-custom transition-all z-40 cursor-pointer"
            >
              <span>{showCharts ? "Expand Map (Hide Charts)" : "Split View (Show Charts)"}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transform transition-transform ${showCharts ? "" : "rotate-180"}`}
              >
                <polyline points="18 15 12 9 6 15" />
              </svg>
            </button>
          </div>

          {/* Charts Section (30% split height) */}
          {showCharts && (
            <div className="w-full h-[30%] bg-surface/30">
              <Charts
                agency={selectedAgency}
                category={selectedCategory}
                state={selectedState}
              />
            </div>
          )}
        </div>

        {/* Right Side: Sidebar Insights (30%) */}
        <div className="w-full h-full overflow-hidden">
          <Sidebar
            agency={selectedAgency}
            category={selectedCategory}
            state={selectedState}
            selectedStateData={selectedStateData}
            onCloseStateDetail={() => setSelectedStateData(null)}
          />
        </div>
      </div>
    </div>
  );
}
