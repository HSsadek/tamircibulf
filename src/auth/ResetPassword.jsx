import React, { useMemo } from 'react';

function useResetToken() {
  return useMemo(() => {
    const hash = window.location.hash || '';
    // supports #/auth/reset?token=XYZ or #/auth/reset/XYZ
    const qIndex = hash.indexOf('?');
    if (qIndex !== -1) {
      const params = new URLSearchParams(hash.slice(qIndex + 1));
      return params.get('token');
    }
    const parts = hash.split('/');
    const maybeToken = parts[parts.length - 1];
    return maybeToken && maybeToken !== 'reset' ? maybeToken : null;
  }, []);
}

export default function ResetPassword() {
  const token = useResetToken();

  const onSubmit = (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    if (!payload.password || payload.password.length < 6) {
      alert('Şifre en az 6 karakter olmalıdır.');
      return;
    }
    if (payload.password !== payload.confirm) {
      alert('Şifreler uyuşmuyor.');
      return;
    }
    alert(`Şifre sıfırlama (DEMO) başarıyla gönderildi. Token: ${token || '(yok)'}\nYeni şifre: ${payload.password}`);
  };

  return (
    <div className="auth-section">
      <h2>Şifre Sıfırla</h2>
      {!token && (
        <p className="muted small">Uyarı: Geçerli bir sıfırlama token'ı bulunamadı. (Demo modunda form yine de çalışır.)</p>
      )}
      <form className="auth-form" onSubmit={onSubmit}>
        <label>
          Yeni Şifre
          <input name="password" type="password" placeholder="••••••••" minLength={6} required />
        </label>
        <label>
          Yeni Şifre (Tekrar)
          <input name="confirm" type="password" placeholder="••••••••" minLength={6} required />
        </label>
        <button className="btn primary" type="submit">Şifreyi Sıfırla</button>
      </form>
      <p className="muted small" style={{marginTop: 8}}>Sorun mu yaşıyorsunuz? <a href="#/auth/forgot">Şifremi Unuttum</a></p>
    </div>
  );
}
