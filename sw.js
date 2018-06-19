var cacheVer = 'reviews-app-v19';

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(cacheVer).then((cache) => {
            return cache.addAll([
                '/',
                '/img',
                '/restaurant.html',
                'index.html',
                'restaurant.html',
                'data/restaurants.json',
                'css/styles.css',
                'js/dbhelper.js',
                'js/main.js',
                'js/restaurant_info.js'
            ]);
        })
    )
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) =>{
            return Promise.all(
                cacheNames.filter((cacheName) =>{
                    return cacheName.startsWith('reviews-') && 
                           cacheName != cacheVer;
                }).map((cacheName) => {
                    return caches.delete(cacheName);
                })
            )
            
        })
    )
})

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            if(response) return response;
            return fetch(event.request);
        })
    )
});