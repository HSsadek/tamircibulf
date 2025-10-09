import React, { useState } from 'react';
import './UnifiedLogin.css';

export default function UnifiedLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const loginType = 'email'; // Only email login

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const form = new FormData(e.currentTarget);
    const formData = Object.fromEntries(form.entries());

    console.log('Unified login attempt:', { 
      type: loginType, 
      identifier: formData.identifier,
      passwordLength: formData.password?.length 
    });

    try {
      setLoading(true);
      
      console.log('Making unified login request to:', 'http://localhost:8000/api/auth/login');
      const res = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          [loginType]: formData.identifier, // phone or email
          password: formData.password
        })
      });
      
      console.log('Login response status:', res.status);
      
      const contentType = res.headers.get('content-type') || '';
      let data = {};
      const responseText = await res.text();
      console.log('Raw login response:', responseText);
      
      if (contentType.includes('application/json') && responseText) {
        try {
          data = JSON.parse(responseText);
          console.log('Parsed login response data:', data);
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
        if (!errMsg) errMsg = `Giriş başarısız (HTTP ${res.status}). ${responseText || 'Bilinmeyen hata'}`;
        throw new Error(errMsg);
      }

      const token = data?.token || data?.access_token || data?.data?.token;
      console.log('Extracted token:', token ? 'Token found' : 'No token');
      
      if (!token) {
        console.error('No token in response:', data);
        throw new Error('Token alınamadı. Sunucu yanıtında token bulunamadı.');
      }

      // Extract user data and role
      let userData = null;
      let userRole = null;
      
      if (data?.user) {
        userData = data.user;
        userRole = data.user.role || data.user.user_type || data.user.type;
      } else if (data?.data?.user) {
        userData = data.data.user;
        userRole = data.data.user.role || data.data.user.user_type || data.data.user.type;
      } else {
        // Create fallback user data
        userData = {
          name: data?.name || data?.full_name || data?.username || 'Kullanıcı',
          email: data?.email || '',
          phone: data?.phone || formData.identifier,
          id: data?.id || data?.user_id || 1,
          role: data?.role || data?.user_type || data?.type || 'customer'
        };
        userRole = userData.role;
      }
      
      console.log('User role detected:', userRole);
      console.log('User data:', userData);
      
      // Save token and user data
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user_data', JSON.stringify(userData));
      localStorage.setItem('user_role', userRole);
      
      // Role-based redirection
      switch (userRole?.toLowerCase()) {
        case 'admin':
        case 'administrator':
          console.log('Redirecting to admin dashboard');
          window.location.hash = '#/admin';
          break;
          
        case 'service':
        case 'service_provider':
        case 'provider':
        case 'tamirci':
          console.log('Redirecting to service dashboard');
          localStorage.setItem('service_token', token);
          localStorage.setItem('service_user', JSON.stringify(userData));
          window.location.hash = '#/service-dashboard';
          break;
          
        case 'customer':
        case 'user':
        case 'müşteri':
        default:
          console.log('Redirecting to customer homepage');
          localStorage.setItem('customer_token', token);
          localStorage.setItem('customer_user', JSON.stringify(userData));
          window.location.hash = '#/';
          break;
      }
      
    } catch (err) {
      console.error('Login error:', err);
      setError(err?.message || 'Bir hata oluştu. Konsolu kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="unified-login-page">
      <div className="unified-login-container">
        <div className="unified-login-card">
          <div className="unified-login-header">
            <h1 className="unified-login-title">TamirciBul'a Hoş Geldin</h1>
            <p className="unified-login-subtitle">Giriş yap ve hizmetlere ulaş!</p>
          </div>
          
          <form onSubmit={onSubmit} autoComplete="off">
            <div className="unified-form-group">
              <label className="unified-form-label">E-posta Adresi</label>
              <input 
                name="identifier" 
                type="email"
                className="unified-form-input"
                placeholder="ornek@email.com" 
                required 
              />
            </div>
            
            <div className="unified-form-group">
              <label className="unified-form-label">Şifre</label>
              <div className="unified-password-input-wrapper">
                <input 
                  name="password" 
                  type={showPassword ? 'text' : 'password'} 
                  className="unified-form-input"
                  placeholder="••••••••" 
                  minLength={6} 
                  required 
                />
                <button 
                  type="button" 
                  className="unified-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            
            <button className="unified-btn unified-btn-primary" type="submit" disabled={loading}>
              {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
            </button>
            
            <div className="unified-login-links">
              <a href="#/register" className="unified-link">Hesabın yok mu? Kayıt ol</a>
              <a href="#/forgot-password" className="unified-link">Şifremi unuttum</a>
            </div>
            
            {error && (
              <div className="unified-error">{error}</div>
            )}
          </form>
          
          <div className="unified-login-footer">
            <div className="role-info">
              <p><strong>Müşteri misin?</strong> Ana sayfaya yönlendirileceksin</p>
              <p><strong>Servis sağlayıcı mısın?</strong> Dashboard'ına yönlendirileceksin</p>
              <p><strong>Admin misin?</strong> <a href="#/admin-portal">Buraya tıkla</a></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
