import { env } from '$env/dynamic/private';
import type { RequestEvent } from '@sveltejs/kit';

/** Check if the current request has a valid session cookie */
export function isAuthenticated(event: RequestEvent): boolean {
  const session = event.cookies.get('session');
  return session === env.APP_PASSWORD;
}

/** Set session cookie on login */
export function setSession(event: RequestEvent): void {
  event.cookies.set('session', env.APP_PASSWORD, {
    path: '/',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 30 // 30 days
  });
}

/** Clear session cookie on logout */
export function clearSession(event: RequestEvent): void {
  event.cookies.delete('session', { path: '/' });
}
