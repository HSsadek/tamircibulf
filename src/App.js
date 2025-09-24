import React, { useEffect, useState } from 'react';
import './App.css';
import LandingPage from './components/LandingPage';
import AuthLayout from './auth/AuthLayout';

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
  if (hash.startsWith('#/auth')) {
    return <AuthLayout />;
  }
  return <LandingPage />;
}

export default App;
