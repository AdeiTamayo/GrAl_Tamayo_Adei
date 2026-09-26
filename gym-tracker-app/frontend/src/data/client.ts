import { supabase } from "../utils/supabaseClient";

/**
 * Data-layer conventions (read before adding a query):
 *
 * 1. Authorisation is enforced by Postgres Row Level Security, not by these
 *    modules. Most list queries intentionally carry no `user_id` filter.
 * 2. Single-row reads and every UPDATE/DELETE name their row explicitly with
 *    `.eq('id', ...)` anyway, so a policy change can never turn one of them
 *    into a cross-user or mass write.
 * 3. The numeric `users.id` is cached below for the lifetime of the SPA.
 *    AuthContext clears it (`resetMyId`) whenever the signed-in identity
 *    changes — never cache a user id anywhere else.
 */
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
