"use test";
"use client";

import React from "react";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

const CATEGORIES = ["contracts", "grants", "loans", "idvs", "other"];

interface AgencyOption {
  id: number;
  code: string | null;
  name: string;
  abbreviation: string | null;
}

interface FilterBarProps {
  agencies: AgencyOption[];
  selectedAgency: string;
  selectedCategory: string;
  selectedState: string;
  onAgencyChange: (val: string) => void;
  onCategoryChange: (val: string) => void;
  onStateChange: (val: string) => void;
  onClearFilters: () => void;
}

export default function FilterBar({
  agencies,
  selectedAgency,
  selectedCategory,
  selectedState,
  onAgencyChange,
  onCategoryChange,
  onStateChange,
  onClearFilters,
}: FilterBarProps) {
  return (
    <div className="flex h-12 w-full items-center border-b border-border bg-surface px-4 space-x-3 z-30">
      {/* Agency Dropdown */}
      <div className="flex flex-col">
        <select
          value={selectedAgency}
          onChange={(e) => onAgencyChange(e.target.value)}
          className={`h-8 w-60 rounded bg-bg px-2.5 text-xs text-text-primary border outline-none transition-colors ${
            selectedAgency
              ? "border-cyan-custom font-medium"
              : "border-border hover:border-text-muted text-text-muted"
          }`}
        >
          <option value="">Select Agency</option>
          {agencies.map((agency) => (
            <option key={agency.id} value={agency.name}>
              {agency.name}
            </option>
          ))}
        </select>
      </div>

      {/* Category Dropdown */}
      <div className="flex flex-col">
        <select
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          className={`h-8 w-44 rounded bg-bg px-2.5 text-xs text-text-primary border outline-none transition-colors capitalize ${
            selectedCategory
              ? "border-cyan-custom font-medium"
              : "border-border hover:border-text-muted text-text-muted"
          }`}
        >
          <option value="">Select Category</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* State Dropdown */}
      <div className="flex flex-col">
        <select
          value={selectedState}
          onChange={(e) => onStateChange(e.target.value)}
          className={`h-8 w-36 rounded bg-bg px-2.5 text-xs text-text-primary border outline-none transition-colors ${
            selectedState
              ? "border-cyan-custom font-medium"
              : "border-border hover:border-text-muted text-text-muted"
          }`}
        >
          <option value="">Select State</option>
          {US_STATES.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
      </div>

      {/* Clear Button */}
      {(selectedAgency || selectedCategory || selectedState) && (
        <button
          onClick={onClearFilters}
          className="flex h-8 items-center justify-center rounded border border-border bg-bg px-3 text-xs font-medium text-text-muted transition-colors hover:border-cyan-custom hover:text-cyan-custom"
        >
          Reset Filters
        </button>
      )}
    </div>
  );
}
