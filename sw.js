// 앱 파일을 고쳐서 배포할 때마다 아래 버전 숫자를 올려야 새 버전이 적용된다.
const CACHE_NAME = "todo-app-v1";

// 오프라인용으로 미리 저장할 앱 파일 (모두 상대 경로)
const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
];

// 설치: 앱 파일을 한꺼번에 캐시에 저장하고 바로 활성화 대기를 건너뜀
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES)).then(() => self.skipWaiting())
  );
});

// 활성화: 이전 버전 캐시를 모두 지우고 열린 페이지를 바로 제어
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 요청: GET만 처리. 캐시 우선, 없으면 네트워크, 페이지 이동이 오프라인이면 index.html
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  // 외부 주소 요청은 건드리지 않음
  if (new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).catch(() => {
        if (req.mode === "navigate") return caches.match("./index.html");
        return Response.error();
      });
    })
  );
});
