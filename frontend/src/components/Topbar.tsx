"use test";
"use client";

import React, { useState } from "react";

export default function Topbar() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <header className="flex h-12 w-full items-center justify-between border-b border-border bg-surface px-4 z-40">
        {/* Left Section */}
        <div className="flex items-center space-x-2">
          <div className="h-3 w-3 bg-cyan-custom rounded-sm" />
          <span className="text-[13px] font-medium tracking-wide text-text-primary">
            Procurement Intelligence
          </span>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
              Live
            </span>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-bg text-text-muted transition-colors hover:border-cyan-custom hover:text-cyan-custom"
            aria-label="Information"
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
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
          </button>
        </div>
      </header>

      {/* Info Modal Overlay */}
      {isModalOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 transition-opacity"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-sm border border-border bg-surface p-5 text-left rounded-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                System Info
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-text-muted transition-colors hover:text-text-primary"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
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
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between border-b border-border/30 pb-2">
                <span className="text-text-muted">Architect</span>
                <span className="font-medium text-text-primary">Sangeeth PS</span>
              </div>
              <div className="flex justify-between border-b border-border/30 pb-2">
                <span className="text-text-muted">Batch</span>
                <span className="font-medium text-text-primary">Real Rails Batch 4</span>
              </div>
              <div className="flex flex-col space-y-1">
                <span className="text-text-muted">Stack</span>
                <span className="font-medium text-cyan-custom leading-relaxed">
                  Next.js &middot; FastAPI &middot; MapLibre &middot; TanStack Table
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
