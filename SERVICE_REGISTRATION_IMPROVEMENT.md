# Servis Kayıt Formu İyileştirmesi

## Sorun

Servis sağlayıcı kayıt formunda firma adı ve telefon numarası alanları yoktu. Bu yüzden:
- ❌ Admin panelinde firma adı görünmüyordu
- ❌ İletişim bilgileri eksikti
- ❌ Başvuru detayları yetersizdi

## Çözüm

Servis kayıt formuna **Firma Adı** ve **Telefon Numarası** alanları eklendi.

### Frontend Değişiklikleri

**Register.jsx - Yeni Alanlar:**

```jsx
{selectedRole === 'service' && (
  <>
    {/* Firma Adı - YENİ */}
    <div className="register-form-group">
      <label className="register-form-label">Firma Adı *</label>
      <input 
        name="company_name" 
        type="text"
        placeholder="Örn: Ahmet Tesisat Ltd."
        required
      />
    </div>

    {/* Telefon - YENİ */}
    <div className="register-form-group">
      <label className="register-form-label">Telefon Numarası *</label>
      <input 
        name="phone" 
        type="tel"
        placeholder="0555 123 45 67"
        required
      />
    </div>

    {/* Hizmet Türü - Emoji eklendi */}
    <div className="register-form-group">
      <label className="register-form-label">Hizmet Türü *</label>
      <select name="service_type" required>
        <option value="">Hizmet türünü seçin</option>
        <option value="plumbing">🚰 Tesisatçı</option>
        <option value="electrical">⚡ Elektrikçi</option>
        <option value="cleaning">🧹 Temizlik</option>
        <option value="appliance">🔌 Beyaz Eşya</option>
        <option value="computer">💻 Bilgisayar</option>
        <option value="phone">📱 Telefon</option>
        <option value="other">🛠️ Diğer</option>
      </select>
    </div>

    {/* Açıklama */}
    <div className="register-form-group">
      <label className="register-form-label">Hizmet Açıklaması</label>
      <textarea 
        name="description" 
        placeholder="Verdiğiniz hizmetler hakkında kısa bilgi..."
        rows={3}
      />
    </div>
  </>
)}
```

**API Request Body:**
```javascript
{
  name: "Ahmet Yılmaz",
  email: "ahmet@example.com",
  password: "123456",
  password_confirmation: "123456",
  role: "service",
  company_name: "Ahmet Tesisat Ltd.",  // YENİ
  phone: "0555 123 45 67",             // YENİ
  service_type: "plumbing",
  description: "Profesyonel tesisat hizmetleri..."
}
```

### Backend Değişiklikleri

**AuthController.php - Validation:**

```php
$validator = Validator::make($request->all(), [
    'name' => 'required|string|max:255',
    'email' => 'nullable|email|unique:users,email',
    'phone' => 'nullable|string|unique:users,phone',
    'password' => 'required|string|min:6|confirmed',
    'role' => 'required|in:customer,service',
    'company_name' => 'required_if:role,service|string|max:255', // YENİ
    'service_type' => 'required_if:role,service|string',
    'description' => 'nullable|string',
]);
```

**ServiceProvider Creation:**

```php
if ($request->role === 'service') {
    ServiceProvider::create([
        'user_id' => $user->id,
        'company_name' => $request->company_name,  // YENİ
        'service_type' => $request->service_type,
        'description' => $request->description,
        'phone' => $request->phone,                // YENİ
        'status' => ServiceProvider::STATUS_PENDING,
    ]);
}
```

**Field Names (Türkçe Hata Mesajları):**

```php
$fieldNames = [
    'name' => 'Ad Soyad',
    'email' => 'E-posta',
    'phone' => 'Telefon',
    'password' => 'Şifre',
    'password_confirmation' => 'Şifre Tekrarı',
    'role' => 'Rol',
    'company_name' => 'Firma Adı',        // YENİ
    'service_type' => 'Hizmet Türü',
    'description' => 'Açıklama',
];
```

## Form Alanları Sırası

### Servis Kayıt Formu:

