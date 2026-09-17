"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { cn } from "@/lib/utils";

const createCustomIcon = (isSuccess: boolean, isRejected: boolean) => {
  const color = isSuccess ? "#22c55e" : isRejected ? "#ef4444" : "#6b7280";
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="background-color: white; width: 16px; height: 16px; border-radius: 50%; border: 3px solid ${color}; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
};

const centerIcon = L.divIcon({
  className: "center-marker",
  html: `<div style="background-color: #531FFF; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export default function MapComponent({ filteredData, centerLat, centerLng, radius }: any) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Fix Leaflet's default icon path issues with Next.js
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
    setMounted(true);
  }, []);

  if (!mounted) return <div className="h-[500px] w-full bg-gray-100 animate-pulse rounded-lg" />;

  return (
    <div className="h-[500px] w-full rounded-lg overflow-hidden border border-gray-200 z-0">
      <MapContainer 
        center={[centerLat, centerLng]} 
        zoom={18} 
        style={{ height: "100%", width: "100%", zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* School Center Marker */}
        <Marker position={[centerLat, centerLng]} icon={centerIcon}>
          <Popup>
            <div className="text-center font-bold text-gray-900">Pusat Sekolah</div>
          </Popup>
        </Marker>
        
        {/* Radius Circle */}
        <Circle 
          center={[centerLat, centerLng]} 
          pathOptions={{ color: '#531FFF', fillColor: '#531FFF', fillOpacity: 0.1, weight: 1 }}
          radius={radius || 50} 
        />

        {/* Student Markers */}
        {filteredData.map((item: any) => {
          const isSuccess = item.status === "Hadir" || item.status === "Terlambat";
          const isRejected = item.status.includes("Ditolak");
          
          return (
            <Marker 
              key={item.id} 
              position={[item.location.lat, item.location.lng]}
              icon={createCustomIcon(isSuccess, isRejected)}
            >
              <Popup>
                <div className="p-1 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                    <div className="w-8 h-8 relative rounded-full overflow-hidden shrink-0">
                      <img src={item.capturedImage} alt={item.studentName} className="object-cover w-full h-full" referrerPolicy="no-referrer" />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 truncate block">{item.studentName}</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] text-gray-500 flex justify-between">
                      <span>Status</span>
                      <span className={cn("font-semibold", isSuccess ? "text-green-600" : "text-red-600")}>{item.status}</span>
                    </p>
                    <p className="text-[11px] text-gray-500 flex justify-between">
                      <span>Jarak</span>
                      <span className="font-semibold text-gray-700">{item.location.distance}m</span>
                    </p>
                    <p className="text-[11px] text-gray-500 flex justify-between">
                      <span>Waktu</span>
                      <span className="font-semibold text-gray-700">{item.timestamp}</span>
                    </p>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
