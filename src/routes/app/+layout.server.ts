import { redirect } from '@sveltejs/kit';
import { isAuthenticated } from '$lib/server/auth';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
  if (!isAuthenticated(event)) {
    redirect(303, '/login');
  }
};
