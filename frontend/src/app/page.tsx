"use client";

import React, { useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import FilterBar from "@/components/FilterBar";
import MapStage from "@/components/MapStage";
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

      {/* Main Layout Container - NO LAYOUT SHIFT */}
      <div className="flex flex-col flex-1 w-full h-[calc(100vh-96px)] overflow-hidden relative">
        
        {/* Fixed Split Layout: Map (70%) & Sidebar (30%) - ALWAYS SAME HEIGHT */}
        <div className="grid grid-cols-[70%_30%] w-full h-full">
          {/* Map Stage (70% width) */}
          <div className="w-full h-full border-r border-border relative overflow-hidden bg-bg">
            <MapStage
              agency={selectedAgency}
              category={selectedCategory}
              onStateClick={handleStateClick}
            />
          </div>

          {/* Sidebar Section (30% width) - Fixed/Always Visible */}
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
    </div>
  );
}
