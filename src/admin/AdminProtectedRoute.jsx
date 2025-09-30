import React, { useEffect, useState } from 'react';
import AdminDashboard from './AdminDashboard';
import AdminLogin from './AdminLogin';

export default function AdminProtectedRoute() {
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null = loading, true/false = result
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem('admin_token');
      
      // No token = not authenticated
      if (!token) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      try {
        // Validate token with backend
        const res = await fetch('http://localhost:8000/api/admin/validate-token', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          console.log('Token validation successful, user data:', data);
          
          // Update user info if provided
          if (data?.user) {
            localStorage.setItem('admin_user', JSON.stringify(data.user));
            console.log('Updated admin user info:', data.user);
          } else if (data?.data?.user) {
            localStorage.setItem('admin_user', JSON.stringify(data.data.user));
            console.log('Updated admin user info from data.user:', data.data.user);
          }
          setIsAuthenticated(true);
        } else {
          // Token is invalid, clear it
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_user');
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Token validation error:', error);
        // On network error, assume token is invalid
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, []);

  // Show loading while validating
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        Yetkilendirme kontrol ediliyor...
      </div>
    );
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  // Show dashboard if authenticated
  return <AdminDashboard />;
}
