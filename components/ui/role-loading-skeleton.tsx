"use client";

import React from "react";
import { cn } from "@/lib/utils";

/**
 * DashboardSkeleton:
 * Sits in place of role-specific dashboards while user authentication and role verification are resolving.
 * Completely neutral, prevents flashing of AdminDashboardView or other unauthorized content.
 */
export function DashboardSkeleton() {
  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1600px] mx-auto w-full space-y-6 animate-pulse select-none">
      {/* 1. Header Greeting Skeleton */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-gray-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="h-5 w-24 bg-gray-200 rounded-full" />
            <div className="h-5 w-32 bg-purple-100 rounded-full" />
          </div>
          <div className="h-8 w-64 sm:w-80 bg-gray-200 rounded-xl" />
          <div className="h-4 w-48 sm:w-60 bg-gray-100 rounded-md" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-11 w-32 bg-gray-100 rounded-xl" />
          <div className="h-11 w-11 bg-gray-100 rounded-xl" />
        </div>
      </div>

      {/* 2. KPI Metrics Grid Skeleton (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((idx) => (
          <div
            key={idx}
            className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between"
          >
            <div className="space-y-2">
              <div className="h-3 w-20 bg-gray-200 rounded" />
              <div className="h-7 w-28 bg-gray-200 rounded-lg" />
              <div className="h-2.5 w-16 bg-gray-100 rounded" />
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center shrink-0">
              <div className="w-6 h-6 bg-purple-200/60 rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      {/* 3. Main Content Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="h-5 w-40 bg-gray-200 rounded-lg" />
              <div className="h-4 w-20 bg-gray-100 rounded" />
            </div>
            <div className="space-y-3 pt-1">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-gray-200" />
                    <div className="space-y-1.5">
                      <div className="h-4 w-36 bg-gray-200 rounded" />
                      <div className="h-3 w-24 bg-gray-100 rounded" />
                    </div>
                  </div>
                  <div className="h-6 w-16 bg-gray-200 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (1 col) */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-4">
            <div className="h-5 w-32 bg-gray-200 rounded-lg" />
            <div className="space-y-3">
              {[1, 2, 3].map((notif) => (
                <div key={notif} className="p-3.5 rounded-2xl bg-gray-50/80 border border-gray-100 space-y-2">
                  <div className="h-3 w-20 bg-purple-200/70 rounded" />
                  <div className="h-4 w-full bg-gray-200 rounded" />
                  <div className="h-3 w-28 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * SidebarSkeleton:
 * Shown in the navigation sidebar while user permissions and role are being resolved.
 * Neutral placeholder rows prevent unauthorized admin menus from momentarily flashing.
 */
export function SidebarSkeleton({ isCollapsed }: { isCollapsed?: boolean }) {
  return (
    <div className={cn("p-4 space-y-6 animate-pulse select-none flex flex-col h-full", isCollapsed && "items-center")}>
      {/* Category 1 */}
      <div className="space-y-2 w-full">
        {!isCollapsed && <div className="h-3 w-20 bg-gray-200 rounded px-2 mb-3" />}
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              "h-10 rounded-xl bg-gray-100/90 flex items-center gap-3",
              isCollapsed ? "w-10 justify-center px-0" : "w-full px-3"
            )}
          >
            <div className="w-5 h-5 bg-gray-200 rounded-lg shrink-0" />
            {!isCollapsed && <div className="h-3.5 w-28 bg-gray-200 rounded" />}
          </div>
        ))}
      </div>

      {/* Category 2 */}
      <div className="space-y-2 w-full pt-2">
        {!isCollapsed && <div className="h-3 w-24 bg-gray-200 rounded px-2 mb-3" />}
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "h-10 rounded-xl bg-gray-100/70 flex items-center gap-3",
              isCollapsed ? "w-10 justify-center px-0" : "w-full px-3"
            )}
          >
            <div className="w-5 h-5 bg-gray-200 rounded-lg shrink-0" />
            {!isCollapsed && <div className="h-3.5 w-32 bg-gray-200 rounded" />}
          </div>
        ))}
      </div>

      {/* Bottom User Area */}
      <div className="mt-auto pt-4 border-t border-gray-100 w-full">
        <div
          className={cn(
            "flex items-center gap-3 p-2 rounded-xl bg-gray-50",
            isCollapsed && "justify-center p-1.5"
          )}
        >
          <div className="w-9 h-9 rounded-xl bg-gray-200 shrink-0" />
          {!isCollapsed && (
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="h-3.5 w-24 bg-gray-200 rounded" />
              <div className="h-2.5 w-16 bg-gray-100 rounded" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * PageContentSkeleton:
 * High-quality general content skeleton for internal data pages (table, search bar, controls).
 */
export function PageContentSkeleton() {
  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1600px] mx-auto w-full space-y-6 animate-pulse select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-48 sm:w-64 bg-gray-200 rounded-xl" />
          <div className="h-4 w-72 sm:w-96 bg-gray-100 rounded" />
        </div>
        <div className="h-10 w-36 bg-gray-200 rounded-xl" />
      </div>

      {/* Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="h-10 flex-1 max-w-md bg-gray-100 rounded-xl" />
        <div className="flex items-center gap-2">
          <div className="h-10 w-28 bg-gray-100 rounded-xl" />
          <div className="h-10 w-28 bg-gray-100 rounded-xl" />
        </div>
      </div>

      {/* Table Mock Rows */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="h-12 bg-gray-50 border-b border-gray-100 flex items-center px-6 gap-4">
          <div className="h-3 w-28 bg-gray-200 rounded" />
          <div className="h-3 w-24 bg-gray-200 rounded" />
          <div className="h-3 w-36 bg-gray-200 rounded" />
          <div className="h-3 w-20 bg-gray-200 rounded ml-auto" />
        </div>
        <div className="divide-y divide-gray-100">
          {[1, 2, 3, 4, 5, 6].map((row) => (
            <div key={row} className="h-16 px-6 flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl bg-gray-100 shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3.5 w-40 bg-gray-200 rounded" />
                <div className="h-2.5 w-24 bg-gray-100 rounded" />
              </div>
              <div className="h-6 w-20 bg-gray-100 rounded-full" />
              <div className="h-6 w-16 bg-gray-100 rounded-lg ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
