import React, { useEffect, useMemo, useState } from 'react';
import MapView from './MapView';
import Filters from './Filters';
import ServiceList from './ServiceList';
import mockServices from './mockServices';
import { haversineKm } from './utils';
import CustomerDashboard from '../dashboard/CustomerDashboard';
import ServiceDashboard from '../dashboard/ServiceDashboard';

export default function MainApp() {
  // Role from hash param (no setter needed)
  const role = useMemo(() => {
    const hash = window.location.hash || '';
    const qIndex = hash.indexOf('?');
    if (qIndex !== -1) {
      const params = new URLSearchParams(hash.slice(qIndex + 1));
      const r = params.get('role');
      if (r === 'customer' || r === 'service') return r;
    }
    return '';
  }, []);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const showDashboard = useMemo(() => {
    const hash = window.location.hash || '';
    const qIndex = hash.indexOf('?');
    if (qIndex !== -1) {
      const params = new URLSearchParams(hash.slice(qIndex + 1));
      return params.get('dashboard') === '1';
    }
    return false;
  }, []);

  // Filters
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [appliance, setAppliance] = useState('');
  const [sortBy, setSortBy] = useState('distance'); // 'distance' | 'rating'
  const [focusedServiceId, setFocusedServiceId] = useState(null);

  // Geolocation
  const [userLocation, setUserLocation] = useState(null);
  useEffect(() => {
    if (!navigator.geolocation) {
      // fallback to Ankara center
      setUserLocation({ lat: 39.92077, lng: 32.85411 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => setUserLocation({ lat: 41.015137, lng: 28.97953 }) // fallback to İstanbul
    );
  }, []);

  // Derived options from data
  const cities = useMemo(() => Array.from(new Set(mockServices.map((s) => s.city))).sort(), []);
  const districtsAll = useMemo(
    () => Array.from(new Set(mockServices.map((s) => `${s.city}::${s.district}`))).map((k) => k.split('::')[1]),
    []
  );
  const appliancesAll = useMemo(() => {
    const set = new Set();
    mockServices.forEach((s) => (s.appliances || []).forEach((a) => set.add(a)));
    return Array.from(set).sort();
  }, []);

  const districts = useMemo(() => {
    if (!city) return Array.from(new Set(districtsAll)).sort();
    return Array.from(new Set(mockServices.filter((s) => s.city === city).map((s) => s.district))).sort();
  }, [city, districtsAll]);

  // Filter and compute distances
  const computed = useMemo(() => {
    const base = mockServices.filter((s) => {
      const okCity = city ? s.city === city : true;
      const okDistrict = district ? s.district === district : true;
      const okAppliance = appliance ? (s.appliances || []).includes(appliance) : true;
      return okCity && okDistrict && okAppliance;
    });

    const withDistance = base.map((s) => {
      const dKm = userLocation ? haversineKm(userLocation, { lat: s.lat, lng: s.lng }) : null;
      return { ...s, distanceKm: dKm };
    });

    const sorted = withDistance.sort((a, b) => {
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      // distance first; nulls at end
      const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
      const db = b.distanceKm ?? Number.POSITIVE_INFINITY;
      if (da !== db) return da - db;
      return (b.rating || 0) - (a.rating || 0);
    });

    return sorted;
  }, [city, district, appliance, userLocation, sortBy]);

  // Contact handler (demo)
  const handleContact = (svc) => {
    alert(`Talep oluştur (DEMO):\n${svc.name}\nŞehir/İlçe: ${svc.city} / ${svc.district}\nMesafe: ${typeof svc.distanceKm === 'number' ? svc.distanceKm.toFixed(1) + ' km' : '—'}\nPuan: ${svc.rating.toFixed(1)}`);
  };

  if (showDashboard) {
    if (role === 'service') return <ServiceDashboard />;
    return <CustomerDashboard />;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 md:py-6">
      {/* Role-aware banner */}
      {!bannerDismissed && (
        <div className="mb-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 text-blue-900 p-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="text-sm">
              {role === 'service' ? (
                <>
                  <strong>Servis hesabıyla devam edin:</strong> İş taleplerini görüntüleyin, profilinizi yönetin.
                </>
              ) : role === 'customer' ? (
                <>
                  <strong>Müşteri olarak devam edin:</strong> Yakınınızdaki servisleri görün, talep oluşturun veya AI desteği alın.
                </>
              ) : (
                <>
                  <strong>Rol seçmediniz:</strong> Müşteri mi, Servis mi devam etmek istersiniz?
                </>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {role === 'service' ? (
                <>
                  <a href="#/auth/service" className="px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700">Giriş Yap</a>
                  <a href="#/auth/register" className="px-3 py-1.5 rounded-md border border-blue-300 text-blue-900 bg-white hover:bg-blue-50">Kayıt Ol</a>
                  <button onClick={() => setBannerDismissed(true)} className="px-3 py-1.5 rounded-md border border-transparent hover:bg-blue-100">Giriş yapmadan devam et</button>
                  <a href="#/auth/register" className="px-3 py-1.5 rounded-md border border-transparent hover:bg-blue-100">Rolü değiştir</a>
                </>
              ) : (
                <>
                  <a href="#/auth/customer" className="px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700">Giriş Yap</a>
                  <a href="#/auth/register" className="px-3 py-1.5 rounded-md border border-blue-300 text-blue-900 bg-white hover:bg-blue-50">Kayıt Ol</a>
                  <button onClick={() => setBannerDismissed(true)} className="px-3 py-1.5 rounded-md border border-transparent hover:bg-blue-100">Giriş yapmadan devam et</button>
                  <a href="#/auth/register" className="px-3 py-1.5 rounded-md border border-transparent hover:bg-blue-100">Rolü değiştir</a>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Yakındaki Teknik Servisler</h1>
        <p className="text-gray-500 text-sm md:text-base">Konumunuza göre servisleri keşfedin, filtreleyin ve iletişime geçin.</p>
      </div>

      {/* Filters */}
      <Filters
        city={city}
        district={district}
        appliance={appliance}
        cities={cities}
        districts={districts}
        appliances={appliancesAll}
        onCityChange={(v) => { setCity(v); setDistrict(''); }}
        onDistrictChange={setDistrict}
        onApplianceChange={setAppliance}
      />

      {/* Map */}
      <div className="mb-4">
        <MapView userLocation={userLocation} services={computed} focusedServiceId={focusedServiceId} />
      </div>

      {/* List */}
      <ServiceList
        services={computed}
        sortBy={sortBy}
        onSortChange={setSortBy}
        onContact={handleContact}
        onFocusService={setFocusedServiceId}
      />
    </div>
  );
}
