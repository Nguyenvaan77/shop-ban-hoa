import React, { Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';

const Cms = lazy(() => import('./Cms.jsx'));
const Storefront = lazy(() => import('./Storefront.jsx'));
const isCms = /^\/cms\/?$/.test(window.location.pathname);

createRoot(document.getElementById('root')).render(
  <Suspense fallback={null}>{isCms ? <Cms /> : <Storefront />}</Suspense>
);
