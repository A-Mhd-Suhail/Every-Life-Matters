const CACHE_NAME = 'olm-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/app.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});

// Push notification handling
self.addEventListener('push', (event) => {
    const data = event.data.json();
    const options = {
        body: data.message,
        icon: './icon.png',
        vibrate: [100, 50, 100],
        data: { url: '/#emergency' }
    };
    event.waitUntil(
        self.registration.showNotification('🚨 EMERGENCY ALERT', options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    if (event.notification.data.url) {
        clients.openWindow(event.notification.data.url);
    }
});
