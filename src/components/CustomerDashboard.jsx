import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './CustomerDashboard.css';

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

export default function CustomerDashboard() {
  const auth = useCustomerAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [myRequests, setMyRequests] = useState([]);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    district: ''
  });

  const fetchMyRequests = useCallback(async () => {
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
        setMyRequests(data?.data || []);
      }
    } catch (err) {
      console.error('Error fetching requests:', err);
    } finally {
      setLoading(false);
    }
  }, [auth.token]);

  useEffect(() => {
    if (auth.user) {
      setProfileData({
        name: auth.user.name || '',
        email: auth.user.email || '',
        phone: auth.user.phone || '',
        address: auth.user.customer?.address || '',
        city: auth.user.customer?.city || '',
        district: auth.user.customer?.district || ''
      });
    }
    fetchMyRequests();
  }, [auth.user, fetchMyRequests]);

  const updateProfile = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await fetch('http://localhost:8000/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(profileData)
      });
      
      if (res.ok) {
        const data = await res.json();
        alert('Profil başarıyla güncellendi!');
        // Update local storage
        localStorage.setItem('user_data', JSON.stringify(data.data.user));
        localStorage.setItem('customer_user', JSON.stringify(data.data.user));
      } else {
        const errorData = await res.json();
        alert('Profil güncellenirken hata oluştu: ' + (errorData.message || 'Bilinmeyen hata'));
      }
    } catch (err) {
      console.error('Profile update error:', err);
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
    <div className="customer-dashboard">
      <div className="dashboard-header">
        <h1>Müşteri Paneli</h1>
        <div className="user-info">
          <span>Hoş geldin, {auth.user?.name}!</span>
          <button onClick={auth.logout} className="logout-btn">Çıkış Yap</button>
        </div>
      </div>

      <div className="dashboard-nav">
        <button 
          className={`nav-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          👤 Profilim
        </button>
        <button 
          className={`nav-btn ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          📋 Taleplerim
        </button>
        <button 
          className={`nav-btn ${activeTab === 'services' ? 'active' : ''}`}
          onClick={() => window.location.hash = '#/'}
        >
          🔍 Servis Ara
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'profile' && (
          <div className="profile-section">
            <h2>Profil Bilgileri</h2>
            <form onSubmit={updateProfile} className="profile-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Ad Soyad</label>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>E-posta</label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Telefon</label>
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Şehir</label>
                  <input
                    type="text"
                    value={profileData.city}
                    onChange={(e) => setProfileData({...profileData, city: e.target.value})}
                    placeholder="İstanbul"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>İlçe</label>
                  <input
                    type="text"
                    value={profileData.district}
                    onChange={(e) => setProfileData({...profileData, district: e.target.value})}
                    placeholder="Kadıköy"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Adres</label>
                <textarea
                  value={profileData.address}
                  onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                  placeholder="Tam adresinizi yazın..."
                  rows={3}
                />
              </div>

              <button type="submit" className="update-btn" disabled={loading}>
                {loading ? 'Güncelleniyor...' : 'Profili Güncelle'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="requests-section">
            <div className="section-header">
              <h2>Servis Taleplerim</h2>
              <button 
                className="new-request-btn"
                onClick={() => window.location.hash = '#/'}
              >
                + Yeni Talep Oluştur
              </button>
            </div>

            {loading ? (
              <div className="loading">Talepler yükleniyor...</div>
            ) : myRequests.length === 0 ? (
              <div className="no-requests">
                <p>Henüz hiç servis talebiniz yok.</p>
                <button 
                  className="browse-services-btn"
                  onClick={() => window.location.hash = '#/'}
                >
                  Servislere Göz At
                </button>
              </div>
            ) : (
              <div className="requests-list">
                {myRequests.map(request => (
                  <div key={request.id} className="request-card">
                    <div className="request-header">
                      <h3>{request.title}</h3>
                      <span 
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(request.status) }}
                      >
                        {getStatusText(request.status)}
                      </span>
                    </div>
                    
                    <div className="request-details">
                      <p><strong>Hizmet Türü:</strong> {request.service_type}</p>
                      <p><strong>Açıklama:</strong> {request.description}</p>
                      <p><strong>Konum:</strong> {request.district}, {request.city}</p>
                      {request.budget_min && request.budget_max && (
                        <p><strong>Bütçe:</strong> ₺{request.budget_min} - ₺{request.budget_max}</p>
                      )}
                      <p><strong>Tarih:</strong> {new Date(request.created_at).toLocaleDateString('tr-TR')}</p>
                      
                      {request.service_provider && (
                        <div className="assigned-provider">
                          <strong>Atanan Servis:</strong> {request.service_provider.name}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
