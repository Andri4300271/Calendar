// Service Worker для офлайн-роботи "Календар освітлення"
const CACHE_NAME = 'osvitlennya-cache-v1';

// Встановлення: одразу активуємо нову версію
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Активація: видаляємо старі кеші, якщо версія змінилась
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// Стратегія: спочатку мережа, якщо є інтернет — беремо свіжі дані
// і одразу зберігаємо їх у кеш. Якщо мережі немає — віддаємо
// останню закешовану версію.
self.addEventListener('fetch', (event) => {
  // Кешуємо лише GET-запити
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Клонуємо відповідь і зберігаємо копію в кеш
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return networkResponse;
      })
      .catch(() => {
        // Мережі немає — шукаємо в кеші
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            // Повідомляємо сторінку, що дані офлайн (з кешу),
            // тільки для головної сторінки та запиту розкладу
            const isRelevant =
              event.request.mode === 'navigate' ||
              event.request.url.includes('calendar-schedule-proxy');
            if (isRelevant) {
              self.clients.matchAll().then((clients) => {
                clients.forEach((client) => {
                  client.postMessage({ type: 'OFFLINE_DATA' });
                });
              });
            }
            return cachedResponse;
          }
          // Якщо це запит на саму сторінку і кешу немає взагалі
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
