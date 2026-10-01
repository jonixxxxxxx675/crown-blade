self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: 'Crown & Blade', body: event.data?.text?.() || '' }; }
  const title = data.title || 'Crown & Blade';
  const options = {
    body: data.body || 'У вас є оновлення щодо запису.',
    icon: data.icon || '/assets/desktop.png',
    badge: data.badge || '/assets/desktop.png',
    tag: data.tag || 'crown-blade',
    renotify: Boolean(data.renotify),
    data: { url: data.url || '/account.html' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = event.notification?.data?.url || '/account.html';
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      if ('focus' in client) {
        await client.focus();
        if ('navigate' in client) await client.navigate(target);
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(target);
  })());
});
