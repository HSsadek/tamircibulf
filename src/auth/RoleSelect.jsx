import React from 'react';

export default function RoleSelect() {
  return (
    <div className="auth-section">
      <h2>Giriş / Kayıt</h2>
      <p className="muted">Lütfen kullanıcı tipinizi seçin</p>
      <div className="role-grid">
        <a className="role-card" href="#/auth/customer">
          <div className="role-emoji" aria-hidden>👤</div>
          <h3>Müşteri</h3>
          <p>Beyaz eşyası arızalı kullanıcılar</p>
        </a>
        <a className="role-card" href="#/auth/service">
          <div className="role-emoji" aria-hidden>🛠️</div>
          <h3>Servis</h3>
          <p>Beyaz eşya tamircileri / servisler</p>
        </a>
      </div>
    </div>
  );
}
