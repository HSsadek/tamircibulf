import React, { useState, useEffect } from 'react';
import './Admin.css';

export default function AdminLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');
  const [backendStatus, setBackendStatus] = useState('checking'); // 'checking', 'online', 'offline'

  // Check backend status on component mount
  useEffect(() => {
    const checkBackendStatus = async () => {
      try {
        // Test with a simple OPTIONS request to check CORS and server availability
        const response = await fetch('http://localhost:8000/api/admin/login', {
          method: 'OPTIONS',
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        // If we get any response (even 404), server is running
        setBackendStatus('online');
        console.log('Backend is online, response status:', response.status);
      } catch (error) {
        // Network error means server is not reachable
        if (error.name === 'TypeError' || error.message.includes('fetch')) {
          setBackendStatus('offline');
          console.error('Backend server is not reachable:', error);
        } else {
          // Other errors (like timeout) still mean server might be online
          setBackendStatus('online');
          console.log('Backend seems online but slow:', error);
        }
      }
    };
    
    checkBackendStatus();
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const form = new FormData(e.currentTarget);
    const { email, password } = Object.fromEntries(form.entries());

    console.log('Admin login attempt:', { email, passwordLength: password?.length });

    try {
      setLoading(true);
      // If already logged in, go directly
      if (localStorage.getItem('admin_token')) {
        console.log('Already have token, redirecting...');
        window.location.hash = '#/admin';
        return;
      }
      
      // Backend is responding since we're making the request
      setBackendStatus('online');
      
      console.log('Making login request to:', 'http://localhost:8000/api/admin/login');
      const res = await fetch('http://localhost:8000/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });
      
      console.log('Login response status:', res.status);
      console.log('Login response headers:', Object.fromEntries(res.headers.entries()));

      const contentType = res.headers.get('content-type') || '';
      console.log('Response content-type:', contentType);
      
      let data = {};
      const responseText = await res.text();
      console.log('Raw response:', responseText);
      
      if (contentType.includes('application/json') && responseText) {
        try {
          data = JSON.parse(responseText);
          console.log('Parsed response data:', data);
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          throw new Error('Sunucudan geçersiz yanıt alındı.');
        }
      }
      
      if (!res.ok) {
        console.error('Login failed with status:', res.status, 'Data:', data);
        let errMsg = data?.message || '';
        if (!errMsg && Array.isArray(data?.errors)) errMsg = data.errors.join(', ');
        else if (!errMsg && data?.errors && typeof data.errors === 'object') {
          errMsg = Object.values(data.errors).flat().join(' \n ');
        }
        if (!errMsg) errMsg = `Giriş başarısız (HTTP ${res.status}). Sunucu yanıtı: ${responseText || 'Boş'}`;
        throw new Error(errMsg);
      }

      const token = data?.token || data?.access_token || data?.data?.token;
      console.log('Extracted token:', token ? 'Token found' : 'No token');
      console.log('User data:', data?.user);
      
      if (!token) {
        console.error('No token in response:', data);
        throw new Error('Token alınamadı. Sunucu yanıtında token bulunamadı.');
      }

      // Persist token (simple localStorage for now)
      localStorage.setItem('admin_token', token);
      
      // Save user data with multiple fallback options
      let userData = null;
      if (data?.user) {
        userData = data.user;
      } else if (data?.data?.user) {
        userData = data.data.user;
      } else if (data?.admin) {
        userData = data.admin;
      } else {
        // Create fallback user data from available info
        userData = {
          name: data?.name || data?.username || data?.email?.split('@')[0] || 'Admin',
          email: data?.email || 'admin@example.com',
          role: data?.role || data?.user_type || 'Yönetici',
          id: data?.id || data?.admin_id || 1
        };
      }
      
      localStorage.setItem('admin_user', JSON.stringify(userData));
      console.log('Login successful! Saved user data:', userData);
      console.log('Token saved:', token.substring(0, 20) + '...');
      
      // Redirect to admin dashboard route
      window.location.hash = '#/admin';
    } catch (err) {
      console.error('Login error:', err);
      setError(err?.message || 'Bir hata oluştu. Konsolu kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  const onForgotPassword = async (e) => {
    e.preventDefault();
    setForgotPasswordMessage('');
    const form = new FormData(e.currentTarget);
    const { email } = Object.fromEntries(form.entries());

    try {
      setForgotPasswordLoading(true);
      const res = await fetch('http://localhost:8000/api/admin/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      const contentType = res.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? (await res.json()) : {};
      
      if (res.ok) {
        setForgotPasswordMessage('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.');
      } else {
        setForgotPasswordMessage(data?.message || 'Şifre sıfırlama başarısız.');
      }
    } catch (err) {
      setForgotPasswordMessage('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <h1 className="admin-login-title">TamirciBul Admin</h1>
        <p className="admin-login-subtitle">Yönetici paneline giriş yapın</p>
        
        <div className={`backend-status ${backendStatus}`}>
          {backendStatus === 'checking' && '🔄 Backend durumu kontrol ediliyor...'}
          {backendStatus === 'online' && '✅ Backend bağlantısı aktif'}
          {backendStatus === 'offline' && '❌ Backend sunucusuna ulaşılamıyor'}
        </div>
        
        <form onSubmit={onSubmit} autoComplete="off">
          <div className="admin-form-group">
            <label className="admin-form-label">E-posta</label>
            <input 
              name="email" 
              type="email" 
              className="admin-form-input"
              placeholder="E-posta adresinizi girin" 
              required 
            />
          </div>
          
          <div className="admin-form-group">
            <label className="admin-form-label">Şifre</label>
            <div className="admin-password-input-wrapper">
              <input 
                name="password" 
                type={showPassword ? 'text' : 'password'} 
                className="admin-form-input"
                placeholder="••••••••" 
                minLength={8} 
                required 
              />
              <button 
                type="button" 
                className="admin-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          
          <button className="admin-btn admin-btn-primary" type="submit" disabled={loading}>
            {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
          </button>
          
          <button 
            type="button" 
            className="admin-forgot-password-btn"
            onClick={() => setShowForgotPassword(true)}
          >
            Şifremi Unuttum
          </button>
          
          {error && (
            <div className="admin-error">{error}</div>
          )}
        </form>
      </div>
      
      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="admin-modal-overlay" onClick={() => setShowForgotPassword(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>Şifre Sıfırlama</h2>
              <button 
                className="admin-modal-close"
                onClick={() => setShowForgotPassword(false)}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={onForgotPassword}>
              <div className="admin-form-group">
                <label className="admin-form-label">E-posta Adresi</label>
                <input 
                  name="email" 
                  type="email" 
                  className="admin-form-input"
                  placeholder="E-posta adresinizi girin" 
                  required 
                />
              </div>
              
              <div className="admin-modal-actions">
                <button 
                  type="button" 
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setShowForgotPassword(false)}
                >
                  İptal
                </button>
                <button 
                  type="submit" 
                  className="admin-btn admin-btn-primary"
                  disabled={forgotPasswordLoading}
                >
                  {forgotPasswordLoading ? 'Gönderiliyor...' : 'Gönder'}
                </button>
              </div>
              
              {forgotPasswordMessage && (
                <div className={`admin-message ${forgotPasswordMessage.includes('gönderildi') ? 'success' : 'error'}`}>
                  {forgotPasswordMessage}
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
