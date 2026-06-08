import { useState, useEffect, useMemo, FormEvent } from "react";
import { apiFetch } from "../utils/api";

interface Goal {
    id: number;
    exercise_id: number;
    exercise_name: string;
    target_weight: string;
    target_reps: number;
    created_at: string;
}

interface Exercise {
    id: number;
    name: string;
}

export default function Goals() {
    const [goals, setGoals] = useState<Goal[]>([]);
    const [allExercises, setAllExercises] = useState<Exercise[]>([]);
    const [exercises, setExercises] = useState<Exercise[]>([]);

    // Form state
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedExerciseId, setSelectedExerciseId] = useState<number | "">("");
    const [targetWeight, setTargetWeight] = useState<number | "">("");
    const [targetReps, setTargetReps] = useState<number | "">("");
    const [editingGoalId, setEditingGoalId] = useState<number | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const token = localStorage.getItem("user_login_token");
    const headers = useMemo(() => ({
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
    }), [token]);

    useEffect(() => {
        Promise.all([fetchGoals(), fetchExercises()]).finally(() => setIsLoading(false));
    }, [headers]);

    // Handle search filtering
    useEffect(() => {
        if (!searchQuery) {
            setExercises(allExercises);
        } else {
            const query = searchQuery.toLowerCase();
            setExercises(allExercises.filter(ex => ex.name.toLowerCase().includes(query)));
        }
    }, [searchQuery, allExercises]);

    async function fetchExercises() {
        try {
            const res = await apiFetch("/api/exercises", { headers });
            const data = await res.json();
            const fetchedExercises = data.exercises || data.data || data || [];
            setAllExercises(fetchedExercises);
            setExercises(fetchedExercises);
        } catch (err: any) {
            console.error("Failed to fetch exercises", err);
        }
    }

    async function fetchGoals() {
        try {
            const res = await apiFetch("/api/goals", { headers });
            const data = await res.json();
            setGoals(data.goals || []);
        } catch (err: any) {
            console.error("Failed to fetch goals", err);
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
                    target_reps: targetReps
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
        setTargetWeight(Number(goal.target_weight));
        setTargetReps(goal.target_reps);
        setSearchQuery("");
        setError(null);
    }

    function resetForm() {
        setEditingGoalId(null);
        setSelectedExerciseId("");
        setTargetWeight("");
        setTargetReps("");
        setSearchQuery("");
        setError(null);
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

    if (isLoading) return <div className="p-8 text-zinc-400 font-medium animate-pulse">Loading goals...</div>;

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 mt-4 md:mt-8 space-y-8">
            <div>
                <h1 className="text-3xl font-display text-zinc-100 uppercase tracking-tight mb-2">My Goals</h1>
                <p className="text-zinc-400 font-medium">Set, track, and crush your lifting milestones.</p>
            </div>
            {error && <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg font-medium text-sm">Error: {error}</div>}

            <div className="flex gap-6 flex-col md:flex-row items-start">

                {/* Form to add/edit goal */}
                <div className="flex-none w-full md:w-[380px] bg-zinc-950/80 border border-zinc-800 rounded-xl p-6 shadow-xl">
                    <h3 className="font-display text-lg font-bold text-zinc-200 tracking-wide uppercase mb-5">
                        {editingGoalId ? "Edit Goal" : "Add New Goal"}
                    </h3>
                    <form onSubmit={handleAddGoal} className="flex flex-col gap-4">
                        <input
                            type="text"
                            placeholder="Search exercise..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            disabled={!!editingGoalId}
                            className="w-full border border-zinc-800 bg-zinc-900 rounded-lg px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:border-lime-400 focus:outline-none transition-colors disabled:opacity-50"
                        />
                        <select
                            value={selectedExerciseId}
                            onChange={e => setSelectedExerciseId(Number(e.target.value))}
                            required
                            disabled={!!editingGoalId}
                            className="w-full border border-zinc-800 bg-zinc-900 rounded-lg px-4 py-3 text-zinc-100 focus:border-lime-400 focus:outline-none transition-colors disabled:opacity-50 appearance-none"
                        >
                            <option value="" disabled>Select Exercise</option>
                            {exercises?.map(ex => (
                                <option key={ex.id} value={ex.id}>{ex.name}</option>
                            ))}
                        </select>
                        <input
                            type="number"
                            step="0.1"
                            placeholder="Target Weight (kg)"
                            value={targetWeight}
                            onChange={e => setTargetWeight(Number(e.target.value))}
                            required
                            className="w-full border border-zinc-800 bg-zinc-900 rounded-lg px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:border-lime-400 focus:outline-none transition-colors"
                        />
                        <input
                            type="number"
                            placeholder="Target Reps"
                            value={targetReps}
                            onChange={e => setTargetReps(Number(e.target.value))}
                            required
                            className="w-full border border-zinc-800 bg-zinc-900 rounded-lg px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:border-lime-400 focus:outline-none transition-colors"
                        />

                        <div className="flex gap-3 mt-2">
                            <button type="submit" className="flex-1 bg-lime-400 text-black font-bold py-3 rounded-lg hover:bg-lime-300 transition-all hover:scale-[1.02] active:scale-[0.98]">
                                {editingGoalId ? "Update Goal" : "Create Goal"}
                            </button>
                            {editingGoalId && (
                                <button type="button" onClick={resetForm} className="flex-1 bg-transparent border border-zinc-700 text-zinc-300 font-bold py-3 rounded-lg hover:bg-zinc-800 transition-all hover:scale-[1.02] active:scale-[0.98]">
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* List of goals */}
                <div className="flex-1 w-full bg-zinc-950/80 border border-zinc-800 rounded-xl p-6 shadow-xl">
                    <h2 className="font-display text-lg font-bold text-zinc-200 tracking-wide uppercase mb-5">Current Goals</h2>
                    {!goals || goals.length === 0 ? (
                        <div className="text-center py-10 bg-zinc-900/50 rounded-lg border border-zinc-800/80">
                            <p className="text-zinc-500 font-medium italic">No goals set yet. Time to aim high.</p>
                        </div>
                    ) : (
                        <ul className="space-y-3">
                            {goals?.map(g => (
                                <li key={g.id} className={`bg-zinc-900/40 border ${editingGoalId === g.id ? "border-lime-400/50" : "border-zinc-800/80"} rounded-lg p-5 flex flex-col sm:flex-row justify-between sm:items-center hover:border-zinc-700 transition-colors gap-4`}>
                                    <div>
                                        <strong className="text-xl font-bold text-lime-400 capitalize">{g.exercise_name}</strong>
                                        <div className="text-zinc-100 font-medium text-lg mt-1">
                                            {g.target_weight} kg × {g.target_reps} reps
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleEditGoal(g)}
                                            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md font-medium text-sm transition-colors"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => deleteGoal(g.id)}
                                            className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-md font-medium text-sm border border-rose-500/20 transition-colors"
                                        >
                                            Delete
                                        </button>
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