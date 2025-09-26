import React, { useEffect, useMemo, useState } from 'react';
import './ServiceRegistration.css';

const CITY_OPTIONS = [
  { value: '', label: 'Şehir seçin' },
  { value: 'İstanbul', label: 'İstanbul' },
  { value: 'Ankara', label: 'Ankara' },
  { value: 'İzmir', label: 'İzmir' },
  { value: 'Bursa', label: 'Bursa' },
];

const DISTRICT_BY_CITY = {
  İstanbul: ['Kadıköy', 'Üsküdar', 'Beşiktaş', 'Bakırköy'],
  Ankara: ['Çankaya', 'Keçiören', 'Yenimahalle', 'Mamak'],
  İzmir: ['Konak', 'Karşıyaka', 'Bornova', 'Buca'],
  Bursa: ['Osmangazi', 'Nilüfer', 'Yıldırım'],
};

export default function ServiceRegistration() {
  const [form, setForm] = useState({
    companyName: '',
    description: '',
    city: '',
    district: '',
    address: '',
    phone: '',
    email: '',
    workingHours: '',
    latitude: '',
    longitude: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success'|'error', text: string }
  const [submitted, setSubmitted] = useState(false);

  const districts = useMemo(() => {
    return form.city && DISTRICT_BY_CITY[form.city] ? DISTRICT_BY_CITY[form.city] : [];
  }, [form.city]);

  useEffect(() => {
    // Reset district when city changes
    setForm((f) => ({ ...f, district: '' }));
  }, [form.city]);

  useEffect(() => {
    // Optional: try to get geolocation
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          latitude: String(pos.coords.latitude),
          longitude: String(pos.coords.longitude),
        }));
      },
      () => {
        // Ignore errors silently; user may deny permission
      }
    );
  }, []);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const validate = () => {
    const e = {};
    if (!form.companyName.trim()) e.companyName = 'Zorunlu alan';
    if (!form.city) e.city = 'Zorunlu alan';
    if (!form.district) e.district = 'Zorunlu alan';
    if (!form.phone.trim()) e.phone = 'Zorunlu alan';
    return e;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    setMessage(null);
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    try {
      setSubmitting(true);
      const res = await fetch('/api/service-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: form.companyName,
          description: form.description,
          city: form.city,
          district: form.district,
          address: form.address,
          phone: form.phone,
          email: form.email,
          working_hours: form.workingHours,
          latitude: form.latitude,
          longitude: form.longitude,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => 'Bir hata oluştu');
        throw new Error(errText || `HTTP ${res.status}`);
      }

      setMessage({ type: 'success', text: 'Başvurunuz alındı. Yönetici tarafından incelendikten sonra tarafınıza dönüş yapılacaktır.' });
      setSubmitted(true);
      // Optionally reset non-required fields
      setForm((f) => ({
        ...f,
        description: '',
        address: '',
        email: '',
        workingHours: '',
      }));
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Gönderim başarısız oldu.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="sr-page">
      <div className="sr-card">
        <div className="sr-brand">TamirciBul<span>.com</span></div>
        <h2 className="sr-title">Servis Kayıt Başvurusu</h2>
        <p className="sr-muted">Beyaz eşya tamir servisiniz için başvuru formunu doldurun. Bu form doğrudan servis hesabı oluşturmaz;
          yönetici onayından sonra sistemde görünür olursunuz.</p>

        {message && (
          <div className={"sr-alert " + (message.type === 'success' ? 'success' : 'error')}>
            {message.text}
          </div>
        )}

        {!submitted ? (
        <form className="sr-form" onSubmit={onSubmit}>
          <label>
            <span>Firma / Servis Adı *</span>
            <input
              name="companyName"
              type="text"
              placeholder="Örn. Hızlı Beyaz Eşya Servisi"
              value={form.companyName}
              onChange={onChange}
              required
            />
            {errors.companyName && <small className="sr-error">{errors.companyName}</small>}
          </label>

          <label>
            <span>Açıklama</span>
            <textarea
              name="description"
              rows={3}
              placeholder="Kısa bir tanım, uzmanlık alanlarınız vs."
              value={form.description}
              onChange={onChange}
            />
          </label>

          <div className="sr-grid-2">
            <label>
              <span>Şehir *</span>
              <select name="city" value={form.city} onChange={onChange} required>
                {CITY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value} disabled={c.value === ''}>
                    {c.label}
                  </option>
                ))}
              </select>
              {errors.city && <small className="sr-error">{errors.city}</small>}
            </label>

            <label>
              <span>İlçe *</span>
              <select name="district" value={form.district} onChange={onChange} required disabled={!districts.length}>
                <option value="" disabled>
                  İlçe seçin
                </option>
                {districts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              {errors.district && <small className="sr-error">{errors.district}</small>}
            </label>
          </div>

          <label>
            <span>Adres</span>
            <input
              name="address"
              type="text"
              placeholder="Cadde, sokak, no"
              value={form.address}
              onChange={onChange}
            />
          </label>

          <div className="sr-grid-2">
            <label>
              <span>Telefon *</span>
              <input
                name="phone"
                type="tel"
                placeholder="05xx xxx xx xx"
                value={form.phone}
                onChange={onChange}
                required
              />
              {errors.phone && <small className="sr-error">{errors.phone}</small>}
            </label>

            <label>
              <span>E-posta</span>
              <input
                name="email"
                type="email"
                placeholder="ornek@servis.com"
                value={form.email}
                onChange={onChange}
              />
            </label>
          </div>

          <label>
            <span>Çalışma Saatleri</span>
            <input
              name="workingHours"
              type="text"
              placeholder="Örn. Hafta içi 09:00 - 18:00"
              value={form.workingHours}
              onChange={onChange}
            />
          </label>

          {/* Hidden lat/lng if available */}
          <input type="hidden" name="latitude" value={form.latitude} readOnly />
          <input type="hidden" name="longitude" value={form.longitude} readOnly />

          <button className="sr-btn primary" type="submit" disabled={submitting}>
            {submitting ? (
              <span className="sr-spinner" aria-hidden />
            ) : (
              'Gönder'
            )}
          </button>
        </form>
        ) : (
          <div className="sr-confirm">
            <h3>Başvurunuz alındı ve inceleme aşamasında.</h3>
            <p className="sr-muted">
              Sistem yöneticisi, servis bilgilerinizin doğruluğunu kontrol edecek ve en kısa sürede sizinle iletişime geçecektir.
              Onaylanmanızın ardından servisiniz web sitesinde listelenecektir.
            </p>
            <div style={{ marginTop: 12 }}>
              <a className="sr-btn primary" href="#/">Ana sayfaya dön</a>
            </div>
          </div>
        )}

        <div className="sr-footer">
          <a href="#/">← Ana sayfa</a>
        </div>
      </div>
    </div>
  );
}
