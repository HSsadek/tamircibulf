import React from 'react';

function distanceBadgeClass(km) {
  if (typeof km !== 'number') return 'bg-gray-100 text-gray-600 border-gray-200';
  if (km <= 3) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (km <= 10) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-rose-50 text-rose-700 border-rose-200';
}

export default function ServiceList({ services, sortBy, onSortChange, onContact, onFocusService }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">Servisler</h3>
        <div className="flex items-center gap-2 text-xs md:text-sm">
          <span className="text-gray-500">Sırala:</span>
          <button
            className={`px-3 py-1 rounded-md border transition ${sortBy === 'distance' ? 'bg-blue-50 border-blue-300 text-blue-900' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            onClick={() => onSortChange('distance')}
          >
            Mesafe
          </button>
          <button
            className={`px-3 py-1 rounded-md border transition ${sortBy === 'rating' ? 'bg-blue-50 border-blue-300 text-blue-900' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            onClick={() => onSortChange('rating')}
          >
            Puan
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {services.map((s) => (
          <div
            key={s.id}
            className="bg-white/90 backdrop-blur border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            onMouseEnter={() => onFocusService?.(s.id)}
            onClick={() => onFocusService?.(s.id)}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="font-semibold text-gray-900 leading-tight">{s.name}</h4>
                <p className="text-xs text-gray-500 mt-0.5">{s.city} • {s.district}</p>
              </div>
              <div className="text-right">
                <div className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs ${distanceBadgeClass(s.distanceKm)}`}>
                  {typeof s.distanceKm === 'number' ? `${s.distanceKm.toFixed(1)} km` : 'Mesafe —'}
                </div>
                <div className="text-xs text-yellow-700 mt-1">★ {s.rating.toFixed(1)}</div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1 text-xs text-gray-600">
                {s.appliances?.slice(0, 3).map((a) => (
                  <span key={a} className="px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200">{a}</span>
                ))}
              </div>
              <button
                className="px-3 py-1.5 text-white bg-blue-600 hover:bg-blue-700 rounded-md w-auto md:w-auto"
                onClick={() => onContact?.(s)}
              >
                İletişim / Talep
              </button>
            </div>
          </div>
        ))}
        {services.length === 0 && (
          <div className="text-sm text-gray-500">Kriterlerinize uygun servis bulunamadı.</div>
        )}
      </div>
    </div>
  );
}
