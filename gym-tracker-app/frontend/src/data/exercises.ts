import { supabase } from "../utils/supabaseClient";
import { getMyId } from "./client";
import { Exercise, ExerciseFilterOptions } from "./types";

export async function getExercises(page?: number, limit?: number): Promise<{ exercises: Exercise[]; total: number }> {
    const countQuery = supabase.from('exercises').select('id', { count: 'exact', head: true });
    let query = supabase
        .from('exercises')
        .select('id, name, body_part, target_muscle, secondary_muscles, equipment, difficulty, category, is_custom')
        .order('name', { ascending: true });

    if (page !== undefined && limit !== undefined) {
        const offset = (page - 1) * limit;
        query = query.range(offset, offset + limit - 1);
    }

    const [{ count }, { data, error }] = await Promise.all([countQuery, query]);
    if (error) throw new Error(error.message);

    return {
        exercises: (data ?? []).map((row) => ({
            id: row.id,
            name: row.name,
            bodyPart: row.body_part,
            target: row.target_muscle,
            secondary_muscles: row.secondary_muscles,
            equipment: row.equipment,
            difficulty: row.difficulty,
            category: row.category,
            is_custom: row.is_custom,
        })),
        total: count ?? 0,
    };
}

export async function getExerciseById(id: number): Promise<Exercise | null> {
    const { data, error } = await supabase
        .from('exercises')
        .select('id, name, body_part, target_muscle, equipment, difficulty, category, description, secondary_muscles, instructions')
        .eq('id', id)
        .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;

    return {
        id: data.id,
        name: data.name,
        bodyPart: data.body_part,
        target: data.target_muscle,
        equipment: data.equipment,
        difficulty: data.difficulty,
        category: data.category,
        description: data.description,
        secondary_muscles: data.secondary_muscles,
        instructions: data.instructions,
    };
}

export async function createExercise(data: {
    name: string;
    bodyPart?: string | null;
    target?: string | null;
    secondaryMuscles?: string[] | null;
    equipment?: string | null;
    difficulty?: string | null;
    category?: string | null;
    description?: string | null;
    instructions?: string[] | null;
}): Promise<Exercise> {
    const userId = await getMyId();
    const { data: row, error } = await supabase
        .from('exercises')
        .insert({
            name: data.name,
            body_part: data.bodyPart ?? null,
            target_muscle: data.target ?? null,
            secondary_muscles: data.secondaryMuscles ?? null,
            equipment: data.equipment ?? null,
            difficulty: data.difficulty ?? null,
            category: data.category ?? null,
            description: data.description ?? null,
            instructions: data.instructions ?? null,
            is_custom: true,
            created_by: userId,
        })
        .select('*')
        .single();
    if (error) throw new Error(error.message);
    return {
        id: row.id,
        name: row.name,
        bodyPart: row.body_part,
        target: row.target_muscle,
        equipment: row.equipment,
        difficulty: row.difficulty,
        category: row.category,
        description: row.description,
        secondary_muscles: row.secondary_muscles,
        instructions: row.instructions,
        is_custom: true,
    };
}

export async function updateExercise(
    id: number,
    data: {
        name?: string;
        bodyPart?: string | null;
        target?: string | null;
        secondaryMuscles?: string[] | null;
        equipment?: string | null;
        difficulty?: string | null;
        category?: string | null;
        description?: string | null;
        instructions?: string[] | null;
    }
): Promise<Exercise | null> {
    const update: Record<string, unknown> = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.bodyPart !== undefined) update.body_part = data.bodyPart ?? null;
    if (data.target !== undefined) update.target_muscle = data.target ?? null;
    if (data.secondaryMuscles !== undefined) update.secondary_muscles = data.secondaryMuscles ?? null;
    if (data.equipment !== undefined) update.equipment = data.equipment ?? null;
    if (data.difficulty !== undefined) update.difficulty = data.difficulty ?? null;
    if (data.category !== undefined) update.category = data.category ?? null;
    if (data.description !== undefined) update.description = data.description ?? null;
    if (data.instructions !== undefined) update.instructions = data.instructions ?? null;

    const { data: row, error } = await supabase
        .from('exercises')
        .update(update)
        .eq('id', id)
        .select('*')
        .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;

    return {
        id: row.id,
        name: row.name,
        bodyPart: row.body_part,
        target: row.target_muscle,
        equipment: row.equipment,
        difficulty: row.difficulty,
        category: row.category,
        description: row.description,
        secondary_muscles: row.secondary_muscles,
        instructions: row.instructions,
        is_custom: row.is_custom,
    };
}

export async function deleteExercise(id: number): Promise<boolean> {
    const { error, count } = await supabase.from('exercises').delete().eq('id', id).select('id');
    if (error) throw new Error(error.message);
    return (count ?? 0) > 0;
}

export async function getFilterOptions(): Promise<ExerciseFilterOptions> {
    const [equipment, muscles, categoryType] = await Promise.all([
        supabase.from('exercises').select('equipment').not('equipment', 'is', null).neq('equipment', '').order('equipment'),
        supabase.from('exercises').select('target_muscle').not('target_muscle', 'is', null).neq('target_muscle', '').order('target_muscle'),
        supabase.from('exercises').select('category').not('category', 'is', null).neq('category', '').order('category'),
    ]);

    return {
        equipment: Array.from(new Set((equipment.data ?? []).map((r) => r.equipment as string))),
        muscles: Array.from(new Set((muscles.data ?? []).map((r) => r.target_muscle as string))),
        categoryType: Array.from(new Set((categoryType.data ?? []).map((r) => r.category as string))),
    };
}

export async function getExerciseHistory(exerciseId: number): Promise<{ date: string; workout_name: string; max_weight: number | null; total_volume: number; max_reps: number | null }[]> {
    const userId = await getMyId();
    const { data, error } = await supabase
        .from('workouts')
        .select(`
            id, date, name,
            workout_exercises!inner ( exercise_id, sets ( weight, repetitions ) )
        `)
        .eq('user_id', userId)
        .eq('workout_exercises.exercise_id', exerciseId);
    if (error) throw new Error(error.message);

    const rows = (data ?? []).flatMap((w) => {
        const we = (w.workout_exercises ?? []).filter((e: { exercise_id: number }) => e.exercise_id === exerciseId);
        return we.map((e: { sets: { weight: number | null; repetitions: number | null }[] }) => {
            const sets = e.sets ?? [];
            const weights = sets.map((s) => s.weight ?? 0);
            const reps = sets.map((s) => s.repetitions ?? 0);
            return {
                date: w.date,
                workout_name: w.name,
                max_weight: weights.length ? Math.max(...weights) : null,
                total_volume: sets.reduce((sum, s) => sum + (s.weight ?? 0) * (s.repetitions ?? 0), 0),
                max_reps: reps.length ? Math.max(...reps) : null,
            };
        });
    });

    return rows.sort((a, b) => a.date.localeCompare(b.date));
}
