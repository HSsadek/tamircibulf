import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import './ServiceDashboard.css';
import './ServiceProviderProfile.css';

function useServiceAuth() {
  return useMemo(() => {
    const serviceToken = localStorage.getItem('service_token');
    const authToken = localStorage.getItem('auth_token');
    const token = serviceToken || authToken;
    
    console.log('=== useServiceAuth Debug ===');
    console.log('service_token:', serviceToken);
    console.log('auth_token:', authToken);
    console.log('final token:', token);
    console.log('user_role:', localStorage.getItem('user_role'));
    
    return {
      get token() { return token; },
      get user() { 
        try { 
          const userData = localStorage.getItem('service_user') || localStorage.getItem('user_data');
          const parsed = JSON.parse(userData || 'null');
          return parsed;
        } catch (error) {
          console.error('Error parsing service user data:', error);
          return null;
        }
      },
      logout() {
        localStorage.removeItem('service_token');
        localStorage.removeItem('service_user');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        localStorage.removeItem('user_role');
        window.location.hash = '#/';
      }
    };
  }, []);
}

export default function ServiceDashboard() {
  const auth = useServiceAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    completedJobs: 0,
    earnings: 0
  });

  // Profile states
  const [profileLoading, setProfileLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });
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

  // Debug user info on component mount
  useEffect(() => {
    console.log('ServiceDashboard mounted');
    console.log('Auth token:', auth.token ? 'Present' : 'Missing');
    console.log('Auth user:', auth.user);
    
    if (!auth.token) {
      console.log('No service token, redirecting to login');
      setTimeout(() => {
        window.location.hash = '#/login';
      }, 100);
      return;
    }
    
    // Simple fetch without useCallback to avoid dependency issues
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        
        console.log('Fetching dashboard data with token:', auth.token);
        
        // Fetch service dashboard data
        const dashboardRes = await fetch('http://localhost:8000/api/service/dashboard', {
          headers: {
            'Authorization': `Bearer ${auth.token}`,
            'Accept': 'application/json'
          }
        });
        
        console.log('Dashboard response status:', dashboardRes.status);
        
        if (dashboardRes.ok) {
          const dashboardData = await dashboardRes.json();
          console.log('Dashboard data received:', dashboardData);
          
          if (dashboardData.success) {
            setStats(dashboardData.data?.stats || {
              totalRequests: 0,
              pendingRequests: 0,
              completedJobs: 0,
              earnings: 0
            });
          }
        } else {
          const errorData = await dashboardRes.json();
          console.error('Dashboard API error:', errorData);
          setError(errorData.message || 'Dashboard verileri alınamadı');
        }
        
        // Fetch service requests
        const requestsRes = await fetch('http://localhost:8000/api/service/requests', {
          headers: {
            'Authorization': `Bearer ${auth.token}`,
            'Accept': 'application/json'
          }
        });
        
        console.log('Requests response status:', requestsRes.status);
        
        if (requestsRes.ok) {
          const requestsData = await requestsRes.json();
          console.log('Requests data received:', requestsData);
          setRequests(requestsData?.data || requestsData?.requests || []);
        } else {
          console.error('Requests API error:', await requestsRes.json());
        }
        
      } catch (err) {
        console.error('Dashboard data fetch error:', err);
        setError('Dashboard verileri yüklenirken hata oluştu: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.token]); // FIXED: Removed auth.user to prevent infinite loop

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const dashboardRes = await fetch('http://localhost:8000/api/service/dashboard', {
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Accept': 'application/json'
        }
      });
      
      if (dashboardRes.ok) {
        const dashboardData = await dashboardRes.json();
        if (dashboardData.success) {
          setStats(dashboardData.data?.stats || stats);
        }
      }
      
    } catch (err) {
      console.error('Refresh error:', err);
      setError('Veriler yenilenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAction = async (requestId, action) => {
    try {
      const res = await fetch(`http://localhost:8000/api/service/requests/${requestId}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (res.ok) {
        // Refresh requests
        fetchDashboardData();
      } else {
        throw new Error('İşlem başarısız');
      }
    } catch (err) {
      console.error('Request action error:', err);
      alert('İşlem sırasında hata oluştu');
    }
  };

  // Profile functions
  const fetchProfile = async () => {
    setProfileLoading(true);
    try {
      const token = localStorage.getItem('service_token') || localStorage.getItem('auth_token') || localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/api/service/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        const profileData = response.data.data;
        // Ensure all fields have proper default values (empty string instead of null)
        setProfile({
          company_name: profileData.company_name || '',
          description: profileData.description || '',
          service_type: profileData.service_type || '',
          city: profileData.city || '',
          district: profileData.district || '',
          address: profileData.address || '',
          phone: profileData.phone || '',
          working_hours: profileData.working_hours || '',
          logo: profileData.logo || '',
          latitude: profileData.latitude || '',
          longitude: profileData.longitude || ''
        });
        
        if (profileData.logo) {
          setLogoPreview(`http://localhost:8000/storage/${profileData.logo}`);
        }
      }
    } catch (error) {
      console.error('Profil yüklenirken hata:', error);
      setProfileMessage({ type: 'error', text: 'Profil yüklenemedi' });
    } finally {
      setProfileLoading(false);
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
        setProfileMessage({ type: 'error', text: 'Logo boyutu 2MB\'dan küçük olmalıdır' });
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
      const token = localStorage.getItem('service_token') || localStorage.getItem('auth_token') || localStorage.getItem('token');
      const formData = new FormData();
      formData.append('logo', logoFile);

      console.log('Uploading logo...', logoFile);

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

      console.log('Logo upload response:', response.data);

      if (response.data.success) {
        setProfileMessage({ type: 'success', text: 'Logo başarıyla yüklendi' });
        setLogoFile(null);
        await fetchProfile();
      }
    } catch (error) {
      console.error('Logo yükleme hatası:', error);
      console.error('Error response:', error.response?.data);
      const errorMsg = error.response?.data?.message || 
                      error.response?.data?.errors ? 
                      Object.values(error.response.data.errors).flat().join(', ') : 
                      'Logo yüklenemedi';
      setProfileMessage({ type: 'error', text: errorMsg });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleLogoDelete = async () => {
    if (!window.confirm('Logoyu silmek istediğinizden emin misiniz?')) return;

    try {
      const token = localStorage.getItem('service_token') || localStorage.getItem('auth_token') || localStorage.getItem('token');
      const response = await axios.delete('http://localhost:8000/api/service/profile/logo', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setProfileMessage({ type: 'success', text: 'Logo silindi' });
        setLogoPreview(null);
        setProfile(prev => ({ ...prev, logo: '' }));
      }
    } catch (error) {
      console.error('Logo silme hatası:', error);
      setProfileMessage({ type: 'error', text: 'Logo silinemedi' });
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setProfileMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('service_token') || localStorage.getItem('auth_token') || localStorage.getItem('token');
      
      // Don't send service_type and logo as they're not in backend validation
      const { service_type, logo, ...profileData } = profile;
      
      // Clean up data - convert empty strings to null or remove them, ensure proper types
      const cleanedData = {};
      Object.keys(profileData).forEach(key => {
        const value = profileData[key];
        // Only include non-empty values
        if (value !== '' && value !== null && value !== undefined) {
          // Convert numeric strings to numbers for latitude/longitude
          if (key === 'latitude' || key === 'longitude') {
            cleanedData[key] = value ? parseFloat(value) : null;
          } else {
            // Ensure strings are strings
            cleanedData[key] = String(value);
          }
        }
      });
      
      const response = await axios.put(
        'http://localhost:8000/api/service/profile',
        cleanedData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setProfileMessage({ type: 'success', text: 'Profil başarıyla güncellendi' });
        fetchProfile();
      }
    } catch (error) {
      console.error('Profil güncelleme hatası:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.errors ? 
                          Object.values(error.response.data.errors).flat().join(', ') : 
                          'Profil güncellenemedi';
      setProfileMessage({ 
        type: 'error', 
        text: errorMessage
      });
    } finally {
      setSaving(false);
    }
  };

  // Load profile when profile tab is active
  useEffect(() => {
    if (activeTab === 'profile' && auth.token) {
      fetchProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const getTabTitle = () => {
    switch (activeTab) {
      case 'overview': return 'Genel Bakış';
      case 'requests': return 'Gelen Talepler';
      case 'jobs': return 'Aktif İşler';
      case 'profile': return 'Profil Ayarları';
      default: return 'Dashboard';
    }
  };

  if (!auth.token) {
    return <div>Yönlendiriliyor...</div>;
  }

  // Early return for loading state
  if (loading) {
    return (
      <div className="service-dashboard" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <h2>Servis Dashboard Yükleniyor...</h2>
          <p>Lütfen bekleyin...</p>
        </div>
      </div>
    );
  }

  // Early return for error state
  if (error) {
    return (
      <div className="service-dashboard" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center', color: 'red' }}>
          <h2>Hata Oluştu</h2>
          <p>{error}</p>
          <button onClick={fetchDashboardData} style={{ padding: '10px 20px', marginTop: '10px' }}>
            Tekrar Dene
          </button>
          <button onClick={() => auth.logout()} style={{ padding: '10px 20px', marginTop: '10px', marginLeft: '10px' }}>
            Çıkış Yap
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="service-dashboard">
      {/* Sidebar */}
      <div className="service-sidebar">
        <div className="service-sidebar-header">
          <h2 className="service-sidebar-title">Servis Panel</h2>
        </div>
        
        <nav className="service-sidebar-nav">
          <button 
            className={`service-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <span className="service-nav-icon">📊</span>
            Genel Bakış
          </button>
          <button 
            className={`service-nav-item ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            <span className="service-nav-icon">📋</span>
            Gelen Talepler
          </button>
          <button 
            className={`service-nav-item ${activeTab === 'jobs' ? 'active' : ''}`}
            onClick={() => setActiveTab('jobs')}
          >
            <span className="service-nav-icon">🔧</span>
            Aktif İşler
          </button>
          <button 
            className={`service-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <span className="service-nav-icon">👤</span>
            Profil Düzenle
          </button>
        </nav>
        
        <div className="service-sidebar-footer">
          <div className="service-user-info">
            <div>
              <div className="service-user-name">
                {auth.user?.name || auth.user?.full_name || auth.user?.username || 
                 (auth.user?.email ? auth.user.email.split('@')[0] : null) || 'Servis Sağlayıcı'}
              </div>
              <div className="service-user-email">
                {auth.user?.email || (auth.token ? 'E-posta bilgisi yok' : 'Giriş yapılmamış')}
              </div>
              <div className="service-user-role">
                {auth.user?.role || auth.user?.user_type || 'Servis Sağlayıcı'}
              </div>
            </div>
            <button className="service-logout-btn" onClick={() => auth.logout()}>
              Çıkış
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="service-main">
        <header className="service-header">
          <h1 className="service-header-title">{getTabTitle()}</h1>
          <div className="service-header-user">
            <span>Hoş geldin, {auth.user?.name || auth.user?.full_name || auth.user?.username || 
                   (auth.user?.email ? auth.user.email.split('@')[0] : null) || 'Servis Sağlayıcı'}</span>
          </div>
        </header>
        
        <div className="service-content">
          {loading && <p>Yükleniyor...</p>}
          {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

          {/* Overview Tab */}
          {activeTab === 'overview' && !loading && (
            <div className="service-overview">
              <div className="service-stats-grid">
                <div className="service-stat-card">
                  <div className="service-stat-icon">📋</div>
                  <div className="service-stat-info">
                    <div className="service-stat-number">{stats.totalRequests}</div>
                    <div className="service-stat-label">Toplam Talep</div>
                  </div>
                </div>
                <div className="service-stat-card">
                  <div className="service-stat-icon">⏳</div>
                  <div className="service-stat-info">
                    <div className="service-stat-number">{stats.pendingRequests}</div>
                    <div className="service-stat-label">Bekleyen Talep</div>
                  </div>
                </div>
                <div className="service-stat-card">
                  <div className="service-stat-icon">✅</div>
                  <div className="service-stat-info">
                    <div className="service-stat-number">{stats.completedJobs}</div>
                    <div className="service-stat-label">Tamamlanan İş</div>
                  </div>
                </div>
                <div className="service-stat-card">
                  <div className="service-stat-icon">💰</div>
                  <div className="service-stat-info">
                    <div className="service-stat-number">₺{stats.earnings}</div>
                    <div className="service-stat-label">Toplam Kazanç</div>
                  </div>
                </div>
              </div>
              
              <div className="service-recent-requests">
                <h3>Son Talepler</h3>
                {requests.slice(0, 5).map(request => (
                  <div key={request.id} className="service-request-item">
                    <div className="service-request-info">
                      <div className="service-request-title">{request.title || request.service_type}</div>
                      <div className="service-request-customer">{request.customer_name}</div>
                      <div className="service-request-date">{new Date(request.created_at).toLocaleDateString('tr-TR')}</div>
                    </div>
                    <div className={`service-request-status ${request.status}`}>
                      {request.status === 'pending' ? 'Bekliyor' : 
                       request.status === 'accepted' ? 'Kabul Edildi' : 
                       request.status === 'completed' ? 'Tamamlandı' : request.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Requests Tab */}
          {activeTab === 'requests' && !loading && (
            <div className="service-requests">
              <div className="service-card">
                <div className="service-card-header">
                  <h2 className="service-card-title">Gelen Talepler</h2>
                </div>
                <div className="service-card-body">
                  {requests.length === 0 ? (
                    <p>Henüz talep bulunmuyor.</p>
                  ) : (
                    requests.map(request => (
                      <div key={request.id} className="service-request-card">
                        <div className="service-request-header">
                          <h4>{request.title || request.service_type}</h4>
                          <span className={`service-status-badge ${request.status}`}>
                            {request.status === 'pending' ? 'Bekliyor' : 
                             request.status === 'accepted' ? 'Kabul Edildi' : 
                             request.status === 'completed' ? 'Tamamlandı' : request.status}
                          </span>
                        </div>
                        <div className="service-request-details">
                          <p><strong>Müşteri:</strong> {request.customer_name}</p>
                          <p><strong>Telefon:</strong> {request.customer_phone}</p>
                          <p><strong>Adres:</strong> {request.address}</p>
                          <p><strong>Açıklama:</strong> {request.description}</p>
                          <p><strong>Tarih:</strong> {new Date(request.created_at).toLocaleDateString('tr-TR')}</p>
                        </div>
                        {request.status === 'pending' && (
                          <div className="service-request-actions">
                            <button 
                              className="service-btn service-btn-success"
                              onClick={() => handleRequestAction(request.id, 'accept')}
                            >
                              Kabul Et
                            </button>
                            <button 
                              className="service-btn service-btn-danger"
                              onClick={() => handleRequestAction(request.id, 'reject')}
                            >
                              Reddet
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && !loading && (
            <div className="service-profile-tab">
              {profileLoading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div className="spinner"></div>
                  <p>Profil yükleniyor...</p>
                </div>
              ) : (
                <>
                  {profileMessage.text && (
                    <div className={`message ${profileMessage.type}`}>
                      {profileMessage.text}
                    </div>
                  )}

                  <div className="profile-container-inline">
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
                    <form onSubmit={handleProfileSubmit} className="profile-form">
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
                          onClick={() => setActiveTab('overview')}
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
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
