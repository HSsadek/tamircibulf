import React, { useState } from 'react';

export default function ServiceAuth() {
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());

    // Client-side validation to match backend rules
    if (mode === 'register') {
      if (!payload.password || payload.password.length < 8) {
        setError('Şifre en az 8 karakter olmalıdır.');
        return;
      }
      if (payload.password !== payload.password_confirmation) {
        setError('Şifreler uyuşmuyor.');
        return;
      }
    }

    if (mode === 'register') {
      try {
        setLoading(true);
        const res = await fetch('http://localhost:8000/api/service-requests', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            company_name: payload.company,
            service_type: payload.serviceType,
            description: payload.description || null,
            address: payload.address,
            phone: payload.phone,
            email: payload.email,
            password: payload.password,
            password_confirmation: payload.password_confirmation,
          }),
        });

        const contentType = res.headers.get('content-type') || '';
        const data = contentType.includes('application/json') ? (await res.json()) : {};
        console.log('Service register response:', { status: res.status, ok: res.ok, data });
        if (!res.ok) {
          let errMsg = '';
          if (data?.message) errMsg = data.message;
          else if (Array.isArray(data?.errors)) errMsg = data.errors.join(', ');
          else if (data?.errors && typeof data.errors === 'object') {
            errMsg = Object.values(data.errors).flat().join(' \n ');
          }
          if (!errMsg) errMsg = `Kayıt işlemi başarısız (HTTP ${res.status}).`;
          throw new Error(errMsg);
        }

        // Başarılı: onaylıysa dashboard'a, değilse bekleme sayfasına yönlendir
        const approved = data?.status === 'approved' || data?.approved === true;
        setSuccess('Kayıt talebiniz alındı.');
        if (approved) {
          window.location.hash = '#/app?role=service&dashboard=1';
        } else {
          window.location.hash = '#/pending-approval';
        }
      } catch (err) {
        setError(err?.message || 'Bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    } else {
      // Login modu için mevcut demo davranışını koru
      alert(`Giriş (Servis) — Demo:\n` + JSON.stringify(payload, null, 2));
      window.location.hash = '#/app?role=service&dashboard=1';
    }
  };

  return (
    <div className="auth-section">
      <div className="tabs">
        <button
          className={mode === 'login' ? 'tab active' : 'tab'}
          onClick={() => {
            setMode('login');
            try { window.location.hash = '#/auth/service?mode=login'; } catch {}
          }}
        >
          Giriş
        </button>
        <button
          className={mode === 'register' ? 'tab active' : 'tab'}
          onClick={() => {
            setMode('register');
            try { window.location.hash = '#/auth/service?mode=register'; } catch {}
          }}
        >
          Kayıt Ol
        </button>
      </div>

      <form className="auth-form" onSubmit={onSubmit}>
        {mode === 'register' && (
          <>
            <label>
              Firma / Servis Adı
              <input name="company" type="text" placeholder="Örn. Hızlı Beyaz Eşya Servisi" required />
            </label>
            <label>
              Servis Türü
              <select name="serviceType" required>
                <option value="">Seçiniz</option>
                <option value="authorized">Yetkili Servis</option>
                <option value="private">Özel Servis</option>
                <option value="independent">Bağımsız Tamirci</option>
              </select>
            </label>
            <label>
              Açıklama
              <textarea name="description" placeholder="Örn. Buzdolabı ve çamaşır makinesi tamiri yapılır" rows={3} />
            </label>
            <label>
              Adres
              <textarea name="address" placeholder="Örn. Mahalle, Cadde, No, İlçe/İl" rows={2} required />
            </label>
            <label>
              Telefon
              <input name="phone" type="tel" placeholder="05xx xxx xx xx" required />
            </label>
          </>
        )}

        <label>
          E-posta
          <input name="email" type="email" placeholder="ornek@servis.com" required />
        </label>

        <label>
          Şifre
          <div className="password-input" style={{ position: 'relative' }}>
            <input
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              minLength={8}
              required
              style={{ paddingRight: 36 }}
            />
            <button
              type="button"
              aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
              onClick={() => setShowPassword((s) => !s)}
              className="icon-btn"
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: 16,
              }}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </label>
        {mode === 'register' && (
          <label>
            Şifre (Tekrar)
            <div className="password-input" style={{ position: 'relative' }}>
              <input
                name="password_confirmation"
                type={showConfirm ? 'text' : 'password'}
                placeholder="••••••••"
                minLength={8}
                required
                style={{ paddingRight: 36 }}
              />
              <button
                type="button"
                aria-label={showConfirm ? 'Şifreyi gizle' : 'Şifreyi göster'}
                onClick={() => setShowConfirm((s) => !s)}
                className="icon-btn"
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 16,
                }}
              >
                {showConfirm ? '🙈' : '👁️'}
              </button>
            </div>
          </label>
        )}

        <button className="btn primary" type="submit" disabled={loading}>
          {mode === 'login'
            ? (loading ? 'Giriş Yapılıyor...' : 'Giriş Yap')
            : (loading ? 'Kayıt Gönderiliyor...' : 'Kayıt Ol')}
        </button>
      </form>

      {error && (
        <p className="muted small" style={{ color: 'crimson', marginTop: 8 }}>
          {error}
        </p>
      )}
      {success && (
        <p className="muted small" style={{ color: 'green', marginTop: 8 }}>
          {success}
        </p>
      )}

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

