import React from 'react';

export default function Filters({
  city,
  district,
  appliance,
  cities,
  districts,
  appliances,
  onCityChange,
  onDistrictChange,
  onApplianceChange,
}) {
  return (
    <div className="w-full bg-white/70 backdrop-blur border border-gray-200 rounded-lg p-4 shadow mb-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Şehir</label>
          <select
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            className="w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-200"
          >
            <option value="">Tümü</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">İlçe</label>
          <select
            value={district}
            onChange={(e) => onDistrictChange(e.target.value)}
            className="w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-200"
          >
            <option value="">Tümü</option>
            {districts.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cihaz</label>
          <select
            value={appliance}
            onChange={(e) => onApplianceChange(e.target.value)}
            className="w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-200"
          >
            <option value="">Tümü</option>
            {appliances.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
