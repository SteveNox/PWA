const STATIC_CACHE_NAME = 'static';
const DYNAMIC_CACHE_NAME = 'dynamic';
const CACHE_VERSION = "v4";
const STATIC_CACHE_CONTENT = ['/', 'index.html', 'offline.html', '/js/app.js', 'manifest.json'];


self.addEventListener('install', event => {
    event.waitUntil(install());
  });
  
  async function install() {
    const cache = await caches.open(STATIC_CACHE_NAME + CACHE_VERSION);
    return cache.addAll(STATIC_CACHE_CONTENT);
  }

self.addEventListener('activate', event => {
    event.waitUntil(activate());
});

async function activate() {
    const keys = await caches.keys();
    return Promise.all(
      keys.map(key => {
        if (!key.endsWith(CACHE_VERSION)) return caches.delete(key);
      })
    );
  }

self.addEventListener('fetch', event =>
  event.waitUntil(cacheOnly(event.request))
);

const networkOnly = async (request) => {
    return fetch(request);
  };

const cacheOnly = async (request) => {
    const responseFromCache = await caches.match(request);
    if (responseFromCache) {
      return responseFromCache;
    }
  };

const cacheFirstThenNetwork = async (request) => {
    const responseFromCache = await caches.match(request);
    if (responseFromCache) {
      return responseFromCache;
    }

    try {
        const responseFromWeb = await fetch(request);
        return await cacheDynamically(request, responseFromWeb.clone());
    } catch (error) {
        return cacheOnly("offline.html");
    }
  };

const networkFirstThenCache = async (request) => {
    try {
        const responseFromWeb = await fetch(request);
        return await cacheDynamically(request, responseFromWeb.clone());
    } catch (error) {
        const responseFromCache = await caches.match(request);
        if(responseFromCache) {
            return responseFromCache;
        }
    }
  };  

const cacheDynamically = async (request, response) => {
    var responseFromCache = await caches.match(request)
    if(responseFromCache === null || responseFromCache === undefined) {
        var dynamicCache = await caches.open(DYNAMIC_CACHE_NAME+CACHE_VERSION);
        dynamicCache.put(request.url, response);   
    }
    return response;
}

self.addEventListener('sync', function(event) {
    //console.log('[SW]: Service worker syncing...', event);

});

