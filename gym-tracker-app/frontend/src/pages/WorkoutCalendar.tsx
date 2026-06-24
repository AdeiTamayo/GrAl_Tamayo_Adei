import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";
import Calendar from "../components/Calendar";

interface Workout {
    id: number;
    name: string;
    date: string;
    note?: string | null;
}

export default function WorkoutCalendar() {
    const navigate = useNavigate();
    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<string>("");

    const token = localStorage.getItem("user_login_token");
    const headers = useMemo(() => ({
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    }), [token]);

    useEffect(() => {
        fetchWorkouts().finally(() => setIsLoading(false));
    }, [headers]);

    async function fetchWorkouts() {
        try {
            const res = await apiFetch("/api/workouts", { headers });
            const data = await res.json();
            if (data.success) {
                setWorkouts(data.data || []);
            }
        } catch (err) {
            console.error("Failed to fetch workouts", err);
        }
    }

    const events = useMemo(() => {
        const ev: Record<string, { date: string; status: 'completed'; label: string }> = {};
        for (const w of workouts) {
            const d = w.date?.substring(0, 10);
            if (d) ev[d] = { date: d, status: 'completed', label: w.name };
        }
        return ev;
    }, [workouts]);

    const selectedWorkouts = useMemo(() => {
        if (!selectedDate) return [];
        return workouts.filter(w => w.date?.substring(0, 10) === selectedDate);
    }, [workouts, selectedDate]);

    const defaultDate = useMemo(() => {
        if (workouts.length > 0) {
            return workouts[0].date?.substring(0, 10);
        }
        return new Date().toLocaleDateString('en-CA');
    }, [workouts]);

    useEffect(() => {
        if (!selectedDate && defaultDate) {
            setSelectedDate(defaultDate);
        }
    }, [defaultDate, selectedDate]);

    if (isLoading) return <div className="p-8 text-muted font-medium animate-pulse">Loading workout calendar...</div>;

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8 mt-4 md:mt-8 space-y-8">
            <h1 className="font-display text-4xl font-bold tracking-tight uppercase italic text-lime-400">Workout Calendar</h1>
            <p className="text-dim text-sm font-medium -mt-6">Click a day to see workouts performed on that date.</p>

            <div className="flex gap-6 items-start flex-col lg:flex-row">
                <div className="flex-none w-full lg:w-[380px]">
                    <Calendar
                        selectedDate={selectedDate}
                        onSelect={(d) => setSelectedDate(d)}
                        events={events}
                    />
                </div>

                <div className="flex-1 w-full bg-card border border-subtle rounded-xl p-6 shadow-xl">
                    <h2 className="font-display text-lg font-bold text-heading tracking-wide uppercase mb-5">
                        {selectedDate ? (
                            <>{new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</>
                        ) : "Select a day"}
                    </h2>

                    {selectedWorkouts.length === 0 ? (
                        <div className="text-center py-10 bg-surface/50 rounded-lg border border-subtle/80">
                            <p className="text-dim font-medium italic">No workouts on this day.</p>
                        </div>
                    ) : (
                        <ul className="space-y-3">
                            {selectedWorkouts.map(w => (
                                <li key={w.id}>
                                    <button
                                        onClick={() => navigate('/workouts', { state: { preselectedWorkoutId: w.id } })}
                                        className="w-full text-left bg-surface/40 border border-subtle/80 rounded-lg p-4 flex items-center justify-between hover:border-lime-400/50 hover:bg-surface/60 transition-all group"
                                    >
                                        <div>
                                            <strong className="text-lg font-bold text-body group-hover:text-lime-400 transition-colors">{w.name || "Untitled Workout"}</strong>
                                            {w.note && <div className="text-sm text-dim font-medium mt-1">{w.note}</div>}
                                        </div>
                                        <svg className="w-5 h-5 text-dim group-hover:text-lime-400 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}

                    <div className="mt-6 pt-4 border-t border-subtle text-xs text-dim">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-lime-400 mr-1.5 align-middle" />
                        Days with a green dot have logged workouts.
                    </div>
                </div>
            </div>
        </div>
    );
}
