import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";
import Calendar from "../components/Calendar";
import LoadingSkeleton from "../components/LoadingSkeleton";
import Button from "../components/Button";
import DeleteButton from "../components/DeleteButton";
import Modal from "../components/Modal";
import Select from "../components/Select";
import DatePicker from "../components/DatePicker";

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

interface Goal {
    id: number;
    exercise_name: string;
    target_weight: string;
    target_reps: number;
    expected_date: string | null;
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
    const [goals, setGoals] = useState<Goal[]>([]);
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
        Promise.all([fetchWorkouts(), fetchPlanned(), fetchRoutines(), fetchGoals()])
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

    async function fetchGoals() {
        try {
            const res = await apiFetch("/api/goals", { headers });
            const data = await res.json();
            setGoals(data.goals || []);
        } catch (err) {
            console.error("Failed to fetch goals", err);
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

    const goalDates = useMemo(() => {
        const set = new Set<string>();
        for (const g of goals) {
            if (g.expected_date) {
                set.add(g.expected_date.substring(0, 10));
            }
        }
        return set;
    }, [goals]);

    const selectedWorkouts = useMemo(() => {
        if (!selectedDate) return [];
        return workouts.filter(w => w.date?.substring(0, 10) === selectedDate);
    }, [workouts, selectedDate]);

    const selectedPlanned = useMemo(() => {
        if (!selectedDate) return [];
        return planned.filter(p => p.date?.substring(0, 10) === selectedDate);
    }, [planned, selectedDate]);

    const selectedGoals = useMemo(() => {
        if (!selectedDate) return [];
        return goals.filter(g => g.expected_date?.substring(0, 10) === selectedDate);
    }, [goals, selectedDate]);

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

    if (isLoading) return <div className="p-8"><LoadingSkeleton type="page" /></div>;

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8 mt-4 md:mt-8 space-y-8 animate-in fade-in duration-200">
            <h1 className="font-display text-4xl font-bold tracking-tight uppercase italic text-accent">Workout Calendar</h1>
            <p className="text-dim text-sm font-medium -mt-6">Click a day to see workouts and goal deadlines or schedule workouts.</p>

            <div className="flex gap-6 items-start flex-col lg:flex-row">
                <div className="flex-none w-full lg:w-[380px]">
                    <Calendar
                        selectedDate={selectedDate}
                        onSelect={(d) => setSelectedDate(d)}
                        events={events}
                        plannedDates={plannedDates}
                        goalDates={goalDates}
                    />
                </div>

                <div className="flex-1 w-full bg-card border border-subtle rounded-xl p-6 shadow-xl space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="font-display text-lg font-bold text-heading tracking-wide uppercase">
                            {selectedDate ? (
                                <>{new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</>
                            ) : "Select a day"}
                        </h2>
                    </div>

                    {selectedWorkouts.length === 0 && selectedGoals.length === 0 && selectedPlanned.length === 0 ? (
                        <div className="text-center py-10 bg-surface/50 rounded-lg border border-subtle/80">
                            <p className="text-dim font-medium italic">No workouts, goals, or scheduled sessions on this day.</p>
                        </div>
                    ) : (
                        <>
                            {selectedWorkouts.length > 0 && (
                                <>
                                    <h3 className="font-display text-sm font-bold text-heading tracking-wide uppercase mb-3 text-accent">Logged Workouts</h3>
                                    <ul className="space-y-3 mb-6">
                                        {selectedWorkouts.map(w => (
                                            <li key={w.id}>
                                                <button
                                                    onClick={() => navigate('/workouts', { state: { preselectedWorkoutId: w.id } })}
                                                    className="w-full text-left bg-surface/40 border border-subtle/80 rounded-lg p-4 flex items-center justify-between hover:border-accent/50 hover:bg-surface/60 transition-all group"
                                                >
                                                    <div>
                                                        <strong className="text-lg font-bold text-body group-hover:text-accent transition-colors">{w.name || "Untitled Workout"}</strong>
                                                        {w.note && <div className="text-sm text-dim font-medium mt-1">{w.note}</div>}
                                                    </div>
                                                    <svg className="w-5 h-5 text-dim group-hover:text-accent transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}
                            {selectedGoals.length > 0 && (
                                <>
                                    <h3 className="font-display text-sm font-bold text-heading tracking-wide uppercase mb-3 text-accent">Goal Deadlines</h3>
                                    <ul className="space-y-3 mb-6">
                                        {selectedGoals.map(g => (
                                            <li key={g.id} className="bg-surface/40 border border-subtle/80 rounded-lg p-4">
                                                <strong className="text-lg font-bold text-body capitalize">{g.exercise_name}</strong>
                                                <div className="text-sm text-body font-medium mt-1">{g.target_weight} kg × {g.target_reps} reps</div>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}
                            {selectedPlanned.length > 0 && (
                                <>
                                    <h3 className="font-display text-sm font-bold text-heading tracking-wide uppercase mb-3 text-accent">Scheduled Workouts</h3>
                                    <ul className="space-y-3">
                                        {selectedPlanned.map(p => (
                                            <li key={p.id} className="bg-surface/40 border border-subtle/80 rounded-lg p-4 flex items-center justify-between group">
                                                <div>
                                                    <strong className="text-lg font-bold text-body capitalize">{p.name}</strong>
                                                    {p.routine_name && <div className="text-sm text-dim font-medium mt-1">Routine: {p.routine_name}</div>}
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {p.routine_id && (
                                                        <button
                                                            onClick={() => navigate(`/active-workout?loadRoutine=${p.routine_id}&name=${encodeURIComponent(p.name)}`)}
                                                            className="p-1.5 bg-accent/10 hover:bg-accent text-accent hover:text-black rounded-lg border border-accent/30 transition-colors"
                                                            title="Start workout"
                                                        >
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                                <path d="M8 5v14l11-7z" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                    <DeleteButton onClick={() => handleDeletePlanned(p.id)} className="!p-1.5 !w-8 !h-8" />
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}
                        </>
                    )}


                    {selectedDate && (
                        <div className="flex items-center gap-2  border-t border-subtle mt-6 pt-4">
                            <Button
                                onClick={() => navigate(`/workouts?date=${selectedDate}`)}
                                variant="secondary"
                                className="!text-xs !py-2 !px-3"
                            >
                                + Log Workout
                            </Button>
                            <Button
                                onClick={() => navigate(`/goals?date=${selectedDate}`)}
                                variant="secondary"
                                className="!text-xs !py-2 !px-3"
                            >
                                + Add Goal
                            </Button>
                            <Button
                                onClick={openPlanModal}
                                variant="secondary"
                                className="!text-xs !py-2 !px-3"
                            >
                                + Schedule
                            </Button>
                        </div>
                    )}
                    <div className="mt-6 pt-4 border-t border-subtle text-xs text-dim flex gap-4">
                        <div><span className="inline-block w-2.5 h-2.5 rounded-full bg-accent mr-1.5 align-middle" />Logged workout</div>
                        <div><span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400 mr-1.5 align-middle" />Goal deadline</div>
                        <div><span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-400 mr-1.5 align-middle" />Scheduled workout</div>
                    </div>
                </div>
            </div>

            <Modal open={showPlanModal} onClose={() => setShowPlanModal(false)} maxWidth="sm" backdrop="darker">
                <div className="bg-card border border-subtle rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                    <h2 className="font-display text-lg font-bold text-body uppercase tracking-wide mb-2">Schedule Workout</h2>
                    <p className="text-sm text-muted mb-5">Assign a routine to {planDate}.</p>

                    <div className="space-y-4">
                        <DatePicker
                            value={planDate}
                            onChange={(d) => setPlanDate(d)}
                            placeholder="Select date"
                            buttonClassName="!px-3 !py-2 text-sm"
                        />

                        <Select
                            value={String(planRoutineId)}
                            onChange={(val) => {
                                setPlanRoutineId(val ? Number(val) : "");
                                const routine = routines.find(r => r.id === Number(val));
                                if (routine) setPlanName(routine.name);
                            }}
                            options={[
                                { value: "", label: "-- No routine --" },
                                ...routines.map(r => ({ value: String(r.id), label: r.name }))
                            ]}
                            placeholder="Select routine"
                            buttonClassName="px-3 py-2 text-sm"
                        />

                        <div>
                            <label className="block text-xs uppercase tracking-wider text-muted font-bold mb-1.5">Workout Name</label>
                            <input
                                type="text"
                                value={planName}
                                onChange={(e) => setPlanName(e.target.value)}
                                placeholder="e.g. Push Day"
                                className="w-full bg-surface border border-subtle rounded-lg px-3 py-2 text-sm text-body placeholder:text-dim focus:border-accent focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="mt-6">
                        <Button
                            onClick={handleAddPlanned}
                            disabled={!planDate || !planName.trim()}
                            variant="primary"
                            fullWidth
                        >
                            Schedule
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
