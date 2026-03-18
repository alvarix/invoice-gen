import { supabase } from '$lib/server/supabase';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const { data } = await supabase.from('settings').select('*').eq('id', 1).single();
  return { settings: data };
};

export const actions: Actions = {
  default: async ({ request }) => {
    const data = await request.formData();
    await supabase.from('settings').upsert({
      id: 1,
      owner_name: data.get('owner_name'),
      address: data.get('address'),
      zelle: data.get('zelle'),
    });
  }
};
