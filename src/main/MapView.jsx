import React, { useEffect, useRef } from 'react';
import { loadLeafletFromCDN } from './utils';

// distanceColor: choose marker color by distance thresholds (km)
function distanceColor(km) {
  if (km <= 3) return '#34d399'; // green
  if (km <= 10) return '#fbbf24'; // yellow
  return '#f87171'; // red
}

export default function MapView({ userLocation, services, focusedServiceId }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]); // array of { id, marker }

  useEffect(() => {
    let isMounted = true;

    async function setup() {
      const L = await loadLeafletFromCDN();
      if (!isMounted) return;

      if (!mapInstanceRef.current) {
        const center = userLocation || { lat: 39.92077, lng: 32.85411 }; // Ankara fallback
        mapInstanceRef.current = L.map(mapRef.current).setView([center.lat, center.lng], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(mapInstanceRef.current);
      }

      // Clear existing markers
      markersRef.current.forEach((m) => m.marker.remove());
      markersRef.current = [];

      const L2 = window.L; // already loaded
      const map = mapInstanceRef.current;

      // User marker
      if (userLocation) {
        const userMarker = L2.circleMarker([userLocation.lat, userLocation.lng], {
          radius: 8,
          color: '#60a5fa',
          fillColor: '#3b82f6',
          fillOpacity: 0.9,
          weight: 2,
        }).addTo(map);
        userMarker.bindPopup('Konumunuz');
        markersRef.current.push(userMarker);
        map.setView([userLocation.lat, userLocation.lng], 13);
      }

      // Service markers
      services.forEach(svc => {
        const col = distanceColor(svc.distanceKm ?? 0);
        const marker = L2.circleMarker([svc.lat, svc.lng], {
          radius: 7,
          color: col,
          fillColor: col,
          fillOpacity: 0.85,
          weight: 2,
        }).addTo(map);
        marker.bindPopup(
          `<div style="min-width:180px"><strong>${svc.name}</strong><br/>Mesafe: ${
            (svc.distanceKm ?? 0).toFixed(1)
          } km<br/>Puan: ${svc.rating.toFixed(1)}</div>`
        );
        markersRef.current.push({ id: svc.id, marker });
      });
    }

    setup();

    return () => {
      isMounted = false;
    };
  }, [userLocation, services]);

  // Focus/open popup when a service is focused from list
  useEffect(() => {
    if (!focusedServiceId) return;
    const entry = markersRef.current.find((m) => m.id === focusedServiceId);
    if (entry && entry.marker && mapInstanceRef.current) {
      const { marker } = entry;
      marker.openPopup();
      try {
        const latlng = marker.getLatLng();
        mapInstanceRef.current.setView(latlng, 14, { animate: true });
      } catch {}
    }
  }, [focusedServiceId]);

  return (
    <div className="relative w-full h-80 md:h-[28rem] rounded-xl overflow-hidden shadow-lg ring-1 ring-gray-200 bg-white">
      {/* Map canvas */}
      <div ref={mapRef} className="w-full h-full" />

      {/* Distance legend */}
      <div className="absolute right-3 top-3 bg-white/90 backdrop-blur rounded-lg border border-gray-200 shadow px-3 py-2 text-xs text-gray-700">
        <div className="font-semibold mb-1 text-gray-900">Mesafe Göstergesi</div>
        <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-full" style={{background:'#34d399'}} /> Yakın (≤ 3 km)</div>
        <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-full" style={{background:'#fbbf24'}} /> Orta (≤ 10 km)</div>
        <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-full" style={{background:'#f87171'}} /> Uzak (&gt; 10 km)</div>
      </div>

      {/* Recenter button */}
      <button
        type="button"
        title="Konumuma odakla"
        onClick={() => {
          if (mapInstanceRef.current && userLocation) {
            mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 13);
          }
        }}
        className="absolute bottom-3 right-3 bg-white/90 hover:bg-white text-gray-800 border border-gray-200 rounded-md shadow px-3 py-1.5 text-sm"
      >
        Konumum
      </button>
    </div>
  );
}
