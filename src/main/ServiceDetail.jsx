import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
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
  const [service, setService] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  
  const distanceKm = useMemo(() => {
    if (!userLocation || !service) return null;
    return haversineKm(userLocation, { lat: service.latitude, lng: service.longitude });
  }, [userLocation, service]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  }, []);

  useEffect(() => {
    const fetchServiceDetails = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const response = await axios.get(`http://localhost:8000/api/services/${id}`);
        
        if (response.data.success) {
          setService(response.data.data.service);
          setReviews(response.data.data.reviews || []);
        }
      } catch (err) {
        console.error('Error fetching service details:', err);
        setError('Servis detayları yüklenirken hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    fetchServiceDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <a href="#/app" className="text-blue-600 hover:underline text-sm">← Servislere dön</a>
        <div className="mt-4 p-4 text-center">Yükleniyor...</div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <a href="#/app" className="text-blue-600 hover:underline text-sm">← Servislere dön</a>
        <div className="mt-4 p-4 border border-rose-200 bg-rose-50 text-rose-900 rounded-lg">
          {error || 'Aradığınız servis bulunamadı.'}
        </div>
      </div>
    );
  }

  const serviceTypeNames = {
    'plumbing': 'Tesisatçı',
    'electrical': 'Elektrikçi',
    'cleaning': 'Temizlik',
    'appliance': 'Beyaz Eşya',
    'computer': 'Bilgisayar',
    'phone': 'Telefon',
    'other': 'Diğer'
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between">
        <a href="#/app" className="text-blue-600 hover:underline text-sm">← Servislere dön</a>
      </div>

      <div className="mt-3 bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex gap-4">
            {service.logo && (
              <img 
                src={`http://localhost:8000/storage/${service.logo}`} 
                alt={service.company_name}
                className="w-20 h-20 rounded-lg object-cover"
                onError={(e) => e.target.style.display = 'none'}
              />
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{service.company_name || service.user?.name}</h1>
              <p className="text-sm text-gray-600">{service.city} • {service.district}</p>
              <div className="mt-2 text-sm text-gray-700 flex gap-3 items-center">
                <span className="flex items-center gap-1">
                  ⭐ {service.rating ? Number(service.rating).toFixed(1) : '0.0'}
                </span>
                <span>•</span>
                <span>{reviews.length} değerlendirme</span>
                <span>•</span>
                <span>{serviceTypeNames[service.service_type] || service.service_type}</span>
              </div>
              {typeof distanceKm === 'number' && (
                <div className="mt-1 text-xs text-gray-500">📍 Tahmini mesafe: {distanceKm.toFixed(1)} km</div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {service.phone && (
              <a href={`tel:${service.phone}`} className="px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-sm">
                📞 Telefon
              </a>
            )}
            {service.phone && (
              <a 
                href={`https://wa.me/${service.phone.replace(/\D/g, '')}`} 
                target="_blank" 
                rel="noreferrer" 
                className="px-3 py-2 rounded-md border border-green-300 bg-green-50 text-green-900 hover:bg-green-100 text-sm"
              >
                💬 WhatsApp
              </a>
            )}
            {service.latitude && service.longitude && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(service.latitude + ',' + service.longitude)}`}
                target="_blank" 
                rel="noreferrer"
                className="px-3 py-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-sm"
              >
                🗺️ Yol tarifi
              </a>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg border border-gray-200 bg-gray-50">
            <h2 className="font-semibold text-gray-900 mb-2 text-sm">📝 Hakkında</h2>
            <p className="text-sm text-gray-700">{service.description || 'Açıklama bulunmuyor.'}</p>
          </div>
          <div className="p-4 rounded-lg border border-gray-200 bg-gray-50">
            <h2 className="font-semibold text-gray-900 mb-2 text-sm">🕐 Çalışma Saatleri</h2>
            <p className="text-sm text-gray-700">{service.working_hours || 'Belirtilmemiş'}</p>
          </div>
        </div>

        {service.address && (
          <div className="mt-4 p-4 rounded-lg border border-gray-200 bg-gray-50">
            <h2 className="font-semibold text-gray-900 mb-2 text-sm">📍 Adres</h2>
            <p className="text-sm text-gray-700">{service.address}</p>
          </div>
        )}

        {/* Reviews Section */}
        <div className="mt-6 border-t pt-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">⭐ Müşteri Değerlendirmeleri</h2>
          
          {reviews.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">⭐</div>
              <p>Henüz değerlendirme yapılmamış</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => {
                const profileImage = review.customer?.profile_image;
                const imageSrc = profileImage 
                  ? (profileImage.startsWith('data:') 
                      ? profileImage 
                      : `http://localhost:8000/storage/${profileImage}`)
                  : null;

                return (
                  <div key={review.id} className="p-4 border border-gray-200 rounded-lg bg-white hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0">
                        {imageSrc ? (
                          <img 
                            src={imageSrc} 
                            alt={review.customer.name}
                            className="w-full h-full object-cover"
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
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-gray-900">{review.customer.name}</div>
                            <div className="flex items-center gap-1 mt-1">
                              {[...Array(5)].map((_, i) => (
                                <span key={i} className={i < review.rating ? 'text-yellow-400' : 'text-gray-300'}>
                                  {i < review.rating ? '⭐' : '☆'}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(review.rated_at).toLocaleDateString('tr-TR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-gray-600 font-medium">{review.title}</div>
                        {review.comment && (
                          <p className="mt-2 text-sm text-gray-700">{review.comment}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
