import React, { useEffect, useMemo, useState } from 'react';
import './AdminDashboard.css';

function useAdminAuth() {
  return useMemo(() => ({
    get token() { return localStorage.getItem('admin_token'); },
    get user() { 
      try { 
        const userData = localStorage.getItem('admin_user');
        console.log('Raw user data from localStorage:', userData);
        const parsed = JSON.parse(userData || 'null');
        console.log('Parsed user data:', parsed);
        return parsed;
      } catch (error) {
        console.error('Error parsing user data:', error);
        return null;
      }
    },
    logout() {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.hash = '#/';
    }
  }), []);
}

export default function AdminDashboard() {
  const auth = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [allRequests, setAllRequests] = useState([]); // All requests from server
  const [requests, setRequests] = useState([]); // Current page requests
  const [selected, setSelected] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 10;
  const [total, setTotal] = useState(0);
  const [tab, setTab] = useState('overview'); // 'overview' | 'requests' | 'profile' | 'settings' | 'complaints'
  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0
  });
  const [toast, setToast] = useState({ show: false, type: '', message: '', title: '' });
  
  // Debug user info on component mount
  useEffect(() => {
    console.log('AdminDashboard mounted');
    console.log('Auth token:', auth.token ? 'Present' : 'Missing');
    console.log('Auth user:', auth.user);
    console.log('localStorage admin_user:', localStorage.getItem('admin_user'));
    console.log('localStorage admin_token:', localStorage.getItem('admin_token') ? 'Present' : 'Missing');
  }, [auth.token, auth.user]);

  // Fetch all requests on mount (once)
  useEffect(() => {
    if (!auth.token) {
      window.location.hash = '#/admin-portal';
      return;
    }
    
    // Fetch data only once when component mounts
    (async () => {
      try {
        setLoading(true);
        // Fetch all service requests without pagination
        const url = 'http://localhost:8000/api/admin/service-requests';
        
        console.log('Fetching all requests, URL:', url);
        
        const res = await fetch(url, {
          headers: { 
            'Accept': 'application/json', 
            'Authorization': `Bearer ${auth.token}`,
            'Cache-Control': 'no-cache'
          },
        });
        const contentType = res.headers.get('content-type') || '';
        const data = contentType.includes('application/json') ? (await res.json()) : {};
        if (!res.ok) throw new Error(data?.message || `Listeleme başarısız (HTTP ${res.status})`);
        
        console.log('API Response:', data);
        
        const serverList = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []));
        
        console.log('📋 Başvurular:', serverList);
        console.log('📋 İlk başvuru:', serverList[0]);
        
        setAllRequests(serverList);
        setTotal(serverList.length);
        
        // Calculate stats
        setStats({
          totalRequests: serverList.length,
          pendingRequests: serverList.filter(r => r.status === 'pending').length,
          approvedRequests: serverList.filter(r => r.status === 'active').length,
          rejectedRequests: serverList.filter(r => r.status === 'suspended' || r.status === 'rejected').length
        });
      } catch (err) {
        setError(err?.message || 'İstekler alınamadı.');
      } finally {
        setLoading(false);
      }
    })();
  }, [auth.token]); // Only run once when token is available

  // Handle client-side pagination
  useEffect(() => {
    if (allRequests.length > 0) {
      const startIndex = (page - 1) * perPage;
      const endIndex = startIndex + perPage;
      const pageRequests = allRequests.slice(startIndex, endIndex);
      setRequests(pageRequests);
      console.log(`Showing page ${page}: items ${startIndex + 1}-${Math.min(endIndex, allRequests.length)} of ${allRequests.length}`);
    }
  }, [allRequests, page, perPage]);

  const onApprove = async (id) => {
    if (!auth.token || actionLoading) return;
    try {
      setActionLoading(true);
      const res = await fetch(`http://localhost:8000/api/admin/service-providers/${id}/approve`, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${auth.token}` },
      });
      if (!res.ok) throw new Error('Onay başarısız.');
      
      // Filter out the approved application from both allRequests and current page requests
      const updatedList = allRequests.filter((r) => r.id !== id);
      setAllRequests(updatedList);
      setRequests((list) => list.filter((r) => r.id !== id));
      
      // Update total count and stats
      setTotal((prevTotal) => prevTotal - 1);
      setStats({
        totalRequests: updatedList.length,
        pendingRequests: updatedList.filter(r => r.status === 'pending').length,
        approvedRequests: updatedList.filter(r => r.status === 'active').length,
        rejectedRequests: updatedList.filter(r => r.status === 'suspended' || r.status === 'rejected').length
      });
      
      // Close detail panel
      setPanelOpen(false);
      setSelected(null);
      
      // Show success toast
      showToast('success', 'Başarılı!', 'Başvuru başarıyla onaylandı');
    } catch (err) {
      showToast('error', 'Hata!', err?.message || 'Başvuru onaylanamadı');
    } finally {
      setActionLoading(false);
    }
  };

  const onReject = async (id) => {
    if (!auth.token || actionLoading) return;
    try {
      setActionLoading(true);
      const res = await fetch(`http://localhost:8000/api/admin/service-providers/${id}/reject`, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${auth.token}` },
      });
      if (!res.ok) throw new Error('Reddetme başarısız.');
      
      // Filter out the rejected application from both allRequests and current page requests
      const updatedList = allRequests.filter((r) => r.id !== id);
      setAllRequests(updatedList);
      setRequests((list) => list.filter((r) => r.id !== id));
      
      // Update total count and stats
      setTotal((prevTotal) => prevTotal - 1);
      setStats({
        totalRequests: updatedList.length,
        pendingRequests: updatedList.filter(r => r.status === 'pending').length,
        approvedRequests: updatedList.filter(r => r.status === 'active').length,
        rejectedRequests: updatedList.filter(r => r.status === 'suspended' || r.status === 'rejected').length
      });
      
      // Close detail panel
      setPanelOpen(false);
      setSelected(null);
      
      // Show success toast
      showToast('warning', 'Reddedildi', 'Başvuru reddedildi');
    } catch (err) {
      showToast('error', 'Hata!', err?.message || 'Başvuru reddedilemedi');
    } finally {
      setActionLoading(false);
    }
  };

  const showToast = (type, title, message) => {
    setToast({ show: true, type, title, message });
    setTimeout(() => {
      setToast({ show: false, type: '', title: '', message: '' });
    }, 4000);
  };

  const getTabTitle = () => {
    switch(tab) {
      case 'overview': return '📊 Genel Bakış';
      case 'requests': return '📋 Servis Başvuruları';
      case 'profile': return '👤 Profil Ayarları';
      case 'settings': return '⚙️ Sistem Ayarları';
      default: return '📊 Dashboard';
    }
  };

  return (
    <div className="admin-dashboard">
      {/* Sidebar */}
      <div className="admin-sidebar">
        <div className="admin-sidebar-header">
          <div className="admin-logo">
            <span className="admin-logo-icon">🔧</span>
            <span className="admin-logo-text">TamirciBul</span>
          </div>
          <div className="admin-badge">Admin Panel</div>
        </div>
        
        <nav className="admin-sidebar-nav">
          <button 
            className={`admin-nav-item ${tab === 'overview' ? 'active' : ''}`}
            onClick={() => setTab('overview')}
          >
            <span className="admin-nav-icon">📊</span>
            Genel Bakış
          </button>
          <button 
            className={`admin-nav-item ${tab === 'requests' ? 'active' : ''}`}
            onClick={() => { setTab('requests'); setPage(1); }}
          >
            <span className="admin-nav-icon">📋</span>
            Başvurular
            {stats.pendingRequests > 0 && (
              <span className="admin-badge-count">{stats.pendingRequests}</span>
            )}
          </button>
          <button 
            className={`admin-nav-item ${tab === 'profile' ? 'active' : ''}`}
            onClick={() => setTab('profile')}
          >
            <span className="admin-nav-icon">👤</span>
            Profil
          </button>
          <button 
            className={`admin-nav-item ${tab === 'settings' ? 'active' : ''}`}
            onClick={() => setTab('settings')}
          >
            <span className="admin-nav-icon">⚙️</span>
            Ayarlar
          </button>
        </nav>
        
        <div className="admin-sidebar-footer">
          <div className="admin-user-info">
            <div>
              <div className="admin-user-name">
                {auth.user?.name || auth.user?.full_name || auth.user?.username || 
                 (auth.user?.email ? auth.user.email.split('@')[0] : null) || 'Yönetici'}
              </div>
              <div className="admin-user-email">
                {auth.user?.email || (auth.token ? 'E-posta bilgisi yok' : 'Giriş yapılmamış')}
              </div>
              <div className="admin-user-role">
                {auth.user?.role || auth.user?.user_type || auth.user?.position || 'Admin'}
              </div>
            </div>
            <button className="admin-logout-btn" onClick={() => auth.logout()}>
              Çıkış
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="admin-main">
        <header className="admin-header">
          <h1 className="admin-header-title">{getTabTitle()}</h1>
          <div className="admin-header-user">
            <span>Hoş geldin, {auth.user?.name || auth.user?.full_name || auth.user?.username || 
                   (auth.user?.email ? auth.user.email.split('@')[0] : null) || 'Admin'}</span>
          </div>
        </header>
        
        <div className="admin-content">
          {/* Loading State */}
          {loading && (tab === 'requests' || tab === 'overview') && (
            <div className="admin-loading-container">
              <div className="admin-loading-spinner">
                <div className="admin-spinner-ring"></div>
                <div className="admin-spinner-ring"></div>
                <div className="admin-spinner-ring"></div>
                <div className="admin-spinner-icon">🔧</div>
              </div>
              <p className="admin-loading-text">Veriler yükleniyor...</p>
            </div>
          )}

          {/* Error State */}
          {error && tab==='requests' && !loading && (
            <div className="admin-error-container">
              <div className="admin-error-icon">⚠️</div>
              <p className="admin-error-text">{error}</p>
              <button 
                className="admin-error-retry"
                onClick={() => window.location.reload()}
              >
                🔄 Tekrar Dene
              </button>
            </div>
          )}

          {/* Overview Tab */}
          {tab === 'overview' && !loading && (
            <div className="admin-overview">
              <div className="admin-stats-grid">
                <div className="admin-stat-card">
                  <div className="admin-stat-icon" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
                    📋
                  </div>
                  <div className="admin-stat-content">
                    <h3>{stats.totalRequests}</h3>
                    <p>Toplam Başvuru</p>
                  </div>
                </div>
                
                <div className="admin-stat-card">
                  <div className="admin-stat-icon" style={{background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'}}>
                    ⏳
                  </div>
                  <div className="admin-stat-content">
                    <h3>{stats.pendingRequests}</h3>
                    <p>Bekleyen</p>
                  </div>
                </div>
                
                <div className="admin-stat-card">
                  <div className="admin-stat-icon" style={{background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'}}>
                    ✅
                  </div>
                  <div className="admin-stat-content">
                    <h3>{stats.approvedRequests}</h3>
                    <p>Onaylanan</p>
                  </div>
                </div>
                
                <div className="admin-stat-card">
                  <div className="admin-stat-icon" style={{background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'}}>
                    ❌
                  </div>
                  <div className="admin-stat-content">
                    <h3>{stats.rejectedRequests}</h3>
                    <p>Reddedilen</p>
                  </div>
                </div>
              </div>

              <div className="admin-card" style={{ marginTop: '24px' }}>
                <div className="admin-card-header">
                  <h2 className="admin-card-title">Son Başvurular</h2>
                </div>
                <div className="admin-card-body" style={{ padding: 0 }}>
                  {allRequests.slice(0, 5).map((r) => (
                    <div
                      key={r.id}
                      className="admin-request-item-detailed"
                      onClick={() => {
                        setSelected(r);
                        setPanelOpen(true);
                      }}
                    >
                      <div className="admin-request-icon">
                        {r.service_type === 'plumbing' ? '🚰' :
                         r.service_type === 'electrical' ? '⚡' :
                         r.service_type === 'cleaning' ? '🧹' :
                         r.service_type === 'appliance' ? '🔌' :
                         r.service_type === 'computer' ? '💻' :
                         r.service_type === 'phone' ? '📱' : '🏢'}
                      </div>
                      <div className="admin-request-content">
                        <div className="admin-request-header">
                          <span className="admin-request-company">{r.company_name || r.companyName}</span>
                          <span className={`admin-request-status ${r.status || 'pending'}`}>
                            {r.status === 'active' ? '✅ Onaylandı' : 
                             r.status === 'suspended' ? '❌ Reddedildi' : 
                             r.status === 'rejected' ? '❌ Reddedildi' : '⏳ Beklemede'}
                          </span>
                        </div>
                        <div className="admin-request-meta">
                          <span className="admin-request-type">
                            {r.service_type === 'plumbing' ? 'Tesisatçı' :
                             r.service_type === 'electrical' ? 'Elektrikçi' :
                             r.service_type === 'cleaning' ? 'Temizlik' :
                             r.service_type === 'appliance' ? 'Beyaz Eşya' :
                             r.service_type === 'computer' ? 'Bilgisayar' :
                             r.service_type === 'phone' ? 'Telefon' : 
                             r.serviceType || 'Diğer'}
                          </span>
                          {r.city && (
                            <span className="admin-request-location">📍 {r.district ? `${r.district}, ` : ''}{r.city}</span>
                          )}
                          {r.created_at && (
                            <span className="admin-request-date">📅 {new Date(r.created_at).toLocaleDateString('tr-TR')}</span>
                          )}
                        </div>
                        {r.description && (
                          <div className="admin-request-description">
                            {r.description.substring(0, 80)}{r.description.length > 80 ? '...' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {allRequests.length === 0 && (
                    <div style={{ padding: 48, textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)' }}>
                      Henüz başvuru bulunmuyor.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Requests Tab */}
          {tab==='requests' && !loading && !error && (
            <div className="admin-card">
              <div className="admin-card-body" style={{ padding: 0 }}>
                {(Array.isArray(requests) ? requests : []).map((r) => (
                  <div
                    key={r.id}
                    className="admin-request-item-detailed"
                    onClick={() => {
                      setSelected(r);
                      setPanelOpen(true);
                    }}
                  >
                    <div className="admin-request-icon">
                      {r.service_type === 'plumbing' ? '🚰' :
                       r.service_type === 'electrical' ? '⚡' :
                       r.service_type === 'cleaning' ? '🧹' :
                       r.service_type === 'appliance' ? '🔌' :
                       r.service_type === 'computer' ? '💻' :
                       r.service_type === 'phone' ? '📱' : '🏢'}
                    </div>
                    <div className="admin-request-content">
                      <div className="admin-request-header">
                        <span className="admin-request-company">{r.company_name || r.companyName}</span>
                        <span className={`admin-request-status ${r.status || 'pending'}`}>
                          {r.status === 'active' ? '✅ Onaylandı' : 
                           r.status === 'suspended' ? '❌ Reddedildi' : 
                           r.status === 'rejected' ? '❌ Reddedildi' : '⏳ Beklemede'}
                        </span>
                      </div>
                      <div className="admin-request-meta">
                        <span className="admin-request-type">
                          {r.service_type === 'plumbing' ? 'Tesisatçı' :
                           r.service_type === 'electrical' ? 'Elektrikçi' :
                           r.service_type === 'cleaning' ? 'Temizlik' :
                           r.service_type === 'appliance' ? 'Beyaz Eşya' :
                           r.service_type === 'computer' ? 'Bilgisayar' :
                           r.service_type === 'phone' ? 'Telefon' : 
                           r.serviceType || 'Diğer'}
                        </span>
                        {r.city && (
                          <span className="admin-request-location">📍 {r.district ? `${r.district}, ` : ''}{r.city}</span>
                        )}
                        {r.created_at && (
                          <span className="admin-request-date">📅 {new Date(r.created_at).toLocaleDateString('tr-TR')}</span>
                        )}
                      </div>
                      {r.description && (
                        <div className="admin-request-description">
                          {r.description.substring(0, 80)}{r.description.length > 80 ? '...' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {requests.length === 0 && (
                  <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                    Gösterilecek başvuru bulunamadı.
                  </div>
                )}
              </div>
              
              {requests.length > 0 && (
                <div className="admin-pagination">
                  <div className="admin-pagination-info">
                    Sayfa {page} / {Math.max(1, Math.ceil((total || 0) / perPage))} 
                    ({total > 0 ? `${(page - 1) * perPage + 1}-${Math.min(page * perPage, total)} / ${total}` : `${requests.length} kayıt`})
                  </div>
                  <div className="admin-pagination-controls">
                    <button 
                      className="admin-pagination-btn" 
                      disabled={page === 1} 
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Önceki
                    </button>
                    <button 
                      className="admin-pagination-btn primary" 
                      disabled={page >= Math.ceil((total || 0) / perPage) || (total === 0 && requests.length < perPage)} 
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Sonraki
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Profile Tab */}
          {tab==='profile' && (
            <div className="admin-card">
              <div className="admin-card-header">
                <h2 className="admin-card-title">Profil Bilgileri</h2>
              </div>
              <div className="admin-card-body">
                <form className="admin-form" onSubmit={(e)=>e.preventDefault()}>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Ad Soyad</label>
                    <input 
                      type="text" 
                      className="admin-form-input"
                      defaultValue={auth.user?.name || auth.user?.full_name || auth.user?.username || 
                                   (auth.user?.email ? auth.user.email.split('@')[0] : '') || ''} 
                      placeholder="Ad Soyad" 
                    />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-form-label">E-posta</label>
                    <input 
                      type="email" 
                      className="admin-form-input"
                      defaultValue={auth.user?.email || 'E-posta bilgisi mevcut değil'} 
                      placeholder="E-posta adresi" 
                      readOnly
                    />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Rol</label>
                    <input 
                      type="text" 
                      className="admin-form-input"
                      defaultValue={auth.user?.role || auth.user?.user_type || auth.user?.position || 'Yönetici'} 
                      placeholder="Kullanıcı rolü" 
                      readOnly
                    />
                  </div>
                  {auth.user?.created_at && (
                    <div className="admin-form-group">
                      <label className="admin-form-label">Kayıt Tarihi</label>
                      <input 
                        type="text" 
                        className="admin-form-input"
                        defaultValue={new Date(auth.user.created_at).toLocaleDateString('tr-TR')} 
                        readOnly
                      />
                    </div>
                  )}
                  <div className="admin-form-actions">
                    <button className="admin-form-btn primary" type="submit">Kaydet</button>
                    <button className="admin-form-btn secondary" type="button" onClick={()=>window.location.reload()}>
                      Vazgeç
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {tab==='settings' && (
            <div className="admin-card">
              <div className="admin-card-header">
                <h2 className="admin-card-title">Sistem Ayarları</h2>
              </div>
              <div className="admin-card-body">
                <div className="admin-form">
                  <div className="admin-form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" /> Yeni başvurularda e-posta bildirimi
                    </label>
                  </div>
                  <div className="admin-form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" defaultChecked /> Otomatik liste yenileme
                    </label>
                  </div>
                  <div className="admin-form-actions">
                    <button className="admin-form-btn primary">Ayarları Kaydet</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {panelOpen && selected && (
        <div className="admin-modal-overlay" onClick={() => setPanelOpen(false)}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2 className="admin-modal-title">📋 Başvuru Detayı</h2>
              <button className="admin-modal-close" onClick={() => setPanelOpen(false)}>
                ✕
              </button>
            </div>
            
            <div className="admin-modal-body">
              <div className="admin-detail-section">
                <h3>🏢 Firma Bilgileri</h3>
                <div className="admin-detail-grid">
                  <div className="admin-detail-item">
                    <span className="admin-detail-label">Firma Adı:</span>
                    <span className="admin-detail-value">{selected.company_name || selected.companyName}</span>
                  </div>
                  <div className="admin-detail-item">
                    <span className="admin-detail-label">Servis Türü:</span>
                    <span className="admin-detail-value">
                      {selected.service_type === 'plumbing' ? '🚰 Tesisatçı' :
                       selected.service_type === 'electrical' ? '⚡ Elektrikçi' :
                       selected.service_type === 'cleaning' ? '🧹 Temizlik' :
                       selected.service_type === 'appliance' ? '🔌 Beyaz Eşya' :
                       selected.service_type === 'computer' ? '💻 Bilgisayar' :
                       selected.service_type === 'phone' ? '📱 Telefon' : 
                       selected.serviceType || '🛠️ Diğer'}
                    </span>
                  </div>
                  <div className="admin-detail-item">
                    <span className="admin-detail-label">Durum:</span>
                    <span className={`admin-detail-status ${selected.status || 'pending'}`}>
                      {selected.status === 'active' ? '✅ Onaylandı' : 
                       selected.status === 'suspended' ? '❌ Reddedildi' :
                       selected.status === 'rejected' ? '❌ Reddedildi' : '⏳ Beklemede'}
                    </span>
                  </div>
                  {selected.created_at && (
                    <div className="admin-detail-item">
                      <span className="admin-detail-label">Başvuru Tarihi:</span>
                      <span className="admin-detail-value">
                        {new Date(selected.created_at).toLocaleString('tr-TR')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {selected.description && (
                <div className="admin-detail-section">
                  <h3>📝 Açıklama</h3>
                  <p className="admin-detail-description">{selected.description}</p>
                </div>
              )}

              <div className="admin-detail-section">
                <h3>📞 İletişim Bilgileri</h3>
                <div className="admin-detail-grid">
                  <div className="admin-detail-item full-width">
                    <span className="admin-detail-label">Telefon:</span>
                    <span className="admin-detail-value">
                      {selected.phone || '—'}
                      {selected.phone && (
                        <a 
                          href={`tel:${selected.phone}`}
                          style={{ marginLeft: '8px', color: '#667eea', textDecoration: 'underline' }}
                        >
                          Ara
                        </a>
                      )}
                    </span>
                  </div>
                  <div className="admin-detail-item full-width">
                    <span className="admin-detail-label">E-posta:</span>
                    <span className="admin-detail-value">
                      {selected.email || '—'}
                      {selected.email && (
                        <a 
                          href={`mailto:${selected.email}`}
                          style={{ marginLeft: '8px', color: '#667eea', textDecoration: 'underline' }}
                        >
                          Mail Gönder
                        </a>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {selected.address && (
                <div className="admin-detail-section">
                  <h3>📍 Adres Bilgileri</h3>
                  <div className="admin-detail-grid">
                    <div className="admin-detail-item full-width">
                      <span className="admin-detail-label">Adres:</span>
                      <span className="admin-detail-value">{selected.address}</span>
                    </div>
                    {selected.city && (
                      <div className="admin-detail-item">
                        <span className="admin-detail-label">Şehir:</span>
                        <span className="admin-detail-value">{selected.city}</span>
                      </div>
                    )}
                    {selected.district && (
                      <div className="admin-detail-item">
                        <span className="admin-detail-label">İlçe:</span>
                        <span className="admin-detail-value">{selected.district}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(selected.working_hours || selected.workingHours) && (
                <div className="admin-detail-section">
                  <h3>🕐 Çalışma Saatleri</h3>
                  <p className="admin-detail-description">{selected.working_hours || selected.workingHours}</p>
                </div>
              )}
            </div>
            
            <div className="admin-modal-footer">
              <button 
                className="admin-modal-btn secondary" 
                onClick={() => setPanelOpen(false)}
                disabled={actionLoading}
              >
                Kapat
              </button>
              <button 
                className="admin-modal-btn reject" 
                onClick={() => onReject(selected.id)}
                disabled={actionLoading}
              >
                {actionLoading ? '⏳ İşleniyor...' : '❌ Reddet'}
              </button>
              <button 
                className="admin-modal-btn approve" 
                onClick={() => onApprove(selected.id)}
                disabled={actionLoading}
              >
                {actionLoading ? '⏳ İşleniyor...' : '✅ Onayla'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className={`admin-toast ${toast.type} show`}>
          <div className="admin-toast-icon">
            {toast.type === 'success' && '✅'}
            {toast.type === 'error' && '❌'}
            {toast.type === 'warning' && '⚠️'}
            {toast.type === 'info' && 'ℹ️'}
          </div>
          <div className="admin-toast-content">
            <div className="admin-toast-title">{toast.title}</div>
            <div className="admin-toast-message">{toast.message}</div>
          </div>
          <button className="admin-toast-close" onClick={() => setToast({ ...toast, show: false })}>
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
