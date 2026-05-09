import { useState, useEffect, FormEvent, useMemo, useRef } from "react";
import { apiFetch } from "../utils/api";

interface Set {
    id: number;
    set_number: number;
    weight: number | null;
    repetitions: number | null;
    time: number | null;
}

interface WorkoutExercise {
    id: number;
    exercise_id: number;
    exercise_order: number;
    name: string;
    note?: string | null;
    sets: Set[];
    category?: string;
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
    equipment?: string;
    category?: string;
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
    const [newSetTime, setNewSetTime] = useState<number | "">("");
    const [newSetNote, setNewSetNote] = useState("");

    // Dropdown handling
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [openExerciseNoteId, setOpenExerciseNoteId] = useState<number | null>(null);

    const headers = useMemo(() => ({
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("user_login_token")}`
    }), []);


    const isCardio = selectedExercise
        ? selectedExercise.category === "cardio"
        : false;

    // Initial Fetch
    useEffect(() => {
        Promise.all([fetchWorkouts(), fetchExercises()]).finally(() => setIsLoadingInit(false));
    }, [headers]);

    // Handle clicking outside the dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            console.log("click");
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
            const res = await apiFetch("/api/exercises", { headers });
            const data = await res.json();
            if (data.success) setExercises(data.data);
        } catch (err: any) {
            console.error("Failed to fetch exercises", err);
        }
    }

    async function fetchWorkouts() {
        try {
            const res = await apiFetch("/api/workouts", { headers });
            const data = await res.json();
            if (data.success) setWorkouts(data.data);
            else setError(data.error);
        } catch (err: any) {
            setError(err.message);
        }
    }

    async function fetchWorkoutById(id: number) {
        try {
            const res = await apiFetch(`/api/workouts/${id}`, { headers });
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
            const res = await apiFetch("/api/workouts", {
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
            const res = await apiFetch(`/api/workouts/${id}`, { method: "DELETE", headers });
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

        if (isCardio) {
            if (newSetTime === "") return;
        } else {
            if (newSetWeight === "" || newSetReps === "") return;
        }

        setIsAddingSet(true);
        setError(null);
        try {
            const res = await apiFetch(`/api/workouts/${selectedWorkout.id}/sets`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    exercise_id: selectedExercise.id,
                    weight: isCardio ? null : newSetWeight,
                    reps: isCardio ? null : newSetReps,
                    time: isCardio ? newSetTime : null,
                    note: newSetNote || undefined
                })
            });
            const data = await res.json();
            if (data.success) {
                await fetchWorkoutById(selectedWorkout.id);
                setNewSetWeight("");
                setNewSetReps("");
                setNewSetTime("");
                setNewSetNote("");
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
            const res = await apiFetch(`/api/workouts/sets/${setId}`, { method: "DELETE", headers });
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

    function formatWeight(weight: number | null | string): string {
        if (!weight && weight !== 0) return "—";
        const num = Number(weight);
        if (isNaN(num)) return "—";
        return Number.isInteger(num) ? String(num) : num.toFixed(2);
    }


    // Filter exercises for the dropdown
    const filteredExercises = exercises.filter(ex =>
        ex.name.toLowerCase().includes(searchQuery.toLowerCase())
    );


    useEffect(() => {
        console.log("selectedWorkout:", selectedWorkout);
        console.log("exercises:", selectedWorkout?.exercises);
    }, [selectedWorkout]);

    if (isLoadingInit) return <p>Loading data...</p>;

    // --- UI Render ---
    return (
        <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
            <h1>Workouts Management</h1>
            {error && <p style={{ fontWeight: "bold" }}>Error: {error}</p>}

            <div style={{ display: "flex", gap: "40px", alignItems: "flex-start" }}>

                {/* ---------- LEFT COLUMN ---------- */}
                <div style={{ flex: 1, maxWidth: "450px" }}>

                    {/* Create Form */}
                    <div style={{ border: "1px solid", padding: "20px", marginBottom: "20px" }}>
                        <h3 style={{ marginTop: 0 }}>Create New Workout</h3>
                        <form onSubmit={createWorkout} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            <input
                                type="text"
                                placeholder="Workout Name"
                                value={newWorkoutName}
                                onChange={e => setNewWorkoutName(e.target.value)}
                                required
                                style={{ padding: "8px", border: "1px solid" }}
                            />
                            <input
                                type="date"
                                value={newWorkoutDate}
                                onChange={e => setNewWorkoutDate(e.target.value)}
                                style={{ padding: "8px", border: "1px solid" }}
                            />
                            <input
                                type="text"
                                placeholder="Notes (optional)"
                                value={newWorkoutNote}
                                onChange={e => setNewWorkoutNote(e.target.value)}
                                style={{ padding: "8px", border: "1px solid" }}
                            />
                            <button type="submit" disabled={isCreating} style={{ padding: "10px", border: "1px solid", background: "none", cursor: isCreating ? "not-allowed" : "pointer", fontWeight: "bold" }}>
                                {isCreating ? "Creating..." : "Create Workout"}
                            </button>
                        </form>
                    </div>

                    {/* Workouts List */}
                    <div style={{ border: "1px solid", padding: "20px" }}>
                        <h2 style={{ marginTop: 0 }}>All Workouts</h2>
                        <ul style={{ listStyleType: "none", padding: 0 }}>
                            {workouts.map(w => (
                                <li key={w.id} style={{ borderBottom: "1px solid", padding: "15px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div>
                                        <strong style={{ fontSize: "1.1em" }}>{w.name}</strong><br />
                                        <small>{w.date?.substring(0, 10)}</small>
                                    </div>
                                    <div style={{ display: "flex", gap: "10px" }}>
                                        <button onClick={() => fetchWorkoutById(w.id)} style={{ cursor: "pointer", padding: "5px 10px", border: "1px solid", background: "none" }}>View</button>
                                        <button onClick={() => deleteWorkout(w.id)} style={{ cursor: "pointer", padding: "5px 10px", border: "1px solid", background: "none" }}>Delete</button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* ---------- RIGHT COLUMN (DETAILS) ---------- */}
                {selectedWorkout && (
                    <div style={{ flex: 1.5, border: "1px solid", padding: "25px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                                <h2 style={{ marginTop: 0 }}>Workout: {selectedWorkout.name}</h2>
                                <p style={{ margin: "5px 0" }}><strong>Date:</strong> {selectedWorkout.date?.substring(0, 10)}</p>
                                <p style={{ margin: "5px 0" }}><strong>Note:</strong> {selectedWorkout.note || "No notes"}</p>
                            </div>
                            <button onClick={() => setSelectedWorkout(null)} style={{ padding: "5px 10px", cursor: "pointer", border: "1px solid", background: "none" }}>Close Panel</button>
                        </div>

                        <hr style={{ margin: "20px 0", border: "none", borderTop: "1px solid" }} />

                        <h3>Recorded Exercises & Sets</h3>
                        {!selectedWorkout.exercises || selectedWorkout.exercises.length === 0 ? (
                            <p style={{ fontStyle: "italic" }}>No exercises logged for this workout yet.</p>
                        ) : (
                            <ul style={{ listStyleType: "none", padding: 0 }}>
                                {selectedWorkout.exercises.map(ex => (
                                    <li key={ex.id} style={{ border: "1px solid", padding: "15px", marginBottom: "15px" }}>
                                        <h4 style={{ margin: "0 0 10px 0" }}>
                                            {ex.name || `Unknown Exercise ${ex.exercise_id}`}{" "}
                                            <small style={{ fontWeight: "normal" }}>(Exercise: {ex.exercise_order})</small>
                                        </h4>

                                        {ex.note && (
                                            <div style={{ marginBottom: "10px" }}>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setOpenExerciseNoteId(openExerciseNoteId === ex.id ? null : ex.id)
                                                    }
                                                    style={{ cursor: "pointer", border: "1px solid", background: "none", padding: "4px 8px" }}
                                                >
                                                    {openExerciseNoteId === ex.id ? "Hide Note" : "Show Note"}
                                                </button>

                                                {openExerciseNoteId === ex.id && (
                                                    <div style={{ marginTop: "8px", padding: "8px", border: "1px solid" }}>
                                                        {ex.note}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <ul style={{ listStyleType: "circle", paddingLeft: "25px", margin: 0 }}>
                                            {ex.sets?.map(set => (
                                                <li key={set.id} style={{ margin: "8px 0", display: "flex", alignItems: "center" }}>
                                                    <span style={{ width: "200px" }}>
                                                        Set {set.set_number}:
                                                        {set.time != null ? (
                                                            <strong> {set.time} mins</strong>
                                                        ) : (
                                                            <strong> {formatWeight(set.weight)}kg × {set.repetitions} reps</strong>
                                                        )}
                                                    </span>
                                                    <button
                                                        onClick={() => deleteSet(set.id)}
                                                        style={{ cursor: "pointer", fontSize: "0.8em", padding: "2px 6px", marginLeft: "10px", border: "1px solid", background: "none" }}
                                                    >
                                                        Delete Set
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <hr style={{ margin: "20px 0", border: "none", borderTop: "1px solid" }} />

                        <h3>Add New Set</h3>
                        <form onSubmit={handleAddSet} style={{ display: "flex", flexDirection: "column", gap: "10px", border: "1px solid", padding: "15px" }}>
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
                                    style={{ padding: "8px", width: "100%", boxSizing: "border-box", border: "1px solid" }}
                                />
                                {showDropdown && filteredExercises.length > 0 && (
                                    <ul style={{ position: "absolute", zIndex: 10, width: "100%", background: "white", border: "1px solid", listStyle: "none", padding: 0, margin: 0, maxHeight: "200px", overflowY: "auto" }}>
                                        {filteredExercises.map(ex => (
                                            <li
                                                key={ex.id}
                                                onClick={() => {
                                                    setSearchQuery(ex.name);
                                                    setSelectedExercise(ex);
                                                    setShowDropdown(false);
                                                }}
                                                style={{ padding: "10px", cursor: "pointer", borderBottom: "1px solid" }}
                                            >
                                                {ex.name}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <div style={{ display: "flex", gap: "10px" }}>
                                {isCardio ? (
                                    <input
                                        type="number"
                                        placeholder="Time (mins)"
                                        value={newSetTime === 0 ? "" : newSetTime}
                                        onChange={e => setNewSetTime(e.target.value === "" ? "" : Number(e.target.value))}
                                        required
                                        style={{ padding: "8px", flex: 2, border: "1px solid" }}
                                    />
                                ) : (
                                    <>
                                        <input
                                            type="number"
                                            step="0.1"
                                            placeholder="Weight (kg)"
                                            value={newSetWeight === 0 ? "" : newSetWeight}
                                            onChange={e => setNewSetWeight(e.target.value === "" ? "" : Number(e.target.value))}
                                            required
                                            style={{ padding: "8px", flex: 1, border: "1px solid" }}
                                        />
                                        <input
                                            type="number"
                                            placeholder="Reps"
                                            value={newSetReps === 0 ? "" : newSetReps}
                                            onChange={e => setNewSetReps(e.target.value === "" ? "" : Number(e.target.value))}
                                            required
                                            style={{ padding: "8px", flex: 1, border: "1px solid" }}
                                        />
                                    </>
                                )}
                            </div>
                            <input
                                type="text"
                                placeholder="Note (optional)"
                                value={newSetNote}
                                onChange={e => setNewSetNote(e.target.value)}
                                style={{ padding: "8px", width: "100%", boxSizing: "border-box", border: "1px solid" }}
                            />
                            <button type="submit" disabled={isAddingSet} style={{ padding: "8px", border: "1px solid", background: "none", cursor: isAddingSet ? "not-allowed" : "pointer", fontWeight: "bold" }}>
                                {isAddingSet ? "Adding..." : "+ Add Set"}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}