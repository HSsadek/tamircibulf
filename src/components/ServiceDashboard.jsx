import React, { useState, useEffect, useMemo } from 'react';
import './ServiceDashboard.css';

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
        window.location.hash = '#/login';
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
            onClick={() => window.location.hash = '#/service-profile'}
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
            <div className="service-profile">
              <div className="service-card">
                <div className="service-card-header">
                  <h2 className="service-card-title">Profil Bilgileri</h2>
                </div>
                <div className="service-card-body">
                  <form className="service-form" onSubmit={(e)=>e.preventDefault()}>
                    <div className="service-form-group">
                      <label className="service-form-label">Ad Soyad</label>
                      <input 
                        type="text" 
                        className="service-form-input"
                        defaultValue={auth.user?.name || auth.user?.full_name || auth.user?.username || 
                                     (auth.user?.email ? auth.user.email.split('@')[0] : '') || ''} 
                        placeholder="Ad Soyad" 
                      />
                    </div>
                    <div className="service-form-group">
                      <label className="service-form-label">E-posta</label>
                      <input 
                        type="email" 
                        className="service-form-input"
                        defaultValue={auth.user?.email || 'E-posta bilgisi mevcut değil'} 
                        placeholder="E-posta adresi" 
                        readOnly
                      />
                    </div>
                    <div className="service-form-group">
                      <label className="service-form-label">Telefon</label>
                      <input 
                        type="tel" 
                        className="service-form-input"
                        defaultValue={auth.user?.phone || ''} 
                        placeholder="Telefon numarası" 
                      />
                    </div>
                    <div className="service-form-group">
                      <label className="service-form-label">Hizmet Türü</label>
                      <input 
                        type="text" 
                        className="service-form-input"
                        defaultValue={auth.user?.service_type || 'Genel Tamir'} 
                        placeholder="Hizmet türü" 
                      />
                    </div>
                    <div className="service-form-actions">
                      <button className="service-form-btn primary" type="submit">Kaydet</button>
                      <button className="service-form-btn secondary" type="button" onClick={()=>window.location.reload()}>
                        Vazgeç
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
