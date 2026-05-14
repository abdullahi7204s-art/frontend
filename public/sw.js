// This is the Service Worker (sw.js)
self.addEventListener('install', (e) => {
  console.log('SpendWise Service Worker Installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
});

self.addEventListener('fetch', (e) => {
  // Keeps the app running smoothly
  e.respondWith(fetch(e.request));
});
