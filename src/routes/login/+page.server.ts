import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { setSession } from '$lib/server/auth';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async (event) => {
    const data = await event.request.formData();
    const password = data.get('password') as string;

    if (password !== env.APP_PASSWORD) {
      return fail(401, { error: 'Incorrect password' });
    }

    setSession(event);
    redirect(303, '/app/invoices/new');
  }
};
