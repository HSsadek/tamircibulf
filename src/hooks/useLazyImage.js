import { useState, useEffect, useRef } from 'react';
import { createPlaceholder } from '../utils/imageOptimizer';

/**
 * Lazy loading image hook
 * Görselleri sadece görünür olduklarında yükler
 */
export const useLazyImage = (src, options = {}) => {
  const {
    placeholder = createPlaceholder(),
    rootMargin = '50px',
    threshold = 0.01
  } = options;

  const [imageSrc, setImageSrc] = useState(placeholder);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    if (!src) {
      setImageSrc(placeholder);
      return;
    }

    // IntersectionObserver ile lazy loading
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Görünür olduğunda resmi yükle
            const img = new Image();
            
            img.onload = () => {
              setImageSrc(src);
              setIsLoaded(true);
              setIsError(false);
            };
            
            img.onerror = () => {
              setIsError(true);
              setImageSrc(placeholder);
            };
            
            img.src = src;
            
            // Observer'ı durdur
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin,
        threshold
      }
    );

    // Element'i gözlemle
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    // Cleanup
    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, [src, placeholder, rootMargin, threshold]);

  return { imageSrc, isLoaded, isError, imgRef };
};

/**
 * Lazy loading component
 */
export const LazyImage = ({ src, alt, className, style, placeholder, onLoad, onError }) => {
  const { imageSrc, isLoaded, isError, imgRef } = useLazyImage(src, { placeholder });

  useEffect(() => {
    if (isLoaded && onLoad) {
      onLoad();
    }
  }, [isLoaded, onLoad]);

  useEffect(() => {
    if (isError && onError) {
      onError();
    }
  }, [isError, onError]);

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={`${className || ''} ${isLoaded ? 'loaded' : 'loading'}`}
      style={{
        ...style,
        opacity: isLoaded ? 1 : 0.7,
        transition: 'opacity 0.3s ease-in-out'
      }}
    />
  );
};
