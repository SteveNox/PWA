self.addEventListener('install', function(event) {
    // var cache = await caches.open('static');
    // cache.add('/js/app.js');
    // console.log('->added something to cache');
    event.waitUntil(
        caches.open('static')
            .then(function(cache) {
                cache.add('/');    
                cache.add('index.html');    
                cache.add('/js/app.js');
                console.log('->added something to cache');
            })
    )
    //do not wait for page-reload
    return self.skipWaiting();
});

self.addEventListener('activate', function(event) {
    //ask the client to take control over the service worker
    return self.clients.claim();
});

self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request)
            .then(function(resFromCache) {
                if(resFromCache) {
                    return resFromCache;
                } else {
                    return fetch(event.request)
                        .then(function(resFromInternet) {
                            return caches.open('dynamic')
                                .then(function(cache) {
                                    cache.put(event.request.url, resFromInternet.clone())
                                    return resFromInternet;
                                });
                        });
                }
            }
        )
    )
});

self.addEventListener('sync', function(event) {
    console.log('[SW]: Service worker syncing...', event);

});