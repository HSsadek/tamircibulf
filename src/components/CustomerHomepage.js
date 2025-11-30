/* eslint-disable-next-line */
// @ts-nocheck
/* eslint-disable */
import React, { useState, useEffect, useMemo } from 'react';
import './CustomerHomepage.css';
import RealMap from './RealMap.jsx';
import { LazyImage } from '../hooks/useLazyImage';
import ServiceRequestDialog from './ServiceRequestDialog.jsx';

function useCustomerAuth() {
  return useMemo(() => ({
    get token() { return localStorage.getItem('customer_token') || localStorage.getItem('auth_token'); },
    get user() { 
      try { 
        const userData = localStorage.getItem('customer_user') || localStorage.getItem('user_data');
        return JSON.parse(userData || 'null');
      } catch (error) {
        return null;
      }
    },
    logout() {
      localStorage.removeItem('customer_token');
      localStorage.removeItem('customer_user');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      localStorage.removeItem('user_role');
      window.location.hash = '#/';
    }
  }), []);
}

export default function CustomerHomepage() {
  const auth = useCustomerAuth();
  const scrollPositionRef = React.useRef(0);
  const wasModalOpenRef = React.useRef(false);
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0
  });
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [showAIChat, setShowAIChat] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [realUserLocation, setRealUserLocation] = useState(null); // Kullanıcının gerçek GPS konumu
  const [locationStatus, setLocationStatus] = useState('loading'); // 'loading', 'success', 'error', 'denied'
  const [mapZoomData, setMapZoomData] = useState({ zoom: 12, radius: 10 });
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedCity, setSelectedCity] = useState('');
  const [showLocationFilter, setShowLocationFilter] = useState(false);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [requestService, setRequestService] = useState(null);

  const categories = [
    { id: 'all', name: 'Tümü', icon: '🔧' },
    { id: 'plumbing', name: 'Tesisatçı', icon: '🚰' },
    { id: 'electrical', name: 'Elektrikçi', icon: '⚡' },
    { id: 'cleaning', name: 'Temizlik', icon: '🧹' },
    { id: 'appliance', name: 'Beyaz Eşya', icon: '🔌' },
    { id: 'computer', name: 'Bilgisayar', icon: '💻' },
    { id: 'phone', name: 'Telefon', icon: '📱' }
  ];

  const cities = [
    { id: 'istanbul', name: 'İstanbul', lat: 41.0082, lng: 28.9784 },
    { id: 'ankara', name: 'Ankara', lat: 39.9334, lng: 32.8597 },
    { id: 'izmir', name: 'İzmir', lat: 38.4192, lng: 27.1287 },
    { id: 'bursa', name: 'Bursa', lat: 40.1826, lng: 29.0665 },
    { id: 'antalya', name: 'Antalya', lat: 36.8969, lng: 30.7133 },
    { id: 'adana', name: 'Adana', lat: 37.0000, lng: 35.3213 },
    { id: 'konya', name: 'Konya', lat: 37.8667, lng: 32.4833 },
    { id: 'gaziantep', name: 'Gaziantep', lat: 37.0662, lng: 37.3833 },
    { id: 'kayseri', name: 'Kayseri', lat: 38.7312, lng: 35.4787 },
    { id: 'eskisehir', name: 'Eskişehir', lat: 39.7767, lng: 30.5206 },
    { id: 'kahramanmaras', name: 'Kahramanmaraş', lat: 37.5858, lng: 36.9371 }
  ];

  useEffect(() => {
    getUserLocation();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial fetch when user location is set
  useEffect(() => {
    if (userLocation) {
      console.log('🗺️ CustomerHomepage: User location set, fetching initial services');
      fetchServices(1, false);
    }
  }, [userLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  // Modal açıkken body scroll'unu engelle ve scroll pozisyonunu koru
  useEffect(() => {
    const isAnyModalOpen = showServiceModal || showReviewsModal || showRequestDialog;
    
    if (isAnyModalOpen && !wasModalOpenRef.current) {
      // İlk modal açılıyor - scroll pozisyonunu kaydet
      scrollPositionRef.current = window.scrollY;
      document.body.style.top = `-${scrollPositionRef.current}px`;
      document.body.classList.add('modal-open');
      wasModalOpenRef.current = true;
    } else if (!isAnyModalOpen && wasModalOpenRef.current) {
      // Tüm modaller kapandı - scroll pozisyonunu geri yükle
      document.body.classList.remove('modal-open');
      document.body.style.top = '';
      window.scrollTo(0, scrollPositionRef.current);
      wasModalOpenRef.current = false;
    }
    
    return () => {
      if (!isAnyModalOpen) {
        document.body.classList.remove('modal-open');
        document.body.style.top = '';
      }
    };
  }, [showServiceModal, showReviewsModal, showRequestDialog]);

  useEffect(() => {
    // Refetch when any filter changes including zoom
    fetchServices(1, false);
  }, [userLocation, selectedCategory, searchQuery, selectedCity, mapZoomData.radius]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    filterServices();
  }, [services, realUserLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle location search from map clicks
  const handleLocationSearch = (locationData) => {
    console.log('🗺️ CustomerHomepage: Location search requested:', locationData);
    
    // Update search location (different from user location)
    const searchLocation = {
      lat: locationData.lat,
      lng: locationData.lng
    };
    
    // Temporarily update userLocation for search
    setUserLocation(searchLocation);
    setMapZoomData({ zoom: 13, radius: locationData.radius });
    
    // Show loading indicator
    setLoading(true);
  };

  const getUserLocation = () => {
    setLocationStatus('loading');
    if (navigator.geolocation) {
      console.log('Konum izni isteniyor...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Konum başarıyla alındı:', position.coords);
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(location);
          setRealUserLocation(location);
          setLocationStatus('success');
        },
        (error) => {
          console.error('Konum alınamadı:', error);
          if (error.code === error.PERMISSION_DENIED) {
            setLocationStatus('denied');
          } else {
            setLocationStatus('error');
          }
          
          // Sessizce varsayılan konumu kullan
          const defaultLocation = {
            lat: 41.0082,
            lng: 28.9784
          };
          setUserLocation(defaultLocation);
          setRealUserLocation(defaultLocation);
        },
        {
          enableHighAccuracy: false, // Daha hızlı sonuç için
          timeout: 5000, // 5 saniye
          maximumAge: 600000 // 10 dakika cache
        }
      );
    } else {
      setLocationStatus('error');
      const defaultLocation = {
        lat: 41.0082,
        lng: 28.9784
      };
      setUserLocation(defaultLocation);
      setRealUserLocation(defaultLocation);
    }
  };

  const fetchServices = async (page = 1, append = false) => {
    try {
      if (!append) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      // Build query parameters
      const params = new URLSearchParams({
        per_page: '50' // Get more for better map display
      });

      // Add city filter if selected (priority over location-based filtering)
      if (selectedCity) {
        const city = cities.find(c => c.id === selectedCity);
        if (city) {
          params.append('city', city.name);
          console.log('🏙️ Adding city filter:', city.name);
          // Don't add radius filter when city is selected - show all services in that city
        }
      } else if (userLocation) {
        // Add location-based filtering only if no city is selected
        params.append('lat', userLocation.lat.toString());
        params.append('lng', userLocation.lng.toString());
        params.append('radius', mapZoomData.radius.toString());
        console.log(`🗺️ CustomerHomepage: Fetching services with radius ${mapZoomData.radius}km from location ${userLocation.lat}, ${userLocation.lng}`);
      }

      // Add filters
      if (selectedCategory && selectedCategory !== 'all') {
        params.append('service_type', selectedCategory);
      }

      // Add search query
      if (searchQuery && searchQuery.trim()) {
        params.append('search', searchQuery.trim());
        console.log('🔍 Adding search query:', searchQuery.trim());
      }

      const apiUrl = `http://localhost:8000/api/services?${params.toString()}`;

      console.log('🔍 API URL:', apiUrl);
      
      const res = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 Response status:', res.status);
      console.log('📡 Response ok:', res.ok);
      
      if (res.ok) {
        const data = await res.json();
        console.log('✅ API response data:', data);
        console.log('📊 Data type:', typeof data);
        console.log('🔑 Data keys:', Object.keys(data || {}));
        console.log('📋 Data.data length:', data?.data?.length || 0);
        
        // API'den gelen verileri kullan, koordinat bilgileri dahil
        const servicesWithCoords = (data?.data || []).map((service, index) => ({
          ...service,
          // Unique ID garantisi
          id: service.id || `service-${index}`,
          // API'den gelen latitude/longitude'u lat/lng'ye çevir
          lat: service.latitude || service.lat,
          lng: service.longitude || service.lng,
          // Kategori mapping'i
          category: service.service_type
        }));
        
        console.log('📋 Services with coordinates:', servicesWithCoords);
        console.log('🔍 Service IDs:', servicesWithCoords.map(s => s.id));
        console.log('🏙️ Cities found:', [...new Set(servicesWithCoords.map(s => s.city))]);
        console.log('📍 Service locations:', servicesWithCoords.map(s => `${s.name} (${s.city}, ${s.district})`));
        
        // Duplicate ID kontrolü
        const ids = servicesWithCoords.map(s => s.id);
        const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
        if (duplicateIds.length > 0) {
          console.warn('⚠️ Duplicate service IDs found:', duplicateIds);
        }
        
        if (append) {
          // Append new services to existing ones, avoid duplicates
          setServices(prev => {
            const existingIds = prev.map(s => s.id);
            const newServices = servicesWithCoords.filter(s => !existingIds.includes(s.id));
            return [...prev, ...newServices];
          });
        } else {
          // Replace services, remove duplicates
          const uniqueServices = servicesWithCoords.filter((service, index, self) => 
            index === self.findIndex(s => s.id === service.id)
          );
          console.log('🔧 Unique services:', uniqueServices.length, 'from', servicesWithCoords.length);
          setServices(uniqueServices);
        }

        // Update pagination info
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } else {
        console.log('❌ API failed with status:', res.status);
        const errorText = await res.text();
        console.log('❌ Error response:', errorText);
        
        // Try to parse error as JSON
        try {
          const errorJson = JSON.parse(errorText);
          console.log('❌ Error JSON:', errorJson);
        } catch (e) {
          console.log('❌ Error is not JSON');
        }
        
        if (!append) {
          setServices([]);
        }
      }
    } catch (err) {
      console.error('💥 Services fetch error:', err);
      console.error('💥 Error details:', err.message);
      console.error('💥 Error stack:', err.stack);
      if (!append) {
        setServices([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const filterServices = () => {
    // Calculate real distances for all services
    const servicesWithRealDistances = services.map(service => {
      if (realUserLocation && service.latitude && service.longitude) {
        const realDistance = calculateDistance(
          realUserLocation.lat,
          realUserLocation.lng,
          service.latitude,
          service.longitude
        );
        return {
          ...service,
          distance: `${Math.round(realDistance)} km`,
          distanceKm: Math.round(realDistance)
        };
      }
      return service;
    });
    
    setFilteredServices(servicesWithRealDistances);
  };

  const loadMoreServices = () => {
    if (pagination.current_page < pagination.last_page && !loadingMore) {
      fetchServices(pagination.current_page + 1, true);
    }
  };

  const handleServiceRequest = (service) => {
    if (!auth.token) {
      alert('Hizmet talep etmek için giriş yapmalısınız.');
      window.location.hash = '#/login';
      return;
    }
    
    // Dialog'u aç
    setRequestService(service);
    setShowRequestDialog(true);
  };

  const handleRequestSuccess = (requestData) => {
    console.log('✅ Hizmet talebi başarıyla oluşturuldu:', requestData);
    // Dialog otomatik olarak başarı ekranını gösterecek
  };

  // Haversine formula to calculate distance between two points
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance;
  };

  const handleServiceDetails = async (service) => {
    // Önce modal'ı hemen aç (temel bilgilerle)
    setSelectedService(service);
    setShowServiceModal(true);
    
    // Sonra detayları yükle
    try {
      const response = await fetch(`http://localhost:8000/api/services/${service.id}`);
      const data = await response.json();
      
      if (data.success) {
        // Calculate real distance from user's actual location
        let serviceWithDetails = { ...data.data.service };
        
        if (realUserLocation && serviceWithDetails.latitude && serviceWithDetails.longitude) {
          const realDistance = calculateDistance(
            realUserLocation.lat,
            realUserLocation.lng,
            serviceWithDetails.latitude,
            serviceWithDetails.longitude
          );
          serviceWithDetails.realDistance = `${Math.round(realDistance)} km`;
        } else {
          serviceWithDetails.realDistance = service.distance;
        }
        
        // Add reviews to service object
        serviceWithDetails.reviews = data.data.reviews || [];
        serviceWithDetails.average_rating = data.data.average_rating;
        serviceWithDetails.total_reviews = data.data.total_reviews;
        
        // Modal zaten açık, sadece içeriği güncelle
        setSelectedService(serviceWithDetails);
      }
    } catch (error) {
      console.error('Error fetching service details:', error);
      // Modal zaten temel bilgilerle açık, hata durumunda olduğu gibi kalır
    }
  };

  const closeServiceModal = () => {
    setShowServiceModal(false);
    setSelectedService(null);
  };

  const handleCitySelection = (cityId) => {
    if (cityId === '') {
      // Kullanıcının gerçek konumunu kullan
      setSelectedCity('');
      setUserLocation(realUserLocation); // Gerçek konuma geri dön
      setShowLocationFilter(false);
      console.log('🏠 Gerçek konuma geri dönüldü');
      return;
    }

    const city = cities.find(c => c.id === cityId);
    if (city) {
      setSelectedCity(cityId);
      // Seçilen şehrin koordinatlarını sadece API için userLocation'a ata
      // realUserLocation değişmez, haritada gerçek konum gösterilir
      setUserLocation({ lat: city.lat, lng: city.lng });
      setShowLocationFilter(false);
      console.log(`🏙️ Şehir seçildi: ${city.name} (${city.lat}, ${city.lng})`);
      console.log(`📍 Gerçek konum: (${realUserLocation?.lat}, ${realUserLocation?.lng})`);
    }
  };

  const sendAIMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage = { type: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');


    try {
      // Backend'e gönder
      const response = await fetch('http://localhost:8000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: chatInput })
      });
  
      if (!response.ok) throw new Error('AI API isteği başarısız');
  
      const data = await response.json();
  
      // Backend'den gelen cevabı ekle
      const aiResponse = { type: 'ai', content: data.reply };
      setChatMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      const errorMsg = { type: 'ai', content: 'AI servisine bağlanırken bir hata oluştu.' };
      setChatMessages(prev => [...prev, errorMsg]);
      console.error('AI API hatası:', error);
    }
  };

  const handleSearch = () => {
    console.log('🔍 Search triggered with query:', searchQuery);
    // Search is already handled by useEffect when searchQuery changes
    // This function can be used for additional search actions if needed
    if (searchQuery.trim()) {
      // Optionally scroll to services section
      const servicesSection = document.querySelector('.customer-services');
      if (servicesSection) {
        servicesSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="customer-homepage">
      {/* Header */}
      <header className="customer-header">
        <div className="customer-header-content">
          <div className="customer-logo">
            <div className="logo-icon">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="14" fill="url(#gradient1)" />
                <path d="M12 10L16 6L20 10M16 6V18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 16L14 20L18 16M22 16L18 20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="16" cy="24" r="2" fill="white"/>
                <defs>
                  <linearGradient id="gradient1" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#667eea"/>
                    <stop offset="1" stopColor="#764ba2"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="logo-text">
              <span className="logo-brand">Tamir</span>
              <span className="logo-brand-accent">ciBul</span>
              <span className="logo-domain">.com</span>
            </div>
          </div>
          <div className="customer-header-actions">
            {auth.user ? (
              <div className="customer-user-menu">
                <span>Merhaba, {auth.user.name || 'Müşteri'}</span>
                <a href="#/customer-dashboard" className="customer-dashboard-btn">📊 Panelim</a>
                {/* Location Status Button */}
                <button 
                  className={`location-status-btn ${locationStatus}`}
                  onClick={getUserLocation}
                  title={
                    locationStatus === 'success' ? 'Konum aktif' :
                    locationStatus === 'denied' ? 'Konum izni reddedildi - Tekrar dene' :
                    locationStatus === 'error' ? 'Konum alınamadı - Tekrar dene' :
                    'Konum alınıyor...'
                  }
                >
                  {locationStatus === 'success' && '📍 Konumum'}
                  {locationStatus === 'denied' && '🚫 Konum İzni'}
                  {locationStatus === 'error' && '⚠️ Konum Hatası'}
                  {locationStatus === 'loading' && '⏳ Konum...'}
                </button>
              </div>
            ) : (
              <>
                {/* Location Status Button for guests */}
                <button 
                  className={`location-status-btn ${locationStatus}`}
                  onClick={getUserLocation}
                  title={
                    locationStatus === 'success' ? 'Konum aktif' :
                    locationStatus === 'denied' ? 'Konum izni reddedildi - Tekrar dene' :
                    locationStatus === 'error' ? 'Konum alınamadı - Tekrar dene' :
                    'Konum alınıyor...'
                  }
                >
                  {locationStatus === 'success' && '📍 Konumum'}
                  {locationStatus === 'denied' && '🚫 Konum İzni'}
                  {locationStatus === 'error' && '⚠️ Konum Hatası'}
                  {locationStatus === 'loading' && '⏳ Konum...'}
                </button>
                <a href="#/login" className="customer-login-btn">Giriş Yap</a>
              </>
            )}
          </div>
        </div>
        
        {/* Sticky Search Bar */}
        <div className="customer-sticky-search">
          <div className="customer-header-content">
            <div className="customer-search-bar-sticky">
              <input 
                type="text"
                placeholder="Hangi hizmeti arıyorsunuz?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                className="customer-search-input"
              />
              <button 
                className="customer-search-btn"
                onClick={handleSearch}
                title="Ara"
              >
                🔍
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="customer-hero">
        <div className="customer-hero-content">
          <h2>En Yakın Tamircini Bul</h2>
          <p>Güvenilir ve profesyonel tamir hizmetleri</p>
        </div>
      </section>

      {/* Categories */}
      <section className="customer-categories">
        <div className="customer-container">
          <h3>Hizmet Kategorileri</h3>
          <div className="customer-category-grid">
            {categories.map(category => (
              <button
                key={category.id}
                className={`customer-category-card ${selectedCategory === category.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category.id)}
              >
                <div className="customer-category-icon">{category.icon}</div>
                <div className="customer-category-name">{category.name}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Services List */}
      <section className="customer-services">
        <div className="customer-container">
          <div className="services-header">
            <div className="services-header-left">
              <h3>
                {selectedCategory === 'all' ? 'Tüm Hizmetler' : 
                 categories.find(c => c.id === selectedCategory)?.name || 'Hizmetler'}
              </h3>
              
              {/* Location Filter */}
              <div className="location-filter">
                <button 
                  className="location-filter-btn"
                  onClick={() => setShowLocationFilter(!showLocationFilter)}
                  title="Konum seç"
                >
                  📍 {selectedCity ? cities.find(c => c.id === selectedCity)?.name : 'Mevcut Konumum'}
                  <span className="dropdown-arrow">▼</span>
                </button>
                
                {showLocationFilter && (
                  <div className="location-dropdown">
                    <div className="location-dropdown-header">
                      <h4>🗺️ Konum Seçin</h4>
                      <button 
                        className="location-close"
                        onClick={() => setShowLocationFilter(false)}
                      >
                        ✕
                      </button>
                    </div>
                    
                    <div className="location-options">
                      <button
                        className={`location-option ${selectedCity === '' ? 'active' : ''}`}
                        onClick={() => handleCitySelection('')}
                      >
                        📍 Mevcut Konumum
                        <small>GPS konumunuzu kullanır</small>
                      </button>
                      
                      {cities.map(city => (
                        <button
                          key={city.id}
                          className={`location-option ${selectedCity === city.id ? 'active' : ''}`}
                          onClick={() => handleCitySelection(city.id)}
                        >
                          🏙️ {city.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="view-toggle">
              <button 
                className={`view-btn ${!showMap ? 'active' : ''}`}
                onClick={() => setShowMap(false)}
              >
                📋 Liste
              </button>
              <button 
                className={`view-btn ${showMap ? 'active' : ''}`}
                onClick={() => setShowMap(true)}
              >
                🗺️ Harita
              </button>
            </div>
          </div>
          
          {loading ? (
            <div className="customer-loading">Hizmetler yükleniyor...</div>
          ) : showMap ? (
            <div style={{ position: 'relative' }}>
              {realUserLocation ? (
                <>
                  <RealMap 
                    userLocation={realUserLocation}
                    centerLocation={selectedCity ? cities.find(c => c.id === selectedCity) : realUserLocation}
                    services={filteredServices} 
                    height="500px"
                    onLocationRequest={() => {
                      if (navigator.geolocation) {
                        setLocationStatus('loading');
                        navigator.geolocation.getCurrentPosition(
                          (pos) => {
                            const newLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                            setRealUserLocation(newLocation); // Gerçek konumu güncelle
                            if (!selectedCity) {
                              setUserLocation(newLocation); // Şehir seçili değilse API konumunu da güncelle
                            }
                            setLocationStatus('success');
                          },
                          (error) => {
                            console.error('Konum alınamadı:', error);
                            setLocationStatus('error');
                            const fallbackLocation = { lat: 41.0082, lng: 28.9784 };
                            setRealUserLocation(fallbackLocation);
                            if (!selectedCity) {
                              setUserLocation(fallbackLocation);
                            }
                          }
                        );
                      }
                    }}
                    onLocationSearch={handleLocationSearch}
                    onServiceRequest={handleServiceRequest}
                  />
                </>
              ) : (
                <div className="customer-loading" style={{ textAlign: 'center', padding: '50px' }}>
                  📍 Konum bilgisi yükleniyor...
                  <br />
                  <small>Harita görünümü için konum izni gereklidir</small>
                </div>
              )}
            </div>
          ) : (
            <div className="customer-services-grid">
              {filteredServices.map(service => (
                <div key={service.id} className="customer-service-card">
                  <div className="customer-service-header">
                    <div className="customer-service-image">
                      {service.logo ? (
                        <LazyImage 
                          src={service.logo} 
                          alt={service.company_name || service.name} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} 
                        />
                      ) : (
                        service.image
                      )}
                    </div>
                    <div className="customer-service-info">
                      <h4>{service.company_name || service.name}</h4>
                      <p className="service-description">{service.description}</p>
                    </div>
                  </div>
                  
                  <div className="customer-service-details">
                    <div className="service-detail-item">
                      <span className="detail-icon">⭐</span>
                      {service.reviews > 0 ? (
                        <>
                          <span className="detail-text">{service.rating}</span>
                          <span className="detail-subtext">({service.reviews} değerlendirme)</span>
                        </>
                      ) : (
                        <span className="detail-text" style={{ fontSize: '13px', color: '#94a3b8' }}>
                          Henüz değerlendirilmedi
                        </span>
                      )}
                    </div>
                    <div className="service-detail-item">
                      <span className="detail-icon">📍</span>
                      <span className="detail-text">{service.city}, {service.district}</span>
                    </div>
                    <div className="service-detail-item">
                      <span className="detail-icon">🚗</span>
                      <span className="detail-text">{service.distance}</span>
                    </div>
                  </div>
                  
                  <div className="customer-service-actions">
                    <button 
                      className="customer-service-btn secondary"
                      onClick={() => handleServiceDetails(service)}
                      title="Servis detaylarını görüntüle"
                    >
                      📋 Detaylar
                    </button>
                    <button 
                      className="customer-service-btn primary"
                      onClick={() => handleServiceRequest(service)}
                      title="Hizmet talep et"
                    >
                      🛠️ Hizmet Talep Et
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Load More Button */}
          {!loading && !showMap && pagination.current_page < pagination.last_page && (
            <div style={{ textAlign: 'center', marginTop: '30px' }}>
              <button 
                className="customer-service-btn primary"
                onClick={loadMoreServices}
                disabled={loadingMore}
                style={{
                  padding: '12px 30px',
                  fontSize: '16px',
                  minWidth: '200px'
                }}
              >
                {loadingMore ? '⏳ Yükleniyor...' : `Daha Fazla Göster (${pagination.total - services.length} kaldı)`}
              </button>
            </div>
          )}
          
          {!loading && filteredServices.length === 0 && (
            <div className="customer-no-results">
              <p>Aradığınız kriterlere uygun hizmet bulunamadı.</p>
              <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
                Toplam {pagination.total} servis mevcut. Filtreleri değiştirmeyi deneyin.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* AI Chat Button */}
      <button 
        className="customer-ai-chat-toggle"
        onClick={() => setShowAIChat(!showAIChat)}
      >
        🤖 AI Destek
      </button>

      {/* AI Chat Panel */}
      {showAIChat && (
        <div className="customer-ai-chat">
          <div className="customer-ai-chat-header">
            <h4>🤖 AI Destek</h4>
            <button onClick={() => setShowAIChat(false)}>✕</button>
          </div>
          
          <div className="customer-ai-chat-messages">
            {chatMessages.length === 0 && (
              <div className="customer-ai-welcome">
                Merhaba! Size nasıl yardımcı olabilirim?
              </div>
            )}
            {chatMessages.map((message, index) => (
              <div key={index} className={`customer-ai-message ${message.type}`}>
                {message.content}
              </div>
            ))}
          </div>
          
          <div className="customer-ai-chat-input">
            <input 
              type="text"
              placeholder="Mesajınızı yazın..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendAIMessage()}
            />
            <button onClick={sendAIMessage}>Gönder</button>
          </div>
        </div>
      )}

      {/* Service Details Panel */}
      {showServiceModal && selectedService && (
        <div className="service-modal-overlay" onClick={closeServiceModal}>
          <div className="service-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="service-modal-header">
              <h3>🏢 Servis Detayları</h3>
              <button className="service-modal-close" onClick={closeServiceModal}>
                ✕
              </button>
            </div>
            
            <div className="service-modal-body">
              {/* Service Info Card */}
              <div className="service-modal-info">
                <div className="service-modal-icon">
                  {selectedService.logo ? (
                    <img 
                      src={selectedService.logo.startsWith('http') ? selectedService.logo : `http://localhost:8000/storage/${selectedService.logo}`}
                      alt={selectedService.company_name || selectedService.name} 
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover', 
                        borderRadius: '12px' 
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = selectedService.image || '🏢';
                      }}
                    />
                  ) : (
                    selectedService.image
                  )}
                </div>
                <div className="service-modal-details">
                  <h4>{selectedService.company_name || selectedService.name}</h4>
                  <p className="service-modal-type">{selectedService.service_type_name || selectedService.service_type}</p>
                </div>
              </div>

              {/* Description */}
              <div className="service-modal-section">
                <h5>📋 Açıklama</h5>
                <p>{selectedService.description || 'Bu servis sağlayıcı profesyonel hizmet sunmaktadır.'}</p>
              </div>

              {/* Rating */}
              <div className="service-modal-section">
                <h5>⭐ Değerlendirme</h5>
                <div className="service-modal-rating">
                  {selectedService.reviews === undefined ? (
                    <span style={{ color: '#94a3b8', fontSize: '14px' }}>
                      Yükleniyor...
                    </span>
                  ) : selectedService.reviews && selectedService.reviews.length > 0 ? (
                    <>
                      <span className="rating-stars">
                        {'⭐'.repeat(Math.floor(selectedService.rating || 0))}
                      </span>
                      <span className="rating-text">
                        {selectedService.rating}/5 
                        <span 
                          className="reviews-link"
                          onClick={() => setShowReviewsModal(true)}
                          style={{ cursor: 'pointer', color: '#3b82f6', textDecoration: 'underline', marginLeft: '4px' }}
                        >
                          ({selectedService.total_reviews || selectedService.reviews.length} değerlendirme)
                        </span>
                      </span>
                    </>
                  ) : (
                    <span style={{ color: '#94a3b8', fontSize: '14px' }}>
                      Henüz değerlendirilmedi
                    </span>
                  )}
                </div>
              </div>

              {/* Location Info */}
              <div className="service-modal-section">
                <h5>📍 Konum Bilgileri</h5>
                <p><strong>Şehir:</strong> {selectedService.city}</p>
                <p><strong>İlçe:</strong> {selectedService.district}</p>
                <p><strong>Mesafe:</strong> {selectedService.realDistance || selectedService.distance}</p>
                {selectedService.address && (
                  <p><strong>Adres:</strong> {selectedService.address}</p>
                )}
              </div>

              {/* Working Hours */}
              <div className="service-modal-section">
                <h5>🕐 Çalışma Saatleri</h5>
                <p>{selectedService.working_hours || '09:00 - 18:00 (Hafta içi)'}</p>
              </div>

              {/* Contact Section */}
              {selectedService.user?.phone && (
                <div className="service-modal-section">
                  <h5>📞 İletişim</h5>
                  <p className="service-modal-phone">{selectedService.user.phone}</p>
                  <div className="contact-buttons">
                    <a 
                      href={`tel:${selectedService.user.phone}`}
                      className="contact-btn phone-btn"
                    >
                      📞 Telefon Et
                    </a>
                    <a 
                      href={`https://wa.me/${selectedService.user.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="contact-btn whatsapp-btn"
                    >
                      💬 WhatsApp
                    </a>
                  </div>
                </div>
              )}

              {/* Map Section */}
              {(selectedService.latitude || selectedService.lat) && (selectedService.longitude || selectedService.lng) && (
                <div className="service-modal-section">
                  <h5>🗺️ Konum</h5>
                  <a 
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent((selectedService.latitude || selectedService.lat) + ',' + (selectedService.longitude || selectedService.lng))}`}
                    target="_blank"
                    rel="noreferrer"
                    className="map-btn"
                  >
                    🗺️ Yol Tarifi Al
                  </a>
                  <button 
                    className="map-btn show-map-btn"
                    onClick={() => {
                      closeServiceModal();
                      setShowMap(true);
                      // Scroll to map
                      setTimeout(() => {
                        const mapSection = document.querySelector('.customer-services');
                        if (mapSection) {
                          mapSection.scrollIntoView({ behavior: 'smooth' });
                        }
                      }, 100);
                    }}
                  >
                    📍 Haritada Göster
                  </button>
                </div>
              )}
            </div>

            <div className="service-modal-footer">
              <button 
                className="service-modal-btn secondary"
                onClick={closeServiceModal}
              >
                Kapat
              </button>
              <button 
                className="service-modal-btn primary"
                onClick={() => {
                  closeServiceModal();
                  handleServiceRequest(selectedService);
                }}
              >
                🛠️ Hizmet Talep Et
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reviews Modal */}
      {showReviewsModal && selectedService && selectedService.reviews && (
        <div className="service-modal-overlay" onClick={() => setShowReviewsModal(false)}>
          <div className="reviews-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="reviews-modal-header">
              <div>
                <h3>⭐ Müşteri Değerlendirmeleri</h3>
                <p className="reviews-modal-subtitle">
                  {selectedService.company_name || selectedService.name} - {selectedService.reviews.length} değerlendirme
                </p>
              </div>
              <button className="service-modal-close" onClick={() => setShowReviewsModal(false)}>
                ✕
              </button>
            </div>
            
            <div className="reviews-modal-body">
              <div className="reviews-summary">
                <div className="reviews-summary-score">
                  <div className="score-number">{selectedService.rating || '5.0'}</div>
                  <div className="score-stars">
                    {'⭐'.repeat(Math.floor(selectedService.rating || 5))}
                  </div>
                  <div className="score-text">{selectedService.reviews.length} değerlendirme</div>
                </div>
              </div>

              <div className="reviews-full-list">
                {selectedService.reviews.map((review) => {
                  const profileImage = review.customer?.profile_image;
                  const imageSrc = profileImage 
                    ? (profileImage.startsWith('data:') 
                        ? profileImage 
                        : `http://localhost:8000/storage/${profileImage}`)
                    : null;

                  return (
                    <div key={review.id} className="review-item-full">
                      <div className="review-header">
                        <div className="review-avatar">
                          {imageSrc ? (
                            <img 
                              src={imageSrc} 
                              alt={review.customer.name}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <span style={{ display: imageSrc ? 'none' : 'flex' }}>
                            {review.customer.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="review-info">
                          <div className="review-name">{review.customer.name}</div>
                          <div className="review-stars">
                            {[...Array(5)].map((_, i) => (
                              <span key={i} className={i < review.rating ? 'star-filled' : 'star-empty'}>
                                {i < review.rating ? '⭐' : '☆'}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="review-date">
                          {new Date(review.rated_at).toLocaleDateString('tr-TR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                      </div>
                      {review.title && (
                        <h4 className="review-title">{review.title}</h4>
                      )}
                      {review.comment && (
                        <p className="review-comment">{review.comment}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="reviews-modal-footer">
              <button 
                className="service-modal-btn secondary"
                onClick={() => setShowReviewsModal(false)}
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="customer-footer">
        <div className="customer-container">
          <p>&copy; 2024 TamirciBul. Tüm hakları saklıdır.</p>
        </div>
      </footer>

      {/* Service Request Dialog */}
      <ServiceRequestDialog
        isOpen={showRequestDialog}
        onClose={() => {
          setShowRequestDialog(false);
          setRequestService(null);
        }}
        service={requestService}
        userLocation={realUserLocation}
        onSuccess={handleRequestSuccess}
      />
    </div>
  );
}
