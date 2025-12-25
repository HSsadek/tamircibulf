import React, { useEffect, useState } from 'react';
import './App.css';
import AuthLayout from './auth/AuthLayout';
import MainApp from './main/MainApp';
import ServiceRegistration from './service/ServiceRegistration';
import PendingApproval from './auth/PendingApproval';
import AdminLogin from './admin/AdminLogin';
import AdminProtectedRoute from './admin/AdminProtectedRoute';
import UnifiedLogin from './components/UnifiedLogin';
import Register from './components/Register';
import CustomerHomepage from './components/CustomerHomepage';
import CustomerDashboard from './components/CustomerDashboard';
import ServiceDashboard from './components/ServiceDashboard';
import ServiceDetail from './main/ServiceDetail';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';

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
  
  // Check user role and redirect accordingly on root path
  const checkAndRedirectByRole = () => {
    const userRole = localStorage.getItem('user_role');
    const serviceToken = localStorage.getItem('service_token');
    const authToken = localStorage.getItem('auth_token');
    const token = serviceToken || authToken;
    
    // If user is logged in, redirect based on role
    if (token && userRole) {
      if (userRole === 'service_provider') {
        window.location.hash = '#/service-dashboard';
        return <ServiceDashboard />;
      } else if (userRole === 'customer') {
        return <CustomerHomepage />;
      }
    }
    
    // Default: show customer homepage (public browsing)
    return <CustomerHomepage />;
  };
  
  // Admin routes
  if (hash.startsWith('#/admin-portal')) {
    return <AdminLogin />;
  }
  if (hash.startsWith('#/admin')) {
    return <AdminProtectedRoute />;
  }
  
  // Service provider routes
  if (hash.startsWith('#/service-dashboard') || hash.startsWith('#/service-profile')) {
    return <ServiceDashboard />;
  }
  if (hash.startsWith('#/service-register')) {
    return <ServiceRegistration />;
  }
  
  // Auth routes
  if (hash.startsWith('#/login')) {
    return <UnifiedLogin />;
  }
  if (hash.startsWith('#/register')) {
    return <Register />;
  }
  if (hash.startsWith('#/forgot-password')) {
    return <ForgotPassword />;
  }
  if (hash.startsWith('#/reset-password')) {
    return <ResetPassword />;
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
  if (hash.startsWith('#/service/')) {
    return <ServiceDetail />;
  }
  if (hash.startsWith('#/app')) {
    return <MainApp />;
  }
  
  // Root path - check role and redirect
  if (hash === '#/' || hash === '') {
    return checkAndRedirectByRole();
  }
  
  // Fallback to customer homepage for unknown routes
  return <CustomerHomepage />;
}

export default App;
