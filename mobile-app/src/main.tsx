import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/app.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Offline app shell. Production only, so the dev server never serves cached files.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((err) => console.warn('[PWA] Service worker not registered:', err));
  });
}
