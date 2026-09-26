export function formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map(v => v < 10 ? "0" + v : v).filter((v, i) => v !== "00" || i > 0).join(":");
}

/**
 * Local calendar date (YYYY-MM-DD) in the device timezone.
 * `toISOString()` is UTC and shifts the day near local midnight, so workout
 * dates, calendar dots and date filters must all use this instead.
 */
export function todayLocal(date = new Date()): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// ---------------------------------------------------------------------------
// Dashboard statistics (pure, database-free).
// `getDashboardStats` in data/dashboard.ts queries Supabase and delegates the
// streak rule to `computeStreak` so the most visible metric stays testable.
// ---------------------------------------------------------------------------

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Consecutive-week training streak from ISO week-start keys (`YYYY-MM-DD`),
 * sorted newest-first, against the current week start.
 *
 * The count seeds at 1 when the latest trained week is the current or previous
 * week, then walks backwards while each gap is exactly one week. Anything else
 * (empty history, a stale latest week, a broken chain) yields the count so far.
 */
export function computeStreak(weekStartsDesc: string[], nowWeekStart: string): number {
    if (weekStartsDesc.length === 0) return 0;

    const latestGapWeeks = Math.round(
        (new Date(nowWeekStart).getTime() - new Date(weekStartsDesc[0]).getTime()) / WEEK_MS
    );
    if (latestGapWeeks > 1) return 0;

    let streak = 1;
    for (let i = 1; i < weekStartsDesc.length; i++) {
        const gapWeeks = Math.round(
            (new Date(weekStartsDesc[i - 1]).getTime() - new Date(weekStartsDesc[i]).getTime()) / WEEK_MS
        );
        if (gapWeeks === 1) {
            streak++;
        } else {
            break;
        }
    }
    return streak;
}
