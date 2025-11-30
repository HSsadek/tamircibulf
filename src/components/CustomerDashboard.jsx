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
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showRequestDetail, setShowRequestDetail] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [requestToCancel, setRequestToCancel] = useState(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [complaintReason, setComplaintReason] = useState('');
  const [complaintDescription, setComplaintDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
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
      console.log('📤 Talepler isteniyor...', 'http://localhost:8000/api/services/my-requests');
      console.log('🔑 Token:', auth.token);
      
      const res = await fetch('http://localhost:8000/api/services/my-requests', {
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Accept': 'application/json'
        }
      });
      
      console.log('📥 Response status:', res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log('✅ API Response:', data);
        const requests = data?.data || [];
        console.log('📋 Requests count:', requests.length);
        console.log('📋 Requests:', requests);
        setMyRequests(requests);
        
        // Calculate stats
        const newStats = {
          totalRequests: requests.length,
          pendingRequests: requests.filter(r => r.status === 'pending').length,
          completedRequests: requests.filter(r => r.status === 'completed').length,
          cancelledRequests: requests.filter(r => r.status === 'cancelled').length
        };
        console.log('📊 Stats:', newStats);
        setStats(newStats);
      } else if (res.status === 404) {
        console.warn('⚠️ API endpoint bulunamadı:', res.status);
      } else if (res.status === 401) {
        console.warn('⚠️ Yetkilendirme hatası, token geçersiz olabilir');
      } else {
        console.error('❌ API error:', res.status, await res.text());
      }
    } catch (err) {
      console.error('💥 Error fetching requests:', err);
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
      case 'rejected': return '#e91e63';
      default: return '#757575';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Bekliyor';
      case 'accepted': return 'Kabul Edildi';
      case 'in_progress': return 'Devam Ediyor';
      case 'completed': return 'Tamamlandı';
      case 'rejected': return 'Reddedildi';
      case 'cancelled': return 'İptal Edildi';
      default: return status;
    }
  };

  const handleDeleteRequest = async () => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:8000/api/services/request/${requestToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Accept': 'application/json'
        }
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Talepleri yeniden yükle
        fetchMyRequests();
        setShowDeleteConfirm(false);
        setRequestToDelete(null);
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
      } else {
        alert(data.message || 'Talep silinemedi');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Talep silinirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRating = async () => {
    if (rating === 0) {
      alert('Lütfen bir puan seçin');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`http://localhost:8000/api/services/request/${selectedRequest.id}/rate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          rating: rating,
          comment: ratingComment
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setShowRatingModal(false);
        setRating(0);
        setRatingComment('');
        setSelectedRequest(null);
        
        // Show modern success toast
        const toast = document.createElement('div');
        toast.className = 'modern-toast success';
        toast.innerHTML = `
          <div class="toast-icon">⭐</div>
          <div class="toast-content">
            <div class="toast-title">Teşekkürler!</div>
            <div class="toast-message">Değerlendirmeniz başarıyla kaydedildi</div>
          </div>
          <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
          toast.classList.remove('show');
          setTimeout(() => toast.remove(), 300);
        }, 3000);
        
        fetchMyRequests();
      } else {
        // Show error toast
        const toast = document.createElement('div');
        toast.className = 'modern-toast error';
        toast.innerHTML = `
          <div class="toast-icon">❌</div>
          <div class="toast-content">
            <div class="toast-title">Hata!</div>
            <div class="toast-message">${data.message || 'Değerlendirme kaydedilemedi'}</div>
          </div>
          <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
          toast.classList.remove('show');
          setTimeout(() => toast.remove(), 300);
        }, 3000);
      }
    } catch (error) {
      console.error('Rating error:', error);
      
      // Show error toast
      const toast = document.createElement('div');
      toast.className = 'modern-toast error';
      toast.innerHTML = `
        <div class="toast-icon">❌</div>
        <div class="toast-content">
          <div class="toast-title">Hata!</div>
          <div class="toast-message">Değerlendirme gönderilirken bir hata oluştu</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
      `;
      document.body.appendChild(toast);
      setTimeout(() => toast.classList.add('show'), 10);
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitComplaint = async () => {
    if (!complaintReason.trim()) {
      alert('Lütfen şikayet sebebini seçin');
      return;
    }

    if (!complaintDescription.trim()) {
      alert('Lütfen şikayet açıklaması yazın');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`http://localhost:8000/api/services/request/${selectedRequest.id}/complaint`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          reason: complaintReason,
          description: complaintDescription
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setShowComplaintModal(false);
        setComplaintReason('');
        setComplaintDescription('');
        setSelectedRequest(null);
        
        // Show modern success toast
        const toast = document.createElement('div');
        toast.className = 'modern-toast warning';
        toast.innerHTML = `
          <div class="toast-icon">⚠️</div>
          <div class="toast-content">
            <div class="toast-title">Şikayet Alındı</div>
            <div class="toast-message">Şikayetiniz incelemeye alındı, en kısa sürede dönüş yapılacak</div>
          </div>
          <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
          toast.classList.remove('show');
          setTimeout(() => toast.remove(), 300);
        }, 4000);
        
        fetchMyRequests();
      } else {
        // Show error toast
        const toast = document.createElement('div');
        toast.className = 'modern-toast error';
        toast.innerHTML = `
          <div class="toast-icon">❌</div>
          <div class="toast-content">
            <div class="toast-title">Hata!</div>
            <div class="toast-message">${data.message || 'Şikayet kaydedilemedi'}</div>
          </div>
          <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
          toast.classList.remove('show');
          setTimeout(() => toast.remove(), 300);
        }, 3000);
      }
    } catch (error) {
      console.error('Complaint error:', error);
      
      // Show error toast
      const toast = document.createElement('div');
      toast.className = 'modern-toast error';
      toast.innerHTML = `
        <div class="toast-icon">❌</div>
        <div class="toast-content">
          <div class="toast-title">Hata!</div>
          <div class="toast-message">Şikayet gönderilirken bir hata oluştu</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
      `;
      document.body.appendChild(toast);
      setTimeout(() => toast.classList.add('show'), 10);
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    } finally {
      setSubmitting(false);
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
                        {request.service_provider?.logo ? (
                          <img 
                            src={request.service_provider.logo} 
                            alt={request.service_provider.company_name || request.service_provider.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                          />
                        ) : (
                          request.service_type === 'plumbing' ? '🚰' :
                          request.service_type === 'electrical' ? '⚡' :
                          request.service_type === 'cleaning' ? '🧹' :
                          request.service_type === 'appliance' ? '🔌' :
                          request.service_type === 'computer' ? '💻' :
                          request.service_type === 'phone' ? '📱' : '🛠️'
                        )}
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
                      
                      {/* Rejection Reason */}
                      {request.status === 'rejected' && request.cancellation_reason && (
                        <div className="rejection-reason-box">
                          <div className="rejection-reason-header">
                            <span className="rejection-icon">⚠️</span>
                            <strong>Reddetme Sebebi:</strong>
                          </div>
                          <p className="rejection-reason-text">{request.cancellation_reason}</p>
                        </div>
                      )}
                      
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
                          <span className="provider-icon">🏢</span>
                          <span>{request.service_provider.company_name || request.service_provider.name}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="request-card-footer">
                      <button 
                        className="btn-view"
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowRequestDetail(true);
                        }}
                      >
                        👁️ Detaylar
                      </button>
                      {request.status === 'pending' && (
                        <button 
                          className="btn-cancel"
                          onClick={() => {
                            setRequestToCancel(request);
                            setShowCancelConfirm(true);
                          }}
                        >
                          ❌ İptal Et
                        </button>
                      )}
                      {request.status === 'accepted' && (
                        <>
                          <button 
                            className="btn-rate"
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowRatingModal(true);
                            }}
                          >
                            ⭐ Değerlendir
                          </button>
                          <button 
                            className="btn-complaint"
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowComplaintModal(true);
                            }}
                          >
                            ⚠️ Şikayet Et
                          </button>
                        </>
                      )}
                      {(request.status === 'rejected' || request.status === 'cancelled') && (
                        <button 
                          className="btn-delete"
                          onClick={() => {
                            setRequestToDelete(request);
                            setShowDeleteConfirm(true);
                          }}
                        >
                          🗑️ Sil
                        </button>
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
                <h2>🌍 Dil Tercihi</h2>
              </div>
              
              <div className="settings-form">
                <div className="form-group">
                  <label>Uygulama Dili</label>
                  <select 
                    className="language-select"
                    defaultValue="tr"
                    onChange={(e) => {
                      localStorage.setItem('app_language', e.target.value);
                      alert('Dil tercihi kaydedildi! Değişikliklerin uygulanması için sayfayı yenileyin.');
                    }}
                  >
                    <option value="tr">🇹🇷 Türkçe</option>
                    <option value="en">🇬🇧 English</option>
                    <option value="de">🇩🇪 Deutsch</option>
                    <option value="fr">🇫🇷 Français</option>
                    <option value="ar">🇸🇦 العربية</option>
                  </select>
                  <p className="form-hint">
                    Uygulama dilini değiştirin. Değişiklikler sayfa yenilendiğinde uygulanacaktır.
                  </p>
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

      {/* Request Detail Modal */}
      {showRequestDetail && selectedRequest && (
        <div className="modal-overlay" onClick={() => setShowRequestDetail(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📋 Talep Detayları</h2>
              <button className="modal-close" onClick={() => setShowRequestDetail(false)}>✕</button>
            </div>
            
            <div className="modal-body">
              <div className="detail-section">
                <h3>Genel Bilgiler</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Başlık:</span>
                    <span className="detail-value">{selectedRequest.title}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Durum:</span>
                    <span 
                      className="detail-value status-badge"
                      style={{ backgroundColor: getStatusColor(selectedRequest.status) }}
                    >
                      {getStatusText(selectedRequest.status)}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Öncelik:</span>
                    <span className="detail-value">{selectedRequest.priority === 'urgent' ? '🔴 Acil' : selectedRequest.priority === 'high' ? '🟠 Yüksek' : selectedRequest.priority === 'medium' ? '🟡 Orta' : '🟢 Düşük'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Tarih:</span>
                    <span className="detail-value">{new Date(selectedRequest.created_at).toLocaleString('tr-TR')}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>Açıklama</h3>
                <p className="detail-description">{selectedRequest.description}</p>
              </div>

              <div className="detail-section">
                <h3>Adres Bilgileri</h3>
                <div className="detail-grid">
                  <div className="detail-item full-width">
                    <span className="detail-label">Adres:</span>
                    <span className="detail-value">{selectedRequest.address}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Şehir:</span>
                    <span className="detail-value">{selectedRequest.city}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">İlçe:</span>
                    <span className="detail-value">{selectedRequest.district}</span>
                  </div>
                </div>
              </div>

              {selectedRequest.service_provider && (
                <div className="detail-section">
                  <h3>🏢 Atanan Firma</h3>
                  <div className="provider-info">
                    <div className="provider-avatar">
                      {selectedRequest.service_provider.logo ? (
                        <img 
                          src={selectedRequest.service_provider.logo} 
                          alt={selectedRequest.service_provider.company_name || selectedRequest.service_provider.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                        />
                      ) : (
                        '🏢'
                      )}
                    </div>
                    <div className="provider-details">
                      <div className="provider-name">
                        {selectedRequest.service_provider.company_name || selectedRequest.service_provider.name}
                      </div>
                      <div className="provider-contact">
                        <span>📧 {selectedRequest.service_provider.email}</span>
                        <span>📱 {selectedRequest.service_provider.phone}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              {selectedRequest.status === 'pending' && (
                <button 
                  className="btn-danger"
                  onClick={() => {
                    setRequestToCancel(selectedRequest);
                    setShowCancelConfirm(true);
                    setShowRequestDetail(false);
                  }}
                >
                  ❌ Talebi İptal Et
                </button>
              )}
              <button className="btn-secondary" onClick={() => setShowRequestDetail(false)}>
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      {/* Delete Confirm Dialog */}
      {showDeleteConfirm && requestToDelete && (
        <div className="confirm-dialog-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-dialog-header">
              <div className="confirm-dialog-icon">🗑️</div>
              <h3>Talebi Sil</h3>
            </div>
            
            <div className="confirm-dialog-body">
              <p>
                <strong>{requestToDelete.title}</strong> talebini silmek istediğinizden emin misiniz?
              </p>
              <p className="warning-text">
                Bu işlem geri alınamaz!
              </p>
            </div>
            
            <div className="confirm-dialog-footer">
              <button 
                className="confirm-btn confirm-btn-cancel"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setRequestToDelete(null);
                }}
                disabled={loading}
              >
                Vazgeç
              </button>
              <button 
                className="confirm-btn confirm-btn-confirm"
                onClick={handleDeleteRequest}
                disabled={loading}
              >
                {loading ? 'Siliniyor...' : 'Evet, Sil'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancelConfirm && requestToCancel && (
        <div className="confirm-dialog-overlay" onClick={() => setShowCancelConfirm(false)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-dialog-header">
              <div className="confirm-dialog-icon">⚠️</div>
              <h3>Talebi İptal Et</h3>
            </div>
            
            <div className="confirm-dialog-body">
              <p>
                <strong>{requestToCancel.title}</strong> talebini iptal etmek istediğinizden emin misiniz?
              </p>
              <p className="warning-text">
                Bu işlem geri alınamaz!
              </p>
            </div>
            
            <div className="confirm-dialog-footer">
              <button 
                className="confirm-btn confirm-btn-cancel"
                onClick={() => {
                  setShowCancelConfirm(false);
                  setRequestToCancel(null);
                }}
              >
                Vazgeç
              </button>
              <button 
                className="confirm-btn confirm-btn-confirm"
                onClick={async () => {
                  try {
                    setLoading(true);
                    const res = await fetch(`http://localhost:8000/api/services/request/${requestToCancel.id}/cancel`, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${auth.token}`,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                      }
                    });

                    const data = await res.json();

                    if (res.ok && data.success) {
                      // Talepleri yeniden yükle
                      fetchMyRequests();
                      setShowCancelConfirm(false);
                      setRequestToCancel(null);
                      // Başarı mesajını göster
                      setShowSuccessMessage(true);
                      // 3 saniye sonra otomatik kapat
                      setTimeout(() => setShowSuccessMessage(false), 3000);
                    } else {
                      alert(`❌ ${data.message || 'Talep iptal edilemedi'}`);
                    }
                  } catch (error) {
                    console.error('İptal hatası:', error);
                    alert('❌ Bir hata oluştu. Lütfen tekrar deneyin.');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
              >
                {loading ? '⏳ İptal Ediliyor...' : 'Evet, İptal Et'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && selectedRequest && (
        <div className="modal-overlay" onClick={() => setShowRatingModal(false)}>
          <div className="modal-content rating-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⭐ Hizmeti Değerlendir</h2>
              <button className="modal-close" onClick={() => setShowRatingModal(false)}>✕</button>
            </div>
            
            <div className="modal-body">
              <div className="rating-service-info">
                <h3>{selectedRequest.title}</h3>
                <p>{selectedRequest.service_provider?.company_name || selectedRequest.service_provider?.name}</p>
              </div>

              <div className="rating-stars">
                <p className="rating-label">Hizmet kalitesini değerlendirin:</p>
                <div className="stars-container">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      className={`star-btn ${rating >= star ? 'active' : ''}`}
                      onClick={() => setRating(star)}
                    >
                      {rating >= star ? '⭐' : '☆'}
                    </button>
                  ))}
                </div>
                <p className="rating-text">
                  {rating === 0 && 'Puan seçin'}
                  {rating === 1 && '😞 Çok Kötü'}
                  {rating === 2 && '😕 Kötü'}
                  {rating === 3 && '😐 Orta'}
                  {rating === 4 && '😊 İyi'}
                  {rating === 5 && '🤩 Mükemmel'}
                </p>
              </div>

              <div className="rating-comment">
                <label>Yorumunuz (İsteğe bağlı):</label>
                <textarea
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  placeholder="Deneyiminizi paylaşın..."
                  rows={4}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn-secondary"
                onClick={() => {
                  setShowRatingModal(false);
                  setRating(0);
                  setRatingComment('');
                }}
                disabled={submitting}
              >
                İptal
              </button>
              <button 
                className="btn-primary"
                onClick={handleSubmitRating}
                disabled={submitting || rating === 0}
              >
                {submitting ? '⏳ Gönderiliyor...' : '✅ Değerlendirmeyi Gönder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complaint Modal */}
      {showComplaintModal && selectedRequest && (
        <div className="modal-overlay" onClick={() => setShowComplaintModal(false)}>
          <div className="modal-content complaint-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⚠️ Şikayet Et</h2>
              <button className="modal-close" onClick={() => setShowComplaintModal(false)}>✕</button>
            </div>
            
            <div className="modal-body">
              <div className="complaint-service-info">
                <h3>{selectedRequest.title}</h3>
                <p>{selectedRequest.service_provider?.company_name || selectedRequest.service_provider?.name}</p>
              </div>

              <div className="complaint-reason">
                <label>Şikayet Sebebi *</label>
                <select
                  value={complaintReason}
                  onChange={(e) => setComplaintReason(e.target.value)}
                  required
                >
                  <option value="">Seçiniz</option>
                  <option value="poor_service">Kötü Hizmet Kalitesi</option>
                  <option value="late_arrival">Geç Geldi</option>
                  <option value="no_show">Gelmedi</option>
                  <option value="unprofessional">Profesyonel Olmayan Davranış</option>
                  <option value="overpricing">Fahiş Fiyat</option>
                  <option value="incomplete_work">Eksik İş</option>
                  <option value="damage">Hasar Verdi</option>
                  <option value="other">Diğer</option>
                </select>
              </div>

              <div className="complaint-description">
                <label>Şikayet Detayı *</label>
                <textarea
                  value={complaintDescription}
                  onChange={(e) => setComplaintDescription(e.target.value)}
                  placeholder="Şikayetinizi detaylı olarak açıklayın..."
                  rows={5}
                  required
                />
              </div>

              <div className="complaint-warning">
                <span className="warning-icon">ℹ️</span>
                <p>Şikayetiniz incelenecek ve gerekli işlemler yapılacaktır.</p>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn-secondary"
                onClick={() => {
                  setShowComplaintModal(false);
                  setComplaintReason('');
                  setComplaintDescription('');
                }}
                disabled={submitting}
              >
                İptal
              </button>
              <button 
                className="btn-danger"
                onClick={handleSubmitComplaint}
                disabled={submitting || !complaintReason || !complaintDescription.trim()}
              >
                {submitting ? '⏳ Gönderiliyor...' : '⚠️ Şikayeti Gönder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="success-toast">
          <div className="success-toast-content">
            <div className="success-toast-icon">✅</div>
            <div className="success-toast-text">
              <strong>Başarılı!</strong>
              <p>Talep başarıyla iptal edildi</p>
            </div>
            <button 
              className="success-toast-close"
              onClick={() => setShowSuccessMessage(false)}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
