import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import RoleApp from './RoleApp';
import { engine } from './lib/engine';
import '@next-steps/core/styles.css';
import './styles.css';

registerSW({ immediate: true });

// ITEM-8-HRP-NEWBORN.md NS-1, NS-13: roles are deployment configuration
// (engine.rolesEnabled()) — the original deployment declares none and
// renders exactly the admin experience it always has; a deployment that
// declares the four version-1 roles (the maternal profile) renders the
// role-scoped worklist/arrivals experience instead.
const Root = engine.rolesEnabled() ? RoleApp : App;

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  </React.StrictMode>,
);
