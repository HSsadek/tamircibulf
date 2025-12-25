import React, { useState } from 'react';
import './ForgotPassword.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [userType, setUserType] = useState('customer');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('E-posta adresi gereklidir');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('http://localhost:8000/api/auth/password/forgot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          user_type: userType
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessage(data.message);
        setEmailSent(true);
      } else {
        setError(data.message || 'Bir hata oluştu');
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      setError('Bağlantı hatası. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    window.location.hash = '#/login';
  };

  if (emailSent) {
    return (
      <div className="forgot-password-page">
        <div className="forgot-password-container">
          <div className="forgot-password-card success-card">
            <div className="success-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="#10b981"/>
                <path d="m9 12 2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            
            <h2>E-posta Gönderildi!</h2>
            <p className="success-message">
              Şifre sıfırlama linki <strong>{email}</strong> adresine gönderildi.
            </p>
            
            <div className="success-instructions">
              <h4>Sonraki Adımlar:</h4>
              <ol>
                <li>E-posta kutunuzu kontrol edin</li>
                <li>Spam/Gereksiz klasörünü de kontrol etmeyi unutmayın</li>
                <li>E-postadaki "Şifremi Sıfırla" butonuna tıklayın</li>
                <li>Yeni şifrenizi belirleyin</li>
              </ol>
            </div>

            <div className="success-actions">
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
                onClick={() => {
                  setEmailSent(false);
                  setEmail('');
                  setMessage('');
                  setError('');
                }}
              >
                Tekrar Gönder
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="forgot-password-page">
      <div className="forgot-password-container">
        <div className="forgot-password-card">
          {/* Header */}
          <div className="forgot-password-header">
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
            
            <h2>Şifremi Unuttum</h2>
            <p>E-posta adresinizi girin, size şifre sıfırlama linki gönderelim.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="forgot-password-form">
            {/* User Type Selection */}
            <div className="form-group">
              <label>Hesap Türü</label>
              <div className="user-type-selector">
                <button
                  type="button"
                  className={`user-type-btn ${userType === 'customer' ? 'active' : ''}`}
                  onClick={() => setUserType('customer')}
                >
                  <span className="user-type-icon">👤</span>
                  <span>Müşteri</span>
                </button>
                <button
                  type="button"
                  className={`user-type-btn ${userType === 'service_provider' ? 'active' : ''}`}
                  onClick={() => setUserType('service_provider')}
                >
                  <span className="user-type-icon">🔧</span>
                  <span>Servis Sağlayıcı</span>
                </button>
              </div>
            </div>

            {/* Email Input */}
            <div className="form-group">
              <label htmlFor="email">E-posta Adresi</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@email.com"
                required
                disabled={loading}
              />
            </div>

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
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  Gönderiliyor...
                </>
              ) : (
                <>
                  <span className="btn-icon">📧</span>
                  Şifre Sıfırlama Linki Gönder
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="forgot-password-footer">
            <p>
              Şifrenizi hatırladınız mı?{' '}
              <button 
                type="button" 
                className="link-btn"
                onClick={handleBackToLogin}
              >
                Giriş Yap
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}