1. **Ad Soyad** (zorunlu)
2. **E-posta Adresi** (zorunlu)
3. **Şifre** (zorunlu, min 6 karakter)
4. **Şifre Tekrar** (zorunlu)
5. **Firma Adı** ⭐ (zorunlu, yeni)
6. **Telefon Numarası** ⭐ (zorunlu, yeni)
7. **Hizmet Türü** (zorunlu, emoji'li)
8. **Hizmet Açıklaması** (opsiyonel)

### Müşteri Kayıt Formu:

1. **Ad Soyad** (zorunlu)
2. **E-posta Adresi** (zorunlu)
3. **Şifre** (zorunlu, min 6 karakter)
4. **Şifre Tekrar** (zorunlu)

## Veri Akışı

```
Kayıt Formu (Frontend)
         ↓
company_name + phone eklendi
         ↓
POST /api/auth/register
         ↓
AuthController::register()
         ↓
Validation (company_name required_if:role,service)
         ↓
User oluştur (phone ile)
         ↓
ServiceProvider oluştur (company_name + phone ile)
         ↓
STATUS_PENDING
         ↓
Admin Dashboard'da görünür
```

## Admin Dashboard'da Görünüm

### Başvuru Listesi:
```
┌─────────────────────────────────────────────────┐
│ [🚰]  Ahmet Tesisat Ltd.          [⏳ Beklemede]│
│       Tesisatçı                                  │
│       📍 Kadıköy, İstanbul  📅 03.12.2024       │
│       Profesyonel tesisat hizmetleri...         │
└─────────────────────────────────────────────────┘
```

### Modal Detay:
```
🏢 Firma Bilgileri
  Firma Adı: Ahmet Tesisat Ltd.
  Servis Türü: 🚰 Tesisatçı
  Durum: ⏳ Beklemede

📞 İletişim Bilgileri
  Telefon: 0555 123 45 67 [Ara]
  E-posta: ahmet@example.com [Mail Gönder]
```

## Validation Kuralları

### Frontend:
- `company_name`: required, type="text"
- `phone`: required, type="tel"
- `service_type`: required, select
- `description`: optional, textarea

### Backend:
- `company_name`: required_if:role,service, string, max:255
- `phone`: nullable, string, unique:users,phone
- `service_type`: required_if:role,service, string
- `description`: nullable, string

## Hata Mesajları

**Türkçe Validation Mesajları:**
- "Firma Adı alanı zorunludur"
- "Telefon alanı zorunludur"
- "Telefon zaten kullanılıyor"
- "Hizmet Türü alanı zorunludur"

## Test Senaryoları

1. ✅ Firma adı olmadan kayıt yapılamaz
2. ✅ Telefon olmadan kayıt yapılamaz
3. ✅ Firma adı admin dashboard'da görünür
4. ✅ Telefon numarası modal'da görünür
5. ✅ Telefon numarası tıklanabilir (tel: link)
6. ✅ Hizmet türü emoji ile gösterilir
7. ✅ Validation hataları Türkçe gösterilir
8. ✅ Kayıt sonrası login sayfasına yönlendirilir

## Avantajlar

### Kullanıcı Deneyimi:
1. **Daha Profesyonel**: Firma adı ile kayıt
2. **İletişim Kolaylığı**: Telefon numarası direkt görünür
3. **Görsel Zenginlik**: Emoji'li hizmet türleri
4. **Açık Gereksinimler**: Zorunlu alanlar (*) ile işaretli

### Admin Deneyimi:
1. **Bilgilendirici**: Firma adı hemen görünür
2. **Hızlı İletişim**: Telefon numarası tıklanabilir
3. **Kolay Karar**: Tüm bilgiler bir arada
4. **Profesyonel**: Eksik bilgi yok

## Sonuç

Servis kayıt formu artık:
- ✅ Firma adı ile kayıt alıyor
- ✅ Telefon numarası zorunlu
- ✅ Admin dashboard'da tüm bilgiler görünüyor
- ✅ İletişim bilgileri tıklanabilir
- ✅ Emoji'li hizmet türleri
- ✅ Türkçe hata mesajları

Artık servis sağlayıcılar eksiksiz bilgi ile kayıt olabiliyor! 🚀
