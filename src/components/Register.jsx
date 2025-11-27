import React, { useState } from 'react';
import './Register.css';

export default function Register() {
  const [step, setStep] = useState(1); // 1: Role selection, 2: Registration form
  const [selectedRole, setSelectedRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const loginType = 'email'; // Only email registration

  const roles = [
    {
      id: 'customer',
      name: 'Müşteri',
      icon: '👤',
      description: 'Tamir hizmeti arayan kullanıcılar',
      features: ['Hizmet ara ve bul', 'Tamirci ile iletişim', 'Değerlendirme yap']
    },
    {
      id: 'service',
      name: 'Servis Sağlayıcı',
      icon: '🔧',
      description: 'Tamir hizmeti veren profesyoneller',
      features: ['Hizmet ver', 'Müşteri talepleri al', 'Kazanç elde et']
    }
  ];

  const handleRoleSelect = (roleId) => {
    setSelectedRole(roleId);
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const form = new FormData(e.currentTarget);
    const formData = Object.fromEntries(form.entries());

    console.log('Registration attempt:', { 
      role: selectedRole,
      type: loginType, 
      identifier: formData.identifier,
      name: formData.name
    });

    try {
      setLoading(true);
      
      console.log('Making registration request to:', 'http://localhost:8000/api/auth/register');
      const res = await fetch('http://localhost:8000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          [loginType]: formData.identifier, // phone or email
          password: formData.password,
          password_confirmation: formData.password_confirmation,
          role: selectedRole,
          ...(selectedRole === 'service' && {
            service_type: formData.service_type,
            description: formData.description
          })
        })
      });
      
      console.log('Registration response status:', res.status);
      
      const contentType = res.headers.get('content-type') || '';
      let data = {};
      const responseText = await res.text();
      console.log('Raw registration response:', responseText);
      
      if (contentType.includes('application/json') && responseText) {
        try {
          data = JSON.parse(responseText);
          console.log('Parsed registration response data:', data);
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          throw new Error('Sunucudan geçersiz yanıt alındı.');
        }
      }
      
      if (!res.ok) {
        console.error('Registration failed with status:', res.status, 'Data:', data);
        
        // Format error messages for user display
        let errMsg = '';
        
        if (data?.message) {
          errMsg = data.message;
        }
        
        // Handle validation errors
        if (data?.errors && typeof data.errors === 'object') {
          const errorMessages = [];
          for (const [field, messages] of Object.entries(data.errors)) {
            if (Array.isArray(messages)) {
              errorMessages.push(...messages);
            } else {
              errorMessages.push(messages);
            }
          }
          if (errorMessages.length > 0) {
            errMsg = errorMessages.join('\n');
          }
        } else if (Array.isArray(data?.errors)) {
          errMsg = data.errors.join('\n');
        }
        
        // Default error messages based on status code
        if (!errMsg) {
          if (res.status === 422) {
            errMsg = 'Girdiğiniz bilgiler geçersiz. Lütfen tüm alanları doğru doldurun.';
          } else if (res.status === 409) {
            errMsg = 'Bu e-posta adresi zaten kullanılıyor.';
          } else if (res.status === 500) {
            errMsg = 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.';
          } else {
            errMsg = `Kayıt başarısız. Lütfen bilgilerinizi kontrol edin.`;
          }
        }
        
        throw new Error(errMsg);
      }

      // Registration successful
      alert('Kayıt başarılı! Giriş sayfasına yönlendiriliyorsunuz.');
      window.location.hash = '#/login';
      
    } catch (err) {
      console.error('Registration error:', err);
      setError(err?.message || 'Bir hata oluştu. Konsolu kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-card">
          {step === 1 ? (
            // Step 1: Role Selection
            <div className="register-step">
              <div className="register-header">
                <h1 className="register-title">TamirciBul'a Katıl</h1>
                <p className="register-subtitle">Hangi rolde kayıt olmak istiyorsun?</p>
              </div>
              
              <div className="role-selection">
                {roles.map(role => (
                  <div 
                    key={role.id}
                    className="role-option"
                    onClick={() => handleRoleSelect(role.id)}
                  >
                    <div className="role-icon">{role.icon}</div>
                    <div className="role-info">
                      <h3>{role.name}</h3>
                      <p>{role.description}</p>
                      <ul className="role-features">
                        {role.features.map((feature, index) => (
                          <li key={index}>✓ {feature}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="role-arrow">→</div>
                  </div>
                ))}
              </div>
              
              <div className="register-footer">
                <p>Zaten hesabın var mı? <a href="#/login">Giriş yap</a></p>
                <p><a href="#/">← Ana sayfaya dön</a></p>
              </div>
            </div>
          ) : (
            // Step 2: Registration Form
            <div className="register-step">
              <div className="register-header">
                <button 
                  className="back-btn"
                  onClick={() => setStep(1)}
                >
                  ← Geri
                </button>
                <h1 className="register-title">
                  {roles.find(r => r.id === selectedRole)?.icon} {roles.find(r => r.id === selectedRole)?.name} Kayıt
                </h1>
                <p className="register-subtitle">Bilgilerini gir ve hemen başla!</p>
              </div>
              
              <form onSubmit={handleSubmit} autoComplete="off">
                <div className="register-form-group">
                  <label className="register-form-label">Ad Soyad</label>
                  <input 
                    name="name" 
                    type="text"
                    className="register-form-input"
                    placeholder="Adınız ve soyadınız" 
                    required 
                  />
                </div>

                <div className="register-form-group">
                  <label className="register-form-label">E-posta Adresi</label>
                  <input 
                    name="identifier" 
                    type="email"
                    className="register-form-input"
                    placeholder="ornek@email.com" 
                    required 
                  />
                </div>
                
                <div className="register-form-group">
                  <label className="register-form-label">Şifre</label>
                  <div className="register-password-input-wrapper">
                    <input 
                      name="password" 
                      type={showPassword ? 'text' : 'password'} 
                      className="register-form-input"
                      placeholder="En az 6 karakter" 
                      minLength={6} 
                      required 
                    />
                    <button 
                      type="button" 
                      className="register-password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div className="register-form-group">
                  <label className="register-form-label">Şifre Tekrar</label>
                  <input 
                    name="password_confirmation" 
                    type="password" 
                    className="register-form-input"
                    placeholder="Şifrenizi tekrar girin" 
                    minLength={6} 
                    required 
                  />
                </div>

                {/* Service-specific fields */}
                {selectedRole === 'service' && (
                  <>
                    <div className="register-form-group">
                      <label className="register-form-label">Hizmet Türü</label>
                      <select 
                        name="service_type" 
                        className="register-form-input"
                        required
                      >
                        <option value="">Hizmet türünü seçin</option>
                        <option value="plumbing">Tesisatçı</option>
                        <option value="electrical">Elektrikçi</option>
                        <option value="cleaning">Temizlik</option>
                        <option value="appliance">Beyaz Eşya</option>
                        <option value="computer">Bilgisayar</option>
                        <option value="phone">Telefon</option>
                        <option value="other">Diğer</option>
                      </select>
                    </div>

                    <div className="register-form-group">
                      <label className="register-form-label">Hizmet Açıklaması</label>
                      <textarea 
                        name="description" 
                        className="register-form-input"
                        placeholder="Verdiğiniz hizmetler hakkında kısa bilgi..."
                        rows={3}
                      />
                    </div>
                  </>
                )}
                
                <button className="register-btn register-btn-primary" type="submit" disabled={loading}>
                  {loading ? 'Kayıt Oluşturuluyor...' : 'Kayıt Ol'}
                </button>
                
                {error && (
                  <div className="register-error">
                    {error.split('\n').map((line, index) => (
                      <div key={index} className="error-line">{line}</div>
                    ))}
                  </div>
                )}
              </form>
              
              <div className="register-footer">
                <p>Zaten hesabın var mı? <a href="#/login">Giriş yap</a></p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
