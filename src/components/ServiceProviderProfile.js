import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ServiceProviderProfile.css';

const ServiceProviderProfile = () => {
  const navigate = (path) => {
    window.location.hash = path;
  };
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [profile, setProfile] = useState({
    company_name: '',
    description: '',
    service_type: '',
    city: '',
    district: '',
    address: '',
    phone: '',
    working_hours: '',
    logo: '',
    latitude: '',
    longitude: ''
  });

  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);

  const serviceTypes = [
    { value: 'plumbing', label: 'Tesisatçı' },
    { value: 'electrical', label: 'Elektrikçi' },
    { value: 'cleaning', label: 'Temizlik' },
    { value: 'appliance', label: 'Beyaz Eşya Tamiri' },
    { value: 'computer', label: 'Bilgisayar Tamiri' },
    { value: 'phone', label: 'Telefon Tamiri' },
    { value: 'other', label: 'Diğer' }
  ];

  const cities = [
    'İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 
    'Adana', 'Konya', 'Gaziantep', 'Kayseri', 'Eskişehir'
  ];

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/api/service/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setProfile(response.data.data);
        if (response.data.data.logo) {
          setLogoPreview(`http://localhost:8000/storage/${response.data.data.logo}`);
        }
      }
    } catch (error) {
      console.error('Profil yüklenirken hata:', error);
      setMessage({ type: 'error', text: 'Profil yüklenemedi' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2048000) {
        setMessage({ type: 'error', text: 'Logo boyutu 2MB\'dan küçük olmalıdır' });
        return;
      }
      
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;

    setUploadingLogo(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('logo', logoFile);

      const response = await axios.post(
        'http://localhost:8000/api/service/profile/logo',
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        setMessage({ type: 'success', text: 'Logo başarıyla yüklendi' });
        setLogoFile(null);
        fetchProfile();
      }
    } catch (error) {
      console.error('Logo yükleme hatası:', error);
      setMessage({ type: 'error', text: 'Logo yüklenemedi' });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleLogoDelete = async () => {
    if (!window.confirm('Logoyu silmek istediğinizden emin misiniz?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete('http://localhost:8000/api/service/profile/logo', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setMessage({ type: 'success', text: 'Logo silindi' });
        setLogoPreview(null);
        setProfile(prev => ({ ...prev, logo: '' }));
      }
    } catch (error) {
      console.error('Logo silme hatası:', error);
      setMessage({ type: 'error', text: 'Logo silinemedi' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        'http://localhost:8000/api/service/profile',
        profile,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setMessage({ type: 'success', text: 'Profil başarıyla güncellendi' });
        fetchProfile();
      }
    } catch (error) {
      console.error('Profil güncelleme hatası:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Profil güncellenemedi' 
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="spinner"></div>
        <p>Profil yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="service-provider-profile">
      <div className="profile-header">
        <div>
          <button className="back-button" onClick={() => navigate('#/service-dashboard')}>
            ← Geri Dön
          </button>
          <h1>Profil Düzenle</h1>
        </div>
      </div>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="profile-container">
        {/* Logo Section */}
        <div className="profile-section logo-section">
          <h2>Firma Logosu / Fotoğrafı</h2>
          <div className="logo-upload-area">
            {logoPreview ? (
              <div className="logo-preview">
                <img src={logoPreview} alt="Logo" />
                <div className="logo-actions">
                  {logoFile && (
                    <button 
                      onClick={handleLogoUpload} 
                      disabled={uploadingLogo}
                      className="btn-upload"
                    >
                      {uploadingLogo ? 'Yükleniyor...' : 'Yükle'}
                    </button>
                  )}
                  <button onClick={handleLogoDelete} className="btn-delete">
                    Sil
                  </button>
                </div>
              </div>
            ) : (
              <div className="logo-placeholder">
                <span>📷</span>
                <p>Logo yok</p>
              </div>
            )}
            <input
              type="file"
              id="logo-input"
              accept="image/*"
              onChange={handleLogoChange}
              style={{ display: 'none' }}
            />
            <label htmlFor="logo-input" className="btn-select-logo">
              {logoPreview ? 'Logoyu Değiştir' : 'Logo Seç'}
            </label>
            <p className="logo-hint">Maksimum 2MB, JPG, PNG veya GIF</p>
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSubmit} className="profile-form">
          <div className="profile-section">
            <h2>Firma Bilgileri</h2>
            <div className="form-grid">
              <div className="form-group">
                <label>Firma Adı *</label>
                <input
                  type="text"
                  name="company_name"
                  value={profile.company_name || ''}
                  onChange={handleInputChange}
                  required
                  placeholder="Firma adınızı girin"
                />
              </div>

              <div className="form-group">
                <label>Hizmet Türü *</label>
                <select
                  name="service_type"
                  value={profile.service_type || ''}
                  onChange={handleInputChange}
                  required
                  disabled
                >
                  <option value="">Seçiniz</option>
                  {serviceTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <small>Hizmet türü değiştirilemez</small>
              </div>

              <div className="form-group full-width">
                <label>Açıklama</label>
                <textarea
                  name="description"
                  value={profile.description || ''}
                  onChange={handleInputChange}
                  rows="4"
                  placeholder="Firmanız hakkında bilgi verin"
                />
              </div>
            </div>
          </div>

          <div className="profile-section">
            <h2>İletişim Bilgileri</h2>
            <div className="form-grid">
              <div className="form-group">
                <label>Telefon</label>
                <input
                  type="tel"
                  name="phone"
                  value={profile.phone || ''}
                  onChange={handleInputChange}
                  placeholder="0555 123 45 67"
                />
              </div>

              <div className="form-group">
                <label>Şehir</label>
                <select
                  name="city"
                  value={profile.city || ''}
                  onChange={handleInputChange}
                >
                  <option value="">Seçiniz</option>
                  {cities.map(city => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>İlçe</label>
                <input
                  type="text"
                  name="district"
                  value={profile.district || ''}
                  onChange={handleInputChange}
                  placeholder="İlçe adı"
                />
              </div>

              <div className="form-group full-width">
                <label>Adres</label>
                <textarea
                  name="address"
                  value={profile.address || ''}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Tam adresinizi girin"
                />
              </div>
            </div>
          </div>

          <div className="profile-section">
            <h2>Çalışma Bilgileri</h2>
            <div className="form-grid">
              <div className="form-group full-width">
                <label>Çalışma Saatleri</label>
                <input
                  type="text"
                  name="working_hours"
                  value={profile.working_hours || ''}
                  onChange={handleInputChange}
                  placeholder="Örn: Pazartesi-Cuma 09:00-18:00"
                />
              </div>
            </div>
          </div>

          <div className="profile-section">
            <h2>Konum Bilgileri</h2>
            <div className="form-grid">
              <div className="form-group">
                <label>Enlem (Latitude)</label>
                <input
                  type="number"
                  step="0.000001"
                  name="latitude"
                  value={profile.latitude || ''}
                  onChange={handleInputChange}
                  placeholder="41.0082"
                />
              </div>

              <div className="form-group">
                <label>Boylam (Longitude)</label>
                <input
                  type="number"
                  step="0.000001"
                  name="longitude"
                  value={profile.longitude || ''}
                  onChange={handleInputChange}
                  placeholder="28.9784"
                />
              </div>
            </div>
            <p className="hint">
              💡 Konum bilgilerini haritadan otomatik almak için Google Maps'ten koordinatlarınızı kopyalayabilirsiniz
            </p>
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              className="btn-cancel"
              onClick={() => navigate('#/service-dashboard')}
            >
              İptal
            </button>
            <button 
              type="submit" 
              className="btn-save"
              disabled={saving}
            >
              {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ServiceProviderProfile;
