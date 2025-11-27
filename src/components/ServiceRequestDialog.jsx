import React, { useState, useEffect } from 'react';
import './ServiceRequestDialog.css';

export default function ServiceRequestDialog({ 
  isOpen, 
  onClose, 
  service, 
  userLocation,
  onSuccess 
}) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Form, 2: Success
  const [formData, setFormData] = useState({
    service_type: '',
    title: '',
    description: '',
    address: '',
    city: '',
    district: '',
    latitude: '',
    longitude: '',
    priority: 'medium'
  });

  useEffect(() => {
    if (isOpen && service) {
      // Servis bilgilerini form'a doldur
      setFormData(prev => ({
        ...prev,
        service_type: service.service_type || '',
        title: `${service.name} - Hizmet Talebi`,
        city: service.city || '',
        district: service.district || '',
        latitude: userLocation?.lat || '',
        longitude: userLocation?.lng || ''
      }));
    }
  }, [isOpen, service, userLocation]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('customer_token');
      
      if (!token) {
        alert('Giriş yapmanız gerekiyor');
        window.location.hash = '#/login';
        return;
      }

      const requestData = {
        ...formData,
        service_provider_id: service?.id || null,
        latitude: parseFloat(formData.latitude) || null,
        longitude: parseFloat(formData.longitude) || null
      };

      console.log('📤 Hizmet talebi gönderiliyor:', requestData);

      const response = await fetch('http://localhost:8000/api/services/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      const data = await response.json();
      console.log('📥 Backend yanıtı:', data);

      if (response.ok && data.success) {
        setStep(2); // Başarı ekranına geç
        if (onSuccess) {
          onSuccess(data.data);
        }
      } else {
        const errorMsg = data.message || 'Hizmet talebi oluşturulamadı';
        const errors = data.errors ? Object.values(data.errors).flat().join('\n') : '';
        alert(`❌ ${errorMsg}\n${errors}`);
      }
    } catch (error) {
      console.error('Hizmet talebi hatası:', error);
      alert('❌ Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setFormData({
      service_type: '',
      title: '',
      description: '',
      address: '',
      city: '',
      district: '',
      latitude: '',
      longitude: '',
      priority: 'medium'
    });
    onClose();
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude.toFixed(6),
            longitude: position.coords.longitude.toFixed(6)
          }));
          setLoading(false);
        },
        (error) => {
          setLoading(false);
          let errorMsg = 'Konum alınamadı';
          if (error.code === error.PERMISSION_DENIED) {
            errorMsg = 'Konum izni reddedildi. Lütfen tarayıcı ayarlarından konum iznini açın.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            errorMsg = 'Konum bilgisi kullanılamıyor.';
          } else if (error.code === error.TIMEOUT) {
            errorMsg = 'Konum alma zaman aşımına uğradı.';
          }
          alert('❌ ' + errorMsg);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      alert('❌ Tarayıcınız konum hizmetlerini desteklemiyor.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="service-request-overlay" onClick={handleClose}>
      <div className="service-request-dialog" onClick={(e) => e.stopPropagation()}>
        {step === 1 ? (
          <>
            {/* Header */}
            <div className="dialog-header">
              <div className="dialog-header-content">
                <h2>🛠️ Hizmet Talebi Oluştur</h2>
                {service && (
                  <div className="service-info-badge">
                    <span className="service-icon">{service.image}</span>
                    <span className="service-name">{service.name}</span>
                  </div>
                )}
              </div>
              <button className="dialog-close" onClick={handleClose}>✕</button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="dialog-form">
              <div className="form-section">
                <h3>📋 Talep Bilgileri</h3>
                
                <div className="form-group">
                  <label>Başlık *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="Örn: Musluk tamiri"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Açıklama *</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Sorununuzu detaylı olarak açıklayın..."
                    rows={4}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Öncelik</label>
                    <select
                      name="priority"
                      value={formData.priority}
                      onChange={handleChange}
                    >
                      <option value="low">Düşük</option>
                      <option value="medium">Orta</option>
                      <option value="high">Yüksek</option>
                      <option value="urgent">Acil</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>📍 Adres Bilgileri</h3>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Şehir *</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="İstanbul"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>İlçe *</label>
                    <input
                      type="text"
                      name="district"
                      value={formData.district}
                      onChange={handleChange}
                      placeholder="Kadıköy"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Adres *</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Tam adresinizi yazın..."
                    rows={2}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Konum (Opsiyonel)</label>
                  <button
                    type="button"
                    className="btn-location-full"
                    onClick={getCurrentLocation}
                    disabled={loading}
                  >
                    {formData.latitude && formData.longitude ? (
                      <>✅ Konum Alındı</>
                    ) : (
                      <>📍 Konumumu Al</>
                    )}
                  </button>
                  <p className="form-hint">
                    {formData.latitude && formData.longitude 
                      ? 'Konumunuz başarıyla alındı ve talebe eklenecek' 
                      : 'Konumunuzu paylaşarak servis sağlayıcının sizi daha kolay bulmasını sağlayın'}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="dialog-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleClose}
                  disabled={loading}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? '⏳ Gönderiliyor...' : '✅ Talep Gönder'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            {/* Success Screen */}
            <div className="success-screen">
              <div className="success-icon">✅</div>
              <h2>Talebiniz Başarıyla Gönderildi!</h2>
              <p>Servis sağlayıcı en kısa sürede sizinle iletişime geçecektir.</p>
              
              <div className="success-info">
                <div className="info-item">
                  <span className="info-icon">📋</span>
                  <div>
                    <strong>Talep:</strong>
                    <p>{formData.title}</p>
                  </div>
                </div>
                
                {service && (
                  <div className="info-item">
                    <span className="info-icon">🔧</span>
                    <div>
                      <strong>Servis:</strong>
                      <p>{service.name}</p>
                    </div>
                  </div>
                )}
                
                <div className="info-item">
                  <span className="info-icon">📍</span>
                  <div>
                    <strong>Adres:</strong>
                    <p>{formData.city}, {formData.district}</p>
                    <p style={{ fontSize: '13px', marginTop: '4px' }}>{formData.address}</p>
                  </div>
                </div>

                <div className="info-item">
                  <span className="info-icon">📅</span>
                  <div>
                    <strong>Talep Tarihi:</strong>
                    <p>{new Date().toLocaleDateString('tr-TR', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
                  </div>
                </div>
              </div>

              <div className="success-actions">
                <button
                  className="btn-primary"
                  onClick={() => window.location.hash = '#/customer-dashboard'}
                >
                  📊 Taleplerime Git
                </button>
                <button
                  className="btn-secondary"
                  onClick={handleClose}
                >
                  ✕ Kapat
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
