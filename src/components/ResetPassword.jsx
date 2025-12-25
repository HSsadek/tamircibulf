import React, { useState, useEffect } from 'react';
import './ResetPassword.css';

export default function ResetPassword() {
  const [formData, setFormData] = useState({
    password: '',
    password_confirmation: ''
  });
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [tokenValid, setTokenValid] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  // URL parametrelerini al
  const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
  const token = urlParams.get('token');
  const email = urlParams.get('email');
  const userType = urlParams.get('type') || 'customer';

  useEffect(() => {
    verifyToken();
  }, []);

  const verifyToken = async () => {
    if (!token || !email) {
      setError('Geçersiz şifre sıfırlama linki');
      setVerifying(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/auth/password/verify-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          token,
          user_type: userType
        })
      });

      const data = await response.json();

      if (data.success) {
        setTokenValid(true);
        setUserInfo(data.data);
      } else {
        setError(data.message || 'Token geçersiz veya süresi dolmuş');
      }
    } catch (err) {
      console.error('Token verification error:', err);
      setError('Bağlantı hatası. Lütfen tekrar deneyin.');
    } finally {
      setVerifying(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear errors when user starts typing
    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData.password) {
      setError('Yeni şifre gereklidir');
      return false;
    }

    if (formData.password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır');
      return false;
    }

    if (formData.password !== formData.password_confirmation) {
      setError('Şifreler eşleşmiyor');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('http://localhost:8000/api/auth/password/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          token,
          password: formData.password,
          password_confirmation: formData.password_confirmation,
          user_type: userType
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessage(data.message);
        setResetSuccess(true);
      } else {
        setError(data.message || 'Şifre sıfırlama başarısız');
      }
    } catch (err) {
      console.error('Password reset error:', err);
      setError('Bağlantı hatası. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    window.location.hash = '#/login';
  };

  // Loading state
  if (verifying) {
    return (
      <div className="reset-password-page">
        <div className="reset-password-container">
          <div className="reset-password-card">
            <div className="loading-state">
              <div className="loading-spinner large"></div>
              <h3>Token doğrulanıyor...</h3>
              <p>Lütfen bekleyin</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (resetSuccess) {
    return (
      <div className="reset-password-page">
        <div className="reset-password-container">
          <div className="reset-password-card success-card">
            <div className="success-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="#10b981"/>
                <path d="m9 12 2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            
            <h2>Şifre Başarıyla Güncellendi!</h2>
            <p className="success-message">
              Şifreniz başarıyla değiştirildi. Artık yeni şifrenizle giriş yapabilirsiniz.
            </p>
            
            <button 
              type="button" 
              className="btn-primary"
              onClick={handleBackToLogin}
            >
              Giriş Sayfasına Git
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Error state (invalid token)
  if (!tokenValid) {
    return (
      <div className="reset-password-page">
        <div className="reset-password-container">
          <div className="reset-password-card error-card">
            <div className="error-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="#ef4444"/>
                <path d="m15 9-6 6m0-6 6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            
            <h2>Geçersiz Link</h2>
            <p className="error-message">
              {error || 'Şifre sıfırlama linki geçersiz veya süresi dolmuş.'}
            </p>
            
            <div className="error-actions">
              <button 
                type="button" 
                className="btn-secondary"
                onClick={handleBackToLogin}
              >
                Giriş Sayfasına Dön
              </button>
              <button 
                type="button" 
                className="btn-primary"
                onClick={() => window.location.hash = '#/forgot-password'}
              >
                Yeni Link İste
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div className="reset-password-page">
      <div className="reset-password-container">
        <div className="reset-password-card">
          {/* Header */}
          <div className="reset-password-header">
            <div className="logo">
              <div className="logo-icon">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="16" cy="16" r="14" fill="url(#gradient1)" />
                  <path d="M12 10L16 6L20 10M16 6V18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 16L14 20L18 16M22 16L18 20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="16" cy="24" r="2" fill="white"/>
                  <defs>
                    <linearGradient id="gradient1" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#667eea"/>
                      <stop offset="1" stopColor="#764ba2"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div className="logo-text">
                <span className="logo-brand">Tamir</span>
                <span className="logo-brand-accent">ciBul</span>
              </div>
            </div>
            
            <h2>Yeni Şifre Belirle</h2>
            {userInfo && (
              <p>
                Merhaba <strong>{userInfo.user_name}</strong>, yeni şifrenizi belirleyin.
              </p>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="reset-password-form">
            {/* New Password */}
            <div className="form-group">
              <label htmlFor="password">Yeni Şifre</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="En az 6 karakter"
                required
                disabled={loading}
                minLength="6"
              />
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <label htmlFor="password_confirmation">Yeni Şifre Tekrar</label>
              <input
                type="password"
                id="password_confirmation"
                name="password_confirmation"
                value={formData.password_confirmation}
                onChange={handleInputChange}
                placeholder="Şifrenizi tekrar girin"
                required
                disabled={loading}
                minLength="6"
              />
            </div>

            {/* Password Strength Indicator */}
            {formData.password && (
              <div className="password-strength">
                <div className="strength-indicators">
                  <div className={`strength-indicator ${formData.password.length >= 6 ? 'valid' : ''}`}>
                    <span className="indicator-icon">
                      {formData.password.length >= 6 ? '✓' : '○'}
                    </span>
                    En az 6 karakter
                  </div>
                  <div className={`strength-indicator ${formData.password === formData.password_confirmation && formData.password_confirmation ? 'valid' : ''}`}>
                    <span className="indicator-icon">
                      {formData.password === formData.password_confirmation && formData.password_confirmation ? '✓' : '○'}
                    </span>
                    Şifreler eşleşiyor
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}

            {/* Success Message */}
            {message && (
              <div className="success-message">
                <span className="success-icon">✅</span>
                {message}
              </div>
            )}

            {/* Submit Button */}
            <button 
              type="submit" 
              className="submit-btn"
              disabled={loading || !formData.password || !formData.password_confirmation}
            >
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  Güncelleniyor...
                </>
              ) : (
                <>
                  <span className="btn-icon">🔒</span>
                  Şifremi Güncelle
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="reset-password-footer">
            <p>
              <button 
                type="button" 
                className="link-btn"
                onClick={handleBackToLogin}
              >
                ← Giriş sayfasına dön
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}