import React, { useState } from 'react';

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

      // Redirect to admin dashboard (placeholder)
      window.location.hash = '#/app?role=admin&dashboard=1';
    } catch (err) {
      setError(err?.message || 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 420 }}>
        <div className="auth-brand">TamirciBul<span>.com</span> <small style={{opacity:.6}}>/ Admin</small></div>
        <div className="auth-section">
          <h2>Yönetici Girişi</h2>
          <form className="auth-form" onSubmit={onSubmit} autoComplete="off">
            <label>
              E-posta
              <input name="email" type="email" placeholder="admin@mail.com" required />
            </label>
            <label>
              Şifre
              <input name="password" type="password" placeholder="••••••••" minLength={8} required />
            </label>
            <button className="btn primary" type="submit" disabled={loading}>
              {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>
          {error && (
            <p className="muted small" style={{ color: 'crimson', marginTop: 8 }}>{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
