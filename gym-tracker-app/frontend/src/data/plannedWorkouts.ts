import { supabase } from "../utils/supabaseClient";
import { getMyId } from "./client";
import { PlannedWorkout } from "./types";

export async function getPlannedWorkouts(): Promise<PlannedWorkout[]> {
    const { data, error } = await supabase
        .from('planned_workouts')
        .select('*, routines ( name )')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);

    return (data ?? []).map((row) => ({
        id: row.id,
        user_id: row.user_id,
        date: row.date,
        routine_id: row.routine_id,
        name: row.name,
        note: row.note,
        created_at: row.created_at,
        routine_name: (row.routines as { name: string }[] | null)?.[0]?.name ?? null,
    }));
}

export async function getPlannedWorkoutById(id: number): Promise<PlannedWorkout | null> {
    const { data, error } = await supabase
        .from('planned_workouts')
        .select('*, routines ( name )')
        .eq('id', id)
        .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;

    return {
        id: data.id,
        user_id: data.user_id,
        date: data.date,
        routine_id: data.routine_id,
        name: data.name,
        note: data.note,
        created_at: data.created_at,
        routine_name: (data.routines as { name: string }[] | null)?.[0]?.name ?? null,
    };
}

export async function createPlannedWorkout(data: {
    date: string;
    name?: string | null;
    routineId?: number | null;
    note?: string | null;
}): Promise<PlannedWorkout> {
    const userId = await getMyId();
    const { data: row, error } = await supabase
        .from('planned_workouts')
        .insert({
            user_id: userId,
            date: data.date,
            routine_id: data.routineId ?? null,
            name: data.name ?? null,
            note: data.note ?? null,
        })
        .select('*')
        .single();
    if (error) throw new Error(error.message);
    return row as PlannedWorkout;
}

export async function updatePlannedWorkout(
    id: number,
    data: { date?: string | null; name?: string | null; note?: string | null }
): Promise<PlannedWorkout | null> {
    const update: Record<string, unknown> = {};
    if (data.date !== undefined) update.date = data.date;
    if (data.name !== undefined) update.name = data.name ?? null;
    if (data.note !== undefined) update.note = data.note ?? null;

    const { data: row, error } = await supabase
        .from('planned_workouts')
        .update(update)
        .eq('id', id)
        .select('*')
        .maybeSingle();
    if (error) throw new Error(error.message);
    return row as PlannedWorkout | null;
}

export async function deletePlannedWorkout(id: number): Promise<boolean> {
    const { error, count } = await supabase
        .from('planned_workouts')
        .delete()
        .eq('id', id)
        .select('id');
    if (error) throw new Error(error.message);
    return (count ?? 0) > 0;
}
