const CACHE_NAME = 'file-storage-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js'
];

// Install service worker and cache files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch resources
self.addEventListener('fetch', event => {
  // Remove localhost check to allow requests from any origin
  // Handle file uploads
  if (event.request.method === 'POST' && event.request.url.includes('/upload')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const responseClone = response.clone();
          responseClone.json().then(data => {
            if (data.file) {
              // Cache the uploaded file immediately
              caches.open(CACHE_NAME).then(cache => {
                fetch(data.file.url).then(fileResponse => {
                  cache.put(data.file.url, fileResponse);
                });
              });
            }
          });
          return response;
        })
        .catch(error => {
          // If offline, store the upload request
          if (!navigator.onLine) {
            return new Response(JSON.stringify({
              message: 'File will be uploaded when online',
              file: {
                filename: event.request.url.split('/').pop(),
                originalName: 'pending-upload',
                mimeType: 'application/octet-stream',
                size: 0,
                url: '/offline-placeholder',
                isOffline: true
              }
            }), {
              headers: { 'Content-Type': 'application/json' }
            });
          }
          throw error;
        })
    );
    return;
  }

  // Handle file requests and downloads
  if (event.request.url.includes('/uploads/')) {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            return response;
          }
          return fetch(event.request)
            .then(response => {
              if (!response || response.status !== 200) {
                return response;
              }
              // Cache the file for offline use
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseToCache);
              });
              return response;
            })
            .catch(() => {
              // Try to get the file from cache
              return caches.match(event.request)
                .then(cachedResponse => {
                  if (cachedResponse) {
                    return cachedResponse;
                  }
                  // If not in cache, return a placeholder
                  return new Response('File not available offline', {
                    status: 404,
                    statusText: 'Not Found',
                    headers: {
                      'Content-Type': 'text/plain'
                    }
                  });
                });
            });
        })
    );
    return;
  }

  // Handle API requests
  if (event.request.url.includes('/files')) {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            return response;
          }
          return fetch(event.request)
            .then(response => {
              if (!response || response.status !== 200) {
                return response;
              }
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseToCache);
              });
              return response;
            })
            .catch(() => {
              // Return cached files list if available
              return caches.match('/files')
                .then(response => response || new Response('[]', {
                  headers: { 'Content-Type': 'application/json' }
                }));
            });
        })
    );
    return;
  }

  // Handle other requests
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request)
          .then(response => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
            return response;
          })
          .catch(() => {
            // Return offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/');
            }
            return new Response('Offline content not available', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Handle background sync
self.addEventListener('sync', event => {
  if (event.tag === 'sync-files') {
    event.waitUntil(syncFiles());
  }
});

async function syncFiles() {
  const cache = await caches.open(CACHE_NAME);
  const requests = await cache.keys();
  const uploadRequests = requests.filter(request => 
    request.method === 'POST' && request.url.includes('/upload')
  );

  for (const request of uploadRequests) {
    try {
      const response = await fetch(request);
      if (response.ok) {
        await cache.delete(request);
      }
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }
} 