import { supabase } from "../utils/supabaseClient";
import { getMyId } from "./client";
import { Goal } from "./types";

export async function getUserGoals(): Promise<Goal[]> {
    const { data, error } = await supabase
        .from('goals')
        .select('id, exercise_id, target_weight, target_reps, created_at, expected_date, exercises ( name )')
        .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);

    return (data ?? []).map((row) => ({
        id: row.id as number,
        exercise_id: row.exercise_id as number,
        target_weight: row.target_weight as number | null,
        target_reps: row.target_reps as number | null,
        created_at: row.created_at as string,
        expected_date: row.expected_date as string | null,
        exercise_name: (row.exercises as { name: string }[] | null)?.[0]?.name ?? '',
    }));
}

export async function createGoal(data: {
    exerciseId: number;
    targetWeight?: number | null;
    targetReps?: number | null;
    expectedDate?: string | null;
}): Promise<Goal> {
    const userId = await getMyId();
    const { data: row, error } = await supabase
        .from('goals')
        .insert({
            user_id: userId,
            exercise_id: data.exerciseId,
            target_weight: data.targetWeight ?? null,
            target_reps: data.targetReps ?? null,
            expected_date: data.expectedDate ?? null,
        })
        .select('id, target_weight, target_reps, expected_date')
        .single();
    if (error) throw new Error(error.message);
    return row as Goal;
}

export async function updateGoal(
    goalId: number,
    data: { targetWeight?: number | null; targetReps?: number | null; expectedDate?: string | null }
): Promise<Goal | null> {
    const update: Record<string, unknown> = {};
    if (data.targetWeight !== undefined) update.target_weight = data.targetWeight ?? null;
    if (data.targetReps !== undefined) update.target_reps = data.targetReps ?? null;
    if (data.expectedDate !== undefined) update.expected_date = data.expectedDate ?? null;

    const { data: row, error } = await supabase
        .from('goals')
        .update(update)
        .eq('id', goalId)
        .select('id, target_weight, target_reps, expected_date')
        .maybeSingle();
    if (error) throw new Error(error.message);
    return row as Goal | null;
}

export async function deleteGoal(goalId: number): Promise<boolean> {
    const { error, count } = await supabase.from('goals').delete().eq('id', goalId).select('id');
    if (error) throw new Error(error.message);
    return (count ?? 0) > 0;
}
