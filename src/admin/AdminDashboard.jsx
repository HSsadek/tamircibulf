import React, { useEffect, useMemo, useState } from 'react';

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
  const [tab, setTab] = useState('requests'); // 'requests' | 'profile' | 'settings' | 'complaints'
  
  // Debug user info on component mount
  useEffect(() => {
    console.log('AdminDashboard mounted');
    console.log('Auth token:', auth.token ? 'Present' : 'Missing');
    console.log('Auth user:', auth.user);
    console.log('localStorage admin_user:', localStorage.getItem('admin_user'));
    console.log('localStorage admin_token:', localStorage.getItem('admin_token') ? 'Present' : 'Missing');
  }, [auth.token, auth.user]);

  // Fetch all requests once
  useEffect(() => {
    if (!auth.token) {
      window.location.hash = '#/admin-portal';
      return;
    }
    if (tab !== 'requests') { setLoading(false); return; }
    
    (async () => {
      try {
        setLoading(true);
        // Fetch all service requests without pagination
        const url = new URL('http://localhost:8000/api/get-service-requests');
        // Try to get all data by setting a high limit or no pagination params
        url.searchParams.set('limit', '1000'); // Request many records
        
        console.log('Fetching all requests, URL:', url.toString());
        
        const res = await fetch(url.toString(), {
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
        
        setAllRequests(serverList);
        setTotal(serverList.length);
      } catch (err) {
        setError(err?.message || 'İstekler alınamadı.');
      } finally {
        setLoading(false);
      }
    })();
  }, [auth.token, tab]);

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
      // NOTE: Adjust endpoint/method according to your backend
      const res = await fetch(`http://localhost:8000/api/admin/service-requests/${id}/approve`, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${auth.token}` },
      });
      if (!res.ok) throw new Error('Onay başarısız.');
      
      // Filter out the approved application from both allRequests and current page requests
      setAllRequests((list) => list.filter((r) => r.id !== id));
      setRequests((list) => list.filter((r) => r.id !== id));
      
      // Update total count
      setTotal((prevTotal) => prevTotal - 1);
      
      // Close detail panel
      setPanelOpen(false);
      setSelected(null);
    } catch (err) {
      alert(err?.message || 'Onaylanamadı');
    } finally {
      setActionLoading(false);
    }
  };

  const onReject = async (id) => {
    if (!auth.token || actionLoading) return;
    try {
      setActionLoading(true);
      // NOTE: Adjust endpoint/method according to your backend
      const res = await fetch(`http://localhost:8000/api/admin/service-requests/${id}/reject`, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${auth.token}` },
      });
      if (!res.ok) throw new Error('Reddetme başarısız.');
      
      // Filter out the rejected application from both allRequests and current page requests
      setAllRequests((list) => list.filter((r) => r.id !== id));
      setRequests((list) => list.filter((r) => r.id !== id));
      
      // Update total count
      setTotal((prevTotal) => prevTotal - 1);
      
      // Close detail panel
      setPanelOpen(false);
      setSelected(null);
    } catch (err) {
      alert(err?.message || 'Reddedilemedi');
    } finally {
      setActionLoading(false);
    }
  };

  const getTabTitle = () => {
    switch(tab) {
      case 'requests': return 'Servis Başvuruları';
      case 'complaints': return 'Şikayetler';
      case 'profile': return 'Profil Ayarları';
      case 'settings': return 'Sistem Ayarları';
      default: return 'Dashboard';
    }
  };

  return (
    <div className="admin-dashboard">
      {/* Sidebar */}
      <div className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h1 className="admin-sidebar-title">TamirciBul</h1>
        </div>
        
        <nav className="admin-sidebar-nav">
          <button 
            className={`admin-nav-item ${tab === 'requests' ? 'active' : ''}`}
            onClick={() => { setTab('requests'); setPage(1); }}
          >
            <span className="admin-nav-icon">📋</span>
            Başvurular
          </button>
          <button 
            className={`admin-nav-item ${tab === 'complaints' ? 'active' : ''}`}
            onClick={() => setTab('complaints')}
          >
            <span className="admin-nav-icon">⚠️</span>
            Şikayetler
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
          {loading && <p>Yükleniyor...</p>}
          {error && tab==='requests' && <p style={{ color: 'var(--danger)' }}>{error}</p>}

          {/* Requests Tab */}
          {tab==='requests' && !loading && !error && (
            <div className="admin-card">
              <div className="admin-card-body" style={{ padding: 0 }}>
                {(Array.isArray(requests) ? requests : []).map((r) => (
                  <div
                    key={r.id}
                    className="admin-request-item"
                    onClick={() => {
                      setSelected(r);
                      setPanelOpen(true);
                    }}
                  >
                    <div className="admin-request-company">{r.company_name || r.companyName}</div>
                    <div className={`admin-request-status ${r.status || 'pending'}`}>
                      {r.status === 'approved' ? 'Onaylandı' : r.status === 'rejected' ? 'Reddedildi' : 'Beklemede'}
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

          {/* Complaints Tab */}
          {tab==='complaints' && (
            <div className="admin-card">
              <div className="admin-card-body">
                <h3>Şikayetler</h3>
                <p style={{ color: 'var(--text-muted)' }}>Şikayet yönetimi için API bilgilerini paylaşınca bu listeyi dolduracağım.</p>
              </div>
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

      {/* Detail Panel */}
      {panelOpen && selected && (
        <div className="admin-detail-panel">
          <div className="admin-detail-header">
            <h2 className="admin-detail-title">Başvuru Detayı</h2>
            <button className="admin-detail-close" onClick={() => setPanelOpen(false)}>
              ✕
            </button>
          </div>
          
          <div className="admin-detail-body">
            <div className="admin-detail-field">
              <div className="admin-detail-label">Firma</div>
              <div className="admin-detail-value">{selected.company_name || selected.companyName}</div>
            </div>
            <div className="admin-detail-field">
              <div className="admin-detail-label">Servis Türü</div>
              <div className="admin-detail-value">{selected.service_type || selected.serviceType || '—'}</div>
            </div>
            <div className="admin-detail-field">
              <div className="admin-detail-label">Açıklama</div>
              <div className="admin-detail-value">{selected.description || '—'}</div>
            </div>
            <div className="admin-detail-field">
              <div className="admin-detail-label">Adres</div>
              <div className="admin-detail-value">{selected.address || '—'}</div>
            </div>
            <div className="admin-detail-field">
              <div className="admin-detail-label">Telefon</div>
              <div className="admin-detail-value">{selected.phone || '—'}</div>
            </div>
            <div className="admin-detail-field">
              <div className="admin-detail-label">E-posta</div>
              <div className="admin-detail-value">{selected.email || '—'}</div>
            </div>
          </div>
          
          <div className="admin-detail-actions">
            <button 
              className="admin-detail-btn approve" 
              onClick={() => onApprove(selected.id)}
              disabled={actionLoading}
            >
              {actionLoading ? 'İşleniyor...' : 'Onayla'}
            </button>
            <button 
              className="admin-detail-btn reject" 
              onClick={() => onReject(selected.id)}
              disabled={actionLoading}
            >
              {actionLoading ? 'İşleniyor...' : 'Reddet'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
