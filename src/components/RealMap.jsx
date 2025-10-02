import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
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

// Create custom service icon based on service type
const createServiceIcon = (serviceType, rating) => {
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
      ">
        <div style="font-size: 20px; line-height: 1;">${icon}</div>
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

// MapController component to handle map updates
function MapController({ center, zoom }) {
  const map = useMap();
  
  useEffect(() => {
    if (center && map && typeof map.setView === 'function' && map.getContainer() && map._loaded) {
      try {
        map.setView(center, zoom);
      } catch (error) {
        console.warn('MapController setView error:', error);
      }
    }
  }, [map, center, zoom]);
  
  return null;
}

export default function RealMap({ userLocation, services, focusedServiceId, className = "", height = "400px", onLocationRequest }) {
  const mapRef = useRef(null);
  const [selectedService, setSelectedService] = useState(null);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [mapInstance, setMapInstance] = useState(null);
  
  // Default center (Istanbul)
  const defaultCenter = [41.0082, 28.9784];
  const mapCenter = userLocation ? [userLocation.lat, userLocation.lng] : defaultCenter;
  
  // Safe services array
  const safeServices = Array.isArray(services) ? services.filter(s => 
    s && typeof s === 'object' && (s.lat || s.latitude) && (s.lng || s.longitude)
  ) : [];

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
  
  // Error boundary for map
  if (mapError) {
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
          <div style={{ fontSize: '18px', marginBottom: '8px', fontWeight: 'bold' }}>Harita Geçici Olarak Kullanılamıyor</div>
          <div style={{ fontSize: '14px', marginBottom: '16px', textAlign: 'center', opacity: 0.9 }}>
            Servisler liste halinde görüntüleniyor
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
      {/* Loading indicator */}
      {!mapReady && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1000,
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          🗺️ Harita yükleniyor...
        </div>
      )}
      
      <MapContainer
        center={mapCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
        whenCreated={(map) => {
          try {
            console.log('🗺️ Map created successfully');
            setMapInstance(map);
            
            // Set ready immediately, then verify
            setMapReady(true);
            console.log('🗺️ Map ready');
            
            // Timeout fallback - if map doesn't work after 5 seconds, show error
            setTimeout(() => {
              if (!map || !map.getContainer()) {
                console.error('Map timeout - container not found');
                setMapError('Harita yükleme zaman aşımı');
              }
            }, 5000);
            
          } catch (error) {
            console.error('Map creation error:', error);
            setMapError(error.message);
          }
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {mapReady && <MapController center={mapCenter} zoom={13} />}
        
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
                service.rating !== undefined ? service.rating : 4.0
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
                    <div style={{ fontSize: '24px', marginRight: '8px' }}>
                      {service.image || (service.service_type === 'plumbing' ? '🚰' : 
                                        service.service_type === 'electrical' ? '⚡' : 
                                        service.service_type === 'cleaning' ? '🧹' : 
                                        service.service_type === 'appliance' ? '🔌' : 
                                        service.service_type === 'computer' ? '💻' : 
                                        service.service_type === 'phone' ? '📱' : '🛠️')}
                    </div>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#333' }}>
                        {service.name || 'Servis Sağlayıcı'}
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
                  
                  {/* Price */}
                  {service.price && (
                    <div style={{ marginBottom: '8px' }}>
                      <span style={{ 
                        background: '#e3f2fd', 
                        color: '#1976d2', 
                        padding: '4px 8px', 
                        borderRadius: '8px', 
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        💰 {service.price}
                      </span>
                    </div>
                  )}
                  
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
                  
                  {/* Action Button */}
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
                      width: '100%',
                      transition: 'transform 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.transform = 'scale(1.02)'}
                    onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                    onClick={() => {
                      setSelectedService(service);
                      setShowServiceModal(true);
                    }}
                  >
                    👁️ Görüntüle
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      
      {/* Location button overlay */}
      {onLocationRequest && (
        <button
          onClick={onLocationRequest}
          style={{
            position: 'absolute',
            bottom: '15px',
            right: '15px',
            background: 'white',
            border: '2px solid #4caf50',
            borderRadius: '8px',
            padding: '10px 14px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#4caf50',
            transition: 'all 0.2s ease',
            minWidth: '100px',
            justifyContent: 'center'
          }}
          onMouseOver={(e) => {
            e.target.style.background = '#4caf50';
            e.target.style.color = 'white';
            e.target.style.transform = 'scale(1.05)';
          }}
          onMouseOut={(e) => {
            e.target.style.background = 'white';
            e.target.style.color = '#4caf50';
            e.target.style.transform = 'scale(1)';
          }}
          title="Konumumu al"
        >
          📍 Konumum
        </button>
      )}
      
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
                <div style={{ fontSize: '32px', marginRight: '12px' }}>
                  {selectedService.image || (selectedService.service_type === 'plumbing' ? '🚰' : 
                                            selectedService.service_type === 'electrical' ? '⚡' : 
                                            selectedService.service_type === 'cleaning' ? '🧹' : 
                                            selectedService.service_type === 'appliance' ? '🔌' : 
                                            selectedService.service_type === 'computer' ? '💻' : 
                                            selectedService.service_type === 'phone' ? '📱' : '🛠️')}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '24px', color: '#333' }}>
                    {selectedService.name || 'Servis Sağlayıcı'}
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
                  {selectedService.price && (
                    <div style={{ marginBottom: '8px' }}>
                      <strong>💰 Fiyat:</strong> {selectedService.price}
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
                    const serviceName = selectedService.name || 'Bu servis sağlayıcı';
                    if (window.confirm(`${serviceName} ile iletişime geçmek istiyor musunuz?`)) {
                      alert('Hizmet talebi gönderildi!');
                      setShowServiceModal(false);
                    }
                  }}
                >
                  📞 Hizmet Talep Et
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
