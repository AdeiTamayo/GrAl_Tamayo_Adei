import { useState, useEffect, useMemo, FormEvent, useCallback } from "react";
import { apiFetch } from "../utils/api";
import TransparentNumericInput from "../components/TransparentNumericInput";
import ExercisePicker, { Exercise as ExerciseMeta } from "../components/ExercisePicker";
import DeleteButton from "../components/DeleteButton";
import EditButton from "../components/EditButton";
import Calendar from "../components/Calendar";
import DatePicker from "../components/DatePicker";

interface Goal {
    id: number;
    exercise_id: number;
    exercise_name: string;
    target_weight: string;
    target_reps: number;
    expected_date: string | null;
    created_at: string;
}

export default function Goals() {
    const [goals, setGoals] = useState<Goal[]>([]);

    // Form state
    const [selectedExerciseId, setSelectedExerciseId] = useState<number | "">("");
    const [selectedExerciseName, setSelectedExerciseName] = useState("");
    const [targetWeight, setTargetWeight] = useState<number | "">("");
    const [targetReps, setTargetReps] = useState<number | "">("");
    const [expectedDate, setExpectedDate] = useState("");
    const [editingGoalId, setEditingGoalId] = useState<number | null>(null);
    const [showPicker, setShowPicker] = useState(false);


    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>("");
    const [prData, setPrData] = useState<Record<number, { weight: number; reps: number }>>({});
    const [goalsPage, setGoalsPage] = useState(1);
    const [goalsOpen, setGoalsOpen] = useState(true);
    const GOALS_PER_PAGE = 5;

    const token = localStorage.getItem("user_login_token");
    const headers = useMemo(() => ({
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
    }), [token]);

    const fetchPRs = useCallback(async () => {
        try {
            const res = await apiFetch("/api/prs", { headers });
            const data = await res.json();
            if (data.success) {
                const map: Record<number, { weight: number; reps: number }> = {};
                for (const pr of data.data || []) {
                    map[pr.exercise_id] = { weight: Number(pr.weight), reps: pr.repetitions };
                }
                setPrData(map);
            }
        } catch (err) {
            console.error("Failed to fetch PRs", err);
        }
    }, [headers]);

    useEffect(() => {
        Promise.all([fetchGoals(), fetchPRs()]).finally(() => setIsLoading(false));
    }, [headers, fetchPRs]);

    function isGoalFulfilled(g: Goal): boolean {
        const pr = prData[g.exercise_id];
        if (!pr) return false;
        return pr.weight >= Number(g.target_weight) && pr.reps >= g.target_reps;
    }

    async function fetchGoals() {
        try {
            const res = await apiFetch("/api/goals", { headers });
            const data = await res.json();
            setGoals(data.goals || []);
        } catch (err: any) {
            console.error("Failed to fetch goals", err);
            setError("Failed to fetch goals");
        }
    }

    async function handleAddGoal(e: FormEvent) {
        e.preventDefault();
        if (selectedExerciseId === "" || targetWeight === "" || targetReps === "") return;

        setError(null);
        try {
            const url = editingGoalId ? `/api/goals/${editingGoalId}` : "/api/goals";
            const method = editingGoalId ? "PUT" : "POST";

            const res = await apiFetch(url, {
                method,
                headers,
                body: JSON.stringify({
                    exercise_id: selectedExerciseId,
                    target_weight: targetWeight,
                    target_reps: targetReps,
                    expected_date: expectedDate || null
                })
            });
            const data = await res.json();

            if (data.success) {
                await fetchGoals();
                resetForm();
            } else {
                console.log(data.error);
                setError(data.error);
            }
        } catch (err: any) {
            setError(err.message || "Failed to save goal");
        }
    }

    function handleEditGoal(goal: Goal) {
        setEditingGoalId(goal.id);
        setSelectedExerciseId(goal.exercise_id);
        setSelectedExerciseName(goal.exercise_name);
        setTargetWeight(Number(goal.target_weight));
        setTargetReps(goal.target_reps);
        setExpectedDate(goal.expected_date || "");
        setError(null);
    }

    function resetForm() {
        setEditingGoalId(null);
        setSelectedExerciseId("");
        setSelectedExerciseName("");
        setTargetWeight("");
        setTargetReps("");
        setExpectedDate("");
    }

    async function deleteGoal(id: number) {
        try {
            const res = await apiFetch(`/api/goals/${id}`, { method: "DELETE", headers });
            const data = await res.json();
            if (data.success) {
                setGoals(prev => prev.filter(g => g.id !== id));
            }
        } catch (err: any) {
            setError(err.message || "Failed to delete goal");
        }
    }

    const goalDates = useMemo(() => {
        const set = new Set<string>();
        for (const g of goals) {
            if (g.expected_date) {
                set.add(g.expected_date.substring(0, 10));
            }
        }
        return set;
    }, [goals]);

    const filteredGoals = useMemo(() => {
        if (!selectedCalendarDate) return goals;
        return goals.filter(g => g.expected_date?.substring(0, 10) === selectedCalendarDate);
    }, [goals, selectedCalendarDate]);

    const paginatedGoals = useMemo(() => {
        const start = (goalsPage - 1) * GOALS_PER_PAGE;
        return filteredGoals.slice(start, start + GOALS_PER_PAGE);
    }, [filteredGoals, goalsPage, GOALS_PER_PAGE]);

    useEffect(() => {
        setGoalsPage(1);
    }, [filteredGoals.length]);

    if (isLoading) return <div className="p-8 text-muted font-medium animate-pulse">Loading goals...</div>;

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 mt-4 md:mt-8 space-y-8">
            <div>
                <h1 className="font-display text-4xl font-bold tracking-tight uppercase italic text-lime-400">Goals</h1>
            </div>
            {error && <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg font-medium text-sm">Error: {error}</div>}

            <div className="flex gap-6 flex-col md:flex-row items-start">

                {/* Form to add/edit goal */}
                <div className="flex-none w-full md:w-[380px] space-y-6">
                    <div className="bg-card border border-subtle rounded-xl p-6 shadow-xl">
                        <h3 className="font-display text-lg font-bold text-heading tracking-wide uppercase mb-5">
                            {editingGoalId ? "Edit Goal" : "Add New Goal"}
                        </h3>
                        <form onSubmit={handleAddGoal} className="flex flex-col gap-4">
                            <button
                                type="button"
                                onClick={() => setShowPicker(true)}
                                disabled={!!editingGoalId}
                                className="w-full border border-subtle bg-surface rounded-lg px-4 py-3 text-left text-body hover:border-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {selectedExerciseName || <span className="text-dim">Select Exercise</span>}
                            </button>
                            {showPicker && (
                                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                                    <div className="relative w-full max-w-xl">
                                        <button
                                            onClick={() => setShowPicker(false)}
                                            className="absolute -top-3 right-0 z-10 px-2.5 py-0.5 text-xs font-semibold text-lime-400 bg-card border border-lime-400/30 rounded-full shadow-sm"
                                        >
                                            Close
                                        </button>
                                        <ExercisePicker
                                            title="Select Exercise"
                                            onSelect={(ex) => {
                                                setSelectedExerciseId(ex.id);
                                                setSelectedExerciseName(ex.name);
                                                setShowPicker(false);
                                            }}
                                            onClose={() => setShowPicker(false)}
                                        />
                                    </div>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <TransparentNumericInput
                                    placeholder="Weight (kg)"
                                    value={targetWeight}
                                    onChange={(val) => setTargetWeight(val === "" ? "" : Number(val))}
                                    className="w-full"
                                    inputClassName="w-full border border-subtle bg-surface rounded-lg px-4 py-3 text-body placeholder:text-dim focus:border-lime-400 focus:outline-none transition-colors"
                                    step={0.1}
                                    min={0}
                                    max={999}
                                />
                                <TransparentNumericInput
                                    placeholder="Reps"
                                    value={targetReps}
                                    onChange={(val) => setTargetReps(val === "" ? "" : Number(val))}
                                    className="w-full"
                                    inputClassName="w-full border border-subtle bg-surface rounded-lg px-4 py-3 text-body placeholder:text-dim focus:border-lime-400 focus:outline-none transition-colors"
                                    step={1}
                                    min={0}
                                    max={999}
                                />
                            </div>
                            <DatePicker value={expectedDate} onChange={setExpectedDate} placeholder="Set due date (optional)" />

                            <div className="flex gap-3 mt-2">
                                <button type="submit" className="flex-1 bg-lime-400 text-black font-bold py-3 rounded-lg hover:bg-lime-300 transition-all hover:scale-[1.02] active:scale-[0.98]">
                                    {editingGoalId ? "Update Goal" : "Create Goal"}
                                </button>
                                {editingGoalId && (
                                    <button type="button" onClick={resetForm} className="flex-1 bg-transparent border border-subtle text-muted font-bold py-3 rounded-lg hover:bg-elevated transition-all hover:scale-[1.02] active:scale-[0.98]">
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    <div>
                        <h3 className="font-display text-sm font-bold text-heading tracking-wide uppercase mb-3">Goals Calendar</h3>
                        <Calendar
                            selectedDate={selectedCalendarDate}
                            onSelect={(d) => setSelectedCalendarDate(prev => prev === d ? "" : d)}
                            goalDates={goalDates}
                        />
                    </div>
                </div>

                {/* List of goals */}
                <div className="flex-1 w-full bg-card border border-subtle rounded-xl p-6 shadow-xl">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <h2 className="font-display text-lg font-bold text-heading tracking-wide uppercase">Current Goals</h2>
                            <button
                                onClick={() => setGoalsOpen(!goalsOpen)}
                                className="text-xs font-semibold text-dim hover:text-body transition-colors"
                            >
                                {goalsOpen ? 'Hide' : `Show (${filteredGoals.length})`}
                            </button>
                        </div>
                        {selectedCalendarDate && (
                            <button
                                onClick={() => setSelectedCalendarDate("")}
                                className="text-xs font-medium text-dim hover:text-body transition-colors flex items-center gap-1"
                            >
                                Clear filter
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                    {selectedCalendarDate && (
                        <div className="text-xs text-dim font-medium mb-4">Showing goals due on <span className="text-body">{new Date(selectedCalendarDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></div>
                    )}
                    {!goals || goals.length === 0 ? (
                        <div className="text-center py-10 bg-surface/50 rounded-lg border border-subtle/80">
                            <p className="text-dim font-medium italic">No goals set yet. Time to aim high.</p>
                        </div>
                    ) : filteredGoals.length === 0 ? (
                        <div className="text-center py-10 bg-surface/50 rounded-lg border border-subtle/80">
                            <p className="text-dim font-medium italic">No goals due on this day.</p>
                        </div>
                    ) : goalsOpen && (
                        <>
                            <ul className="space-y-3">
                                {paginatedGoals?.map(g => (
                                    <li key={g.id} className={`bg-surface/40 border ${editingGoalId === g.id ? "border-lime-400/50" : "border-subtle/80"} rounded-lg p-5 flex flex-col sm:flex-row justify-between sm:items-center hover:border-hover transition-colors gap-4`}>
                                        <div>
                                            <strong className="text-xl font-bold text-lime-400 capitalize">{g.exercise_name}</strong>
                                            <div className="text-body font-medium text-lg mt-1 flex items-center gap-2">
                                                {g.target_weight} kg × {g.target_reps} reps
                                                {(() => {
                                                    const fulfilled = isGoalFulfilled(g);
                                                    const pr = prData[g.exercise_id];
                                                    return fulfilled ? (
                                                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-lime-400 bg-lime-400/10 border border-lime-400/20 rounded-full px-2.5 py-0.5">
                                                            ✓
                                                        </span>
                                                    ) : pr ? (
                                                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-2.5 py-0.5">
                                                            {Math.max(0, Number(g.target_weight) - pr.weight).toFixed(1)} kg to go
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-dim bg-elevated border border-subtle rounded-full px-2.5 py-0.5">
                                                            No PR registered yet
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                            {g.expected_date && (
                                                <div className="text-xs text-dim font-medium mt-1">Due by: {new Date(g.expected_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <EditButton onClick={() => handleEditGoal(g)} />
                                            <DeleteButton onClick={() => deleteGoal(g.id)} />
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            {filteredGoals.length > GOALS_PER_PAGE && (
                                <div className="flex items-center justify-center gap-3 mt-4 pt-4 border-t border-subtle/60">
                                    <button
                                        onClick={() => setGoalsPage(p => Math.max(1, p - 1))}
                                        disabled={goalsPage === 1}
                                        className="text-xs font-semibold text-dim hover:text-body disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-2 py-1"
                                    >
                                        &larr; Prev
                                    </button>
                                    <span className="text-xs text-muted font-medium">
                                        Page {goalsPage} of {Math.max(1, Math.ceil(filteredGoals.length / GOALS_PER_PAGE))}
                                    </span>
                                    <button
                                        onClick={() => setGoalsPage(p => Math.min(Math.max(1, Math.ceil(filteredGoals.length / GOALS_PER_PAGE)), p + 1))}
                                        disabled={goalsPage === Math.max(1, Math.ceil(filteredGoals.length / GOALS_PER_PAGE))}
                                        className="text-xs font-semibold text-dim hover:text-body disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-2 py-1"
                                    >
                                        Next &rarr;
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
