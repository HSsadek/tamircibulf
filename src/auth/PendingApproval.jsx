import React from 'react';
import './PendingApproval.css';

export default function PendingApproval() {
  return (
    <div className="pa-wrap">
      <div className="pa-bg">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="grid" />
      </div>

      <div className="pa-stage">
        <div className="cube" aria-hidden>
          <span className="face front" />
          <span className="face back" />
          <span className="face right" />
          <span className="face left" />
          <span className="face top" />
          <span className="face bottom" />
        </div>

        <div className="pa-card" tabIndex={0}>
          <div className="pa-badge">
            <span className="dot" />
            İnceleme Sürüyor
          </div>
          <h1 className="pa-title">Başvurunuz İncelemede</h1>
          <p className="pa-text">
            Servis kayıt talebiniz alınmıştır ve yönetici onayına gönderilmiştir. Onaylandığında
            hesabınız etkinleştirilecek ve panelinize yönlendirileceksiniz.
          </p>

          <div className="pa-actions">
            <a className="pa-btn" href="#/">Ana sayfa</a>
            <a className="pa-btn primary" href="#/auth/service?mode=login">Giriş Yap</a>
          </div>

          <div className="pa-footer">
            <span className="spinner" aria-hidden />
            Ortalama onay süresi: 24 saat
          </div>
        </div>
      </div>
    </div>
  );
}
