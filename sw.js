// 【關鍵升級】定義緩存名稱和資料請求網址
const CACHE_NAME = 'simon-cards-cache-v5';
const DATA_CACHE_NAME = 'simon-cards-data-cache-v1';
const GOOGLE_APP_URL = "https://script.google.com/macros/s/AKfycbxfQDtnAqYvOx7b8S7RL4rLrvjVVDRsIcLouv_VBjmCfHeSZSSendcEb0KGZpVLiWd1/exec"; // 如果需要特定處理，可以將它加入例外，但這裡不需。

// 定義要緩存的關鍵靜態資源
const STATIC_FILES = [
  './cards.html',
  './manifest.json',
  './sw.js',
  'card.png' // 將圖示圖片也加入緩存，確保離線時圖示可見
];

// install 事件：在 Service Worker 註冊時緩存靜態檔案
self.addEventListener('install', event => {
  console.log('🔄 Service Worker 安裝中，正在緩存靜態資源...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_FILES))
      .then(() => self.skipWaiting()) // 強制新的 Service Worker 立即激活
  );
});

// fetch 事件：攔截對資料的請求並實施同步策略
self.addEventListener('fetch', event => {
  // 對於 Google Apps Script 資料請求實施 Stale-while-revalidate 策略
  // 這樣網頁會立即載入緩存資料（跨裝置同步的基礎），同時更新新資料
  if (event.request.url.includes(GOOGLE_APP_URL) && event.request.method === 'GET') {
    event.respondWith(
      caches.open(DATA_CACHE_NAME).then(dataCache => {
        return dataCache.match(event.request).then(response => {
          const fetchPromise = fetch(event.request).then(networkResponse => {
            // 將最新的網絡回應存入緩存，實現跨裝置同步
            dataCache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
          // 立即回傳緩存資料（如果有的話），否則等待網絡回應
          return response || fetchPromise;
        });
      })
    );
  } else {
    // 對於靜態資源和其他所有請求實施 Cache-first 策略
    // 優先從緩存中獲取资源，如果失敗（離線且未緩存），則使用網絡
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request);
      })
    );
  }
});

// activate 事件：清理舊緩存
self.addEventListener('activate', event => {
  console.log('✅ Service Worker 激活成功！');
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(keyList.map(key => {
        if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
          console.log('🗑️ 清理舊緩存:', key);
          return caches.delete(key);
        }
      }));
    })
  );
});
