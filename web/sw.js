const STATIC_CACHE_NAME = 'static-v2';
const DYNAMIC_CACHE_NAME = 'dynamic-v2';

self.addEventListener('install', async function(event) {
    console.log('[SW]: Service worker installing..., hopefully!', event);
    //abwarten, bis der gesamte teil innerhalb waitUntil fertig ist
    //sonst kann fetch möglicherweise noch nicht auf den cache zugreifen
    // event.waitUntil(
    //     caches.open('static')
    //         .then(function(staticCache) {
    //             staticCache.add('/');
    //             staticCache.add('index.html');
    //             staticCache.add('app.js');
    //         })
    // );

    var staticCache = await caches.open(STATIC_CACHE_NAME);
    await staticCache.add('/');
    await staticCache.add('index.html');
    await staticCache.add('/js/app.js');

    //do not wait for page-reload
    //erübrigt die manuelle aktivierung eines neuen serviceworkers
    return self.skipWaiting();
});

self.addEventListener('activate', function(event) {
    //console.log('[SW]: Service worker activating...', event);
    //ask the client to take control over the service worker
    return self.clients.claim();
});

self.addEventListener('fetch', function(event) {
    caches.keys()
        .then(function(cacheEntries) {
            console.log(cacheEntries);
        });
        
     event.respondWith(
        caches.match(event.request)
            .then(function(cacheResponse) {
                if(cacheResponse) {
                    //treffer im cache gefunden->zurückgeben
                    return cacheResponse;
                } else {
                    //treffer nicht gefunden->internet fragen
                    return fetch(event.request)
                        .then(function(responseFromInternet) {
                            return caches.open(DYNAMIC_CACHE_NAME)
                                .then(function(dynamicCache) {
                                    dynamicCache.put(event.request.url, responseFromInternet.clone());
                                    return responseFromInternet;
                                })
                        })
                }
            })
     )
});

self.addEventListener('sync', function(event) {
    //console.log('[SW]: Service worker syncing...', event);
});