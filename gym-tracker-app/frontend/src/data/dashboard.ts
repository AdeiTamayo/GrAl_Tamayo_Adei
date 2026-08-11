import { supabase } from "../utils/supabaseClient";
import { getMyId } from "./client";
import { DashboardStats } from "./types";

function getCurrentWeekStart(): Date {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    start.setHours(0, 0, 0, 0);
    return start;
}

export async function getDashboardStats(): Promise<DashboardStats> {
    const userId = await getMyId();

    const { count: workoutCount, error: countError } = await supabase
        .from('workouts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);
    if (countError) throw new Error(countError.message);

    const weekStart = getCurrentWeekStart();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const { data: weeklySets, error: volumeError } = await supabase
        .from('workouts')
        .select(`
            workout_exercises!inner ( sets!inner ( weight, repetitions ) )
        `)
        .eq('user_id', userId)
        .gte('date', weekStart.toISOString().split('T')[0])
        .lt('date', weekEnd.toISOString().split('T')[0]);
    if (volumeError) throw new Error(volumeError.message);

    let weeklyVolume = 0;
    for (const w of weeklySets ?? []) {
        for (const we of w.workout_exercises ?? []) {
            for (const s of we.sets ?? []) {
                if (s.weight != null && s.repetitions != null) {
                    weeklyVolume += s.weight * s.repetitions;
                }
            }
        }
    }
    weeklyVolume = Math.round(weeklyVolume);

    const { data: workoutDates, error: datesError } = await supabase
        .from('workouts')
        .select('date')
        .eq('user_id', userId)
        .order('date', { ascending: false });
    if (datesError) throw new Error(datesError.message);

    const weekStarts = new Map<string, boolean>();
    for (const w of workoutDates ?? []) {
        const d = new Date(w.date as string);
        const ws = new Date(d);
        ws.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        ws.setHours(0, 0, 0, 0);
        weekStarts.set(ws.toISOString().split('T')[0], true);
    }

    let currentStreak = 0;
    if (weekStarts.size > 0) {
        const sortedWeeks = Array.from(weekStarts.keys()).sort().reverse();
        const nowWeek = weekStart.toISOString().split('T')[0];
        const diffMs = new Date(nowWeek).getTime() - new Date(sortedWeeks[0]).getTime();
        const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));

        if (diffWeeks <= 1) {
            currentStreak = 1;
            for (let i = 1; i < sortedWeeks.length; i++) {
                const prev = new Date(sortedWeeks[i - 1]).getTime();
                const cur = new Date(sortedWeeks[i]).getTime();
                const weekDiff = Math.round((prev - cur) / (7 * 24 * 60 * 60 * 1000));
                if (weekDiff === 1) {
                    currentStreak++;
                } else {
                    break;
                }
            }
        }
    }

    return { workoutCount: workoutCount ?? 0, weeklyVolume, currentStreak };
}
