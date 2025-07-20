/*
 * Service Worker for Sharma & Associates
 * Provides offline functionality and performance improvements
 */

const CACHE_NAME = 'sharma-associates-v2024.1';
const OFFLINE_PAGE = '/offline.html';

// Files to cache
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/about.html',
    '/team.html',
    '/services.html',
    '/contact.html',
    '/assets/css/styles.css',
    '/assets/js/main.js',
    '/manifest.json',
    '/offline.html'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
    /\/api\/contact/,
    /\/api\/appointments/
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[SW] Installation complete');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Installation failed:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[SW] Activation complete');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve cached content or fetch from network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-HTTP(S) requests
    if (!url.protocol.startsWith('http')) {
        return;
    }
    
    // Handle different types of requests
    if (request.method === 'GET') {
        if (isStaticAsset(url.pathname)) {
            event.respondWith(handleStaticAsset(request));
        } else if (isAPIRequest(url.pathname)) {
            event.respondWith(handleAPIRequest(request));
        } else if (isHTMLPage(request)) {
            event.respondWith(handleHTMLPage(request));
        }
    } else if (request.method === 'POST') {
        if (isAPIRequest(url.pathname)) {
            event.respondWith(handleAPIPost(request));
        }
    }
});

// Check if request is for a static asset
function isStaticAsset(pathname) {
    return pathname.includes('/assets/') || 
           pathname.endsWith('.css') || 
           pathname.endsWith('.js') ||
           pathname.endsWith('.png') ||
           pathname.endsWith('.jpg') ||
           pathname.endsWith('.svg') ||
           pathname.endsWith('.ico') ||
           pathname.includes('/favicon');
}

// Check if request is for API endpoint
function isAPIRequest(pathname) {
    return pathname.startsWith('/api/') || 
           API_CACHE_PATTERNS.some(pattern => pattern.test(pathname));
}

// Check if request is for HTML page
function isHTMLPage(request) {
    return request.headers.get('accept')?.includes('text/html');
}

// Handle static asset requests (Cache First strategy)
async function handleStaticAsset(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        if (networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('[SW] Static asset fetch failed:', error);
        return new Response('Asset unavailable', { status: 503 });
    }
}

// Handle HTML page requests (Network First with cache fallback)
async function handleHTMLPage(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('[SW] Network failed, trying cache:', error);
        
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline page for HTML requests
        const offlineResponse = await caches.match(OFFLINE_PAGE);
        return offlineResponse || new Response('Offline', { status: 503 });
    }
}

// Handle API GET requests (Network First with limited cache)
async function handleAPIRequest(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.status === 200) {
            // Cache successful API responses for 5 minutes
            const cache = await caches.open(CACHE_NAME);
            const responseClone = networkResponse.clone();
            
            // Set cache expiry
            setTimeout(() => {
                cache.delete(request);
            }, 5 * 60 * 1000); // 5 minutes
            
            cache.put(request, responseClone);
        }
        
        return networkResponse;
    } catch (error) {
        console.log('[SW] API request failed, trying cache:', error);
        
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        return new Response(
            JSON.stringify({ 
                success: false, 
                message: 'Service temporarily unavailable. Please try again later.',
                offline: true 
            }), 
            { 
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

// Handle API POST requests (with offline queue)
async function handleAPIPost(request) {
    try {
        return await fetch(request);
    } catch (error) {
        console.log('[SW] API POST failed, queuing for later:', error);
        
        // Store failed request for later retry
        await storeFailedRequest(request);
        
        return new Response(
            JSON.stringify({ 
                success: false, 
                message: 'Your request has been queued and will be submitted when connection is restored.',
                queued: true 
            }), 
            { 
                status: 202,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

// Store failed requests for later retry
async function storeFailedRequest(request) {
    try {
        const requestData = {
            url: request.url,
            method: request.method,
            headers: Object.fromEntries(request.headers.entries()),
            body: await request.text(),
            timestamp: Date.now()
        };
        
        const db = await openIndexedDB();
        const transaction = db.transaction(['failedRequests'], 'readwrite');
        const store = transaction.objectStore('failedRequests');
        
        await store.add(requestData);
        
        console.log('[SW] Stored failed request for retry');
    } catch (error) {
        console.error('[SW] Failed to store request:', error);
    }
}

// Open IndexedDB for offline queue
function openIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('SharmaAssociatesDB', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            if (!db.objectStoreNames.contains('failedRequests')) {
                const store = db.createObjectStore('failedRequests', {
                    keyPath: 'id',
                    autoIncrement: true
                });
                store.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
    });
}

// Background sync for retrying failed requests
self.addEventListener('sync', (event) => {
    if (event.tag === 'retry-failed-requests') {
        event.waitUntil(retryFailedRequests());
    }
});

// Retry failed requests when connection is restored
async function retryFailedRequests() {
    try {
        const db = await openIndexedDB();
        const transaction = db.transaction(['failedRequests'], 'readwrite');
        const store = transaction.objectStore('failedRequests');
        const requests = await store.getAll();
        
        for (const requestData of requests) {
            try {
                const response = await fetch(requestData.url, {
                    method: requestData.method,
                    headers: requestData.headers,
                    body: requestData.body
                });
                
                if (response.status === 200) {
                    await store.delete(requestData.id);
                    console.log('[SW] Successfully retried request:', requestData.url);
                    
                    // Notify client of successful retry
                    self.clients.matchAll().then(clients => {
                        clients.forEach(client => {
                            client.postMessage({
                                type: 'REQUEST_RETRIED',
                                url: requestData.url,
                                success: true
                            });
                        });
                    });
                }
            } catch (error) {
                console.log('[SW] Retry failed for:', requestData.url, error);
            }
        }
    } catch (error) {
        console.error('[SW] Background sync failed:', error);
    }
}

// Handle push notifications (for future use)
self.addEventListener('push', (event) => {
    if (!event.data) return;
    
    const data = event.data.json();
    const title = data.title || 'Sharma & Associates';
    const options = {
        body: data.body || 'You have a new notification',
        icon: '/favicon-192x192.png',
        badge: '/favicon-96x96.png',
        vibrate: [100, 50, 100],
        data: data.url || '/',
        actions: [
            {
                action: 'view',
                title: 'View',
                icon: '/icons/view.png'
            },
            {
                action: 'dismiss',
                title: 'Dismiss',
                icon: '/icons/dismiss.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    const url = event.notification.data || '/';
    
    event.waitUntil(
        clients.matchAll({ type: 'window' })
            .then((clientList) => {
                // Check if there's already a window open
                for (const client of clientList) {
                    if (client.url === url && 'focus' in client) {
                        return client.focus();
                    }
                }
                
                // Open new window
                if (clients.openWindow) {
                    return clients.openWindow(url);
                }
            })
    );
});

// Periodic background sync (for future use)
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'update-content') {
        event.waitUntil(updateCachedContent());
    }
});

// Update cached content in background
async function updateCachedContent() {
    try {
        const cache = await caches.open(CACHE_NAME);
        const requests = await cache.keys();
        
        for (const request of requests) {
            if (isStaticAsset(request.url)) {
                try {
                    const response = await fetch(request);
                    if (response.status === 200) {
                        await cache.put(request, response);
                    }
                } catch (error) {
                    console.log('[SW] Failed to update:', request.url);
                }
            }
        }
        
        console.log('[SW] Background content update complete');
    } catch (error) {
        console.error('[SW] Background update failed:', error);
    }
}

console.log('[SW] Service Worker script loaded successfully'); 