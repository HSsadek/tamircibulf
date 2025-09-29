import React, { useState } from 'react';
import './Admin.css';

export default function AdminLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const form = new FormData(e.currentTarget);
    const { email, password } = Object.fromEntries(form.entries());

    try {
      setLoading(true);
      // If already logged in, go directly
      if (localStorage.getItem('admin_token')) {
        window.location.hash = '#/admin';
        return;
      }
      const res = await fetch('http://localhost:8000/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });

      const contentType = res.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? (await res.json()) : {};
      if (!res.ok) {
        let errMsg = data?.message || '';
        if (!errMsg && Array.isArray(data?.errors)) errMsg = data.errors.join(', ');
        else if (!errMsg && data?.errors && typeof data.errors === 'object') {
          errMsg = Object.values(data.errors).flat().join(' \n ');
        }
        if (!errMsg) errMsg = `Giriş başarısız (HTTP ${res.status}).`;
        throw new Error(errMsg);
      }

      const token = data?.token || data?.access_token || data?.data?.token;
      if (!token) {
        throw new Error('Token alınamadı.');
      }

      // Persist token (simple localStorage for now)
      localStorage.setItem('admin_token', token);
      if (data?.user) localStorage.setItem('admin_user', JSON.stringify(data.user));

      // Redirect to admin dashboard route
      window.location.hash = '#/admin';
    } catch (err) {
      setError(err?.message || 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <h1 className="admin-login-title">TamirciBul Admin</h1>
        <p className="admin-login-subtitle">Yönetici paneline giriş yapın</p>
        
        <form onSubmit={onSubmit} autoComplete="off">
          <div className="admin-form-group">
            <label className="admin-form-label">E-posta</label>
            <input 
              name="email" 
              type="email" 
              className="admin-form-input"
              placeholder="admin@tamircibul.com" 
              required 
            />
          </div>
          
          <div className="admin-form-group">
            <label className="admin-form-label">Şifre</label>
            <input 
              name="password" 
              type="password" 
              className="admin-form-input"
              placeholder="••••••••" 
              minLength={8} 
              required 
            />
          </div>
          
          <button className="admin-btn admin-btn-primary" type="submit" disabled={loading}>
            {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
          </button>
          
          {error && (
            <div className="admin-error">{error}</div>
          )}
        </form>
      </div>
    </div>
  );
}
