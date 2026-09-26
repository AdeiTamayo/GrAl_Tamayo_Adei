import { supabase } from "../utils/supabaseClient";
import { getMyId } from "./client";
import { PR } from "./types";

function normalizeExerciseName(row: Record<string, unknown>): string {
    const exerciseValue = row.exercises;
    if (!exerciseValue) return '';

    if (Array.isArray(exerciseValue)) {
        return (exerciseValue[0] as { name?: string } | undefined)?.name ?? '';
    }

    if (typeof exerciseValue === 'object' && 'name' in exerciseValue) {
        return String((exerciseValue as { name?: string }).name ?? '');
    }

    return '';
}

export async function getPrSummary(): Promise<PR[]> {
    const { data, error } = await supabase
        .from('pr')
        .select('id, exercise_id, weight, repetitions, date, note, exercises:exercise_id ( name )')
        .order('weight', { ascending: false })
        .order('repetitions', { ascending: false })
        .order('date', { ascending: false });
    if (error) throw new Error(error.message);

    const bestByExercise = new Map<number, PR>();
    for (const row of data ?? []) {
        const exerciseId = Number(row.exercise_id as number | null ?? 0);
        if (!exerciseId || bestByExercise.has(exerciseId)) continue;

        bestByExercise.set(exerciseId, {
            id: row.id as number,
            exercise_id: exerciseId,
            exercise_name: normalizeExerciseName(row as Record<string, unknown>),
            weight: (row.weight as number | null) ?? 0,
            repetitions: (row.repetitions as number | null) ?? 0,
            date: (row.date as string | null) ?? '',
            note: row.note as string | null,
        });
    }
    return Array.from(bestByExercise.values());
}

export async function getPrHistory(exerciseId: number): Promise<PR[]> {
    const { data, error } = await supabase
        .from('pr')
        .select('id, exercise_id, weight, repetitions, date, note, exercises:exercise_id ( name )')
        .eq('exercise_id', exerciseId)
        .order('date', { ascending: false });
    if (error) throw new Error(error.message);

    return (data ?? []).map((row) => ({
        id: row.id as number,
        exercise_id: row.exercise_id as number,
        exercise_name: normalizeExerciseName(row as Record<string, unknown>),
        weight: (row.weight as number | null) ?? 0,
        repetitions: (row.repetitions as number | null) ?? 0,
        date: (row.date as string | null) ?? '',
        note: row.note as string | null,
    }));
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

    const { data: exercise, error: exerciseError } = await supabase
        .from('exercises')
        .select('id')
        .eq('id', data.exerciseId)
        .maybeSingle();

    if (exerciseError) throw new Error(exerciseError.message);
    if (!exercise) {
        throw new Error('The selected exercise was not found. Please choose a valid exercise before logging a PR.');
    }

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
