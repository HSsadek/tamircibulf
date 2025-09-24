import React, { useState } from 'react';

export default function CustomerAuth() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'

  const onSubmit = (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    alert(`${mode === 'login' ? 'Giriş' : 'Kayıt'} (Müşteri) — Demo:\n` + JSON.stringify(payload, null, 2));
  };

  return (
    <div className="auth-section">
      <div className="tabs">
        <button className={mode === 'login' ? 'tab active' : 'tab'} onClick={() => setMode('login')}>Giriş</button>
        <button className={mode === 'register' ? 'tab active' : 'tab'} onClick={() => setMode('register')}>Kayıt Ol</button>
      </div>

      <form className="auth-form" onSubmit={onSubmit}>
        {mode === 'register' && (
          <>
            <label>
              Ad Soyad
              <input name="fullName" type="text" placeholder="Adınız Soyadınız" required />
            </label>
          </>
        )}

        <label>
          E-posta
          <input name="email" type="email" placeholder="ornek@mail.com" required />
        </label>

        <label>
          Şifre
          <input name="password" type="password" placeholder="••••••••" minLength={6} required />
        </label>

        {mode === 'register' && (
          <label>
            Telefon
            <input name="phone" type="tel" placeholder="05xx xxx xx xx" />
          </label>
        )}

        <button className="btn primary" type="submit">
          {mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
        </button>
      </form>

      {mode === 'login' && (
        <p className="muted small" style={{ marginTop: 8 }}>
          <a href="#/auth/forgot">Şifremi unuttum?</a>
        </p>
      )}

      <p className="muted small">
        Yanlış sayfada mısınız? <a href="#/auth">Rol seçimine dönün</a>
      </p>
    </div>
  );
}
