// 서비스 워커 즉시 활성화 (업데이트 시 대기 방지)
self.skipWaiting();

self.addEventListener('push', function (event) {
  const data = event.data
    ? event.data.json()
    : { title: '타이머 종료', body: '시간이 다 되었습니다!' };

  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [200, 100, 200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(self.clients.openWindow('/'));
});
