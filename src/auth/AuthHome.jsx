import React from 'react';
import './Auth.css';

export default function AuthHome() {
  return (
    <div className="auth-section">
      <h2>Giriş</h2>
      <p className="muted">Lütfen giriş yapın veya kayıt olun</p>

      <div className="role-grid" style={{ marginTop: 12 }}>
        <a className="role-card" href="#/auth/customer">
          <div className="role-emoji" aria-hidden>👤</div>
          <h3>Müşteri Girişi</h3>
          <p>Mevcut müşteri hesabınızla giriş yapın</p>
        </a>
        <a className="role-card" href="#/auth/service">
          <div className="role-emoji" aria-hidden>🛠️</div>
          <h3>Servis Girişi</h3>
          <p>Mevcut servis hesabınızla giriş yapın</p>
        </a>
      </div>

      <div style={{ marginTop: 16 }}>
        <a className="btn primary" href="#/auth/register">Kayıt Ol</a>
      </div>
    </div>
  );
}
