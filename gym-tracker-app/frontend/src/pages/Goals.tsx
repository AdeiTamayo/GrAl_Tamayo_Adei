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

    if (isLoading) return <p style={{ padding: "20px" }}>Loading goals...</p>;

    return (
        <div style={{ padding: "20px", fontFamily: "Arial, sans-serif", maxWidth: "800px", margin: "0 auto" }}>
            <h1>My Goals</h1>
            {error && <p style={{ fontWeight: "bold", color: "red" }}>Error: {error}</p>}

            <div style={{ display: "flex", gap: "40px", alignItems: "flex-start" }}>

                {/* Form to add/edit goal */}
                <div style={{ flex: 1, border: "1px solid", padding: "20px" }}>
                    <h3 style={{ marginTop: 0 }}>{editingGoalId ? "Edit Goal" : "Add New Goal"}</h3>
                    <form onSubmit={handleAddGoal} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <input
                            type="text"
                            placeholder="Search exercise..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{ padding: "8px", border: "1px solid" }}
                            disabled={!!editingGoalId}
                        />
                        <select
                            value={selectedExerciseId}
                            onChange={e => setSelectedExerciseId(Number(e.target.value))}
                            required
                            style={{ padding: "8px", border: "1px solid" }}
                            disabled={!!editingGoalId}
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
                            style={{ padding: "8px", border: "1px solid" }}
                        />
                        <input
                            type="number"
                            placeholder="Target Reps"
                            value={targetReps}
                            onChange={e => setTargetReps(Number(e.target.value))}
                            required
                            style={{ padding: "8px", border: "1px solid" }}
                        />

                        <div style={{ display: "flex", gap: "10px" }}>
                            <button type="submit" style={{ flex: 1, padding: "10px", border: "1px solid", background: "none", cursor: "pointer", fontWeight: "bold" }}>
                                {editingGoalId ? "Update Goal" : "Create Goal"}
                            </button>
                            {editingGoalId && (
                                <button type="button" onClick={resetForm} style={{ flex: 1, padding: "10px", border: "1px solid", background: "none", cursor: "pointer" }}>
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* List of goals */}
                <div style={{ flex: 1.5, border: "1px solid", padding: "20px" }}>
                    <h2 style={{ marginTop: 0 }}>Current Goals</h2>
                    {!goals || goals.length === 0 ? (
                        <p style={{ fontStyle: "italic" }}>No goals set yet.</p>
                    ) : (
                        <ul style={{ listStyleType: "none", padding: 0, margin: 5 }}>
                            {goals?.map(g => (
                                <li key={g.id} style={{ borderBottom: "1px solid", padding: "10px 0", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: editingGoalId === g.id ? "#f9f9f9" : "transparent" }}>
                                    <div>
                                        <strong style={{ fontSize: "1.1em", textTransform: "capitalize" }}>{g.exercise_name}</strong>
                                        <div style={{ marginTop: "5px" }}>
                                            {g.target_weight}kg × {g.target_reps} reps
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", gap: "10px" }}>
                                        <button
                                            onClick={() => handleEditGoal(g)}
                                            style={{ padding: "5px 10px", border: "1px solid", background: "none", cursor: "pointer" }}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => deleteGoal(g.id)}
                                            style={{ padding: "5px 10px", border: "1px solid", background: "none", cursor: "pointer" }}
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