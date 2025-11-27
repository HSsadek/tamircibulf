# Hizmet Talebi Akışı

## Genel Bakış
Müşteriler, servis sağlayıcılardan hizmet talep edebilir. Talep oluşturma işlemi hem liste görünümünden hem de harita üzerinden yapılabilir.

## Kullanıcı Akışı

### 1. Hizmet Keşfi
Müşteri, servisleri iki şekilde keşfedebilir:
- **Liste Görünümü**: Servisler kart formatında listelenir
- **Harita Görünümü**: Servisler harita üzerinde marker'lar ile gösterilir

### 2. Hizmet Talebi Oluşturma

#### Liste Görünümünden
1. Müşteri servis kartında "🛠️ Hizmet Talep Et" butonuna tıklar
2. ServiceRequestDialog açılır
3. Form doldurulur
4. Talep gönderilir

#### Harita Görünümünden
1. Müşteri harita üzerinde bir marker'a tıklar
2. Popup açılır ve servis bilgileri gösterilir
3. "🛠️ Talep Et" butonuna tıklanır
4. ServiceRequestDialog açılır
5. Form doldurulur
6. Talep gönderilir

### 3. Form Alanları

#### Zorunlu Alanlar
- **Başlık**: Talep başlığı (örn: "Musluk tamiri")
- **Açıklama**: Sorunun detaylı açıklaması
- **Şehir**: Hizmet alınacak şehir
- **İlçe**: Hizmet alınacak ilçe
- **Adres**: Tam adres bilgisi

#### Opsiyonel Alanlar
- **Öncelik**: Düşük, Orta, Yüksek, Acil (varsayılan: Orta)
- **Konum**: GPS koordinatları ("Konumumu Al" butonu ile otomatik alınır)

#### Otomatik Alanlar
- **Talep Tarihi**: Otomatik olarak şu anki tarih ve saat

### 4. Başarı Ekranı
Talep başarıyla gönderildikten sonra:
- ✅ Başarı mesajı gösterilir
- Talep özeti gösterilir
- "📊 Taleplerime Git" butonu ile dashboard'a yönlendirme
- "✕ Kapat" butonu ile dialog kapatılır

## Teknik Detaylar

### Frontend Components

#### ServiceRequestDialog.jsx
Modern, kullanıcı dostu dialog component:
- **Props**:
  - `isOpen`: Dialog açık mı?
  - `onClose`: Kapatma callback'i
  - `service`: Seçilen servis bilgileri
  - `userLocation`: Kullanıcının konumu
  - `onSuccess`: Başarı callback'i

- **Features**:
  - 2 adımlı form (Form → Başarı)
  - Otomatik konum alma
  - Form validasyonu
  - Responsive tasarım
  - Smooth animasyonlar

#### CustomerHomepage.js
- `handleServiceRequest(service)`: Dialog'u açar
- `handleRequestSuccess(requestData)`: Başarı callback'i
- State yönetimi:
  - `showRequestDialog`: Dialog görünürlüğü
  - `requestService`: Seçilen servis

#### RealMap.jsx
- `onServiceRequest` prop'u eklendi
- Popup içinde "🛠️ Talep Et" butonu
- Haritadan direkt talep oluşturma

### Backend API

#### Endpoint
```
POST /api/services/request
```

#### Request Body
```json
{
  "service_provider_id": 123,
  "service_type": "plumbing",
  "title": "Musluk tamiri",
  "description": "Mutfak musluğu akıyor",
  "address": "Tam adres",
  "city": "İstanbul",
  "district": "Kadıköy",
  "latitude": 40.9876,
  "longitude": 29.1234,
  "priority": "medium"
}
```

**Not**: Tarih otomatik olarak backend'de `created_at` alanına kaydedilir.

#### Response
```json
{
  "success": true,
  "message": "Service request created successfully",
  "data": {
    "id": 456,
    "customer_id": 789,
    "service_provider_id": 123,
    "status": "pending",
    "created_at": "2024-11-27T10:00:00Z"
  }
}
```

### Database
Talepler `service_requests` tablosunda saklanır:
- `customer_id`: Müşteri ID
- `service_provider_id`: Servis sağlayıcı ID (opsiyonel)
- `status`: pending, accepted, in_progress, completed, cancelled
- `priority`: low, medium, high, urgent

## Bildirim Akışı (Gelecek)

### Müşteri Bildirimleri
1. ✅ Talep oluşturuldu
2. 📬 Servis sağlayıcı talebi kabul etti
3. 🔄 Hizmet başladı
4. ✅ Hizmet tamamlandı
5. ⭐ Değerlendirme talebi

### Servis Sağlayıcı Bildirimleri
1. 🔔 Yeni talep geldi
2. ⏰ Talep hatırlatıcısı
3. 💬 Müşteri mesajı
4. ⭐ Yeni değerlendirme

## UI/UX Özellikleri

### Animasyonlar
- Dialog açılış: Fade in + Slide up
- Başarı ikonu: Scale in
- Buton hover: Scale + Shadow

### Responsive Tasarım
- Mobil: Full screen dialog, tek sütun form
- Tablet: Orta boyut dialog, iki sütun form
- Desktop: Maksimum 700px genişlik, iki sütun form

### Erişilebilirlik
- Keyboard navigation
- ARIA labels
- Focus management
- Screen reader uyumlu

## Geliştirme Notları

### Yapılacaklar
- [ ] Fotoğraf yükleme özelliği
- [ ] Gerçek zamanlı bildirimler (WebSocket)
- [ ] Talep durumu takibi
- [ ] Mesajlaşma sistemi
- [ ] Ödeme entegrasyonu
- [ ] Değerlendirme sistemi

### Optimizasyonlar
- ✅ Form validasyonu
- ✅ Otomatik konum alma (tek buton)
- ✅ Basitleştirilmiş form (gereksiz alanlar kaldırıldı)
- ✅ Otomatik tarih (backend'de created_at)
- ✅ Responsive tasarım
- ✅ Smooth animasyonlar
- ✅ Error handling
- ✅ Konum feedback (✅ Konum Alındı)

## Test Senaryoları

### Başarılı Akış
1. Kullanıcı giriş yapmış
2. Servis seçilmiş
3. Form doğru doldurulmuş
4. API başarılı yanıt vermiş
5. Başarı ekranı gösterilmiş

### Hata Senaryoları
1. Kullanıcı giriş yapmamış → Login'e yönlendir
2. Form eksik doldurulmuş → Validasyon hatası göster
3. API hatası → Hata mesajı göster
4. Network hatası → Tekrar dene butonu göster

## Performans

### Optimizasyonlar
- Lazy loading dialog
- Form state yönetimi
- Debounced input
- Optimistic UI updates

### Metrikler
- Dialog açılış: <100ms
- Form submit: <500ms
- API response: <1s
- Başarı ekranı: Anında