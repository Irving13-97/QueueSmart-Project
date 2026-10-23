import { apiRequest, getCurrentUser } from './api';

export async function getNotifications() {
  const user = getCurrentUser();
  const query = user ? `?userId=${user.id}` : '';
  return apiRequest(`/api/notifications${query}`);
}

export async function addNotification(message) {
  const user = getCurrentUser();
  return apiRequest('/api/notifications', {
    method: 'POST',
    body: JSON.stringify({ userId: user?.id, message }),
  });
}
