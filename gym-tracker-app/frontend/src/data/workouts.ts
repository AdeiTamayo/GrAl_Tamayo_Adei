import { supabase } from "../utils/supabaseClient";
import { getMyId } from "./client";
import { Workout, WorkoutExercise, WorkoutSet } from "./types";

export async function getWorkouts(): Promise<Workout[]> {
    const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .order('date', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Workout[];
}

export async function getWorkoutById(id: number): Promise<Workout | null> {
    const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .select('*')
        .eq('id', id)
        .maybeSingle();
    if (workoutError) throw new Error(workoutError.message);
    if (!workout) return null;

    const { data: rows, error: rowsError } = await supabase
        .from('workout_exercises')
        .select(`
            id,
            exercise_id,
            exercise_order,
            note,
            exercises ( name ),
            sets ( id, set_number, weight, repetitions, time, note, rpe )
        `)
        .eq('workout_id', id)
        .order('exercise_order', { ascending: true });
    if (rowsError) throw new Error(rowsError.message);

    const exercisesMap: Record<number, WorkoutExercise> = {};
    for (const row of rows ?? []) {
        const weId = row.id as number;
        if (!exercisesMap[weId]) {
            exercisesMap[weId] = {
                id: weId,
                exercise_id: row.exercise_id as number,
                exercise_order: row.exercise_order as number,
                name: (row.exercises as { name: string }[] | null)?.[0]?.name ?? '',
                note: (row.note as string) || null,
                sets: [],
            };
        }
        for (const s of (row.sets ?? []) as WorkoutSet[]) {
            exercisesMap[weId].sets.push(s);
        }
    }

    return {
        ...(workout as Workout),
        exercises: Object.values(exercisesMap).sort((a, b) => a.exercise_order - b.exercise_order),
    };
}

export async function createWorkout(data: { name: string; date: string; note?: string | null }): Promise<Workout> {
    const userId = await getMyId();
    const { data: row, error } = await supabase
        .from('workouts')
        .insert({
            user_id: userId,
            name: data.name,
            date: data.date,
            note: data.note ?? null,
        })
        .select('*')
        .single();
    if (error) throw new Error(error.message);
    return row as Workout;
}

export async function updateWorkout(id: number, data: { name: string; date: string; note?: string | null }): Promise<Workout | null> {
    const { data: row, error } = await supabase
        .from('workouts')
        .update({
            name: data.name,
            date: data.date,
            note: data.note ?? null,
        })
        .eq('id', id)
        .select('*')
        .maybeSingle();
    if (error) throw new Error(error.message);
    return row as Workout | null;
}

export async function deleteWorkout(id: number): Promise<void> {
    const { error } = await supabase.from('workouts').delete().eq('id', id);
    if (error) throw new Error(error.message);
}

export async function addWorkoutExercise(workoutId: number, exerciseId: number, note?: string | null): Promise<WorkoutExercise> {
    const { data: maxRow } = await supabase
        .from('workout_exercises')
        .select('exercise_order')
        .eq('workout_id', workoutId)
        .order('exercise_order', { ascending: false })
        .limit(1)
        .maybeSingle();

    const nextOrder = (maxRow?.exercise_order ?? 0) + 1;

    const { data: row, error } = await supabase
        .from('workout_exercises')
        .insert({
            workout_id: workoutId,
            exercise_id: exerciseId,
            exercise_order: nextOrder,
            note: note ?? null,
        })
        .select('*')
        .single();
    if (error) throw new Error(error.message);

    const { data: ex } = await supabase
        .from('exercises')
        .select('name')
        .eq('id', exerciseId)
        .maybeSingle();

    return {
        ...(row as WorkoutExercise),
        name: ex?.name ?? '',
        sets: [],
    };
}

export async function deleteWorkoutExercise(workoutExerciseId: number): Promise<void> {
    const { error } = await supabase
        .from('workout_exercises')
        .delete()
        .eq('id', workoutExerciseId);
    if (error) throw new Error(error.message);
}

export async function addSet(
    workoutExerciseId: number,
    data: { weight?: number | null; repetitions?: number | null; time?: number | null; note?: string | null; rpe?: number | null }
): Promise<WorkoutSet> {
    const { data: maxRow } = await supabase
        .from('sets')
        .select('set_number')
        .eq('workout_exercise_id', workoutExerciseId)
        .order('set_number', { ascending: false })
        .limit(1)
        .maybeSingle();

    const setNumber = (maxRow?.set_number ?? 0) + 1;

    const { data: row, error } = await supabase
        .from('sets')
        .insert({
            workout_exercise_id: workoutExerciseId,
            set_number: setNumber,
            weight: data.weight ?? null,
            repetitions: data.repetitions ?? null,
            time: data.time ?? null,
            note: data.note ?? null,
            rpe: data.rpe ?? null,
        })
        .select('*')
        .single();
    if (error) throw new Error(error.message);
    return row as WorkoutSet;
}

export async function updateSet(
    setId: number,
    data: { weight?: number | null; repetitions?: number | null; time?: number | null; note?: string | null; rpe?: number | null }
): Promise<WorkoutSet | null> {
    const update: Record<string, unknown> = {};
    if (data.weight !== undefined) update.weight = data.weight ?? null;
    if (data.repetitions !== undefined) update.repetitions = data.repetitions ?? null;
    if (data.time !== undefined) update.time = data.time ?? null;
    if (data.note !== undefined) update.note = data.note ?? null;
    if (data.rpe !== undefined) update.rpe = data.rpe ?? null;

    const { data: row, error } = await supabase
        .from('sets')
        .update(update)
        .eq('id', setId)
        .select('*')
        .maybeSingle();
    if (error) throw new Error(error.message);
    return row as WorkoutSet | null;
}

export async function deleteSet(setId: number): Promise<void> {
    const { error } = await supabase.from('sets').delete().eq('id', setId);
    if (error) throw new Error(error.message);
}
