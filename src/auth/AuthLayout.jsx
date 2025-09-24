import React, { useEffect, useState } from 'react';
import './Auth.css';
import RoleSelect from './RoleSelect';
import CustomerAuth from './CustomerAuth';
import ServiceAuth from './ServiceAuth';
import ForgotPassword from './ForgotPassword';
import ResetPassword from './ResetPassword';

function useHash() {
  const [hash, setHash] = useState(window.location.hash || '#/');
  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  return hash;
}

export default function AuthLayout() {
  const hash = useHash();

  let content = <RoleSelect />;
  if (hash.startsWith('#/auth/customer')) {
    content = <CustomerAuth />;
  } else if (hash.startsWith('#/auth/service')) {
    content = <ServiceAuth />;
  } else if (hash.startsWith('#/auth/forgot')) {
    content = <ForgotPassword />;
  } else if (hash.startsWith('#/auth/reset')) {
    content = <ResetPassword />;
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">TamirciBul<span>.com</span></div>
        {content}
        <div className="auth-footer">
          <a href="#/">← Ana sayfa</a>
        </div>
      </div>
    </div>
  );
}
