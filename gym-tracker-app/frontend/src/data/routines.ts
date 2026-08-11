import { supabase } from "../utils/supabaseClient";
import { getMyId } from "./client";
import { Routine, RoutineExercise, RoutineSet } from "./types";

export async function getUserRoutines(): Promise<Routine[]> {
    const { data, error } = await supabase
        .from('routines')
        .select('id, name, note')
        .order('id', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Routine[];
}

export async function getRoutineById(routineId: number): Promise<Routine | null> {
    const { data: routine, error: routineError } = await supabase
        .from('routines')
        .select('id, name, note')
        .eq('id', routineId)
        .maybeSingle();
    if (routineError) throw new Error(routineError.message);
    if (!routine) return null;

    const { data: rows, error: rowsError } = await supabase
        .from('routine_exercises')
        .select(`
            id,
            exercise_order,
            planned_sets,
            planned_reps,
            planned_weight,
            planned_time,
            note,
            exercises ( id, name, body_part, equipment ),
            routine_sets ( id, set_number, planned_weight, planned_reps, planned_time )
        `)
        .eq('routine_id', routineId)
        .order('exercise_order', { ascending: true });
    if (rowsError) throw new Error(rowsError.message);

    const exercises: RoutineExercise[] = (rows ?? []).map((row) => {
        const ex = (row.exercises as { id: number; name: string; body_part: string | null; equipment: string | null }[] | null)?.[0] ?? null;
        return {
            item_id: row.id as number,
            exercise_order: row.exercise_order as number,
            planned_time: row.planned_time as number | null,
            note: row.note as string | null,
            planned_sets: row.planned_sets as number | null,
            planned_reps: row.planned_reps as number | null,
            planned_weight: row.planned_weight as number | null,
            exercise_id: ex?.id ?? 0,
            exercise_name: ex?.name ?? '',
            body_part: ex?.body_part ?? null,
            equipment: ex?.equipment ?? null,
            sets: (row.routine_sets ?? []) as RoutineSet[],
        };
    });

    return { ...(routine as Routine), exercises };
}

export async function createRoutine(name: string): Promise<Routine> {
    const userId = await getMyId();
    const { data, error } = await supabase
        .from('routines')
        .insert({ user_id: userId, name })
        .select('id, name, note')
        .single();
    if (error) throw new Error(error.message);
    return data as Routine;
}

export async function updateRoutine(routineId: number, data: { name?: string; note?: string | null }): Promise<Routine | null> {
    const update: Record<string, unknown> = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.note !== undefined) update.note = data.note ?? null;

    const { data: row, error } = await supabase
        .from('routines')
        .update(update)
        .eq('id', routineId)
        .select('id, name, note')
        .maybeSingle();
    if (error) throw new Error(error.message);
    return row as Routine | null;
}

export async function deleteRoutine(routineId: number): Promise<void> {
    const { error } = await supabase.from('routines').delete().eq('id', routineId);
    if (error) throw new Error(error.message);
}

export async function addExerciseToRoutine(
    routineId: number,
    data: {
        exercise_id: number;
        exercise_order: number;
        planned_sets?: number | null;
        planned_reps?: number | null;
        planned_weight?: number | null;
        planned_time?: number | null;
        note?: string | null;
    }
): Promise<RoutineExercise> {
    const { data: row, error } = await supabase
        .from('routine_exercises')
        .insert({
            routine_id: routineId,
            exercise_id: data.exercise_id,
            exercise_order: data.exercise_order,
            planned_sets: data.planned_sets ?? null,
            planned_reps: data.planned_reps ?? null,
            planned_weight: data.planned_weight ?? null,
            planned_time: data.planned_time ?? null,
            note: data.note ?? null,
        })
        .select('*')
        .single();
    if (error) throw new Error(error.message);

    return {
        ...(row as RoutineExercise),
        exercise_name: '',
        sets: [],
    };
}

export async function updateRoutineExercise(
    itemId: number,
    data: {
        exercise_order?: number;
        planned_sets?: number | null;
        planned_reps?: number | null;
        planned_weight?: number | null;
        planned_time?: number | null;
        note?: string | null;
    }
): Promise<RoutineExercise | null> {
    const update: Record<string, unknown> = {};
    if (data.exercise_order !== undefined) update.exercise_order = data.exercise_order;
    if (data.planned_sets !== undefined) update.planned_sets = data.planned_sets ?? null;
    if (data.planned_reps !== undefined) update.planned_reps = data.planned_reps ?? null;
    if (data.planned_weight !== undefined) update.planned_weight = data.planned_weight ?? null;
    if (data.planned_time !== undefined) update.planned_time = data.planned_time ?? null;
    if (data.note !== undefined) update.note = data.note ?? null;

    const { data: row, error } = await supabase
        .from('routine_exercises')
        .update(update)
        .eq('id', itemId)
        .select('*')
        .maybeSingle();
    if (error) throw new Error(error.message);
    return row as RoutineExercise | null;
}

export async function removeExerciseFromRoutine(itemId: number): Promise<void> {
    const { error } = await supabase
        .from('routine_exercises')
        .delete()
        .eq('id', itemId);
    if (error) throw new Error(error.message);
}

export async function addSetToRoutineExercise(
    routineExerciseId: number,
    data: { set_number: number; planned_weight?: number | null; planned_reps?: number | null; planned_time?: number | null }
): Promise<RoutineSet> {
    const { data: row, error } = await supabase
        .from('routine_sets')
        .insert({
            routine_exercise_id: routineExerciseId,
            set_number: data.set_number,
            planned_weight: data.planned_weight ?? null,
            planned_reps: data.planned_reps ?? null,
            planned_time: data.planned_time ?? null,
        })
        .select('*')
        .single();
    if (error) throw new Error(error.message);
    return row as RoutineSet;
}

export async function updateRoutineSet(
    setId: number,
    data: { planned_weight?: number | null; planned_reps?: number | null; planned_time?: number | null }
): Promise<RoutineSet | null> {
    const update: Record<string, unknown> = {};
    if (data.planned_weight !== undefined) update.planned_weight = data.planned_weight ?? null;
    if (data.planned_reps !== undefined) update.planned_reps = data.planned_reps ?? null;
    if (data.planned_time !== undefined) update.planned_time = data.planned_time ?? null;

    const { data: row, error } = await supabase
        .from('routine_sets')
        .update(update)
        .eq('id', setId)
        .select('*')
        .maybeSingle();
    if (error) throw new Error(error.message);
    return row as RoutineSet | null;
}

export async function deleteRoutineSet(setId: number): Promise<void> {
    const { error } = await supabase.from('routine_sets').delete().eq('id', setId);
    if (error) throw new Error(error.message);
}
