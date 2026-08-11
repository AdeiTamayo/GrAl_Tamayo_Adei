import { supabase } from "../utils/supabaseClient";
import { getMyId } from "./client";
import { UserProfile, UserSettings, WeightEntry } from "./types";

export async function getProfile(): Promise<UserProfile | null> {
    const { data, error } = await supabase
        .from('users')
        .select('id, name, surname, email, gender, weight, height, birth_date')
        .single();
    if (error) throw new Error(error.message);
    return data as UserProfile;
}

export async function updateProfile(data: {
    name?: string | null;
    surname?: string | null;
    email?: string | null;
    gender?: string | null;
    weight?: number | null;
    height?: number | null;
    birth_date?: string | null;
}): Promise<UserProfile> {
    const update: Record<string, unknown> = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.surname !== undefined) update.surname = data.surname;
    if (data.email !== undefined) update.email = data.email;
    if (data.gender !== undefined) update.gender = data.gender;
    if (data.weight !== undefined) update.weight = data.weight;
    if (data.height !== undefined) update.height = data.height;
    if (data.birth_date !== undefined) update.birth_date = data.birth_date;

    const { data: row, error } = await supabase
        .from('users')
        .update(update)
        .select('id, name, surname, email, gender, weight, height, birth_date')
        .single();
    if (error) throw new Error(error.message);
    return row as UserProfile;
}

export async function getWeightHistory(
    options: { startDate?: string; endDate?: string; page?: number; limit?: number; sortBy?: 'date' | 'weight'; sortOrder?: 'asc' | 'desc' } = {}
): Promise<{ rows: WeightEntry[]; total: number }> {
    const { count, error: countError } = await supabase
        .from('weight_history')
        .select('id', { count: 'exact', head: true })
        .gte('date', options.startDate ?? '0001-01-01')
        .lte('date', options.endDate ?? '9999-12-31');
    if (countError) throw new Error(countError.message);

    const column = options.sortBy === 'weight' ? 'weight' : 'date';
    const direction = options.sortOrder === 'asc' ? 'ascending' : 'descending';

    let query = supabase
        .from('weight_history')
        .select('id, user_id, weight, date')
        .gte('date', options.startDate ?? '0001-01-01')
        .lte('date', options.endDate ?? '9999-12-31')
        .order(column, { ascending: direction === 'ascending' })
        .order('id', { ascending: direction === 'ascending' });

    if (options.page && options.limit) {
        const offset = (options.page - 1) * options.limit;
        query = query.range(offset, offset + options.limit - 1);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return { rows: (data ?? []) as WeightEntry[], total: count ?? 0 };
}

async function syncProfileWeight(userId: number): Promise<number | null> {
    const { data, error } = await supabase
        .from('weight_history')
        .select('weight')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error) throw new Error(error.message);

    const latestWeight = data?.weight ?? null;
    const { error: updateError } = await supabase
        .from('users')
        .update({ weight: latestWeight })
        .eq('id', userId);
    if (updateError) throw new Error(updateError.message);

    return latestWeight;
}

export async function addWeight(weight: number, date: string): Promise<{ entry: WeightEntry; currentWeight: number | null }> {
    const userId = await getMyId();
    const { data, error } = await supabase
        .from('weight_history')
        .insert({ user_id: userId, weight, date })
        .select('id, user_id, weight, date')
        .single();
    if (error) throw new Error(error.message);

    const currentWeight = await syncProfileWeight(userId);
    return { entry: data as WeightEntry, currentWeight };
}

export async function updateWeight(id: number, weight: number, date: string): Promise<WeightEntry> {
    const userId = await getMyId();
    const { data, error } = await supabase
        .from('weight_history')
        .update({ weight, date })
        .eq('id', id)
        .eq('user_id', userId)
        .select('id, user_id, weight, date')
        .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Weight entry not found or not owned by user');

    await syncProfileWeight(userId);
    return data as WeightEntry;
}

export async function deleteWeight(id: number): Promise<void> {
    const userId = await getMyId();
    const { error } = await supabase
        .from('weight_history')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
    if (error) throw new Error(error.message);

    await syncProfileWeight(userId);
}

export async function getSettings(): Promise<UserSettings> {
    const userId = await getMyId();
    const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return data as UserSettings;

    const { data: created, error: insertError } = await supabase
        .from('user_settings')
        .insert({ user_id: userId })
        .select('*')
        .single();
    if (insertError) throw new Error(insertError.message);
    return created as UserSettings;
}

export async function updateSettings(data: {
    show_rpe?: boolean;
    show_1rm?: boolean;
    show_goals?: boolean;
    show_rest_time?: boolean;
    default_rest_time?: number;
}): Promise<UserSettings> {
    const userId = await getMyId();
    const update: Record<string, unknown> = {};
    if (data.show_rpe !== undefined) update.show_rpe = data.show_rpe;
    if (data.show_1rm !== undefined) update.show_1rm = data.show_1rm;
    if (data.show_goals !== undefined) update.show_goals = data.show_goals;
    if (data.show_rest_time !== undefined) update.show_rest_time = data.show_rest_time;
    if (data.default_rest_time !== undefined) update.default_rest_time = data.default_rest_time;

    const { error: ensureError } = await supabase
        .from('user_settings')
        .upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true });
    if (ensureError) throw new Error(ensureError.message);

    const { data: row, error } = await supabase
        .from('user_settings')
        .update(update)
        .eq('user_id', userId)
        .select('*')
        .single();
    if (error) throw new Error(error.message);
    return row as UserSettings;
}
