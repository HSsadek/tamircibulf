import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './CustomerDashboard.css';
import { compressImage } from '../utils/imageOptimizer';

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
      // Kullanıcıya özel profil fotoğrafını da temizle
      try {
        const userData = localStorage.getItem('customer_user') || localStorage.getItem('user_data');
        const user = JSON.parse(userData || 'null');
        if (user?.id) {
          const userKey = `customer_profile_image_${user.id}`;
          localStorage.removeItem(userKey);
        }
      } catch (error) {
        console.error('Error cleaning up profile image:', error);
      }
      
      // Eski key'i de temizle (geriye dönük uyumluluk)
      localStorage.removeItem('customer_profile_image');
      
      localStorage.removeItem('customer_token');
      localStorage.removeItem('customer_user');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      localStorage.removeItem('user_role');
      window.location.hash = '#/';
    }
  }), []);
}

export default function CustomerDashboard() {
  const auth = useCustomerAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [myRequests, setMyRequests] = useState([]);
  const [profileImage, setProfileImage] = useState(null);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    district: '',
    latitude: '',
    longitude: ''
  });
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    password: '',
    password_confirmation: ''
  });
  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    completedRequests: 0,
    cancelledRequests: 0
  });
  const [notificationPreferences, setNotificationPreferences] = useState({
    email_notifications: true,
    sms_notifications: true,
    push_notifications: false
  });

  const fetchMyRequests = useCallback(async () => {
    // Token yoksa fetch yapma
    if (!auth.token) {
      console.log('⚠️ Token yok, talepler yüklenemiyor');
      return;
    }
    
    try {
      setLoading(true);
      const res = await fetch('http://localhost:8000/api/services/my-requests', {
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Accept': 'application/json'
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        const requests = data?.data || [];
        setMyRequests(requests);
        
        // Calculate stats
        setStats({
          totalRequests: requests.length,
          pendingRequests: requests.filter(r => r.status === 'pending').length,
          completedRequests: requests.filter(r => r.status === 'completed').length,
          cancelledRequests: requests.filter(r => r.status === 'cancelled').length
        });
      } else if (res.status === 404) {
        console.warn('⚠️ API endpoint bulunamadı:', res.status);
      } else if (res.status === 401) {
        console.warn('⚠️ Yetkilendirme hatası, token geçersiz olabilir');
      }
    } catch (err) {
      console.error('Error fetching requests:', err);
    } finally {
      setLoading(false);
    }
  }, [auth.token]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      alert('Dosya boyutu 2MB\'dan küçük olmalıdır.');
      return;
    }
    
    try {
      // Optimize edilmiş resmi al
      const imageData = await compressImage(file, {
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.7,
        format: 'image/jpeg'
      });
      
      // Hemen göster (localStorage'a kaydetmeden)
      setProfileImage(imageData);
      
      // Backend'e kaydet
      const res = await fetch('http://localhost:8000/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ profile_image: imageData })
      });
      
      if (res.ok) {
        const data = await res.json();
        // Update local storage with new user data
        localStorage.setItem('user_data', JSON.stringify(data.data.user));
        localStorage.setItem('customer_user', JSON.stringify(data.data.user));
        
        // Kullanıcıya özel key ile localStorage'a kaydet (sadece başarılı olursa)
        const userKey = `customer_profile_image_${auth.user?.id}`;
        localStorage.setItem(userKey, imageData);
        
        alert('✅ Profil fotoğrafı başarıyla yüklendi!');
      } else {
        alert('❌ Profil fotoğrafı yüklenirken hata oluştu.');
        setProfileImage(null); // Hata durumunda geri al
      }
    } catch (err) {
      console.error('Error uploading profile image:', err);
      alert('❌ Profil fotoğrafı yüklenirken hata oluştu: ' + err.message);
      setProfileImage(null); // Hata durumunda geri al
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setProfileData({
            ...profileData,
            latitude: position.coords.latitude.toFixed(6),
            longitude: position.coords.longitude.toFixed(6)
          });
          setLoading(false);
          alert('Konum başarıyla alındı!');
        },
        (error) => {
          setLoading(false);
          alert('Konum alınamadı: ' + error.message);
        }
      );
    } else {
      alert('Tarayıcınız konum hizmetlerini desteklemiyor.');
    }
  };

  const updatePassword = async (e) => {
    e.preventDefault();
    
    if (passwordData.password !== passwordData.password_confirmation) {
      alert('Şifreler eşleşmiyor!');
      return;
    }

    if (passwordData.password.length < 6) {
      alert('Şifre en az 6 karakter olmalıdır!');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('http://localhost:8000/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(passwordData)
      });
      
      if (res.ok) {
        alert('Şifre başarıyla güncellendi!');
        setPasswordData({
          current_password: '',
          password: '',
          password_confirmation: ''
        });
      } else {
        const errorData = await res.json();
        alert('Şifre güncellenirken hata oluştu: ' + (errorData.message || 'Bilinmeyen hata'));
      }
    } catch (err) {
      console.error('Password update error:', err);
      alert('Şifre güncellenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const updateNotificationPreference = async (key, value) => {
    try {
      const res = await fetch('http://localhost:8000/api/auth/notifications', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ [key]: value })
      });
      
      if (res.ok) {
        setNotificationPreferences(prev => ({ ...prev, [key]: value }));
      } else {
        alert('Bildirim tercihi güncellenirken hata oluştu.');
      }
    } catch (err) {
      console.error('Notification update error:', err);
      alert('Bildirim tercihi güncellenirken hata oluştu.');
    }
  };

  useEffect(() => {
    // Backend'den güncel kullanıcı bilgilerini al
    const fetchUserData = async () => {
      if (auth.token) {
        try {
          const res = await fetch('http://localhost:8000/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${auth.token}`,
              'Accept': 'application/json'
            }
          });
          
          if (res.ok) {
            const data = await res.json();
            const user = data.data.user;
            
            // localStorage'ı güncelle
            localStorage.setItem('user_data', JSON.stringify(user));
            localStorage.setItem('customer_user', JSON.stringify(user));
            
            // State'leri güncelle
            setProfileData({
              name: user.name || '',
              email: user.email || '',
              phone: user.phone || '',
              address: user.customer?.address || '',
              city: user.customer?.city || '',
              district: user.customer?.district || '',
              latitude: user.customer?.latitude || '',
              longitude: user.customer?.longitude || ''
            });
            
            // Load notification preferences
            if (user.customer) {
              setNotificationPreferences({
                email_notifications: user.customer.email_notifications ?? true,
                sms_notifications: user.customer.sms_notifications ?? true,
                push_notifications: user.customer.push_notifications ?? false
              });
            }
            
            // Load profile image
            if (user.customer?.profile_image) {
              setProfileImage(user.customer.profile_image);
              const userKey = `customer_profile_image_${user.id}`;
              localStorage.setItem(userKey, user.customer.profile_image);
            }
          }
        } catch (err) {
          console.error('Error fetching user data:', err);
        }
      }
    };
    
    fetchUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sadece Overview veya Taleplerim sekmesine tıklandığında fetch yap (bir kez)
  const [requestsFetched, setRequestsFetched] = useState(false);
  
  useEffect(() => {
    if ((activeTab === 'overview' || activeTab === 'requests') && auth.token && !requestsFetched) {
      fetchMyRequests();
      setRequestsFetched(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const updateProfile = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // Profil fotoğrafını da ekle
      const updateData = {
        ...profileData,
        profile_image: profileImage // Profil fotoğrafını ekle
      };
      
      console.log('📤 Profil güncelleme isteği:', updateData);
      
      const res = await fetch('http://localhost:8000/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      
      console.log('📡 Backend yanıtı:', res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log('✅ Güncelleme başarılı:', data);
        alert('Profil başarıyla güncellendi!');
        
        // Update local storage
        localStorage.setItem('user_data', JSON.stringify(data.data.user));
        localStorage.setItem('customer_user', JSON.stringify(data.data.user));
        
        console.log('💾 localStorage güncellendi');
      } else {
        const errorData = await res.json();
        console.error('❌ Backend hatası:', errorData);
        console.error('❌ HTTP Status:', res.status);
        console.error('❌ Gönderilen veri:', updateData);
        alert('Profil güncellenirken hata oluştu: ' + (errorData.message || errorData.error || 'Bilinmeyen hata'));
      }
    } catch (err) {
      console.error('💥 Profile update error:', err);
      alert('Profil güncellenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#ff9800';
      case 'accepted': return '#2196f3';
      case 'in_progress': return '#9c27b0';
      case 'completed': return '#4caf50';
      case 'cancelled': return '#f44336';
      default: return '#757575';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Bekliyor';
      case 'accepted': return 'Kabul Edildi';
      case 'in_progress': return 'Devam Ediyor';
      case 'completed': return 'Tamamlandı';
      case 'cancelled': return 'İptal Edildi';
      default: return status;
    }
  };

  return (
    <div className="customer-dashboard-modern">
      {/* Sidebar */}
      <div className="dashboard-sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">🔧</span>
            <span className="logo-text">TamirciBul</span>
          </div>
        </div>

        <div className="sidebar-profile">
          <div className="profile-image-container">
            {profileImage ? (
              <img src={profileImage} alt="Profile" className="profile-image" />
            ) : (
              <div className="profile-image-placeholder">
                <span>👤</span>
              </div>
            )}
          </div>
          <h3 className="profile-name">{auth.user?.name || 'Müşteri'}</h3>
          <p className="profile-email">{auth.user?.email || ''}</p>
        </div>

        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <span className="nav-icon">📊</span>
            <span className="nav-text">Genel Bakış</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <span className="nav-icon">👤</span>
            <span className="nav-text">Profilim</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            <span className="nav-icon">📋</span>
            <span className="nav-text">Taleplerim</span>
            {stats.pendingRequests > 0 && (
              <span className="badge">{stats.pendingRequests}</span>
            )}
          </button>
          <button 
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <span className="nav-icon">⚙️</span>
            <span className="nav-text">Ayarlar</span>
          </button>
          <button 
            className="nav-item"
            onClick={() => window.location.hash = '#/'}
          >
            <span className="nav-icon">🔍</span>
            <span className="nav-text">Servis Ara</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button onClick={auth.logout} className="logout-button">
            <span className="nav-icon">🚪</span>
            <span className="nav-text">Çıkış Yap</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="dashboard-main">
        <div className="dashboard-header">
          <h1 className="page-title">
            {activeTab === 'overview' && '📊 Genel Bakış'}
            {activeTab === 'profile' && '👤 Profilim'}
            {activeTab === 'requests' && '📋 Taleplerim'}
            {activeTab === 'settings' && '⚙️ Ayarlar'}
          </h1>
          <div className="header-actions">
            <button 
              className="btn-primary"
              onClick={() => window.location.hash = '#/'}
            >
              + Yeni Talep Oluştur
            </button>
          </div>
        </div>

      <div className="dashboard-content">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="overview-section">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
                  📋
                </div>
                <div className="stat-content">
                  <h3>{stats.totalRequests}</h3>
                  <p>Toplam Talep</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon" style={{background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'}}>
                  ⏳
                </div>
                <div className="stat-content">
                  <h3>{stats.pendingRequests}</h3>
                  <p>Bekleyen</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon" style={{background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'}}>
                  ✅
                </div>
                <div className="stat-content">
                  <h3>{stats.completedRequests}</h3>
                  <p>Tamamlanan</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon" style={{background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'}}>
                  ❌
                </div>
                <div className="stat-content">
                  <h3>{stats.cancelledRequests}</h3>
                  <p>İptal Edilen</p>
                </div>
              </div>
            </div>

            <div className="recent-activity">
              <h2>Son Taleplerim</h2>
              {myRequests.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📭</div>
                  <h3>Henüz talep oluşturmadınız</h3>
                  <p>Yakınınızdaki servisleri keşfedin ve hizmet talebinde bulunun</p>
                  <button 
                    className="btn-primary"
                    onClick={() => window.location.hash = '#/'}
                  >
                    Servislere Göz At
                  </button>
                </div>
              ) : (
                <div className="activity-list">
                  {myRequests.slice(0, 5).map(request => (
                    <div key={request.id} className="activity-item">
                      <div className="activity-icon">
                        {request.status === 'completed' ? '✅' : 
                         request.status === 'pending' ? '⏳' : 
                         request.status === 'cancelled' ? '❌' : '🔄'}
                      </div>
                      <div className="activity-content">
                        <h4>{request.title}</h4>
                        <p>{request.description?.substring(0, 60)}...</p>
                        <span className="activity-date">
                          {new Date(request.created_at).toLocaleDateString('tr-TR')}
                        </span>
                      </div>
                      <span 
                        className="activity-status"
                        style={{ backgroundColor: getStatusColor(request.status) }}
                      >
                        {getStatusText(request.status)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="profile-section">
            <div className="profile-card">
              <div className="profile-card-header">
                <h2>👤 Kişisel Bilgiler</h2>
              </div>
              
              <div className="profile-image-upload">
                <div className="image-preview">
                  {profileImage ? (
                    <img src={profileImage} alt="Profile" />
                  ) : (
                    <div className="image-placeholder">
                      <span>👤</span>
                    </div>
                  )}
                </div>
                <div className="upload-controls">
                  <label htmlFor="profile-image-input" className="btn-secondary">
                    📷 Fotoğraf Yükle
                  </label>
                  <input
                    id="profile-image-input"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                  {profileImage && (
                    <button
                      className="btn-danger"
                      onClick={async () => {
                        setProfileImage(null);
                        
                        // Kullanıcıya özel key ile localStorage'dan sil
                        const userKey = `customer_profile_image_${auth.user?.id}`;
                        localStorage.removeItem(userKey);
                        
                        // Backend'den de sil
                        try {
                          await fetch('http://localhost:8000/api/auth/profile', {
                            method: 'PUT',
                            headers: {
                              'Authorization': `Bearer ${auth.token}`,
                              'Content-Type': 'application/json',
                              'Accept': 'application/json'
                            },
                            body: JSON.stringify({ profile_image: null })
                          });
                        } catch (err) {
                          console.error('Error removing profile image:', err);
                        }
                      }}
                    >
                      🗑️ Kaldır
                    </button>
                  )}
                </div>
                <p className="upload-hint">Maksimum 2MB, JPG veya PNG</p>
              </div>

              <form onSubmit={updateProfile} className="profile-form">
                <div className="form-grid">
                  <div className="form-group">
                    <label>👤 Ad Soyad</label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                      placeholder="Adınız Soyadınız"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>📧 E-posta</label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                      placeholder="ornek@email.com"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>📱 Telefon</label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                      placeholder="0555 123 45 67"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>🏙️ Şehir</label>
                    <input
                      type="text"
                      value={profileData.city}
                      onChange={(e) => setProfileData({...profileData, city: e.target.value})}
                      placeholder="İstanbul"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>🏘️ İlçe</label>
                    <input
                      type="text"
                      value={profileData.district}
                      onChange={(e) => setProfileData({...profileData, district: e.target.value})}
                      placeholder="Kadıköy"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>📍 Adres</label>
                  <textarea
                    value={profileData.address}
                    onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                    placeholder="Tam adresinizi yazın..."
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label>🗺️ Konum Bilgileri</label>
                  <div className="location-inputs">
                    <input
                      type="text"
                      value={profileData.latitude}
                      onChange={(e) => setProfileData({...profileData, latitude: e.target.value})}
                      placeholder="Enlem (Latitude)"
                      readOnly
                    />
                    <input
                      type="text"
                      value={profileData.longitude}
                      onChange={(e) => setProfileData({...profileData, longitude: e.target.value})}
                      placeholder="Boylam (Longitude)"
                      readOnly
                    />
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={getCurrentLocation}
                      disabled={loading}
                    >
                      📍 Konumumu Al
                    </button>
                  </div>
                  <p className="form-hint">Konumunuz servis aramasında kullanılır</p>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? '⏳ Güncelleniyor...' : '✅ Profili Güncelle'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <div className="requests-section">
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Talepler yükleniyor...</p>
              </div>
            ) : myRequests.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <h3>Henüz talep oluşturmadınız</h3>
                <p>Yakınınızdaki servisleri keşfedin ve hizmet talebinde bulunun</p>
                <button 
                  className="btn-primary"
                  onClick={() => window.location.hash = '#/'}
                >
                  Servislere Göz At
                </button>
              </div>
            ) : (
              <div className="requests-grid">
                {myRequests.map(request => (
                  <div key={request.id} className="request-card-modern">
                    <div className="request-card-header">
                      <div className="request-icon">
                        {request.service_type === 'plumbing' ? '🚰' :
                         request.service_type === 'electrical' ? '⚡' :
                         request.service_type === 'cleaning' ? '🧹' :
                         request.service_type === 'appliance' ? '🔌' :
                         request.service_type === 'computer' ? '💻' :
                         request.service_type === 'phone' ? '📱' : '🛠️'}
                      </div>
                      <span 
                        className="request-status"
                        style={{ backgroundColor: getStatusColor(request.status) }}
                      >
                        {getStatusText(request.status)}
                      </span>
                    </div>
                    
                    <div className="request-card-body">
                      <h3>{request.title}</h3>
                      <p className="request-description">{request.description}</p>
                      
                      <div className="request-meta">
                        <div className="meta-item">
                          <span className="meta-icon">📍</span>
                          <span>{request.district}, {request.city}</span>
                        </div>
                        <div className="meta-item">
                          <span className="meta-icon">📅</span>
                          <span>{new Date(request.created_at).toLocaleDateString('tr-TR')}</span>
                        </div>
                        {request.budget_min && request.budget_max && (
                          <div className="meta-item">
                            <span className="meta-icon">💰</span>
                            <span>₺{request.budget_min} - ₺{request.budget_max}</span>
                          </div>
                        )}
                      </div>
                      
                      {request.service_provider && (
                        <div className="assigned-provider">
                          <span className="provider-icon">👨‍🔧</span>
                          <span>{request.service_provider.name}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="request-card-footer">
                      <button className="btn-view">👁️ Detaylar</button>
                      {request.status === 'pending' && (
                        <button className="btn-cancel">❌ İptal Et</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="settings-section">
            <div className="settings-card">
              <div className="settings-card-header">
                <h2>🔒 Güvenlik Ayarları</h2>
              </div>
              
              <form onSubmit={updatePassword} className="settings-form">
                <div className="form-group">
                  <label>🔑 Mevcut Şifre</label>
                  <input
                    type="password"
                    value={passwordData.current_password}
                    onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})}
                    placeholder="Mevcut şifrenizi girin"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>🔐 Yeni Şifre</label>
                  <input
                    type="password"
                    value={passwordData.password}
                    onChange={(e) => setPasswordData({...passwordData, password: e.target.value})}
                    placeholder="Yeni şifrenizi girin (min. 6 karakter)"
                    required
                    minLength={6}
                  />
                </div>
                
                <div className="form-group">
                  <label>✅ Yeni Şifre (Tekrar)</label>
                  <input
                    type="password"
                    value={passwordData.password_confirmation}
                    onChange={(e) => setPasswordData({...passwordData, password_confirmation: e.target.value})}
                    placeholder="Yeni şifrenizi tekrar girin"
                    required
                    minLength={6}
                  />
                </div>
                
                <div className="form-actions">
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? '⏳ Güncelleniyor...' : '🔒 Şifreyi Güncelle'}
                  </button>
                </div>
              </form>
            </div>

            <div className="settings-card">
              <div className="settings-card-header">
                <h2>🔔 Bildirim Tercihleri</h2>
              </div>
              
              <div className="settings-options">
                <div className="setting-item">
                  <div className="setting-info">
                    <h4>📧 E-posta Bildirimleri</h4>
                    <p>Talep güncellemeleri için e-posta alın</p>
                  </div>
                  <label className="toggle-switch">
                    <input 
                      type="checkbox" 
                      checked={notificationPreferences.email_notifications}
                      onChange={(e) => updateNotificationPreference('email_notifications', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                
                <div className="setting-item">
                  <div className="setting-info">
                    <h4>📱 SMS Bildirimleri</h4>
                    <p>Önemli güncellemeler için SMS alın</p>
                  </div>
                  <label className="toggle-switch">
                    <input 
                      type="checkbox" 
                      checked={notificationPreferences.sms_notifications}
                      onChange={(e) => updateNotificationPreference('sms_notifications', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                
                <div className="setting-item">
                  <div className="setting-info">
                    <h4>🔔 Push Bildirimleri</h4>
                    <p>Tarayıcı bildirimleri alın</p>
                  </div>
                  <label className="toggle-switch">
                    <input 
                      type="checkbox" 
                      checked={notificationPreferences.push_notifications}
                      onChange={(e) => updateNotificationPreference('push_notifications', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>

            <div className="settings-card danger-zone">
              <div className="settings-card-header">
                <h2>⚠️ Tehlikeli Bölge</h2>
              </div>
              
              <div className="danger-actions">
                <div className="danger-item">
                  <div>
                    <h4>Hesabı Sil</h4>
                    <p>Hesabınızı kalıcı olarak silin. Bu işlem geri alınamaz.</p>
                  </div>
                  <button className="btn-danger">🗑️ Hesabı Sil</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
