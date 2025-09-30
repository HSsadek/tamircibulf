import React, { useState, useEffect, useMemo } from 'react';
import './CustomerHomepage.css';

function useCustomerAuth() {
  return useMemo(() => ({
    get token() { return localStorage.getItem('customer_token') || localStorage.getItem('auth_token'); },
    get user() { 
      try { 
        const userData = localStorage.getItem('customer_user') || localStorage.getItem('user_data');
        return JSON.parse(userData || 'null');
      } catch (error) {
        return null;
      }
    },
    logout() {
      localStorage.removeItem('customer_token');
      localStorage.removeItem('customer_user');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      localStorage.removeItem('user_role');
      window.location.hash = '#/login';
    }
  }), []);
}

export default function CustomerHomepage() {
  const auth = useCustomerAuth();
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAIChat, setShowAIChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  const categories = [
    { id: 'all', name: 'Tümü', icon: '🔧' },
    { id: 'plumbing', name: 'Tesisatçı', icon: '🚰' },
    { id: 'electrical', name: 'Elektrikçi', icon: '⚡' },
    { id: 'cleaning', name: 'Temizlik', icon: '🧹' },
    { id: 'appliance', name: 'Beyaz Eşya', icon: '🔌' },
    { id: 'computer', name: 'Bilgisayar', icon: '💻' },
    { id: 'phone', name: 'Telefon', icon: '📱' },
    { id: 'other', name: 'Diğer', icon: '🛠️' }
  ];

  useEffect(() => {
    fetchServices();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    filterServices();
  }, [services, selectedCategory, searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchServices = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:8000/api/services', {
        headers: {
          'Accept': 'application/json',
          ...(auth.token && { 'Authorization': `Bearer ${auth.token}` })
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        setServices(data?.data || data?.services || []);
      } else {
        // Mock data for demo
        setServices([
          {
            id: 1,
            name: 'Ahmet Tesisatçı',
            category: 'plumbing',
            rating: 4.8,
            reviews: 127,
            distance: '0.5 km',
            price: '₺150-300',
            image: '🚰',
            description: 'Profesyonel tesisatçı hizmeti'
          },
          {
            id: 2,
            name: 'Mehmet Elektrikçi',
            category: 'electrical',
            rating: 4.9,
            reviews: 89,
            distance: '1.2 km',
            price: '₺200-400',
            image: '⚡',
            description: 'Elektrik arıza ve montaj'
          },
          {
            id: 3,
            name: 'Fatma Temizlik',
            category: 'cleaning',
            rating: 4.7,
            reviews: 156,
            distance: '0.8 km',
            price: '₺100-250',
            image: '🧹',
            description: 'Ev ve ofis temizlik hizmeti'
          }
        ]);
      }
    } catch (err) {
      console.error('Services fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterServices = () => {
    let filtered = services;
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(service => service.category === selectedCategory);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(service => 
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredServices(filtered);
  };

  const handleServiceRequest = (serviceId) => {
    if (!auth.token) {
      alert('Hizmet talep etmek için giriş yapmalısınız.');
      window.location.hash = '#/login';
      return;
    }
    
    // Service request logic here
    alert('Hizmet talebi gönderildi!');
  };

  const sendAIMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage = { type: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    
    // Simulate AI response
    setTimeout(() => {
      const aiResponse = { 
        type: 'ai', 
        content: `Merhaba! "${chatInput}" konusunda size yardımcı olabilirim. Hangi tür tamir hizmeti arıyorsunuz?` 
      };
      setChatMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  return (
    <div className="customer-homepage">
      {/* Header */}
      <header className="customer-header">
        <div className="customer-header-content">
          <div className="customer-logo">
            <h1>🔧 TamirciBul</h1>
          </div>
          <div className="customer-header-actions">
            {auth.user ? (
              <div className="customer-user-menu">
                <span>Merhaba, {auth.user.name || 'Müşteri'}</span>
                <button onClick={auth.logout} className="customer-logout-btn">Çıkış</button>
              </div>
            ) : (
              <a href="#/login" className="customer-login-btn">Giriş Yap</a>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="customer-hero">
        <div className="customer-hero-content">
          <h2>En Yakın Tamircini Bul</h2>
          <p>Güvenilir ve profesyonel tamir hizmetleri</p>
          
          {/* Search Bar */}
          <div className="customer-search-bar">
            <input 
              type="text"
              placeholder="Hangi hizmeti arıyorsunuz?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="customer-search-input"
            />
            <button className="customer-search-btn">🔍</button>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="customer-categories">
        <div className="customer-container">
          <h3>Hizmet Kategorileri</h3>
          <div className="customer-category-grid">
            {categories.map(category => (
              <button
                key={category.id}
                className={`customer-category-card ${selectedCategory === category.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category.id)}
              >
                <div className="customer-category-icon">{category.icon}</div>
                <div className="customer-category-name">{category.name}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Services List */}
      <section className="customer-services">
        <div className="customer-container">
          <h3>
            {selectedCategory === 'all' ? 'Tüm Hizmetler' : 
             categories.find(c => c.id === selectedCategory)?.name || 'Hizmetler'}
          </h3>
          
          {loading ? (
            <div className="customer-loading">Hizmetler yükleniyor...</div>
          ) : (
            <div className="customer-services-grid">
              {filteredServices.map(service => (
                <div key={service.id} className="customer-service-card">
                  <div className="customer-service-header">
                    <div className="customer-service-image">{service.image}</div>
                    <div className="customer-service-info">
                      <h4>{service.name}</h4>
                      <p>{service.description}</p>
                    </div>
                  </div>
                  
                  <div className="customer-service-details">
                    <div className="customer-service-rating">
                      ⭐ {service.rating} ({service.reviews} değerlendirme)
                    </div>
                    <div className="customer-service-distance">📍 {service.distance}</div>
                    <div className="customer-service-price">💰 {service.price}</div>
                  </div>
                  
                  <div className="customer-service-actions">
                    <button 
                      className="customer-service-btn primary"
                      onClick={() => handleServiceRequest(service.id)}
                    >
                      Hizmet Talep Et
                    </button>
                    <button className="customer-service-btn secondary">
                      Detaylar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {!loading && filteredServices.length === 0 && (
            <div className="customer-no-results">
              <p>Aradığınız kriterlere uygun hizmet bulunamadı.</p>
            </div>
          )}
        </div>
      </section>

      {/* AI Chat Button */}
      <button 
        className="customer-ai-chat-toggle"
        onClick={() => setShowAIChat(!showAIChat)}
      >
        🤖 AI Destek
      </button>

      {/* AI Chat Panel */}
      {showAIChat && (
        <div className="customer-ai-chat">
          <div className="customer-ai-chat-header">
            <h4>🤖 AI Destek</h4>
            <button onClick={() => setShowAIChat(false)}>✕</button>
          </div>
          
          <div className="customer-ai-chat-messages">
            {chatMessages.length === 0 && (
              <div className="customer-ai-welcome">
                Merhaba! Size nasıl yardımcı olabilirim?
              </div>
            )}
            {chatMessages.map((message, index) => (
              <div key={index} className={`customer-ai-message ${message.type}`}>
                {message.content}
              </div>
            ))}
          </div>
          
          <div className="customer-ai-chat-input">
            <input 
              type="text"
              placeholder="Mesajınızı yazın..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendAIMessage()}
            />
            <button onClick={sendAIMessage}>Gönder</button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="customer-footer">
        <div className="customer-container">
          <p>&copy; 2024 TamirciBul. Tüm hakları saklıdır.</p>
        </div>
      </footer>
    </div>
  );
}
