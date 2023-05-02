importScripts('/js/idb.js');
importScripts('/js/helper.js');

//whenever content is changed, change the cache name variables below
const CACHE_STATIC_NAME = 'static-v32';
const CACHE_DYNAMIC_NAME = 'dynamic-v32';
const API_URL = 'http://localhost:24881/bestellung';
const DB_CACHE_NAME = 'orders';

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
                    '/js/idb.js',
                    '/js/helper.js',
                    "js/orderentries.js",
                    "css/bootstrap.min.css",
                    "js/bootstrap.min.js"
                ]);
            })
    )
});


//extension to cache then network in orderentries.js
self.addEventListener('fetch', function(event) {
    // console.log('[SW]: Service worker fetching...', event);

    if (event.request.url.indexOf(API_URL) > -1) {
        event.respondWith(
            fetch(event.request)
            .then(function(res) {
                //cache.put(event.request, res.clone()); <--store db response in cache
                var clonedResponse = res.clone();
                clearAllData(DB_CACHE_NAME)
                    	.then(function() 
                        {
                            return clonedResponse.json()
                        })
                        .then(function(data) {
                            console.log("DATA->", data);
                            for (var key in data)
                            {
                                writeData(DB_CACHE_NAME, data[key]);
                                // console.log(data[key]);
                            }                       
                        });
                return res;
            })
            .catch(function(err) {
                //prevent red line in console
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

self.addEventListener('sync', function(event) {
    console.log('[SW]: Service worker syncing...', event);
    if (event.tag == 'sync-new-order') {
        event.waitUntil
        (
            readAllData('sync-orders')
                .then(function(data) 
                {
                    for (var dt of data) {
                        var newItem = {
                            besteller: dt.besteller,
                            lieferant: dt.lieferant,
                            bestellungsinhalt: dt.bestellungsinhalt,
                            lieferadresse: dt.lieferadresse,
                        }
                        fetch(API_URL, 
                            {
                                method: "POST", 
                                body: JSON.stringify(newItem), 
                                headers: {"Content-type": "application/json; charset=UTF-8", 'Accept': 'application/json'}
                            })
                        .then(function(res) {
                                //console.log('SENT DATA:', res);
                                if(res.ok) {
                                  deleteItemFromData('sync-orders', dt.key);
                                }
                            });
                    }
                })
        );
     }
});
