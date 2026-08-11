import { supabase } from "../utils/supabaseClient";

let cachedMyId: number | null = null;

export function resetMyId() {
    cachedMyId = null;
}

export async function getMyId(): Promise<number> {
    if (cachedMyId != null) return cachedMyId;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .maybeSingle();
    if (error) throw new Error(error.message);

    cachedMyId = data?.id ?? null;
    if (cachedMyId == null) throw new Error('User profile not found');
    return cachedMyId;
}
