import React, { useEffect, useMemo, useState } from 'react';
import mockServices from './mockServices';
import { haversineKm } from './utils';

function useHashParamId() {
  return useMemo(() => {
    // supports #/service/:id
    const hash = window.location.hash || '';
    const parts = hash.split('/');
    const id = parts[2] || '';
    return id;
  }, []);
}

export default function ServiceDetail() {
  const id = useHashParamId();
  const service = mockServices.find((s) => s.id === id);

  const [userLocation, setUserLocation] = useState(null);
  const distanceKm = useMemo(() => {
    if (!userLocation || !service) return null;
    return haversineKm(userLocation, { lat: service.lat, lng: service.lng });
  }, [userLocation, service]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  }, []);

  if (!service) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <a href="#/app" className="text-blue-600 hover:underline text-sm">← Servislere dön</a>
        <div className="mt-4 p-4 border border-rose-200 bg-rose-50 text-rose-900 rounded-lg">
          Aradığınız servis bulunamadı.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between">
        <a href="#/app" className="text-blue-600 hover:underline text-sm">← Servislere dön</a>
      </div>

      <div className="mt-3 bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{service.name}</h1>
            <p className="text-sm text-gray-600">{service.city} • {service.district}</p>
            <div className="mt-2 text-sm text-gray-700 flex gap-3">
              <span>★ {service.rating.toFixed(1)}</span>
              <span>•</span>
              <span>{(service.appliances || []).join(', ')}</span>
            </div>
            {typeof distanceKm === 'number' && (
              <div className="mt-1 text-xs text-gray-500">Tahmini mesafe: {distanceKm.toFixed(1)} km</div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`tel:+90XXXXXXXXXX`} className="px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-sm">Telefon</a>
            <a href={`https://wa.me/90XXXXXXXXXX`} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-md border border-green-300 bg-green-50 text-green-900 hover:bg-green-100 text-sm">WhatsApp</a>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(service.lat + ',' + service.lng)}`}
              target="_blank" rel="noreferrer"
              className="px-3 py-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-sm"
            >
              Yol tarifi
            </a>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg border border-gray-200 bg-gray-50">
            <h2 className="font-semibold text-gray-900 mb-2 text-sm">Hakkında</h2>
            <p className="text-sm text-gray-700">Bu servis beyaz eşya tamirinde uzmanlaşmıştır. Aynı gün servis imkanı ve şeffaf fiyatlandırma sunar. (Demo içerik)</p>
          </div>
          <div className="p-4 rounded-lg border border-gray-200 bg-gray-50">
            <h2 className="font-semibold text-gray-900 mb-2 text-sm">Hizmet Verilen Cihazlar</h2>
            <div className="flex flex-wrap gap-1 text-xs text-gray-700">
              {(service.appliances || []).map((a) => (
                <span key={a} className="px-2 py-0.5 rounded-full bg-white border border-gray-200">{a}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 p-4 rounded-lg border border-blue-200 bg-blue-50 text-blue-900">
          <div className="font-semibold text-sm mb-1">Talep oluştur (Demo)</div>
          <p className="text-sm">Bu sayfayı gerçek bir talep formu ve durum takibi ile bağlayabiliriz. İsterseniz bir modal/form akışı ekleyeyim.</p>
        </div>
      </div>
    </div>
  );
}
