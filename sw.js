// sw.js — сервіс-воркер для офлайн-кешування календаря.
// Кладеться в ту саму папку репозиторію, що й html-файл (поруч, в корені GitHub Pages).
//
// ВАЖЛИВО: коли захочеш примусово скинути кеш у користувачів після оновлення файлу —
// зміни CACHE_NAME (напр. 'calendar-cache-v2') — стара версія кешу видалиться сама.
const CACHE_NAME = 'calendar-cache-v1';

// Що кешувати одразу при встановленні. './' покриває головну сторінку незалежно від назви файлу.
const CACHED_URLS = ['./'];

// Встановлення — заповнюємо кеш базовими файлами
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CACHED_URLS))
  );
  self.skipWaiting(); // новий воркер стає активним одразу, не чекаючи закриття всіх вкладок
});

// Активація — прибираємо застарілі версії кешу (з іншим CACHE_NAME)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Мережа спочатку, кеш — лише запасний варіант, коли інтернету нема.
// Це навмисно "network-first", а не "cache-first" — щоб онлайн завжди бачили
// щойно опубліковану версію на GitHub, а не застарілу з кешу.
// Коли доводиться брати з кешу (мережа недоступна) — повідомляємо сторінку про це,
// щоб вона показала тост "Дані офлайн" (цей код вже є в html, просто чекав на sw.js).
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return; // кешуємо лише GET-запити
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => {
          notifyClientsOffline();
          return cached;
        })
      )
  );
});

// Розсилає всім відкритим вкладкам повідомлення, що дані показані з офлайн-кешу
function notifyClientsOffline() {
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => client.postMessage({ type: 'OFFLINE_DATA' }));
  });
}
