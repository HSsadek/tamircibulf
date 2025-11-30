import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
try {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
} catch (error) {
  console.warn('Leaflet icon setup error:', error);
}

// Custom icons
const userIcon = new L.DivIcon({
  html: `
    <div style="
      background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
      border: 4px solid white;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
      position: relative;
      animation: userPulse 2s infinite;
    ">
      <div style="color: white; font-size: 18px; font-weight: bold;">📍</div>
      <div style="
        position: absolute;
        bottom: -12px;
        background: #4caf50;
        color: white;
        border-radius: 8px;
        padding: 2px 6px;
        font-size: 10px;
        font-weight: bold;
        white-space: nowrap;
      ">Konumunuz</div>
    </div>
    <style>
      @keyframes userPulse {
        0% { box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4), 0 0 0 0 rgba(76, 175, 80, 0.7); }
        70% { box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4), 0 0 0 10px rgba(76, 175, 80, 0); }
        100% { box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4), 0 0 0 0 rgba(76, 175, 80, 0); }
      }
    </style>
  `,
  className: 'custom-user-marker',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20],
});

// Create custom service icon based on service type and logo
const createServiceIcon = (serviceType, rating, logo) => {
  const serviceIcons = {
    'plumbing': '🚰',
    'electrical': '⚡',
    'cleaning': '🧹',
    'appliance': '🔌',
    'computer': '💻',
    'phone': '📱',
    'other': '🛠️'
  };
  
  const icon = serviceIcons[serviceType] || '🛠️';
  
  // Safely convert rating to number and provide fallback
  const numericRating = typeof rating === 'number' ? rating : 
                       typeof rating === 'string' ? parseFloat(rating) : 4.0;
  const safeRating = isNaN(numericRating) ? 4.0 : numericRating;
  
  const ratingColor = safeRating >= 4.5 ? '#4caf50' : safeRating >= 4.0 ? '#ff9800' : '#f44336';
  
  // Use logo if available, otherwise use emoji
  const iconContent = logo ? 
    `<img src="${logo}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />` :
    `<div style="font-size: 20px; line-height: 1;">${icon}</div>`;
  
  return new L.DivIcon({
    html: `
      <div style="
        background: white;
        border: 3px solid ${ratingColor};
        border-radius: 50%;
        width: 50px;
        height: 50px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        font-size: 18px;
        position: relative;
        overflow: hidden;
      ">
        ${iconContent}
        <div style="
          position: absolute;
          bottom: -8px;
          background: ${ratingColor};
          color: white;
          border-radius: 10px;
          padding: 2px 6px;
          font-size: 10px;
          font-weight: bold;
          min-width: 25px;
          text-align: center;
        ">${safeRating.toFixed(1)}</div>
      </div>
    `,
    className: 'custom-service-marker',
    iconAnchor: [25, 25],
    popupAnchor: [0, -25],
  });
};

