//clean up 
//whenever content is changed, change the cache name variables below
var CACHE_STATIC_NAME = 'static-v32'
var CACHE_DYNAMIC_NAME = 'dynamic-v32'

self.addEventListener('activate', function(event) {
    console.log('[SW]: Service worker activating, aber sowas von, jetzt aber echt...', event);
    event.waitUntil(
        caches.keys()
            .then(function(keyList) {
                return Promise.all(keyList.map(function(key) {
                    if (key !== CACHE_STATIC_NAME && key !== CACHE_DYNAMIC_NAME) {
                        console.log('[SW]: Removing old cache.', key);
                        return caches.delete(key);
                    }
                })); //takes array of promises and waits until finished
            })
    );
    return self.clients.claim();
});

self.addEventListener('install', function(event) {
    console.log('[SW]: Service worker installing...', event);
    event.waitUntil( //won't finish until caching is complete
        caches.open(CACHE_STATIC_NAME)
            .then(function(cache) {
                console.log('[SW]: Precaching app shell...', event);
                cache.addAll([
                    '/',
                    'index.html',
                    'offline.html',
                    'js/app.js',
                    "js/orderentries.js",
                    "css/bootstrap.min.css",
                    "js/bootstrap.min.js"
                ]);
            })
    )
});


//extension to cache then network in damagelog.js
self.addEventListener('fetch', function(event) {
    console.log('[SW]: Service worker fetching...', event);
    //var url = 'https://pwademo-66c7b-default-rtdb.europe-west1.firebasedatabase.app/damagelog.json';
    var url = "http://localhost:24881/bestellung";
    
    if (event.request.url.indexOf(url) > -1) {
        event.respondWith(
            caches.open(CACHE_DYNAMIC_NAME)
                .then(function(cache) {
                    return fetch(event.request)
                        .then(function(res) {
                            cache.put(event.request, res.clone());
                            return res;
                        });
                })
        );
    } else {
        event.respondWith(
            caches.match(event.request)
                .then(function(response){
                    if (response) {
                        return response; //response comes from the cache
                    } else {
                        return fetch(event.request) //not cached, get from internet...
                                .then(function(dynamicResponse) { //and place it into dynamic cache
                                caches.open(CACHE_DYNAMIC_NAME)
                                    .then(function(cache) {
                                        cache.put(event.request.url, dynamicResponse.clone()) 
                                        //does not send request, uses response (can be done only once), and is therefore cloned
                                        //to respond back to the browser (clone is stored in cache, rest is shown)
                                        return dynamicResponse;
                                    })
                            })
                            .catch(function(error) { //do not throw exception when fetching fails
                            });
                    }
            })
        );
    }
});