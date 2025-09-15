"use client";

import L from "leaflet";
import React from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import type { HostingInfo } from "@/server/services/hosting";

// Fix default icon paths in Next.js
// Leaflet looks for marker images via URL; in bundlers, we need to set them explicitly
// Avoid accessing window during SSR by running in effect
function useFixLeafletIcons() {
  React.useEffect(() => {
    // Suppress private access typing; upstream typings don't expose _getIconUrl
    const DefaultIcon = L.Icon.Default as unknown as {
      prototype: { _getIconUrl?: unknown };
      mergeOptions(opts: unknown): void;
    };
    delete DefaultIcon.prototype._getIconUrl;
    DefaultIcon.mergeOptions({
      iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  }, []);
}

export function HostingMap({ hosting }: { hosting: HostingInfo }) {
  const lat = hosting.geo.lat;
  const lon = hosting.geo.lon;
  useFixLeafletIcons();

  if (lat == null || lon == null) return null;

  const position: [number, number] = [lat, lon];

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-background/40 backdrop-blur supports-[backdrop-filter]:bg-background/40 p-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] border-black/10 dark:border-white/10">
      <MapContainer
        center={position}
        zoom={6}
        scrollWheelZoom={false}
        style={{ height: 280, width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position}>
          <Popup>
            <div className="text-sm">
              <div className="font-medium">{hosting.ipAddress}</div>
              <div>
                {hosting.geo.city || hosting.geo.region ? (
                  <>
                    {hosting.geo.city}
                    {hosting.geo.city && hosting.geo.region ? ", " : ""}
                    {hosting.geo.region}
                  </>
                ) : null}
                {hosting.geo.country ? (
                  <>
                    {hosting.geo.city || hosting.geo.region ? ", " : ""}
                    {hosting.geo.country}
                  </>
                ) : null}
              </div>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
