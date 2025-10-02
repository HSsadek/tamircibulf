import React, { useEffect, useMemo, useState } from 'react';
import Filters from './Filters';
import ServiceList from './ServiceList';
import { haversineKm } from './utils';
import CustomerDashboard from '../dashboard/CustomerDashboard';
import ServiceDashboard from '../dashboard/ServiceDashboard';
import RealMap from '../components/RealMap';

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
  
  // Services data
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0
  });

  // Geolocation
  const [userLocation, setUserLocation] = useState(null);
  
  const getUserLocation = () => {
    if (!navigator.geolocation) {
      console.log('Geolocation desteklenmiyor - MainApp');
      alert('Tarayıcınız konum hizmetlerini desteklemiyor.');
      setUserLocation({ lat: 41.0082, lng: 28.9784 }); // İstanbul
      return;
    }
    
    console.log('Konum izni isteniyor - MainApp...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        console.log('Konum başarıyla alındı - MainApp:', pos.coords);
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (error) => {
        console.error('Konum alınamadı - MainApp:', error);
        let errorMessage = '';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Konum izni reddedildi. Lütfen tarayıcı ayarlarından konum iznini açın.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Konum bilgisi mevcut değil.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Konum alma işlemi zaman aşımına uğradı.';
            break;
          default:
            errorMessage = 'Bilinmeyen bir hata oluştu.';
            break;
        }
        alert(`Konum alınamadı: ${errorMessage}\n\nVarsayılan konum (İstanbul) kullanılacak.`);
        setUserLocation({ lat: 41.0082, lng: 28.9784 }); // İstanbul fallback
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 dakika cache
      }
    );
  };
  
  // Fetch services from API with location-based filtering
  const fetchServices = async () => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams({
        per_page: '50' // Get more for MainApp since it shows map + list
      });

      // Add location-based filtering if available
      if (userLocation) {
        params.append('lat', userLocation.lat.toString());
        params.append('lng', userLocation.lng.toString());
        params.append('radius', '100'); // 100km radius for MainApp
      }

      // Add filters
      if (city) {
        params.append('city', city);
      }
      if (district) {
        params.append('district', district);
      }
      if (appliance && appliance !== 'all') {
        params.append('service_type', appliance);
      }

      const res = await fetch(`http://localhost:8000/api/services?${params}`, {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log('MainApp API response:', data);
        
        // Transform API data to match expected format
        const transformedServices = (data?.data || []).map((service, index) => ({
          id: service.id || `mainapp-service-${index}`,
          name: service.name,
          lat: service.latitude || service.lat,
          lng: service.longitude || service.lng,
          city: service.city,
          district: service.district,
          appliances: [service.service_type_name || service.service_type],
          rating: service.rating || 0,
          service_type: service.service_type,
          description: service.description,
          price: service.price,
          reviews: service.reviews || service.total_reviews || 0,
          distanceKm: service.distanceKm
        }));
        
        console.log('Transformed services:', transformedServices);
        setServices(transformedServices);
        
        // Update pagination info
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } else {
        console.log('API failed, no services available');
        setServices([]);
      }
    } catch (err) {
      console.error('Services fetch error:', err);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getUserLocation();
  }, []);

  useEffect(() => {
    fetchServices();
  }, [userLocation, city, district, appliance]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derived options from data
  const cities = useMemo(() => Array.from(new Set(services.map((s) => s.city))).sort(), [services]);
  const districtsAll = useMemo(
    () => Array.from(new Set(services.map((s) => `${s.city}::${s.district}`))).map((k) => k.split('::')[1]),
    [services]
  );
  const appliancesAll = useMemo(() => {
    const set = new Set();
    services.forEach((s) => (s.appliances || []).forEach((a) => set.add(a)));
    return Array.from(set).sort();
  }, [services]);

  const districts = useMemo(() => {
    if (!city) return Array.from(new Set(districtsAll)).sort();
    return Array.from(new Set(services.filter((s) => s.city === city).map((s) => s.district))).sort();
  }, [city, districtsAll, services]);

  // Filter and compute distances
  const computed = useMemo(() => {
    const base = services.filter((s) => {
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
  }, [city, district, appliance, userLocation, sortBy, services]);

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
        {loading && <p className="text-blue-600 text-sm">Servisler yükleniyor...</p>}
        {!loading && pagination.total > 0 && (
          <p className="text-gray-600 text-sm mt-2">
            📊 Toplam {pagination.total} servis bulundu, {services.length} tanesi gösteriliyor
            {userLocation && <span className="text-green-600"> • Konumunuza göre sıralandı</span>}
          </p>
        )}
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
        <div className="relative w-full rounded-xl overflow-hidden shadow-lg ring-1 ring-gray-200 bg-white">
          <RealMap 
            userLocation={userLocation} 
            services={computed} 
            focusedServiceId={focusedServiceId}
            height="450px"
            onLocationRequest={getUserLocation}
          />
          {/* Distance legend */}
          <div className="absolute right-3 top-3 bg-white/90 backdrop-blur rounded-lg border border-gray-200 shadow px-3 py-2 text-xs text-gray-700" style={{ zIndex: 1000 }}>
            <div className="font-semibold mb-1 text-gray-900">Servis Bilgileri</div>
            <div className="flex items-center gap-2">🟢 Kullanıcı Konumu</div>
            <div className="flex items-center gap-2">⭐ Servis Sağlayıcıları</div>
          </div>
        </div>
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
