import React, { useEffect, useState } from 'react';
import './App.css';
import LandingPage from './components/LandingPage';
import AuthLayout from './auth/AuthLayout';
import MainApp from './main/MainApp';
import ServiceDetail from './main/ServiceDetail';
import ServiceRegistration from './service/ServiceRegistration';
import PendingApproval from './auth/PendingApproval';
import AdminLogin from './admin/AdminLogin';
import AdminProtectedRoute from './admin/AdminProtectedRoute';
import UnifiedLogin from './components/UnifiedLogin';
import Register from './components/Register';
import CustomerHomepage from './components/CustomerHomepage';
import CustomerDashboard from './components/CustomerDashboard';
import ServiceDashboard from './components/ServiceDashboard';
import ServiceProviderProfile from './components/ServiceProviderProfile';

function useHash() {
  const [hash, setHash] = useState(window.location.hash || '#/');
  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  return hash;
}

function App() {
  const hash = useHash();
  
  // Admin routes
  if (hash.startsWith('#/admin-portal')) {
    return <AdminLogin />;
  }
  if (hash.startsWith('#/admin')) {
    return <AdminProtectedRoute />;
  }
  
  // Service provider routes
  if (hash.startsWith('#/service-profile')) {
    return <ServiceProviderProfile />;
  }
  if (hash.startsWith('#/service-dashboard')) {
    return <ServiceDashboard />;
  }
  if (hash.startsWith('#/service-register')) {
    return <ServiceRegistration />;
  }
  if (hash.startsWith('#/service/')) {
    return <ServiceDetail />;
  }
  
  // Auth routes
  if (hash.startsWith('#/login')) {
    return <UnifiedLogin />;
  }
  if (hash.startsWith('#/register')) {
    return <Register />;
  }
  if (hash.startsWith('#/auth')) {
    return <AuthLayout />;
  }
  
  // Other routes
  if (hash.startsWith('#/pending-approval')) {
    return <PendingApproval />;
  }
  if (hash.startsWith('#/customer-dashboard')) {
    return <CustomerDashboard />;
  }
  if (hash.startsWith('#/app')) {
    return <MainApp />;
  }
  
  // Customer homepage (default route)
  if (hash === '#/' || hash === '') {
    // Check if user is logged in and redirect accordingly
    const userRole = localStorage.getItem('user_role');
    const authToken = localStorage.getItem('auth_token');
    
    if (authToken && userRole) {
      switch (userRole.toLowerCase()) {
        case 'admin':
        case 'administrator':
          window.location.hash = '#/admin';
          return <div>Yönlendiriliyor...</div>;
        case 'service':
        case 'service_provider':
        case 'provider':
        case 'tamirci':
          window.location.hash = '#/service-dashboard';
          return <div>Yönlendiriliyor...</div>;
        default:
          return <CustomerHomepage />;
      }
    }
    
    return <CustomerHomepage />;
  }
  
  // Fallback to landing page for unknown routes
  return <LandingPage />;
}

export default App;
