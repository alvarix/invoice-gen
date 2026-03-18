import { redirect } from '@sveltejs/kit';
import { clearSession } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
  clearSession(event);
  redirect(303, '/login');
};
