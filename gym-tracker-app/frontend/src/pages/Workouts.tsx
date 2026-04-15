import { useState, useEffect, FormEvent, useMemo, useRef } from "react";

interface Set {
    id: number;
    set_number: number;
    weight: number;
    repetitions: number;
}

interface WorkoutExercise {
    id: number;
    exercise_id: number;
    exercise_order: number;
    name: string;
    sets: Set[];
}

interface Workout {
    id: number;
    user_id: number;
    name: string;
    date: string;
    note: string | null;
    exercises?: WorkoutExercise[];
}

interface Exercise {
    id: number;
    name: string;
}

export default function Workouts() {
    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
    const [exercises, setExercises] = useState<Exercise[]>([]);

    // Status states
    const [error, setError] = useState<string | null>(null);
    const [isLoadingInit, setIsLoadingInit] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [isAddingSet, setIsAddingSet] = useState(false);

    // Form states for Workout
    const [newWorkoutName, setNewWorkoutName] = useState("");
    const [newWorkoutDate, setNewWorkoutDate] = useState("");
    const [newWorkoutNote, setNewWorkoutNote] = useState("");

    // Form states for new Set
    const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [newSetWeight, setNewSetWeight] = useState<number | "">("");
    const [newSetReps, setNewSetReps] = useState<number | "">("");

    // Dropdown handling
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const headers = useMemo(() => ({
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("user_login_token")}`
    }), []);

    // Initial Fetch
    useEffect(() => {
        Promise.all([fetchWorkouts(), fetchExercises()]).finally(() => setIsLoadingInit(false));
    }, [headers]);

    // Handle clicking outside the dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- Backend Calls ---
    async function fetchExercises() {
        try {
            const res = await fetch("/api/exercises", { headers });
            const data = await res.json();
            if (data.success) setExercises(data.data);
        } catch (err: any) {
            console.error("Failed to fetch exercises", err);
        }
    }

    async function fetchWorkouts() {
        try {
            const res = await fetch("/api/workouts", { headers });
            const data = await res.json();
            if (data.success) setWorkouts(data.data);
            else setError(data.error);
        } catch (err: any) {
            setError(err.message);
        }
    }

    async function fetchWorkoutById(id: number) {
        try {
            const res = await fetch(`/api/workouts/${id}`, { headers });
            const data = await res.json();
            if (data.success) setSelectedWorkout(data.data);
            else setError(data.error);
        } catch (err: any) {
            setError(err.message);
        }
    }

    async function createWorkout(e: FormEvent) {
        e.preventDefault();
        setIsCreating(true);
        setError(null);
        try {
            const res = await fetch("/api/workouts", {
                method: "POST",
                headers,
                body: JSON.stringify({
                    name: newWorkoutName,
                    date: newWorkoutDate || undefined,
                    note: newWorkoutNote || undefined
                })
            });
            const data = await res.json();
            if (data.success) {
                // Optimistic update
                setWorkouts(prev => [data.data, ...prev]);
                setSelectedWorkout(data.data);

                setNewWorkoutName("");
                setNewWorkoutDate("");
                setNewWorkoutNote("");
            } else {
                setError(data.error);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsCreating(false);
        }
    }

    async function deleteWorkout(id: number) {
        try {
            const res = await fetch(`/api/workouts/${id}`, { method: "DELETE", headers });
            const data = await res.json();
            if (data.success) {
                setWorkouts(prev => prev.filter(w => w.id !== id));
                if (selectedWorkout?.id === id) setSelectedWorkout(null);
            } else {
                setError(data.error);
            }
        } catch (err: any) {
            setError(err.message);
        }
    }

    async function handleAddSet(e: FormEvent) {
        e.preventDefault();
        if (!selectedWorkout) return;

        if (!selectedExercise) {
            setError("Please select an exercise from the list.");
            return;
        }

        if (newSetWeight === "" || newSetReps === "") return;

        setIsAddingSet(true);
        setError(null);
        try {
            const res = await fetch(`/api/workouts/${selectedWorkout.id}/sets`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    exercise_id: selectedExercise.id,
                    weight: newSetWeight,
                    reps: newSetReps
                })
            });
            const data = await res.json();
            if (data.success) {
                // Re-fetch details to get correct grouping and ordering from DB
                await fetchWorkoutById(selectedWorkout.id);
                setNewSetWeight("");
                setNewSetReps("");
            } else {
                setError(data.error);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsAddingSet(false);
        }
    }

    async function deleteSet(setId: number) {
        if (!selectedWorkout) return;

        // Optimistic update
        setSelectedWorkout(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                exercises: prev.exercises?.map(ex => ({
                    ...ex,
                    sets: ex.sets?.filter(s => s.id !== setId)
                })).filter(ex => ex.sets.length > 0) // Remove exercise group if empty
            };
        });

        try {
            const res = await fetch(`/api/workouts/sets/${setId}`, { method: "DELETE", headers });
            const data = await res.json();
            if (!data.success) {
                setError(data.error);
                fetchWorkoutById(selectedWorkout.id); // Revert on failure
            }
        } catch (err: any) {
            setError(err.message);
            fetchWorkoutById(selectedWorkout.id); // Revert on failure
        }
    }

    // Filter exercises for the dropdown
    const filteredExercises = exercises.filter(ex =>
        ex.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isLoadingInit) return <p>Loading data...</p>;

    // --- UI Render ---
    return (
        <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
            <h1>Workouts Management</h1>
            {error && <p style={{ color: "red", fontWeight: "bold" }}>Error: {error}</p>}

            <div style={{ display: "flex", gap: "40px", alignItems: "flex-start" }}>

                {/* ---------- LEFT COLUMN ---------- */}
                <div style={{ flex: 1, maxWidth: "450px" }}>

                    {/* Create Form */}
                    <div style={{ border: "1px solid #ccc", padding: "20px", borderRadius: "8px", marginBottom: "20px", backgroundColor: "#f9f9f9" }}>
                        <h3>Create New Workout</h3>
                        <form onSubmit={createWorkout} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            <input
                                type="text"
                                placeholder="Workout Name"
                                value={newWorkoutName}
                                onChange={e => setNewWorkoutName(e.target.value)}
                                required
                                style={{ padding: "8px" }}
                            />
                            <input
                                type="date"
                                value={newWorkoutDate}
                                onChange={e => setNewWorkoutDate(e.target.value)}
                                style={{ padding: "8px" }}
                            />
                            <input
                                type="text"
                                placeholder="Notes (optional)"
                                value={newWorkoutNote}
                                onChange={e => setNewWorkoutNote(e.target.value)}
                                style={{ padding: "8px" }}
                            />
                            <button type="submit" disabled={isCreating} style={{ padding: "10px", cursor: isCreating ? "not-allowed" : "pointer", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px" }}>
                                {isCreating ? "Creating..." : "Create Workout"}
                            </button>
                        </form>
                    </div>

                    {/* Workouts List */}
                    <div style={{ border: "1px solid #ccc", padding: "20px", borderRadius: "8px" }}>
                        <h2>All Workouts</h2>
                        <ul style={{ listStyleType: "none", padding: 0 }}>
                            {workouts.map(w => (
                                <li key={w.id} style={{ borderBottom: "1px solid #ddd", padding: "15px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div>
                                        <strong style={{ fontSize: "1.1em" }}>{w.name}</strong><br />
                                        <small style={{ color: "#666" }}>{w.date?.substring(0, 10)}</small>
                                    </div>
                                    <div style={{ display: "flex", gap: "10px" }}>
                                        <button onClick={() => fetchWorkoutById(w.id)} style={{ cursor: "pointer", padding: "5px 10px" }}>View</button>
                                        <button onClick={() => deleteWorkout(w.id)} style={{ cursor: "pointer", padding: "5px 10px", color: "red" }}>Delete</button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* ---------- RIGHT COLUMN (DETAILS) ---------- */}
                {selectedWorkout && (
                    <div style={{ flex: 1.5, border: "2px solid #007bff", padding: "25px", borderRadius: "8px", backgroundColor: "#fdfdff" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                                <h2 style={{ marginTop: 0 }}>Workout: {selectedWorkout.name}</h2>
                                <p style={{ margin: "5px 0" }}><strong>Date:</strong> {selectedWorkout.date?.substring(0, 10)}</p>
                                <p style={{ margin: "5px 0" }}><strong>Note:</strong> {selectedWorkout.note || "No notes"}</p>
                            </div>
                            <button onClick={() => setSelectedWorkout(null)} style={{ padding: "5px 10px", cursor: "pointer" }}>Close Panel</button>
                        </div>

                        <hr style={{ margin: "20px 0" }} />

                        <h3>Recorded Exercises & Sets</h3>
                        {!selectedWorkout.exercises || selectedWorkout.exercises.length === 0 ? (
                            <p style={{ color: "#777", fontStyle: "italic" }}>No exercises logged for this workout yet.</p>
                        ) : (
                            <ul style={{ listStyleType: "none", padding: 0 }}>
                                {selectedWorkout.exercises.map(ex => (
                                    <li key={ex.id} style={{ border: "1px solid #ccc", padding: "15px", marginBottom: "15px", borderRadius: "6px", backgroundColor: "#fff" }}>
                                        <h4 style={{ margin: "0 0 10px 0", color: "#333" }}>
                                            {ex.name} <small style={{ fontWeight: "normal", color: "#888" }}>Exercise: {ex.exercise_order}</small>
                                        </h4>
                                        <ul style={{ listStyleType: "circle", paddingLeft: "25px", margin: 0 }}>
                                            {ex.sets?.map(set => (
                                                <li key={set.id} style={{ margin: "8px 0", display: "flex", alignItems: "center" }}>
                                                    <span style={{ width: "150px" }}>Set {set.set_number}: <strong>{set.weight}kg</strong> × <strong>{set.repetitions} reps</strong></span>
                                                    <button onClick={() => deleteSet(set.id)} style={{ cursor: "pointer", color: "red", fontSize: "0.8em", padding: "2px 6px", marginLeft: "10px" }}>Delete Set</button>
                                                </li>
                                            ))}
                                        </ul>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <hr style={{ margin: "20px 0" }} />

                        <h3>Add New Set</h3>
                        <form onSubmit={handleAddSet} style={{ display: "flex", flexDirection: "column", gap: "10px", backgroundColor: "#eef5ff", padding: "15px", borderRadius: "8px" }}>
                            <div style={{ position: "relative" }} ref={dropdownRef}>
                                <input
                                    type="text"
                                    placeholder="Search and select exercise..."
                                    value={searchQuery}
                                    onChange={e => {
                                        setSearchQuery(e.target.value);
                                        setSelectedExercise(null); // Reset selection typing
                                        setShowDropdown(true);
                                    }}
                                    onFocus={() => setShowDropdown(true)}
                                    style={{ padding: "8px", width: "100%", boxSizing: "border-box", borderColor: !selectedExercise && searchQuery ? "red" : "#ccc" }}
                                />
                                {showDropdown && filteredExercises.length > 0 && (
                                    <ul style={{ position: "absolute", zIndex: 10, width: "100%", background: "#fff", border: "1px solid #ccc", listStyle: "none", padding: 0, margin: 0, maxHeight: "200px", overflowY: "auto", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
                                        {filteredExercises.map(ex => (
                                            <li
                                                key={ex.id}
                                                onClick={() => {
                                                    setSearchQuery(ex.name);
                                                    setSelectedExercise(ex);
                                                    setShowDropdown(false);
                                                }}
                                                style={{ padding: "10px", cursor: "pointer", borderBottom: "1px solid #eee" }}
                                            >
                                                {ex.name}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <div style={{ display: "flex", gap: "10px" }}>
                                <input
                                    type="number"
                                    step="1"
                                    placeholder="Weight (kg)"
                                    value={newSetWeight}
                                    onChange={e => setNewSetWeight(Number(e.target.value))}
                                    required
                                    style={{ padding: "8px", flex: 1 }}
                                />
                                <input
                                    type="number"
                                    placeholder="Reps"
                                    value={newSetReps}
                                    onChange={e => setNewSetReps(Number(e.target.value))}
                                    required
                                    style={{ padding: "8px", flex: 1 }}
                                />
                                <button type="submit" disabled={isAddingSet} style={{ padding: "8px", flex: 1, backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: isAddingSet ? "not-allowed" : "pointer", fontWeight: "bold" }}>
                                    {isAddingSet ? "Adding..." : "+ Add Set"}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}