export default function RealMap({ userLocation, centerLocation, services, focusedServiceId, className = "", height = "400px", onLocationRequest, onLocationSearch, onServiceRequest }) {
  const mapRef = useRef(null);
  const scrollPositionRef = useRef(0);
  const [selectedService, setSelectedService] = useState(null);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [mapReady, setMapReady] = useState(true); // Start ready
  const [mapError, setMapError] = useState(null);
  const [mapInstance, setMapInstance] = useState(null);

  // Modal açıkken body scroll'unu engelle ve scroll pozisyonunu koru
  useEffect(() => {
    if (showServiceModal) {
      scrollPositionRef.current = window.scrollY;
      document.body.style.top = `-${scrollPositionRef.current}px`;
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
      document.body.style.top = '';
      window.scrollTo(0, scrollPositionRef.current);
    }
    
    return () => {
      document.body.classList.remove('modal-open');
      document.body.style.top = '';
    };
  }, [showServiceModal]);
  // Zoom tracking for dynamic loading
  
  // Default center (Istanbul)
  const defaultCenter = [41.0082, 28.9784];
  // Use centerLocation if provided, otherwise userLocation, otherwise default
  const mapCenter = centerLocation ? [centerLocation.lat, centerLocation.lng] : 
                   userLocation ? [userLocation.lat, userLocation.lng] : defaultCenter;
  // Safe services array
  const safeServices = Array.isArray(services) ? services.filter(s => 
    s && typeof s === 'object' && (s.lat || s.latitude) && (s.lng || s.longitude)
  ) : [];

  // Log services changes for debugging
  useEffect(() => {
    console.log('🗺️ RealMap services updated:', safeServices.length, 'services');
  }, [safeServices.length]);

  // Update map center when centerLocation changes
  useEffect(() => {
    if (mapInstance && centerLocation) {
      console.log('🗺️ Centering map to:', centerLocation);
      mapInstance.setView([centerLocation.lat, centerLocation.lng], 12);
    }
  }, [mapInstance, centerLocation]);

  // Handle map clicks for location-based search
  useEffect(() => {
    if (mapInstance && onLocationSearch) {
      const handleMapClick = (e) => {
        const { lat, lng } = e.latlng;
        console.log('🗺️ Map clicked at:', { lat, lng });
        
        // Notify parent component about location search
        onLocationSearch({
          lat: lat,
          lng: lng,
          radius: 20 // Fixed 20km radius for searches
        });
      };

      mapInstance.on('click', handleMapClick);
      
      return () => {
        mapInstance.off('click', handleMapClick);
      };
    }
  }, [mapInstance, onLocationSearch]);

  // Reset states when userLocation changes to prevent stale states
  useEffect(() => {
    if (userLocation) {
      console.log('🗺️ User location updated, keeping map ready');
      setMapError(null);
      setSelectedService(null);
      setShowServiceModal(false);
    }
  }, [userLocation]);

  // Cleanup function
  useEffect(() => {
    return () => {
      if (mapInstance) {
        try {
          mapInstance.remove();
        } catch (error) {
          console.warn('Map cleanup error:', error);
        }
      }
    };
  }, [mapInstance]);
  
  // Disable error state for now - always show map
  if (false && mapError && !mapReady) {
    return (
      <div className={`real-map-container ${className}`} style={{ height, width: '100%', position: 'relative' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          flexDirection: 'column',
          borderRadius: '12px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
          <div style={{ fontSize: '18px', marginBottom: '8px', fontWeight: 'bold' }}>Harita Yükleniyor</div>
          <div style={{ fontSize: '14px', marginBottom: '16px', textAlign: 'center', opacity: 0.9 }}>
            Harita yüklenirken servisleri liste halinde görüntüleyebilirsiniz
          </div>
          <div style={{ 
            background: 'rgba(255,255,255,0.2)', 
            padding: '12px 20px', 
            borderRadius: '8px',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            📍 {safeServices.length} servis mevcut<br/>
            {userLocation && `📍 Konumunuz: ${userLocation.lat.toFixed(3)}, ${userLocation.lng.toFixed(3)}`}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`real-map-container ${className}`} style={{ height, width: '100%', position: 'relative' }}>
      {/* Loading indicator - disabled */}
      
      <MapContainer
        center={mapCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
        key={userLocation ? `map-${userLocation.lat.toFixed(3)}-${userLocation.lng.toFixed(3)}` : 'map-default'}
        whenCreated={(map) => {
          try {
            console.log('🗺️ Map created successfully');
            setMapInstance(map);
            
            // Set ready immediately - don't wait
            setMapReady(true);
            setMapError(null);
            console.log('🗺️ Map set to ready immediately');
            
            // Set cursor to crosshair for location selection
            const mapContainer = map.getContainer();
            mapContainer.style.cursor = 'crosshair';
            console.log('🗺️ RealMap: Map cursor set to crosshair for location selection');
            
          } catch (error) {
            console.error('Map creation error:', error);
            setMapReady(true); // Still allow map to show
          }
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          eventHandlers={{
            loading: () => console.log('🗺️ Tiles loading...'),
            load: () => console.log('🗺️ Tiles loaded successfully'),
            tileerror: (e) => console.warn('🗺️ Tile error:', e)
          }}
        />
        
        {/* User location marker */}
        {mapReady && userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
            <Popup>
              <div style={{ textAlign: 'center', minWidth: '200px' }}>
                <div style={{ fontSize: '18px', marginBottom: '8px', fontWeight: 'bold' }}>
                  📍 Konumunuz
                </div>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                  Lat: {userLocation.lat.toFixed(4)}, Lng: {userLocation.lng.toFixed(4)}
                </div>
                <div style={{ fontSize: '12px', color: '#888' }}>
                  Bu konum tarayıcınız tarafından tespit edilmiştir
                </div>
                <div style={{
                  background: '#e8f5e8',
                  padding: '8px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#2e7d32'
                }}>
                  💡 Yakınınızdaki servisler bu konuma göre sıralanır
                </div>
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* Service markers */}
        {mapReady && safeServices.length > 0 && safeServices.map((service, index) => {
          // Validate coordinates
          const lat = parseFloat(service.lat || service.latitude);
          const lng = parseFloat(service.lng || service.longitude);
          
          if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            console.warn('Invalid coordinates for service:', service.id, lat, lng);
            return null;
          }
          
          // Create unique key
          const uniqueKey = `service-${service.id || index}-${lat}-${lng}`;
          
          return (
            <Marker 
              key={uniqueKey}
              position={[lat, lng]} 
              icon={createServiceIcon(
                service.service_type || service.category || 'other', 
                service.rating !== undefined ? service.rating : 4.0,
                service.logo
              )}
            >
              <Popup>
                <div style={{ minWidth: '250px', maxWidth: '300px' }}>
                  {/* Header */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    marginBottom: '12px',
                    paddingBottom: '8px',
                    borderBottom: '1px solid #eee'
                  }}>
                    <div style={{ 
                      fontSize: '24px', 
                      marginRight: '8px',
                      width: '48px',
                      height: '48px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '8px',
                      overflow: 'hidden'
                    }}>
                      {service.logo ? (
                        <img 
                          src={service.logo} 
                          alt={service.company_name || service.name} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      ) : (
                        service.image || (service.service_type === 'plumbing' ? '🚰' : 
                                          service.service_type === 'electrical' ? '⚡' : 
                                          service.service_type === 'cleaning' ? '🧹' : 
                                          service.service_type === 'appliance' ? '🔌' : 
                                          service.service_type === 'computer' ? '💻' : 
                                          service.service_type === 'phone' ? '📱' : '🛠️')
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#333' }}>
                        {service.company_name || service.name || 'Servis Sağlayıcı'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {service.service_type_name || service.service_type || 'Genel Hizmet'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Rating and Reviews */}
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    {(() => {
                      // Safely handle rating
                      const numericRating = typeof service.rating === 'number' ? service.rating : 
                                           typeof service.rating === 'string' ? parseFloat(service.rating) : 4.0;
                      const safeRating = isNaN(numericRating) ? 4.0 : numericRating;
                      const ratingColor = safeRating >= 4.5 ? '#4caf50' : safeRating >= 4.0 ? '#ff9800' : '#f44336';
                      
                      return (
                        <div style={{ 
                          background: ratingColor,
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          marginRight: '8px'
                        }}>
                          ⭐ {safeRating.toFixed(1)}
                        </div>
                      );
                    })()}
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      ({service.reviews || service.total_reviews || 0} değerlendirme)
                    </span>
                  </div>
                  
                  {/* Location and Distance */}
                  <div style={{ marginBottom: '8px', fontSize: '13px' }}>
                    <div style={{ color: '#666', marginBottom: '2px' }}>
                      📍 {service.district}, {service.city}
                    </div>
                    {service.distanceKm && typeof service.distanceKm === 'number' && (
                      <div style={{ color: '#4caf50', fontWeight: 'bold' }}>
                        🚗 {service.distanceKm.toFixed(1)} km uzaklıkta
                      </div>
                    )}
                  </div>
                  
                  {/* Description */}
                  {service.description && typeof service.description === 'string' && (
                    <div style={{ 
                      fontSize: '13px', 
                      color: '#666', 
                      marginBottom: '12px',
                      lineHeight: '1.4'
                    }}>
                      {service.description.length > 80 ? 
                        service.description.substring(0, 80) + '...' : 
                        service.description}
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        flex: 1,
                        transition: 'transform 0.2s'
                      }}
                      onMouseOver={(e) => e.target.style.transform = 'scale(1.02)'}
                      onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                      onClick={() => {
                        if (onServiceRequest) {
                          onServiceRequest(service);
                        }
                      }}
                    >
                      🛠️ Talep Et
                    </button>
                    <button 
                      style={{
                        background: '#f3f4f6',
                        color: '#374151',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        flex: 1,
                        transition: 'transform 0.2s'
                      }}
                      onMouseOver={(e) => e.target.style.transform = 'scale(1.02)'}
                      onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                      onClick={() => {
                        setSelectedService(service);
                        setShowServiceModal(true);
                      }}
                    >
                      👁️ Detay
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      
      {/* Service Detail Modal */}
      {showServiceModal && selectedService && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            position: 'relative',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '24px',
              borderBottom: '1px solid #eee',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ 
                  fontSize: '32px', 
                  marginRight: '12px',
                  width: '64px',
                  height: '64px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '2px solid #eee'
                }}>
                  {selectedService.logo ? (
                    <img 
                      src={selectedService.logo} 
                      alt={selectedService.company_name || selectedService.name} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  ) : (
                    selectedService.image || (selectedService.service_type === 'plumbing' ? '🚰' : 
                                              selectedService.service_type === 'electrical' ? '⚡' : 
                                              selectedService.service_type === 'cleaning' ? '🧹' : 
                                              selectedService.service_type === 'appliance' ? '🔌' : 
                                              selectedService.service_type === 'computer' ? '💻' : 
                                              selectedService.service_type === 'phone' ? '📱' : '🛠️')
                  )}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '24px', color: '#333' }}>
                    {selectedService.company_name || selectedService.name || 'Servis Sağlayıcı'}
                  </h2>
                  <p style={{ margin: '4px 0 0', color: '#666', fontSize: '14px' }}>
                    {selectedService.service_type_name || selectedService.service_type || 'Genel Hizmet'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowServiceModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#999',
                  padding: '4px'
                }}
              >
                ✕
              </button>
            </div>
            
            {/* Modal Content */}
            <div style={{ padding: '24px' }}>
              {/* Rating and Reviews Section */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '18px', color: '#333' }}>
                  📊 Değerlendirme
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                  {(() => {
                    const numericRating = typeof selectedService.rating === 'number' ? selectedService.rating : 
                                         typeof selectedService.rating === 'string' ? parseFloat(selectedService.rating) : 4.0;
                    const safeRating = isNaN(numericRating) ? 4.0 : numericRating;
                    const ratingColor = safeRating >= 4.5 ? '#4caf50' : safeRating >= 4.0 ? '#ff9800' : '#f44336';
                    
                    return (
                      <>
                        <div style={{
                          background: ratingColor,
                          color: 'white',
                          padding: '8px 16px',
                          borderRadius: '20px',
                          fontSize: '18px',
                          fontWeight: 'bold',
                          marginRight: '12px'
                        }}>
                          ⭐ {safeRating.toFixed(1)}
                        </div>
                        <span style={{ fontSize: '16px', color: '#666' }}>
                          ({selectedService.reviews || selectedService.total_reviews || 0} değerlendirme)
                        </span>
                      </>
                    );
                  })()}
                </div>
                
                {/* Star Rating Display */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                  {[1, 2, 3, 4, 5].map(star => {
                    const numericRating = typeof selectedService.rating === 'number' ? selectedService.rating : 
                                         typeof selectedService.rating === 'string' ? parseFloat(selectedService.rating) : 4.0;
                    const safeRating = isNaN(numericRating) ? 4.0 : numericRating;
                    return (
                      <span key={star} style={{ 
                        fontSize: '24px', 
                        color: star <= safeRating ? '#ffc107' : '#e0e0e0',
                        marginRight: '4px'
                      }}>
                        ⭐
                      </span>
                    );
                  })}
                </div>
              </div>
              
              {/* Service Info */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '18px', color: '#333' }}>
                  ℹ️ Servis Bilgileri
                </h3>
                <div style={{ 
                  background: '#f8f9fa', 
                  padding: '16px', 
                  borderRadius: '12px',
                  marginBottom: '12px'
                }}>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>📍 Konum:</strong> {selectedService.district}, {selectedService.city}
                  </div>
                  {selectedService.distanceKm && typeof selectedService.distanceKm === 'number' && (
                    <div style={{ marginBottom: '8px' }}>
                      <strong>🚗 Mesafe:</strong> {selectedService.distanceKm.toFixed(1)} km
                    </div>
                  )}
                  {selectedService.working_hours && (
                    <div>
                      <strong>🕒 Çalışma Saatleri:</strong> {selectedService.working_hours}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Description */}
              {selectedService.description && typeof selectedService.description === 'string' && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ margin: '0 0 12px', fontSize: '18px', color: '#333' }}>
                    📝 Açıklama
                  </h3>
                  <p style={{ 
                    color: '#666', 
                    lineHeight: '1.6',
                    background: '#f8f9fa',
                    padding: '16px',
                    borderRadius: '12px',
                    margin: 0
                  }}>
                    {selectedService.description}
                  </p>
                </div>
              )}
              
              {/* Mock Reviews Section */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '18px', color: '#333' }}>
                  💬 Son Yorumlar
                </h3>
                {/* Mock reviews */}
                {[
                  { name: 'Ahmet K.', rating: 5, comment: 'Çok memnun kaldım, hızlı ve kaliteli hizmet.', date: '2 gün önce' },
                  { name: 'Fatma S.', rating: 4, comment: 'İyi çalışıyor, tavsiye ederim.', date: '1 hafta önce' },
                  { name: 'Mehmet Y.', rating: 5, comment: 'Profesyonel yaklaşım, teşekkürler.', date: '2 hafta önce' }
                ].map((review, index) => (
                  <div key={index} style={{
                    background: '#f8f9fa',
                    padding: '16px',
                    borderRadius: '12px',
                    marginBottom: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ fontWeight: 'bold', color: '#333' }}>{review.name}</div>
                      <div style={{ fontSize: '12px', color: '#999' }}>{review.date}</div>
                    </div>
                    <div style={{ display: 'flex', marginBottom: '8px' }}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <span key={star} style={{ 
                          fontSize: '16px', 
                          color: star <= review.rating ? '#ffc107' : '#e0e0e0',
                          marginRight: '2px'
                        }}>
                          ⭐
                        </span>
                      ))}
                    </div>
                    <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                      {review.comment}
                    </p>
                  </div>
                ))}
              </div>
              
              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'transform 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.transform = 'scale(1.02)'}
                  onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                  onClick={() => {
                    setShowServiceModal(false);
                    if (onServiceRequest) {
                      onServiceRequest(selectedService);
                    }
                  }}
                >
                  🛠️ Hizmet Talep Et
                </button>
                <button
                  style={{
                    background: '#f8f9fa',
                    color: '#666',
                    border: '1px solid #ddd',
                    padding: '12px 24px',
                    borderRadius: '12px',
                    fontSize: '16px',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.background = '#e9ecef'}
                  onMouseOut={(e) => e.target.style.background = '#f8f9fa'}
                  onClick={() => setShowServiceModal(false)}
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
