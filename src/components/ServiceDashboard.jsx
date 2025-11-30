import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import './ServiceDashboard.css';
import './ServiceProviderProfile.css';
import { compressImage } from '../utils/imageOptimizer';

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
    reviews: 0,
    complaints: 0
  });
  const [reviews, setReviews] = useState([]);
  const [complaints, setComplaints] = useState([]);
  
  // Notification states
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Reject modal states
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingRequestId, setRejectingRequestId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  
  // Delete modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingRequestId, setDeletingRequestId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/service/notifications', {
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Accept': 'application/json'
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        const notifs = data.data || data.notifications || [];
        setNotifications(notifs);
        setUnreadCount(notifs.filter(n => !n.read).length);
      }
    } catch (err) {
      console.error('Notifications fetch error:', err);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await fetch(`http://localhost:8000/api/service/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Accept': 'application/json'
        }
      });
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Mark as read error:', err);
    }
  };

  // Debug user info on component mount
  useEffect(() => {
    console.log('ServiceDashboard mounted');
    console.log('Auth token:', auth.token ? 'Present' : 'Missing');
    console.log('Auth user:', auth.user);
    console.log('User ID:', auth.user?.id);
    
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
        
        console.log('🚀 FETCHING DASHBOARD DATA');
        console.log('🔑 Token:', auth.token);
        console.log('👤 User ID:', auth.user?.id);
        
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
              reviews: 0,
              complaints: 0
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
        
        console.log('📋 Requests response status:', requestsRes.status);
        
        if (requestsRes.ok) {
          const requestsData = await requestsRes.json();
          console.log('📋 Requests data received:', requestsData);
          const allRequests = requestsData?.data || requestsData?.requests || [];
          console.log('📋 Total requests:', allRequests.length);
          
          // Debug each request
          allRequests.forEach((req, index) => {
            console.log(`Request ${index + 1}:`, {
              id: req.id,
              title: req.title,
              rating: req.rating,
              has_complaint: req.has_complaint,
              service_provider_id: req.service_provider_id
            });
          });
          
          setRequests(allRequests);
          
          // Extract reviews and complaints from requests
          const reviewsList = allRequests.filter(r => r.rating && r.rating > 0);
          const complaintsList = allRequests.filter(r => r.has_complaint);
          
          console.log('⭐ Reviews List:', reviewsList);
          console.log('⚠️ Complaints List:', complaintsList);
          
          setReviews(reviewsList);
          setComplaints(complaintsList);
        } else {
          console.error('❌ Requests API error:', await requestsRes.json());
        }
        
        // Fetch notifications
        await fetchNotifications();
        
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
      
      // Fetch dashboard stats
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
      
      // Fetch service requests
      const requestsRes = await fetch('http://localhost:8000/api/service/requests', {
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Accept': 'application/json'
        }
      });
      
      if (requestsRes.ok) {
        const requestsData = await requestsRes.json();
        const allRequests = requestsData?.data || requestsData?.requests || [];
        setRequests(allRequests);
        
        console.log('📊 All Requests:', allRequests);
        console.log('📊 Requests with rating:', allRequests.filter(r => r.rating));
        console.log('📊 Requests with complaints:', allRequests.filter(r => r.has_complaint));
        
        // Extract reviews and complaints from requests
        const reviewsList = allRequests.filter(r => r.rating && r.rating > 0);
        const complaintsList = allRequests.filter(r => r.has_complaint);
        
        console.log('⭐ Reviews List:', reviewsList);
        console.log('⚠️ Complaints List:', complaintsList);
        
        setReviews(reviewsList);
        setComplaints(complaintsList);
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
        // Show success message
        const successMsg = document.createElement('div');
        successMsg.className = 'service-toast service-toast-success';
        successMsg.textContent = action === 'accept' ? '✓ Talep kabul edildi' : '✓ İşlem başarılı';
        document.body.appendChild(successMsg);
        setTimeout(() => successMsg.remove(), 3000);
        
        // Refresh requests
        await fetchDashboardData();
      } else {
        throw new Error('İşlem başarısız');
      }
    } catch (err) {
      console.error('Request action error:', err);
      
      // Show error message
      const errorMsg = document.createElement('div');
      errorMsg.className = 'service-toast service-toast-error';
      errorMsg.textContent = '✕ İşlem sırasında hata oluştu';
      document.body.appendChild(errorMsg);
      setTimeout(() => errorMsg.remove(), 3000);
    }
  };

  const handleRejectClick = (requestId) => {
    setRejectingRequestId(requestId);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectReason.trim()) {
      alert('Lütfen reddetme sebebini belirtin');
      return;
    }

    setIsRejecting(true);
    try {
      const res = await fetch(`http://localhost:8000/api/service/requests/${rejectingRequestId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: rejectReason
        })
      });
      
      if (res.ok) {
        setShowRejectModal(false);
        setRejectReason('');
        setRejectingRequestId(null);
        
        // Show success message
        const successMsg = document.createElement('div');
        successMsg.className = 'service-toast service-toast-success';
        successMsg.textContent = '✓ Talep başarıyla reddedildi';
        document.body.appendChild(successMsg);
        setTimeout(() => successMsg.remove(), 3000);
        
        // Refresh requests
        await fetchDashboardData();
      } else {
        throw new Error('İşlem başarısız');
      }
    } catch (err) {
      console.error('Reject error:', err);
      alert('Reddetme işlemi sırasında hata oluştu');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleRejectCancel = () => {
    setShowRejectModal(false);
    setRejectReason('');
    setRejectingRequestId(null);
  };

  const handleDeleteClick = (requestId) => {
    setDeletingRequestId(requestId);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`http://localhost:8000/api/service/requests/${deletingRequestId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Accept': 'application/json'
        }
      });
      
      if (res.ok) {
        setShowDeleteModal(false);
        setDeletingRequestId(null);
        
        // Show success message
        const successMsg = document.createElement('div');
        successMsg.className = 'service-toast service-toast-success';
        successMsg.textContent = '✓ Talep başarıyla silindi';
        document.body.appendChild(successMsg);
        setTimeout(() => successMsg.remove(), 3000);
        
        // Refresh requests
        await fetchDashboardData();
      } else {
        throw new Error('Silme işlemi başarısız');
      }
    } catch (err) {
      console.error('Delete error:', err);
      
      // Show error message
      const errorMsg = document.createElement('div');
      errorMsg.className = 'service-toast service-toast-error';
      errorMsg.textContent = '✕ Silme işlemi sırasında hata oluştu';
      document.body.appendChild(errorMsg);
      setTimeout(() => errorMsg.remove(), 3000);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setDeletingRequestId(null);
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

  const handleLogoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 2048000) {
      setProfileMessage({ type: 'error', text: 'Logo boyutu 2MB\'dan küçük olmalıdır' });
      return;
    }
    
    try {
      // Optimize edilmiş resmi al
      const compressedImage = await compressImage(file, {
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.8,
        format: 'image/jpeg'
      });
      
      // Blob'a çevir (FormData için)
      const blob = await fetch(compressedImage).then(r => r.blob());
      const optimizedFile = new File([blob], file.name, { type: 'image/jpeg' });
      
      setLogoFile(optimizedFile);
      setLogoPreview(compressedImage);
    } catch (error) {
      console.error('Logo sıkıştırma hatası:', error);
      setProfileMessage({ type: 'error', text: 'Logo işlenirken hata oluştu' });
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
      case 'reviews': return 'Değerlendirmeler';
      case 'complaints': return 'Müşteri Şikayetleri';
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
            className={`service-nav-item ${activeTab === 'reviews' ? 'active' : ''}`}
            onClick={() => setActiveTab('reviews')}
          >
            <span className="service-nav-icon">⭐</span>
            Değerlendirmeler
          </button>
          <button 
            className={`service-nav-item ${activeTab === 'complaints' ? 'active' : ''}`}
            onClick={() => setActiveTab('complaints')}
          >
            <span className="service-nav-icon">⚠️</span>
            Müşteri Şikayetleri
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
          <div className="service-header-actions">
            <button 
              className="service-refresh-btn"
              onClick={fetchDashboardData}
              title="Yenile"
            >
              🔄
            </button>
            <div className="service-notifications-wrapper">
              <button 
                className="service-notifications-btn"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                🔔
                {unreadCount > 0 && (
                  <span className="service-notification-badge">{unreadCount}</span>
                )}
              </button>
              
              {showNotifications && (
                <div className="service-notifications-dropdown">
                  <div className="service-notifications-header">
                    <h3>Bildirimler</h3>
                    <button onClick={() => setShowNotifications(false)}>✕</button>
                  </div>
                  <div className="service-notifications-list">
                    {notifications.length === 0 ? (
                      <div className="service-notification-empty">
                        Henüz bildirim yok
                      </div>
                    ) : (
                      notifications.map(notif => (
                        <div 
                          key={notif.id} 
                          className={`service-notification-item ${!notif.read ? 'unread' : ''}`}
                          onClick={() => !notif.read && markAsRead(notif.id)}
                        >
                          <div className="service-notification-icon">
                            {notif.type === 'new_request' ? '📋' : 
                             notif.type === 'request_accepted' ? '✅' : 
                             notif.type === 'request_completed' ? '🎉' : '📢'}
                          </div>
                          <div className="service-notification-content">
                            <div className="service-notification-title">{notif.title}</div>
                            <div className="service-notification-message">{notif.message}</div>
                            <div className="service-notification-time">
                              {new Date(notif.created_at).toLocaleString('tr-TR')}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="service-header-user">
              <span>Hoş geldin, {auth.user?.name || auth.user?.full_name || auth.user?.username || 
                     (auth.user?.email ? auth.user.email.split('@')[0] : null) || 'Servis Sağlayıcı'}</span>
            </div>
          </div>
        </header>
        
        <div className="service-content">
          {loading && <p>Yükleniyor...</p>}
          {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

          {/* Overview Tab */}
          {activeTab === 'overview' && !loading && (
            <div className="service-overview">
              {/* Modern Stats Cards with Animation */}
              <div className="service-stats-grid">
                <div className="service-stat-card modern">
                  <div className="service-stat-icon-wrapper blue">
                    <div className="service-stat-icon">📋</div>
                  </div>
                  <div className="service-stat-info">
                    <div className="service-stat-number">{stats.totalRequests}</div>
                    <div className="service-stat-label">Toplam Talep</div>
                  </div>
                </div>
                <div className="service-stat-card modern">
                  <div className="service-stat-icon-wrapper orange">
                    <div className="service-stat-icon">⏳</div>
                  </div>
                  <div className="service-stat-info">
                    <div className="service-stat-number">{stats.pendingRequests}</div>
                    <div className="service-stat-label">Bekleyen Talep</div>
                  </div>
                </div>
                <div className="service-stat-card modern">
                  <div className="service-stat-icon-wrapper green">
                    <div className="service-stat-icon">✅</div>
                  </div>
                  <div className="service-stat-info">
                    <div className="service-stat-number">{stats.completedJobs}</div>
                    <div className="service-stat-label">Tamamlanan İş</div>
                  </div>
                </div>
                <div className="service-stat-card modern">
                  <div className="service-stat-icon-wrapper purple">
                    <div className="service-stat-icon">⭐</div>
                  </div>
                  <div className="service-stat-info">
                    <div className="service-stat-number">{stats.reviews || 0}</div>
                    <div className="service-stat-label">Değerlendirme</div>
                  </div>
                </div>
                <div className="service-stat-card modern">
                  <div className="service-stat-icon-wrapper red">
                    <div className="service-stat-icon">⚠️</div>
                  </div>
                  <div className="service-stat-info">
                    <div className="service-stat-number">{stats.complaints}</div>
                    <div className="service-stat-label">Müşteri Şikayeti</div>
                  </div>
                </div>
              </div>
              
              {/* Recent Requests with Modern Design */}
              <div className="service-recent-requests modern">
                <div className="service-section-header">
                  <h3>Son Talepler</h3>
                  <button 
                    className="service-view-all-btn"
                    onClick={() => setActiveTab('requests')}
                  >
                    Tümünü Gör →
                  </button>
                </div>
                <div className="service-requests-list">
                  {requests.length === 0 ? (
                    <div className="service-empty-state">
                      <div className="service-empty-icon">📭</div>
                      <p>Henüz talep bulunmuyor</p>
                    </div>
                  ) : (
                    requests.slice(0, 5).map(request => {
                      const profileImage = request.customer?.customer?.profile_image;
                      const customerName = request.customer?.name || request.customer_name || 'Müşteri';
                      
                      // Check if profile_image is base64 or file path
                      const imageSrc = profileImage 
                        ? (profileImage.startsWith('data:') 
                            ? profileImage 
                            : `http://localhost:8000/storage/${profileImage}`)
                        : null;
                      
                      return (
                      <div key={request.id} className="service-request-item modern">
                        <div className="service-request-avatar">
                          {imageSrc ? (
                            <img 
                              src={imageSrc} 
                              alt={customerName}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <span style={{ display: imageSrc ? 'none' : 'flex' }}>
                            {customerName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="service-request-info">
                          <div className="service-request-title">{request.title || request.service_type}</div>
                          <div className="service-request-meta">
                            <span className="service-request-customer">👤 {customerName}</span>
                            <span className="service-request-date">📅 {new Date(request.created_at).toLocaleDateString('tr-TR')}</span>
                          </div>
                        </div>
                        <div className={`service-request-status modern ${request.status}`}>
                          {request.status === 'pending' ? '⏳ Bekliyor' : 
                           request.status === 'accepted' ? '✅ Kabul Edildi' : 
                           request.status === 'completed' ? '🎉 Tamamlandı' : 
                           request.status === 'rejected' ? '❌ Reddedildi' : 
                           request.status === 'cancelled' ? '🚫 İptal Edildi' : request.status}
                        </div>
                      </div>
                    )})
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Requests Tab */}
          {activeTab === 'requests' && !loading && (
            <div className="service-requests modern">
              {requests.length === 0 ? (
                <div className="service-empty-state">
                  <div className="service-empty-icon">📭</div>
                  <h3>Henüz talep bulunmuyor</h3>
                  <p>Yeni talepler geldiğinde burada görünecek.</p>
                </div>
              ) : (
                <div className="service-requests-grid">
                  {requests.map(request => {
                    const customerName = request.customer?.name || 'Müşteri';
                    const customerPhone = request.customer?.phone || 'Belirtilmemiş';
                    const createdDate = new Date(request.created_at);
                    const profileImage = request.customer?.customer?.profile_image;
                    
                    const imageSrc = profileImage 
                      ? (profileImage.startsWith('data:') 
                          ? profileImage 
                          : `http://localhost:8000/storage/${profileImage}`)
                      : null;
                    
                    return (
                    <div key={request.id} className="service-request-card modern">
                      {/* Delete Button for Rejected/Cancelled Requests */}
                      {(request.status === 'rejected' || request.status === 'cancelled') && (
                        <button 
                          className="service-delete-btn"
                          onClick={() => handleDeleteClick(request.id)}
                          title="Talebi Sil"
                        >
                          🗑️
                        </button>
                      )}
                      
                      {/* Card Header with Customer Info */}
                      <div className="service-request-card-header">
                        <div className="service-customer-info">
                          <div className="service-customer-avatar">
                            {imageSrc ? (
                              <img 
                                src={imageSrc} 
                                alt={customerName}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <span style={{ display: imageSrc ? 'none' : 'flex' }}>
                              {customerName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="service-customer-details">
                            <div className="service-customer-name">{customerName}</div>
                            <div className="service-customer-phone">📞 {customerPhone}</div>
                          </div>
                        </div>
                        <span className={`service-status-badge modern ${request.status}`}>
                          {request.status === 'pending' ? '⏳ Bekliyor' : 
                           request.status === 'accepted' ? '✅ Kabul Edildi' : 
                           request.status === 'completed' ? '🎉 Tamamlandı' : 
                           request.status === 'rejected' ? '❌ Reddedildi' : 
                           request.status === 'cancelled' ? '🚫 İptal Edildi' : request.status}
                        </span>
                      </div>

                      {/* Card Body */}
                      <div className="service-request-card-body">
                        <h3 className="service-request-title">{request.title || request.service_type}</h3>
                        <p className="service-request-description">{request.description}</p>
                        
                        {/* Rejection Reason */}
                        {request.status === 'rejected' && request.cancellation_reason && (
                          <div className="service-rejection-reason-box">
                            <div className="service-rejection-reason-header">
                              <span className="service-rejection-icon">⚠️</span>
                              <strong>Reddetme Sebebiniz:</strong>
                            </div>
                            <p className="service-rejection-reason-text">{request.cancellation_reason}</p>
                          </div>
                        )}
                        
                        <div className="service-request-meta-grid">
                          <div className="service-meta-item">
                            <span className="service-meta-icon">📍</span>
                            <div className="service-meta-content">
                              <div className="service-meta-label">Adres</div>
                              <div className="service-meta-value">{request.address}</div>
                            </div>
                          </div>
                          <div className="service-meta-item">
                            <span className="service-meta-icon">📅</span>
                            <div className="service-meta-content">
                              <div className="service-meta-label">Tarih</div>
                              <div className="service-meta-value">
                                {createdDate.toLocaleDateString('tr-TR')} {createdDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                          {request.budget_min && request.budget_max && (
                            <div className="service-meta-item">
                              <span className="service-meta-icon">💰</span>
                              <div className="service-meta-content">
                                <div className="service-meta-label">Bütçe</div>
                                <div className="service-meta-value">
                                  ₺{request.budget_min} - ₺{request.budget_max}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Footer with Actions */}
                      {request.status === 'pending' && (
                        <div className="service-request-card-footer">
                          <button 
                            className="service-btn service-btn-success modern"
                            onClick={() => handleRequestAction(request.id, 'accept')}
                          >
                            ✓ Kabul Et
                          </button>
                          <button 
                            className="service-btn service-btn-danger modern"
                            onClick={() => handleRejectClick(request.id)}
                          >
                            ✕ Reddet
                          </button>
                        </div>
                      )}
                    </div>
                  )})}
                </div>
              )}
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && !loading && (
            <div className="service-reviews modern">
              {reviews.length === 0 ? (
                <div className="service-empty-state">
                  <div className="service-empty-icon">⭐</div>
                  <h3>Henüz değerlendirme yok</h3>
                  <p>Müşterileriniz hizmetlerinizi değerlendirdiğinde burada görünecek.</p>
                </div>
              ) : (
                <div className="service-reviews-list">
                  <div className="reviews-list-header">
                    <h3>Toplam {reviews.length} Değerlendirme</h3>
                    <div className="average-rating">
                      <span className="avg-rating-number">
                        {(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)}
                      </span>
                      <span className="avg-rating-stars">⭐</span>
                    </div>
                  </div>
                  
                  {reviews.map(review => {
                    const customerName = review.customer?.name || 'Müşteri';
                    const customerPhone = review.customer?.phone || 'Belirtilmemiş';
                    const profileImage = review.customer?.customer?.profile_image;
                    const imageSrc = profileImage 
                      ? (profileImage.startsWith('data:') 
                          ? profileImage 
                          : `http://localhost:8000/storage/${profileImage}`)
                      : null;
                    
                    return (
                      <div key={review.id} className="service-review-row">
                        <div className="review-row-left">
                          <div className="review-customer-avatar">
                            {imageSrc ? (
                              <img 
                                src={imageSrc} 
                                alt={customerName}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <span style={{ display: imageSrc ? 'none' : 'flex' }}>
                              {customerName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="review-customer-info">
                            <div className="review-customer-name">{customerName}</div>
                            <div className="review-customer-phone">📞 {customerPhone}</div>
                            <div className="review-date">
                              {new Date(review.rated_at || review.created_at).toLocaleDateString('tr-TR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </div>
                          </div>
                        </div>
                        
                        <div className="review-row-center">
                          <div className="review-rating-stars">
                            {[...Array(5)].map((_, i) => (
                              <span key={i} className={`star ${i < review.rating ? 'filled' : ''}`}>
                                {i < review.rating ? '⭐' : '☆'}
                              </span>
                            ))}
                          </div>
                          <h4 className="review-title">{review.title}</h4>
                          {review.rating_comment && (
                            <p className="review-comment">{review.rating_comment}</p>
                          )}
                        </div>
                        
                        <div className="review-row-right">
                          <span className="review-location">
                            📍 {review.district}, {review.city}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Complaints Tab */}
          {activeTab === 'complaints' && !loading && (
            <div className="service-complaints modern">
              {complaints.length === 0 ? (
                <div className="service-empty-state">
                  <div className="service-empty-icon">✅</div>
                  <h3>Harika! Henüz şikayet yok</h3>
                  <p>Müşterileriniz hizmetinizden memnun görünüyor.</p>
                </div>
              ) : (
                <div className="service-complaints-list">
                  <div className="complaints-list-header">
                    <h3>Toplam {complaints.length} Şikayet</h3>
                    <div className="complaints-warning-badge">
                      <span className="warning-icon">⚠️</span>
                      <span>Dikkat Gerekli</span>
                    </div>
                  </div>
                  
                  {complaints.map(complaint => {
                    const customerName = complaint.customer?.name || 'Müşteri';
                    const customerPhone = complaint.customer?.phone || 'Belirtilmemiş';
                    const profileImage = complaint.customer?.customer?.profile_image;
                    const imageSrc = profileImage 
                      ? (profileImage.startsWith('data:') 
                          ? profileImage 
                          : `http://localhost:8000/storage/${profileImage}`)
                      : null;
                    
                    const reasonLabels = {
                      'poor_service': 'Kötü Hizmet Kalitesi',
                      'late_arrival': 'Geç Geldi',
                      'no_show': 'Gelmedi',
                      'unprofessional': 'Profesyonel Olmayan Davranış',
                      'overpricing': 'Fahiş Fiyat',
                      'incomplete_work': 'Eksik İş',
                      'damage': 'Hasar Verdi',
                      'other': 'Diğer'
                    };
                    
                    return (
                      <div key={complaint.id} className="service-complaint-row">
                        <div className="complaint-row-left">
                          <div className="complaint-customer-avatar">
                            {imageSrc ? (
                              <img 
                                src={imageSrc} 
                                alt={customerName}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <span style={{ display: imageSrc ? 'none' : 'flex' }}>
                              {customerName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="complaint-customer-info">
                            <div className="complaint-customer-name">{customerName}</div>
                            <div className="complaint-customer-phone">📞 {customerPhone}</div>
                            <div className="complaint-date">
                              {new Date(complaint.complaint_date || complaint.created_at).toLocaleDateString('tr-TR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </div>
                          </div>
                        </div>
                        
                        <div className="complaint-row-center">
                          <div className="complaint-warning-badge-inline">
                            <span className="warning-icon">⚠️</span>
                            <span className="complaint-reason-tag">
                              {reasonLabels[complaint.complaint_reason] || complaint.complaint_reason}
                            </span>
                          </div>
                          <h4 className="complaint-title">{complaint.title}</h4>
                          {complaint.complaint_description && (
                            <p className="complaint-description">{complaint.complaint_description}</p>
                          )}
                        </div>
                        
                        <div className="complaint-row-right">
                          <span className="complaint-location">
                            📍 {complaint.district}, {complaint.city}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && !loading && (
            <div className="service-profile-tab modern">
              {profileLoading ? (
                <div className="service-loading">
                  <div className="service-loading-spinner"></div>
                  <p className="service-loading-text">Profil yükleniyor...</p>
                </div>
              ) : (
                <>
                  {profileMessage.text && (
                    <div className={`service-profile-message ${profileMessage.type}`}>
                      <span className="message-icon">
                        {profileMessage.type === 'success' ? '✓' : '✕'}
                      </span>
                      {profileMessage.text}
                    </div>
                  )}

                  <div className="service-profile-grid">
                    {/* Logo Card */}
                    <div className="service-profile-card logo-card">
                      <div className="profile-card-header">
                        <h3>📷 Firma Logosu</h3>
                      </div>
                      <div className="profile-card-body">
                        <div className="modern-logo-upload">
                          <div className="logo-preview-container">
                            {logoPreview ? (
                              <img src={logoPreview} alt="Logo" className="logo-image" />
                            ) : (
                              <div className="logo-empty">
                                <span className="logo-empty-icon">📷</span>
                                <p>Logo Yok</p>
                              </div>
                            )}
                          </div>
                          
                          <div className="logo-controls">
                            <input
                              type="file"
                              id="modern-logo-input"
                              accept="image/*"
                              onChange={handleLogoChange}
                              style={{ display: 'none' }}
                            />
                            <label htmlFor="modern-logo-input" className="btn-modern btn-primary">
                              📷 {logoPreview ? 'Değiştir' : 'Logo Seç'}
                            </label>
                            
                            {logoFile && (
                              <button 
                                onClick={handleLogoUpload} 
                                disabled={uploadingLogo}
                                className="btn-modern btn-success"
                              >
                                {uploadingLogo ? '⏳ Yükleniyor...' : '✓ Yükle'}
                              </button>
                            )}
                            
                            {logoPreview && !logoFile && (
                              <button 
                                onClick={handleLogoDelete}
                                className="btn-modern btn-danger"
                              >
                                🗑️ Sil
                              </button>
                            )}
                          </div>
                          
                          <p className="logo-info">
                            <span className="info-icon">ℹ️</span>
                            Maksimum 2MB • JPG, PNG veya GIF
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Company Info Card */}
                    <div className="service-profile-card">
                      <div className="profile-card-header">
                        <h3>🏢 Firma Bilgileri</h3>
                      </div>
                      <div className="profile-card-body">
                        <form onSubmit={handleProfileSubmit} className="modern-profile-form">
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
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="service-modal-overlay" onClick={handleDeleteCancel}>
          <div className="service-modal" onClick={(e) => e.stopPropagation()}>
            <div className="service-modal-header">
              <h3>Talebi Sil</h3>
              <button className="service-modal-close" onClick={handleDeleteCancel}>✕</button>
            </div>
            <div className="service-modal-body">
              <div className="service-delete-warning">
                <span className="service-warning-icon">⚠️</span>
                <p>Bu talebi silmek istediğinizden emin misiniz?</p>
                <p className="service-warning-text">Bu işlem geri alınamaz!</p>
              </div>
            </div>
            <div className="service-modal-footer">
              <button 
                className="service-modal-btn service-modal-btn-cancel"
                onClick={handleDeleteCancel}
                disabled={isDeleting}
              >
                İptal
              </button>
              <button 
                className="service-modal-btn service-modal-btn-danger"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? 'Siliniyor...' : 'Evet, Sil'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="service-modal-overlay" onClick={handleRejectCancel}>
          <div className="service-modal" onClick={(e) => e.stopPropagation()}>
            <div className="service-modal-header">
              <h3>Talebi Reddet</h3>
              <button className="service-modal-close" onClick={handleRejectCancel}>✕</button>
            </div>
            <div className="service-modal-body">
              <p className="service-modal-description">
                Bu talebi reddetmek istediğinizden emin misiniz? Lütfen reddetme sebebinizi belirtin.
              </p>
              <div className="service-form-group">
                <label className="service-form-label">Reddetme Sebebi *</label>
                <textarea
                  className="service-form-textarea"
                  rows="4"
                  placeholder="Örn: Şu anda yoğunluk nedeniyle bu talebi kabul edemiyorum..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  disabled={isRejecting}
                />
              </div>
            </div>
            <div className="service-modal-footer">
              <button 
                className="service-modal-btn service-modal-btn-cancel"
                onClick={handleRejectCancel}
                disabled={isRejecting}
              >
                İptal
              </button>
              <button 
                className="service-modal-btn service-modal-btn-danger"
                onClick={handleRejectConfirm}
                disabled={isRejecting || !rejectReason.trim()}
              >
                {isRejecting ? 'Reddediliyor...' : 'Talebi Reddet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
