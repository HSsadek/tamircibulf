import React, { useState } from 'react';

export default function CustomerAuth() {
  const getInitialMode = () => {
    try {
      const hash = window.location.hash || '';
      const qIndex = hash.indexOf('?');
      const query = qIndex >= 0 ? hash.substring(qIndex + 1) : '';
      const params = new URLSearchParams(query);
      return params.get('mode') === 'register' ? 'register' : 'login';
    } catch {
      return 'login';
    }
  };
  const [mode, setMode] = useState(getInitialMode()); // 'login' | 'register'

  const onSubmit = (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    alert(`${mode === 'login' ? 'Giriş' : 'Kayıt'} (Müşteri) — Demo:\n` + JSON.stringify(payload, null, 2));
    // demo redirect (rendered by MainApp)
    window.location.hash = '#/app?role=customer&dashboard=1';
  };

  return (
    <div className="auth-section">
      <div className="tabs">
        <button className={mode === 'login' ? 'tab active' : 'tab'} onClick={() => setMode('login')}>Giriş</button>
        {/* Kayıt sekmesine tıklanınca rol seçimine yönlendir */}
        <a className={'tab'} href="#/auth/register">Kayıt Ol</a>
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
        Kayıt olmak mı istiyorsunuz? <a href="#/auth/register">Tip seçimine gidin</a>
      </p>
    </div>
  );
}

