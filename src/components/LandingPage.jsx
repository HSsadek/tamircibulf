import React from 'react';
import './LandingPage.css';

function LandingPage() {
  return (
    <div className="landing">
      {/* Navbar */}
      <nav className="nav">
        <div className="container nav-content">
          <div className="brand">TamirciBul<span>.com</span></div>
          <div className="actions">
            <a href="#features">Özellikler</a>
            <a href="#how">Nasıl Çalışır?</a>
            <a href="#ai">AI Yardımı</a>
            <a href="#/auth" className="btn ghost">Giriş / Kayıt</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="hero">
        <div className="container hero-inner">
          <div className="hero-text">
            <h1>Beyaz Eşya Arızalarını Hızlı ve Güvenilir Şekilde Çözün</h1>
            <p>
              TamirciBul.com, en yakın yetkili ve güvenilir teknik servisleri saniyeler içinde
              bulmanızı sağlar. Dilerseniz AI destekli önerilerle arızayı kendiniz de
              çözmeyi deneyin.
            </p>
            <div className="hero-cta">
              <a href="#/auth" className="btn primary">Hemen Başla</a>
              <a href="#ai" className="btn ghost">AI ile Teşhis</a>
            </div>
          </div>
          <div className="hero-art" aria-hidden>
            <div className="device-card">
              <div className="device-icon" role="img" aria-label="Buzdolabı">🥶</div>
              <div className="device-info">
                <div className="title">Buzdolabı Soğutmuyor</div>
                <div className="meta">Yakınınızda 6 servis bulundu</div>
              </div>
            </div>
            <div className="device-card alt">
              <div className="device-icon" role="img" aria-label="Çamaşır Makinesi">🧺</div>
              <div className="device-info">
                <div className="title">Çamaşır Makinesi Ses Yapıyor</div>
                <div className="meta">AI Öneri: Filtreyi kontrol edin</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* How it works */}
      <section id="how" className="section">
        <div className="container">
          <h2>Nasıl Çalışır?</h2>
          <div className="steps">
            <div className="step">
              <div className="step-icon">📍</div>
              <h3>Konum ve Arıza</h3>
              <p>İl/ilçe ve arıza türünü seçin ya da kısaca anlatın.</p>
            </div>
            <div className="step">
              <div className="step-icon">🔎</div>
              <h3>En Yakın Servisi Bulun</h3>
              <p>Yakınınızdaki güvenilir teknik servisleri anında görüntüleyin.</p>
            </div>
            <div className="step">
              <div className="step-icon">🤖</div>
              <h3>AI Destekli Öneriler</h3>
              <p>Basit arızaları kendiniz çözebilmeniz için adım adım rehber alın.</p>
            </div>
            <div className="step">
              <div className="step-icon">☎️</div>
              <h3>Doğrudan İletişim</h3>
              <p>Servisle hemen telefonla ya da mesajla iletişime geçin.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="section alt-bg">
        <div className="container">
          <h2>Neden TamirciBul.com?</h2>
          <div className="features">
            <div className="feature">
              <div className="f-icon">⚡</div>
              <h3>Hızlı Eşleşme</h3>
              <p>Saniyeler içinde size en yakın uygun servisleri listeler.</p>
            </div>
            <div className="feature">
              <div className="f-icon">🛡️</div>
              <h3>Güvenilir Servis</h3>
              <p>Onaylı ve puanlanmış servislerle içiniz rahat eder.</p>
            </div>
            <div className="feature">
              <div className="f-icon">📞</div>
              <h3>Doğrudan İletişim</h3>
              <p>Aracı olmadan servisle anında iletişime geçin.</p>
            </div>
            <div className="feature">
              <div className="f-icon">⏰</div>
              <h3>7/24 Destek</h3>
              <p>Mesai saatleri dışında da talep oluşturun.</p>
            </div>
          </div>
        </div>
      </section>

      

      {/* AI Assistant */}
      <section id="ai" className="section alt-bg">
        <div className="container ai-box">
          <h2>AI Destekli Arıza Teşhisi</h2>
          <p>Arızayı kısaca anlatın, öneriler alarak basit problemleri kendiniz çözmeyi deneyin.</p>
          <form className="ai-form" onSubmit={(e) => e.preventDefault()}>
            <textarea rows="4" placeholder="Örn. Buzdolabı çalışıyor ama soğutmuyor..." aria-label="Arıza açıklaması" />
            <button className="btn ghost" type="submit">Öneri Al</button>
          </form>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section">
        <div className="container testimonials">
          <div className="testimonial">
            <p>“Akşam bozuldu, sabah ilk iş servisi buldum. Çok hızlıydı!”</p>
            <span>— Elif, İstanbul</span>
          </div>
          <div className="testimonial">
            <p>“AI önerisiyle makinenin filtresini temizledim, sorun çözüldü.”</p>
            <span>— Murat, Ankara</span>
          </div>
          <div className="testimonial">
            <p>“Güvenilir servis listesi sayesinde içim rahat.”</p>
            <span>— Ayşe, İzmir</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container footer-inner">
          <div className="brand">TamirciBul<span>.com</span></div>
          <div className="foot-links">
            <button type="button" className="text-link" onClick={() => alert('Gizlilik politikası yakında.')}>Gizlilik</button>
            <button type="button" className="text-link" onClick={() => alert('Kullanım şartları yakında.')}>Şartlar</button>
            <button type="button" className="text-link" onClick={() => alert('İletişim sayfası yakında.')}>İletişim</button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
