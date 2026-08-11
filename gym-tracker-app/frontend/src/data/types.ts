export interface Exercise {
    id: number;
    api_id?: string | null;
    name: string;
    bodyPart?: string | null;
    target?: string | null;
    secondary_muscles?: string[] | null;
    equipment?: string | null;
    difficulty?: string | null;
    category?: string | null;
    description?: string | null;
    instructions?: string[] | null;
    is_custom?: boolean;
}

export interface WorkoutSet {
    id: number;
    set_number: number;
    weight: number | null;
    repetitions: number | null;
    time: number | null;
    note?: string | null;
    rpe?: number | null;
}

export interface WorkoutExercise {
    id: number;
    exercise_id: number;
    exercise_order: number;
    name: string;
    note?: string | null;
    sets: WorkoutSet[];
}

export interface Workout {
    id: number;
    name: string;
    date: string;
    note?: string | null;
    exercises?: WorkoutExercise[];
}

export interface RoutineSet {
    id: number;
    set_number: number;
    planned_weight: number | null;
    planned_reps: number | null;
    planned_time: number | null;
}

export interface RoutineExercise {
    item_id: number;
    exercise_order: number;
    planned_time: number | null;
    note: string | null;
    exercise_id: number;
    exercise_name: string;
    body_part: string | null;
    equipment: string | null;
    planned_sets?: number | null;
    planned_reps?: number | null;
    planned_weight?: number | null;
    sets: RoutineSet[];
}

export interface Routine {
    id: number;
    name: string;
    note: string | null;
    exercises?: RoutineExercise[];
}

export interface PR {
    id: number;
    exercise_id: number;
    exercise_name?: string;
    weight: number;
    repetitions: number;
    date: string;
    note?: string | null;
}

export interface Goal {
    id: number;
    exercise_id: number;
    exercise_name?: string;
    target_weight: number | null;
    target_reps: number | null;
    created_at: string;
    expected_date: string | null;
}

export interface PlannedWorkout {
    id: number;
    user_id: number;
    date: string;
    routine_id: number | null;
    name: string;
    note: string | null;
    created_at: string;
    routine_name?: string | null;
}

export interface WeightEntry {
    id: number;
    user_id: number;
    weight: number;
    date: string;
}

export interface UserProfile {
    id: number;
    name: string | null;
    surname: string | null;
    email: string;
    gender: string | null;
    weight: number | null;
    height: number | null;
    birth_date: string | null;
}

export interface UserSettings {
    id: number;
    user_id: number;
    show_rpe: boolean;
    show_1rm: boolean;
    show_goals: boolean;
    show_rest_time: boolean;
    default_rest_time: number;
}

export interface DashboardStats {
    workoutCount: number;
    weeklyVolume: number;
    currentStreak: number;
}

export interface ExerciseFilterOptions {
    equipment: string[];
    muscles: string[];
    categoryType: string[];
}

export interface VideoRecord {
    id: number;
    filename: string | null;
    process_type: string | null;
    processed_url: string | null;
    status: string | null;
    created_at: string;
}
