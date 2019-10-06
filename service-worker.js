'use strict';

const DEV_BUILD_VERSION = 20

const CACHE_NAME = `static-cache-g4.6-stable${DEV_BUILD_VERSION}`;
const DATA_CACHE_NAME = `static-cache-g4.6-stable${DEV_BUILD_VERSION}`;

const FILES_TO_CACHE = [
    ' ',
    'index.html',

    'res/fonts/Poppins-Bold.ttf',
    'res/fonts/Poppins-Medium.ttf',
    'res/fonts/Poppins-Regular.ttf',
    'res/fonts/Poppins-SemiBold.ttf',

    'res/music/easy.ogg',
    'res/music/normal.ogg',
    'res/music/hard.ogg',
    'res/music/hell.ogg',
    'res/music/hades.ogg',
    'res/music/reverse.ogg',
    'res/music/denise.ogg',
    'res/music/nox.ogg',

    'res/images/gameHint.svg',

    'res/themes/dark.json',
    'res/themes/light.json',

    'scripts/assets.js',
    'scripts/coverage.js',
    'scripts/game.js',
    'scripts/input.js',
    'scripts/leaderboard.js',
    'scripts/levelgen.js',
    'scripts/main.js',
    'scripts/theme.js',
    'scripts/ui.js',
    'scripts/install.js',

    'styles/build/layout.css',
  ];

self.addEventListener('install', (evt) => {
  console.log('[ServiceWorker] Install');
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching offline page');
      return cache.addAll(FILES_TO_CACHE);
    })
);

  self.skipWaiting();
});

self.addEventListener('activate', (evt) => {
  console.log('[ServiceWorker] Activate');
  evt.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
          console.log('[ServiceWorker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
);

  self.clients.claim();
});

self.addEventListener('fetch', (evt) => {
  console.log('[ServiceWorker] Fetch', evt.request.url);
  evt.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(evt.request)
            .then((response) => {
              return response || fetch(evt.request);
            });
      })
  );
});