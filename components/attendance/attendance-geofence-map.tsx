"use client";

import React, { useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { cn } from "@/lib/utils";
import { Navigation, Compass, AlertCircle, CheckCircle2 } from "lucide-react";

// Fix Leaflet's default marker icon paths in Next.js
const fixLeafletIcons = () => {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
};

const createSchoolIcon = () => {
  return L.divIcon({
    className: "school-center-marker",
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 42px; height: 42px;">
        <div style="position: absolute; width: 42px; height: 42px; background: rgba(83, 31, 255, 0.25); border-radius: 50%; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="width: 32px; height: 32px; background: #531FFF; border: 3px solid #ffffff; border-radius: 50%; box-shadow: 0 4px 12px rgba(83, 31, 255, 0.4); display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 14px;">
          🏫
        </div>
      </div>
    `,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });
};

const createStudentIcon = (inRadius: boolean) => {
  const bg = inRadius ? "#10b981" : "#ef4444";
  const ring = inRadius ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)";
  const iconText = inRadius ? "📍" : "⚠️";

  return L.divIcon({
    className: "student-location-marker",
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 38px; height: 38px;">
        <div style="position: absolute; width: 38px; height: 38px; background: ${ring}; border-radius: 50%; animation: pulse 1.5s infinite;"></div>
        <div style="width: 28px; height: 28px; background: ${bg}; border: 2.5px solid #ffffff; border-radius: 50%; box-shadow: 0 3px 10px rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; color: white; font-size: 13px;">
          ${iconText}
        </div>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
};

export interface AttendanceMarkerItem {
  id?: string;
  lat: number;
  lng: number;
  label: string;
  subLabel?: string;
  status: string;
  distance?: number;
  inRadius?: boolean;
  time?: string;
  photoUrl?: string;
}

export interface AttendanceGeofenceMapProps {
  centerLat: number;
  centerLng: number;
  radius: number; // in meters
  onLocationChange?: (lat: number, lng: number) => void;
  interactive?: boolean; // allow drag/click to change location
  studentLocation?: {
    lat: number;
    lng: number;
    distance?: number;
    inRadius?: boolean;
    label?: string;
  } | null;
  attendanceMarkers?: AttendanceMarkerItem[];
  onSelectMarker?: (marker: AttendanceMarkerItem) => void;
  height?: string;
  zoom?: number;
  className?: string;
}

// Inner Leaflet Map implementation (only rendered client-side)
function InnerGeofenceMap({
  centerLat,
  centerLng,
  radius,
  onLocationChange,
  interactive = true,
  studentLocation,
  attendanceMarkers,
  onSelectMarker,
  height = "380px",
  zoom = 17,
  className,
}: AttendanceGeofenceMapProps) {
  const { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } = require("react-leaflet");

  useEffect(() => {
    fixLeafletIcons();
  }, []);

  const schoolPosition: [number, number] = useMemo(() => [centerLat, centerLng], [centerLat, centerLng]);

  // Map click & auto-pan handler
  function MapController() {
    const map = useMap();

    useEffect(() => {
      if (centerLat && centerLng && !isNaN(centerLat) && !isNaN(centerLng)) {
        map.setView([centerLat, centerLng], map.getZoom(), { animate: true });
      }
    }, [centerLat, centerLng, map]);

    useMapEvents({
      click(e: any) {
        if (interactive && onLocationChange) {
          const newLat = Number(e.latlng.lat.toFixed(6));
          const newLng = Number(e.latlng.lng.toFixed(6));
          onLocationChange(newLat, newLng);
        }
      },
    });

    return null;
  }

  // Handle school marker drag
  const markerEventHandlers = useMemo(
    () => ({
      dragend(e: any) {
        if (!interactive || !onLocationChange) return;
        const marker = e.target;
        const position = marker.getLatLng();
        const newLat = Number(position.lat.toFixed(6));
        const newLng = Number(position.lng.toFixed(6));
        onLocationChange(newLat, newLng);
      },
    }),
    [interactive, onLocationChange]
  );

  const isInRadius = studentLocation?.inRadius ?? true;
  const circleColor = studentLocation ? (isInRadius ? "#10b981" : "#ef4444") : "#531FFF";

  return (
    <div className={cn("w-full relative rounded-2xl overflow-hidden border border-gray-200 shadow-inner group", className)} style={{ height }}>
      <MapContainer
        center={schoolPosition}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%", zIndex: 0 }}
      >
        <MapController />

        {/* Crisp OpenStreetMap Tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* Dynamic Radius Circle */}
        <Circle
          center={schoolPosition}
          radius={Math.max(10, radius || 100)}
          pathOptions={{
            color: circleColor,
            fillColor: circleColor,
            fillOpacity: 0.18,
            weight: 2,
            dashArray: studentLocation && !isInRadius ? "6, 6" : undefined,
          }}
        />

        {/* School Center Marker */}
        <Marker
          position={schoolPosition}
          icon={createSchoolIcon()}
          draggable={interactive}
          eventHandlers={markerEventHandlers}
        >
          <Popup>
            <div className="p-1 min-w-[190px] text-xs">
              <div className="flex items-center gap-1.5 font-bold text-gray-900 border-b border-gray-100 pb-1.5 mb-1.5">
                <span className="text-base">🏫</span>
                <span>Titik Pusat Sekolah</span>
              </div>
              <div className="space-y-1 text-[11px] text-gray-600">
                <p className="flex justify-between">
                  <span className="text-gray-400">Koordinat:</span>
                  <span className="font-mono font-bold text-gray-800">{centerLat.toFixed(5)}, {centerLng.toFixed(5)}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-gray-400">Radius Absensi:</span>
                  <span className="font-bold text-[#531FFF]">{radius} Meter</span>
                </p>
                {interactive && (
                  <p className="mt-1 text-[10px] text-purple-700 bg-purple-50 p-1 rounded font-medium text-center">
                    💡 Geser marker atau klik peta untuk menyesuaikan lokasi
                  </p>
                )}
              </div>
            </div>
          </Popup>
        </Marker>

        {/* Optional Student Location Marker */}
        {studentLocation && studentLocation.lat && studentLocation.lng && (
          <Marker
            position={[studentLocation.lat, studentLocation.lng]}
            icon={createStudentIcon(isInRadius)}
          >
            <Popup>
              <div className="p-1 min-w-[200px] text-xs">
                <div className="flex items-center gap-1.5 font-bold text-gray-900 border-b border-gray-100 pb-1.5 mb-1.5">
                  <Navigation className={cn("w-4 h-4", isInRadius ? "text-emerald-600" : "text-rose-600")} />
                  <span>{studentLocation.label || "Lokasi Anda Saat Ini"}</span>
                </div>
                <div className="space-y-1 text-[11px] text-gray-600">
                  <p className="flex justify-between">
                    <span className="text-gray-400">Jarak ke Sekolah:</span>
                    <span className="font-bold text-gray-900">{studentLocation.distance ?? 0} Meter</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-gray-400">Batas Radius:</span>
                    <span className="font-bold text-gray-900">{radius} Meter</span>
                  </p>
                  <div className={cn(
                    "mt-1.5 p-1 rounded font-bold text-center text-[10px]",
                    isInRadius ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                  )}>
                    {isInRadius ? "🟢 Berada Di Dalam Radius Sekolah" : "🔴 Di Luar Radius Absensi Sekolah"}
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        )}
        {/* Attendance Records Markers (e.g. for Tab 2 GPS Log View) */}
        {attendanceMarkers && attendanceMarkers.map((m, idx) => {
          if (!m.lat || !m.lng) return null;
          const isSuccess = m.inRadius !== undefined ? m.inRadius : (m.status === "Hadir" || m.status === "Terlambat");
          const bg = isSuccess ? "#10b981" : "#ef4444";
          const icon = L.divIcon({
            className: "attendance-record-marker",
            html: `
              <div style="width: 26px; height: 26px; background: ${bg}; border: 2px solid #ffffff; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: bold; cursor: pointer;">
                ${isSuccess ? "✓" : "!"}
              </div>
            `,
            iconSize: [26, 26],
            iconAnchor: [13, 13],
          });

          return (
            <Marker
              key={m.id || idx}
              position={[m.lat, m.lng]}
              icon={icon}
              eventHandlers={{
                click: () => onSelectMarker && onSelectMarker(m),
              }}
            >
              <Popup>
                <div className="p-1 min-w-[210px] text-xs">
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-2 mb-2">
                    {m.photoUrl ? (
                      <img src={m.photoUrl} alt={m.label} className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-purple-100 text-[#531FFF] flex items-center justify-center font-bold text-xs">
                        {m.label.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="truncate">
                      <p className="font-bold text-gray-900 leading-tight truncate">{m.label}</p>
                      <p className="text-[10px] text-gray-400">{m.subLabel || ""}</p>
                    </div>
                  </div>
                  <div className="space-y-1 text-[11px] text-gray-600">
                    <p className="flex justify-between">
                      <span className="text-gray-400">Status:</span>
                      <span className={cn("font-bold", isSuccess ? "text-emerald-600" : "text-rose-600")}>{m.status}</span>
                    </p>
                    {m.time && (
                      <p className="flex justify-between">
                        <span className="text-gray-400">Waktu:</span>
                        <span className="font-bold text-gray-700">{m.time}</span>
                      </p>
                    )}
                    {m.distance !== undefined && (
                      <p className="flex justify-between">
                        <span className="text-gray-400">Jarak:</span>
                        <span className="font-bold text-gray-800">{m.distance}m</span>
                      </p>
                    )}
                    <p className="flex justify-between">
                      <span className="text-gray-400">Koordinat:</span>
                      <span className="font-mono text-[10px] text-gray-600">{m.lat.toFixed(5)}, {m.lng.toFixed(5)}</span>
                    </p>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Floating HUD Badge: Radius and Status indicator */}
      <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1.5 pointer-events-none">
        <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-md border border-gray-200/80 text-[11px] font-bold text-gray-800 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: circleColor }} />
          <span>Radius: {radius}m</span>
          <span className="text-gray-400 font-normal">| Area: ~{Math.round(Math.PI * radius * radius / 1000)}k m²</span>
        </div>

        {studentLocation && (
          <div className={cn(
            "px-3 py-1.5 rounded-xl shadow-md border text-[11px] font-extrabold flex items-center gap-1.5 backdrop-blur-md",
            isInRadius
              ? "bg-emerald-500/95 text-white border-emerald-400"
              : "bg-rose-500/95 text-white border-rose-400 animate-bounce"
          )}>
            {isInRadius ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            <span>{isInRadius ? `Valid (${studentLocation.distance}m)` : `Di Luar Radius (${studentLocation.distance}m / maks ${radius}m)`}</span>
          </div>
        )}
      </div>

      {/* Interactive Helper Banner for Admin */}
      {interactive && (
        <div className="absolute bottom-3 left-3 right-3 z-10 pointer-events-none flex justify-center">
          <div className="bg-gray-900/80 backdrop-blur-md text-white px-3.5 py-1.5 rounded-xl text-[11px] font-medium shadow-lg flex items-center gap-2 border border-white/10">
            <Compass className="w-3.5 h-3.5 text-[#8F94FB]" />
            <span>Klik peta atau geser marker untuk menentukan titik pusat sekolah</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Client-only dynamic wrapper to avoid SSR issues with Leaflet
const DynamicGeofenceMap = dynamic(() => Promise.resolve(InnerGeofenceMap), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[380px] rounded-2xl bg-gray-100 border border-gray-200 animate-pulse flex flex-col items-center justify-center text-gray-400 gap-2">
      <div className="w-8 h-8 rounded-full border-2 border-[#531FFF] border-t-transparent animate-spin" />
      <span className="text-xs font-semibold">Memuat Peta Interaktif...</span>
    </div>
  ),
});

export default function AttendanceGeofenceMap(props: AttendanceGeofenceMapProps) {
  return <DynamicGeofenceMap {...props} />;
}
