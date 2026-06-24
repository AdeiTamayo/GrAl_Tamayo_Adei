import { useState, useEffect, useMemo, FormEvent } from "react";
import { apiFetch } from "../utils/api";
import TransparentNumericInput from "../components/TransparentNumericInput";
import ExercisePicker, { Exercise as ExerciseMeta } from "../components/ExercisePicker";
import DeleteButton from "../components/DeleteButton";
import EditButton from "../components/EditButton";
import Calendar from "../components/Calendar";

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
    const [showDatePicker, setShowDatePicker] = useState(false);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>("");

    const token = localStorage.getItem("user_login_token");
    const headers = useMemo(() => ({
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
    }), [token]);

    useEffect(() => {
        fetchGoals().finally(() => setIsLoading(false));
    }, [headers]);

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
                                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
                                    <div className="w-full max-w-2xl max-h-[80vh] overflow-hidden bg-card border border-subtle rounded-3xl flex flex-col">
                                        <div className="p-4 border-b border-subtle flex justify-between items-center">
                                            <h2 className="text-xl font-bold uppercase italic text-lime-400">Select Exercise</h2>
                                            <button onClick={() => setShowPicker(false)} className="text-dim hover:text-white text-xl leading-none">&times;</button>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-4">
                                            <ExercisePicker
                                                onSelect={(ex) => {
                                                    setSelectedExerciseId(ex.id);
                                                    setSelectedExerciseName(ex.name);
                                                    setShowPicker(false);
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <TransparentNumericInput
                                placeholder="Target Weight (kg)"
                                value={targetWeight}
                                onChange={(val) => setTargetWeight(val === "" ? "" : Number(val))}
                                className="w-full"
                                inputClassName="w-full border border-subtle bg-surface rounded-lg px-4 py-3 text-body placeholder:text-dim focus:border-lime-400 focus:outline-none transition-colors"
                                step={0.1}
                                min={0}
                                max={999}
                            />
                            <TransparentNumericInput
                                placeholder="Target Reps"
                                value={targetReps}
                                onChange={(val) => setTargetReps(val === "" ? "" : Number(val))}
                                className="w-full"
                                inputClassName="w-full border border-subtle bg-surface rounded-lg px-4 py-3 text-body placeholder:text-dim focus:border-lime-400 focus:outline-none transition-colors"
                                step={1}
                                min={0}
                                max={999}
                            />
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setShowDatePicker(!showDatePicker)}
                                    className="w-full border border-subtle bg-surface rounded-lg px-4 py-3 text-left hover:border-hover transition-colors"
                                >
                                    {expectedDate ? (
                                        <span className="text-body">{new Date(expectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                    ) : (
                                        <span className="text-dim">Set due date (optional)</span>
                                    )}
                                </button>
                                {showDatePicker && (
                                    <div className="absolute left-0 mt-1 z-30 animate-in fade-in slide-in-from-top-1 duration-150 w-full">
                                        <div className="relative border border-lime-400/30 rounded-xl bg-card shadow-xl backdrop-blur-md">
                                            <button
                                                onClick={() => setShowDatePicker(false)}
                                                className="absolute -top-3 right-3 z-10 px-2.5 py-0.5 text-xs font-semibold text-lime-400 bg-card border border-lime-400/30 rounded-full shadow-sm transition-colors hover:bg-lime-400/10"
                                            >
                                                Close
                                            </button>
                                            <Calendar
                                                selectedDate={expectedDate}
                                                onSelect={(d) => {
                                                    setExpectedDate(d);
                                                    setShowDatePicker(false);
                                                }}
                                            />
                                            {expectedDate && (
                                                <button
                                                    type="button"
                                                    onClick={() => { setExpectedDate(""); setShowDatePicker(false); }}
                                                    className="w-full text-xs text-dim hover:text-body font-medium transition-colors pb-3"
                                                >
                                                    Clear date
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

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

                    <Calendar
                        selectedDate={selectedCalendarDate}
                        onSelect={(d) => setSelectedCalendarDate(prev => prev === d ? "" : d)}
                        goalDates={goalDates}
                    />
                </div>

                {/* List of goals */}
                <div className="flex-1 w-full bg-card border border-subtle rounded-xl p-6 shadow-xl">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="font-display text-lg font-bold text-heading tracking-wide uppercase">Current Goals</h2>
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
                    ) : (
                        <ul className="space-y-3">
                            {filteredGoals?.map(g => (
                                <li key={g.id} className={`bg-surface/40 border ${editingGoalId === g.id ? "border-lime-400/50" : "border-subtle/80"} rounded-lg p-5 flex flex-col sm:flex-row justify-between sm:items-center hover:border-hover transition-colors gap-4`}>
                                    <div>
                                        <strong className="text-xl font-bold text-lime-400 capitalize">{g.exercise_name}</strong>
                                        <div className="text-body font-medium text-lg mt-1">
                                            {g.target_weight} kg × {g.target_reps} reps
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
                    )}
                </div>
            </div>
        </div>
    );
}
