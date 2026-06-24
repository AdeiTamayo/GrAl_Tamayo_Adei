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

interface PlannedWorkout {
    id: number;
    date: string;
    routine_id: number | null;
    routine_name: string | null;
    name: string;
    note: string | null;
}

interface Routine {
    id: number;
    name: string;
}

export default function WorkoutCalendar() {
    const navigate = useNavigate();
    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const [planned, setPlanned] = useState<PlannedWorkout[]>([]);
    const [routines, setRoutines] = useState<Routine[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<string>("");

    const [showPlanModal, setShowPlanModal] = useState(false);
    const [planDate, setPlanDate] = useState("");
    const [planRoutineId, setPlanRoutineId] = useState<number | "">("");
    const [planName, setPlanName] = useState("");

    const token = localStorage.getItem("user_login_token");
    const headers = useMemo(() => ({
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    }), [token]);

    useEffect(() => {
        Promise.all([fetchWorkouts(), fetchPlanned(), fetchRoutines()])
            .finally(() => setIsLoading(false));
    }, [headers]);

    async function fetchWorkouts() {
        try {
            const res = await apiFetch("/api/workouts", { headers });
            const data = await res.json();
            if (data.success) setWorkouts(data.data || []);
        } catch (err) {
            console.error("Failed to fetch workouts", err);
        }
    }

    async function fetchPlanned() {
        try {
            const res = await apiFetch("/api/planned-workouts", { headers });
            const data = await res.json();
            if (data.success) setPlanned(data.data || []);
        } catch (err) {
            console.error("Failed to fetch planned workouts", err);
        }
    }

    async function fetchRoutines() {
        try {
            const res = await apiFetch("/api/routines", { headers });
            const data = await res.json();
            if (data.success) setRoutines(data.routines || []);
        } catch (err) {
            console.error("Failed to fetch routines", err);
        }
    }

    async function handleAddPlanned() {
        if (!planDate || !planName.trim()) return;
        try {
            const res = await apiFetch("/api/planned-workouts", {
                method: "POST",
                headers,
                body: JSON.stringify({
                    date: planDate,
                    name: planName.trim(),
                    routine_id: planRoutineId || null,
                }),
            });
            const data = await res.json();
            if (data.success) {
                await fetchPlanned();
                setShowPlanModal(false);
                setPlanRoutineId("");
                setPlanName("");
            }
        } catch (err) {
            console.error("Failed to add planned workout", err);
        }
    }

    async function handleDeletePlanned(id: number) {
        try {
            await apiFetch(`/api/planned-workouts/${id}`, { method: "DELETE", headers });
            setPlanned(prev => prev.filter(p => p.id !== id));
        } catch (err) {
            console.error("Failed to delete planned workout", err);
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

    const plannedDates = useMemo(() => {
        return new Set(planned.map(p => p.date?.substring(0, 10)).filter(Boolean));
    }, [planned]);

    const selectedWorkouts = useMemo(() => {
        if (!selectedDate) return [];
        return workouts.filter(w => w.date?.substring(0, 10) === selectedDate);
    }, [workouts, selectedDate]);

    const selectedPlanned = useMemo(() => {
        if (!selectedDate) return [];
        return planned.filter(p => p.date?.substring(0, 10) === selectedDate);
    }, [planned, selectedDate]);

    const defaultDate = useMemo(() => {
        const allDates = [
            ...workouts.map(w => w.date?.substring(0, 10)),
            ...planned.map(p => p.date?.substring(0, 10)),
        ].filter(Boolean) as string[];
        return allDates.length > 0 ? allDates[0] : new Date().toLocaleDateString('en-CA');
    }, [workouts, planned]);

    useEffect(() => {
        if (!selectedDate && defaultDate) {
            setSelectedDate(defaultDate);
        }
    }, [defaultDate, selectedDate]);

    function openPlanModal() {
        setPlanDate(selectedDate);
        setPlanRoutineId("");
        setPlanName("");
        setShowPlanModal(true);
    }

    if (isLoading) return <div className="p-8 text-muted font-medium animate-pulse">Loading workout calendar...</div>;

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8 mt-4 md:mt-8 space-y-8">
            <h1 className="font-display text-4xl font-bold tracking-tight uppercase italic text-lime-400">Workout Calendar</h1>
            <p className="text-dim text-sm font-medium -mt-6">Click a day to view or schedule workouts.</p>

            <div className="flex gap-6 items-start flex-col lg:flex-row">
                <div className="flex-none w-full lg:w-[380px]">
                    <Calendar
                        selectedDate={selectedDate}
                        onSelect={(d) => setSelectedDate(d)}
                        events={events}
                        plannedDates={plannedDates}
                    />
                </div>

                <div className="flex-1 w-full bg-card border border-subtle rounded-xl p-6 shadow-xl space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="font-display text-lg font-bold text-heading tracking-wide uppercase">
                            {selectedDate ? (
                                <>{new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</>
                            ) : "Select a day"}
                        </h2>
                        {selectedDate && (
                            <button
                                onClick={openPlanModal}
                                className="bg-lime-400 text-black font-bold text-xs py-2 px-3 rounded-lg hover:bg-lime-300 transition-all"
                            >
                                + Schedule
                            </button>
                        )}
                    </div>

                    {selectedPlanned.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                                Planned
                            </h3>
                            <ul className="space-y-2">
                                {selectedPlanned.map(p => (
                                    <li key={p.id} className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 flex items-center justify-between group">
                                        <button
                                            onClick={() => {
                                                const params = new URLSearchParams();
                                                if (p.routine_id) params.set('loadRoutine', String(p.routine_id));
                                                params.set('name', p.name);
                                                navigate(`/active-workout?${params.toString()}`);
                                            }}
                                            className="text-left flex-1 min-w-0 mr-2"
                                        >
                                            <strong className="text-sm font-bold text-body group-hover:text-lime-400 transition-colors">{p.name}</strong>
                                            {p.routine_name && (
                                                <span className="text-xs text-dim ml-2">({p.routine_name})</span>
                                            )}
                                            {p.note && <div className="text-xs text-dim mt-0.5">{p.note}</div>}
                                        </button>
                                        <button
                                            onClick={() => handleDeletePlanned(p.id)}
                                            className="text-dim hover:text-rose-400 text-lg leading-none font-bold shrink-0"
                                            title="Remove"
                                        >
                                            ×
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div>
                        <h3 className="text-sm font-bold text-lime-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-lime-400 inline-block" />
                            Logged Workouts
                        </h3>
                        {selectedWorkouts.length === 0 ? (
                            <div className="text-center py-8 bg-surface/50 rounded-lg border border-subtle/80">
                                <p className="text-dim font-medium italic text-sm">No workouts logged on this day.</p>
                            </div>
                        ) : (
                            <ul className="space-y-2">
                                {selectedWorkouts.map(w => (
                                    <li key={w.id}>
                                        <button
                                            onClick={() => navigate('/workouts', { state: { preselectedWorkoutId: w.id } })}
                                            className="w-full text-left bg-surface/40 border border-subtle/80 rounded-lg p-3 flex items-center justify-between hover:border-lime-400/50 hover:bg-surface/60 transition-all group"
                                        >
                                            <div>
                                                <strong className="text-sm font-bold text-body group-hover:text-lime-400 transition-colors">{w.name || "Untitled Workout"}</strong>
                                                {w.note && <div className="text-xs text-dim mt-0.5">{w.note}</div>}
                                            </div>
                                            <svg className="w-4 h-4 text-dim group-hover:text-lime-400 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                            </svg>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="pt-3 border-t border-subtle text-xs text-dim space-y-1">
                        <div><span className="inline-block w-2 h-2 rounded-full bg-lime-400 mr-1.5 align-middle" />Days with logged workouts</div>
                        <div><span className="inline-block w-2 h-2 rounded-full bg-blue-400/70 mr-1.5 align-middle" />Days with planned workouts</div>
                    </div>
                </div>
            </div>

            {showPlanModal && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-sm bg-card border border-subtle rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                        <h2 className="font-display text-lg font-bold text-body uppercase tracking-wide mb-2">Schedule Workout</h2>
                        <p className="text-sm text-muted mb-5">Assign a routine to {planDate}.</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-muted font-bold mb-1.5">Date</label>
                                <input
                                    type="date"
                                    value={planDate}
                                    onChange={(e) => setPlanDate(e.target.value)}
                                    className="w-full bg-surface border border-subtle rounded-lg px-3 py-2 text-sm text-body focus:border-lime-400 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs uppercase tracking-wider text-muted font-bold mb-1.5">Routine (optional)</label>
                                <select
                                    value={planRoutineId}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setPlanRoutineId(val ? Number(val) : "");
                                        const routine = routines.find(r => r.id === Number(val));
                                        if (routine) setPlanName(routine.name);
                                    }}
                                    className="w-full bg-surface border border-subtle rounded-lg px-3 py-2 text-sm text-body focus:border-lime-400 focus:outline-none"
                                >
                                    <option value="">-- No routine --</option>
                                    {routines.map(r => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs uppercase tracking-wider text-muted font-bold mb-1.5">Workout Name</label>
                                <input
                                    type="text"
                                    value={planName}
                                    onChange={(e) => setPlanName(e.target.value)}
                                    placeholder="e.g. Push Day"
                                    className="w-full bg-surface border border-subtle rounded-lg px-3 py-2 text-sm text-body placeholder:text-dim focus:border-lime-400 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={handleAddPlanned}
                                disabled={!planDate || !planName.trim()}
                                className="flex-1 bg-lime-400 text-black font-bold py-2.5 rounded-lg hover:bg-lime-300 transition-all disabled:opacity-40"
                            >
                                Schedule
                            </button>
                            <button
                                onClick={() => setShowPlanModal(false)}
                                className="flex-1 bg-elevated text-muted font-bold py-2.5 rounded-lg hover:bg-hover transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
