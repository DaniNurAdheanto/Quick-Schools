"use client";

import React from "react";
import dynamic from "next/dynamic";
import type { AttendanceGeofenceMapProps, AttendanceMarkerItem } from "./inner-geofence-map";

export type { AttendanceGeofenceMapProps, AttendanceMarkerItem };

// Client-only dynamic wrapper that safely imports Leaflet without any SSR window errors
const DynamicGeofenceMap = dynamic(() => import("./inner-geofence-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[380px] rounded-lg bg-gray-50 border border-gray-200 animate-pulse flex flex-col items-center justify-center text-gray-400 gap-2.5">
      <div className="w-8 h-8 rounded-full border-2 border-[#531FFF] border-t-transparent animate-spin" />
      <span className="text-xs font-semibold text-gray-500">Memuat Peta Interaktif & Koordinat Sekolah...</span>
    </div>
  ),
});

export default function AttendanceGeofenceMap(props: AttendanceGeofenceMapProps) {
  return <DynamicGeofenceMap {...props} />;
}
