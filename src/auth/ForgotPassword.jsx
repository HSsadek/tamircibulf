import React, { useState } from 'react';

export default function ForgotPassword() {
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const { email } = Object.fromEntries(form.entries());
    setSubmitted(true);
    alert(`Şifre sıfırlama bağlantısı (DEMO) şu e-postaya gönderilecek: ${email}`);
  };

  return (
    <div className="auth-section">
      <h2>Şifremi Unuttum</h2>
      <p className="muted">E-posta adresinizi girin, size sıfırlama bağlantısı gönderelim.</p>

      {submitted ? (
        <div className="muted">
          İstek alındı. Gelen kutunuzu kontrol edin. <br />
          <a href="#/auth/customer">Giriş sayfasına dön</a>
        </div>
      ) : (
        <form className="auth-form" onSubmit={onSubmit}>
          <label>
            E-posta
            <input name="email" type="email" placeholder="ornek@mail.com" required />
          </label>
          <button className="btn primary" type="submit">Bağlantı Gönder</button>
        </form>
      )}
    </div>
  );
}
