"use client";

import * as React from "react";
import MapboxMap, { Marker, NavigationControl } from "react-map-gl/mapbox";
import type { HostingInfo } from "@/server/services/hosting";
import "mapbox-gl/dist/mapbox-gl.css";

function MapInner({ hosting }: { hosting: HostingInfo }) {
  if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) return null;

  const lat = hosting.geo.lat;
  const lon = hosting.geo.lon;

  if (lat == null || lon == null) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-background/40 backdrop-blur supports-[backdrop-filter]:bg-background/40 p-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] border-black/10 dark:border-white/10">
      <MapboxMap
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        initialViewState={{ longitude: lon, latitude: lat, zoom: 4 }}
        boxZoom={false}
        doubleClickZoom={false}
        dragRotate={false}
        keyboard={false}
        scrollZoom={false}
        touchPitch={false}
        touchZoomRotate={false}
        style={{ height: 280, width: "100%" }}
        mapStyle="mapbox://styles/mapbox/standard"
        reuseMaps
      >
        <Marker longitude={lon} latitude={lat}>
          <div className="h-4 w-4 rounded-full bg-blue-600 ring-2 ring-white shadow-2xl" />
        </Marker>
        <NavigationControl />
      </MapboxMap>
    </div>
  );
}

export const HostingMap = React.memo(MapInner, (prev, next) => {
  const p = prev.hosting.geo;
  const n = next.hosting.geo;
  return p.lat === n.lat && p.lon === n.lon;
});
