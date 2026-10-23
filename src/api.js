const userKey = 'queuesmart_user';

export async function apiRequest(path, options = {}) {
  let response;

  try {
    response = await fetch(path, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
  } catch {
    throw new Error('Could not reach the server. Is the backend running?');
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong.');
  }

  return data;
}

export function getCurrentUser() {
  const saved = localStorage.getItem(userKey);
  return saved ? JSON.parse(saved) : null;
}

export function setCurrentUser(user) {
  localStorage.setItem(userKey, JSON.stringify(user));
}

export function clearCurrentUser() {
  localStorage.removeItem(userKey);
}
