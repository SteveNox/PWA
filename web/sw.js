importScripts('/js/idb.js');
importScripts('/js/helper.js');

//whenever content is changed, change the cache name variables below
const CACHE_STATIC_NAME = 'static-v33';
const CACHE_DYNAMIC_NAME = 'dynamic-v33';
const API_URL = 'http://localhost:24881/bestellung';
const DB_CACHE_NAME = 'orders';

self.addEventListener('activate', function(event) {
    console.log('[SW]: Service worker activating, aber sowas von, jetzt aber echt...', event);
    var vapidPublicKey = 'BBCAhxasZgyyU0hb2Q3Aisd68AdHOviZkNR3HMy1r1nvkZCNJL9Xkb0ykr-TYIVUHy3WftdEZbGn-evuWD7bd9I'
    var convertedVapidPublicKey = urlBase64ToUint8Array(vapidPublicKey);   
    const options = {      
        userVisibleOnly: true, //push notifications are only visible to the user
        applicationServerKey: convertedVapidPublicKey
    }
        self.registration.pushManager.subscribe(options).then(function(subscription) {
            console.log(JSON.stringify(subscription))
        });
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
                            key: dt.key,
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
                                  deleteItemFromData('sync-orders', dt.bestellungid);
                                }
                            });
                    }
                })
        );
     }
});

//handle notification actions
//telemetry monitoring
self.addEventListener('notificationclick', function(event) {
    var notification = event.notification;
    var action = event.action;
    
    console.log(notification);

    if (action === 'confirm') {
        console.log("confirmed");
        notification.close();
    } else {
        console.log(action);
        notification.close();
    }
});

self.addEventListener('notificationclose', function(event) {
    console.log('notification was closed');
});

self.addEventListener('push', function(event) {
    console.log('Push Notification received', event);
    var data = { title: 'New!', content: 'Something new happened!' }
    if (event.data) {
        data = JSON.parse(event.data.text());
    }

    var options = {
        body: 'You have successfully subscribed to the Notification Service!',
        icon: '/images/icons/icon-96x96.png',
        image: '/images/icons/icon-512x512.png',
        dir: 'ltr',
        lang: 'en-US',
        vibrate: [100, 50, 200],
        badge: '/images/icons/icon-96x96.png',
        //no renotification
        tag: 'confirm-notification',
        renotify: true,
        actions: [
          { action: 'confirm', title: 'OK!', icon: '/images/icons/icon-96x96.png' },
          { action: 'cancel', title: 'CANCEL!', icon: '/images/icons/icon-96x96.png' }
        ]
      };
      event.waitUntil(
        self.registration.showNotification(data.title, options)
      );
})

function urlBase64ToUint8Array(base64String) {
    var padding = '='.repeat((4 - base64String.length % 4) % 4);
    var base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');
    var rawData = atob(base64);
    var outputArray = new Uint8Array(rawData.length);

    for (var i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}