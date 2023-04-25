self.addEventListener('install', function(event) {
    console.log('[SW]: Service worker installing...', event);
    //do not wait for page-reload
    return self.skipWaiting();
});

self.addEventListener('activate', function(event) {
    console.log('[SW]: Service worker activating, aber sowas von, jetzt aber echt...', event);
    //ask the client to take control over the service worker
    return self.clients.claim();
});

self.addEventListener('fetch', function(event) {
     console.log('[SW]: Service worker fetching, really? Oh yes...', event);
});

self.addEventListener('sync', function(event) {
    console.log('[SW]: Service worker syncing...', event);
});