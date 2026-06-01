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
      <div className="flex flex-1 w-full h-[calc(100vh-96px)] overflow-hidden">
        {/* Left Side: Map + Charts (70%) */}
        <div className="flex flex-col h-full w-[70%] border-r border-border">
          {/* Map Section (60%) */}
          <div className="w-full h-[60%] border-b border-border relative">
            <MapStage
              agency={selectedAgency}
              category={selectedCategory}
              onStateClick={handleStateClick}
            />
          </div>

          {/* Charts Section (40%) */}
          <div className="w-full h-[40%] bg-surface/30">
            <Charts
              agency={selectedAgency}
              category={selectedCategory}
              state={selectedState}
            />
          </div>
        </div>

        {/* Right Side: Sidebar Insights (30%) */}
        <div className="w-[30%] h-full">
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
