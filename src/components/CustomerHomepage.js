/* eslint-disable-next-line */
// @ts-nocheck
/* eslint-disable */
import React, { useState, useEffect, useMemo } from 'react';
import './CustomerHomepage.css';
import RealMap from './RealMap.jsx';

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
      window.location.hash = '#/login';
    }
  }), []);
}

export default function CustomerHomepage() {
  const auth = useCustomerAuth();
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
  const [showAIChat, setShowAIChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('loading'); // 'loading', 'success', 'error', 'denied'
  const [mapZoomData, setMapZoomData] = useState({ zoom: 13, radius: 20 });

  const categories = [
    { id: 'all', name: 'Tümü', icon: '🔧' },
    { id: 'plumbing', name: 'Tesisatçı', icon: '🚰' },
    { id: 'electrical', name: 'Elektrikçi', icon: '⚡' },
    { id: 'cleaning', name: 'Temizlik', icon: '🧹' },
    { id: 'appliance', name: 'Beyaz Eşya', icon: '🔌' },
    { id: 'computer', name: 'Bilgisayar', icon: '💻' },
    { id: 'phone', name: 'Telefon', icon: '📱' },
    { id: 'other', name: 'Diğer', icon: '🛠️' }
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

  useEffect(() => {
    // Refetch when any filter changes including zoom
    fetchServices(1, false);
  }, [userLocation, selectedCategory, searchQuery, mapZoomData.radius]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    filterServices();
  }, [services]); // eslint-disable-line react-hooks/exhaustive-deps

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
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationStatus('success');
        },
        (error) => {
          console.error('Konum alınamadı:', error);
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
          console.log('Konum hatası:', errorMessage);
          if (error.code === error.PERMISSION_DENIED) {
            setLocationStatus('denied');
          } else {
            setLocationStatus('error');
          }
          alert(`Konum alınamadı: ${errorMessage}\n\nVarsayılan konum (İstanbul) kullanılacak.`);
          
          // Default İstanbul koordinatları
          setUserLocation({
            lat: 41.0082,
            lng: 28.9784
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 dakika cache
        }
      );
    } else {
      console.log('Geolocation desteklenmiyor');
      setLocationStatus('error');
      alert('Tarayıcınız konum hizmetlerini desteklemiyor. Varsayılan konum (İstanbul) kullanılacak.');
      // Default İstanbul koordinatları
      setUserLocation({
        lat: 41.0082,
        lng: 28.9784
      });
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

      // Add location-based filtering if available
      if (userLocation) {
        params.append('lat', userLocation.lat.toString());
        params.append('lng', userLocation.lng.toString());
        params.append('radius', mapZoomData.radius.toString()); // Dynamic radius based on zoom
        console.log(`🗺️ CustomerHomepage: Fetching services with radius ${mapZoomData.radius}km from location ${userLocation.lat}, ${userLocation.lng}`);
      }

      // Add filters
      if (selectedCategory && selectedCategory !== 'all') {
        params.append('service_type', selectedCategory);
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
    // Since filtering is now done on backend, just set services as filtered
    setFilteredServices(services);
  };

  const loadMoreServices = () => {
    if (pagination.current_page < pagination.last_page && !loadingMore) {
      fetchServices(pagination.current_page + 1, true);
    }
  };

  const handleServiceRequest = (serviceId) => {
    if (!auth.token) {
      alert('Hizmet talep etmek için giriş yapmalısınız.');
      window.location.hash = '#/login';
      return;
    }
    
    // Service request logic here
    alert('Hizmet talebi gönderildi!');
  };

  const sendAIMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage = { type: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    
    // Simulate AI response
    setTimeout(() => {
      const aiResponse = { 
        type: 'ai', 
        content: `Merhaba! "${chatInput}" konusunda size yardımcı olabilirim. Hangi tür tamir hizmeti arıyorsunuz?` 
      };
      setChatMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  return (
    <div className="customer-homepage">
      {/* Header */}
      <header className="customer-header">
        <div className="customer-header-content">
          <div className="customer-logo">
            <h1>🔧 TamirciBul</h1>
          </div>
          <div className="customer-header-actions">
            {auth.user ? (
              <div className="customer-user-menu">
                <span>Merhaba, {auth.user.name || 'Müşteri'}</span>
                <a href="#/customer-dashboard" className="customer-dashboard-btn">📊 Panelim</a>
                <button onClick={auth.logout} className="customer-logout-btn">Çıkış</button>
              </div>
            ) : (
              <a href="#/login" className="customer-login-btn">Giriş Yap</a>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="customer-hero">
        <div className="customer-hero-content">
          <h2>En Yakın Tamircini Bul</h2>
          <p>Güvenilir ve profesyonel tamir hizmetleri</p>
          
          {/* Search Bar */}
          <div className="customer-search-bar">
            <input 
              type="text"
              placeholder="Hangi hizmeti arıyorsunuz?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="customer-search-input"
            />
            <button className="customer-search-btn">🔍</button>
          </div>
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
            <h3>
              {selectedCategory === 'all' ? 'Tüm Hizmetler' : 
               categories.find(c => c.id === selectedCategory)?.name || 'Hizmetler'}
            </h3>
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
              <RealMap 
                userLocation={userLocation} 
                services={filteredServices} 
                height="500px"
                onLocationRequest={() => {
                  if (navigator.geolocation) {
                    setLocationStatus('loading');
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                        setLocationStatus('success');
                      },
                      (error) => {
                        console.error('Konum alınamadı:', error);
                        setLocationStatus('error');
                        setUserLocation({ lat: 41.0082, lng: 28.9784 }); // Istanbul fallback
                      }
                    );
                  }
                }}
                onLocationSearch={handleLocationSearch}
              />
              <button
                onClick={() => setShowMap(false)}
                style={{
                  position: 'absolute',
                  top: '15px',
                  left: '15px',
                  background: 'white',
                  border: '2px solid #667eea',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  color: '#667eea',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  zIndex: 9999
                }}
              >
                📋 Liste Görünümü
              </button>
            </div>
          ) : (
            <div className="customer-services-grid">
              {filteredServices.map(service => (
                <div key={service.id} className="customer-service-card">
                  <div className="customer-service-header">
                    <div className="customer-service-image">{service.image}</div>
                    <div className="customer-service-info">
                      <h4>{service.name}</h4>
                      <p>{service.description}</p>
                    </div>
                  </div>
                  
                  <div className="customer-service-details">
                    <div className="customer-service-rating">
                      ⭐ {service.rating} ({service.reviews} değerlendirme)
                    </div>
                    <div className="customer-service-distance">📍 {service.distance}</div>
                    <div className="customer-service-price">💰 {service.price}</div>
                  </div>
                  
                  <div className="customer-service-actions">
                    <button 
                      className="customer-service-btn primary"
                      onClick={() => handleServiceRequest(service.id)}
                    >
                      Hizmet Talep Et
                    </button>
                    <button className="customer-service-btn secondary">
                      Detaylar
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

      {/* Footer */}
      <footer className="customer-footer">
        <div className="customer-container">
          <p>&copy; 2024 TamirciBul. Tüm hakları saklıdır.</p>
        </div>
      </footer>
    </div>
  );
}
