const storageKey = 'queuesmart_notifications';

export function getNotifications() {
  const saved = localStorage.getItem(storageKey);
  return saved ? JSON.parse(saved) : [];
}

export function addNotification(message) {
  const next = [{ id: Date.now(), message }, ...getNotifications()].slice(0, 10);
  localStorage.setItem(storageKey, JSON.stringify(next));
  return next;
}
