// The stored login, or null when there is none or the token has expired.
// Decodes the JWT payload locally (no verification needed just to read exp).
export function getSession() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')));
    if (!exp || exp * 1000 <= Date.now()) return null;
  } catch {
    return null;
  }
  return { username: localStorage.getItem('username') || '' };
}
