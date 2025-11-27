/**
 * Image optimization utilities
 * Görselleri optimize eder ve yükleme performansını artırır
 */

/**
 * Resmi sıkıştırır ve optimize eder
 * @param {File} file - Yüklenecek dosya
 * @param {Object} options - Optimizasyon seçenekleri
 * @returns {Promise<string>} - Base64 formatında sıkıştırılmış resim
 */
export const compressImage = (file, options = {}) => {
  const {
    maxWidth = 400,
    maxHeight = 400,
    quality = 0.7,
    format = 'image/jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Geçersiz dosya tipi'));
      return;
    }

    const reader = new FileReader();
    
    reader.onerror = () => reject(new Error('Dosya okunamadı'));
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onerror = () => reject(new Error('Resim yüklenemedi'));
      
      img.onload = () => {
        try {
          // Canvas oluştur
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Boyutları hesapla (aspect ratio korunarak)
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }
          
          // Canvas boyutunu ayarla
          canvas.width = width;
          canvas.height = height;
          
          // Resmi çiz
          ctx.drawImage(img, 0, 0, width, height);
          
          // Sıkıştırılmış resmi al
          const compressedDataUrl = canvas.toDataURL(format, quality);
          
          console.log('📸 Resim optimize edildi:');
          console.log('  - Orijinal boyut:', file.size, 'bytes');
          console.log('  - Optimize boyut:', compressedDataUrl.length, 'bytes');
          console.log('  - Boyut:', `${width}x${height}`);
          console.log('  - Sıkıştırma:', Math.round((1 - compressedDataUrl.length / file.size) * 100) + '%');
          
          resolve(compressedDataUrl);
        } catch (error) {
          reject(error);
        }
      };
      
      img.src = e.target.result;
    };
    
    reader.readAsDataURL(file);
  });
};

/**
 * Lazy loading için placeholder oluşturur
 * @param {number} width - Genişlik
 * @param {number} height - Yükseklik
 * @returns {string} - SVG placeholder
 */
export const createPlaceholder = (width = 400, height = 400) => {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f0f0f0"/>
      <text x="50%" y="50%" font-family="Arial" font-size="16" fill="#999" text-anchor="middle" dy=".3em">
        Yükleniyor...
      </text>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

/**
 * Resim URL'sini önbellekten alır veya yükler
 * @param {string} key - localStorage key
 * @param {string} defaultImage - Varsayılan resim
 * @returns {string} - Resim URL'si
 */
export const getCachedImage = (key, defaultImage = null) => {
  try {
    const cached = localStorage.getItem(key);
    return cached || defaultImage;
  } catch (error) {
    console.error('Cache okuma hatası:', error);
    return defaultImage;
  }
};

/**
 * Resmi önbelleğe kaydeder
 * @param {string} key - localStorage key
 * @param {string} imageData - Base64 resim verisi
 */
export const cacheImage = (key, imageData) => {
  try {
    localStorage.setItem(key, imageData);
  } catch (error) {
    console.error('Cache yazma hatası:', error);
    // localStorage dolu olabilir, eski resimleri temizle
    if (error.name === 'QuotaExceededError') {
      console.warn('⚠️ localStorage dolu, eski resimler temizleniyor...');
      clearOldImages();
      // Tekrar dene
      try {
        localStorage.setItem(key, imageData);
      } catch (retryError) {
        console.error('Cache yazma tekrar başarısız:', retryError);
      }
    }
  }
};

/**
 * Eski resimleri temizler
 */
export const clearOldImages = () => {
  const keys = Object.keys(localStorage);
  const imageKeys = keys.filter(key => 
    key.includes('profile_image') || 
    key.includes('logo') ||
    key.includes('_image_')
  );
  
  console.log(`🧹 ${imageKeys.length} resim önbelleği temizleniyor...`);
  
  imageKeys.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Key silinemedi: ${key}`, error);
    }
  });
};

/**
 * Lazy loading için IntersectionObserver kullanır
 * @param {HTMLElement} element - İzlenecek element
 * @param {Function} callback - Görünür olduğunda çağrılacak fonksiyon
 */
export const observeImage = (element, callback) => {
  if (!element) return;
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        callback();
        observer.unobserve(entry.target);
      }
    });
  }, {
    rootMargin: '50px' // 50px önden yüklemeye başla
  });
  
  observer.observe(element);
  
  return observer;
};
