import { supabase } from "../utils/supabaseClient";
import { getMyId } from "./client";
import { PR } from "./types";

export async function getPrSummary(): Promise<PR[]> {
    const { data, error } = await supabase
        .from('pr')
        .select('id, exercise_id, weight, repetitions, date, note, exercises ( name )')
        .order('weight', { ascending: false })
        .order('repetitions', { ascending: false })
        .order('date', { ascending: false });
    if (error) throw new Error(error.message);

    const bestByExercise = new Map<number, PR>();
    for (const row of data ?? []) {
        if (!bestByExercise.has(row.exercise_id as number)) {
            bestByExercise.set(row.exercise_id as number, {
                id: row.id as number,
                exercise_id: row.exercise_id as number,
                exercise_name: (row.exercises as { name: string }[] | null)?.[0]?.name ?? '',
                weight: (row.weight as number | null) ?? 0,
                repetitions: (row.repetitions as number | null) ?? 0,
                date: (row.date as string | null) ?? '',
                note: row.note as string | null,
            });
        }
    }
    return Array.from(bestByExercise.values());
}

export async function getPrHistory(exerciseId: number): Promise<PR[]> {
    const { data, error } = await supabase
        .from('pr')
        .select('id, exercise_id, weight, repetitions, date, note')
        .eq('exercise_id', exerciseId)
        .order('date', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as PR[];
}

export async function createPR(data: {
    exerciseId: number;
    weight: number;
    repetitions: number;
    date?: string | null;
    note?: string | null;
}): Promise<PR> {
    const userId = await getMyId();
    const prDate = data.date || new Date().toISOString().split('T')[0];

    const { data: row, error } = await supabase
        .from('pr')
        .insert({
            user_id: userId,
            exercise_id: data.exerciseId,
            weight: data.weight,
            repetitions: data.repetitions,
            date: prDate,
            note: data.note ?? null,
        })
        .select('*')
        .single();
    if (error) throw new Error(error.message);
    return row as PR;
}

export async function updatePR(
    id: number,
    data: { weight: number; repetitions: number; date: string | null; note: string | null }
): Promise<PR | null> {
    const { data: row, error } = await supabase
        .from('pr')
        .update({
            weight: data.weight,
            repetitions: data.repetitions,
            date: data.date,
            note: data.note,
        })
        .eq('id', id)
        .select('*')
        .maybeSingle();
    if (error) throw new Error(error.message);
    return row as PR | null;
}

export async function deletePR(id: number): Promise<boolean> {
    const { error, count } = await supabase.from('pr').delete().eq('id', id).select('id');
    if (error) throw new Error(error.message);
    return (count ?? 0) > 0;
}
