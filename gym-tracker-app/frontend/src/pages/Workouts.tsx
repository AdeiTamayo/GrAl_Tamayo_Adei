import { useState, useEffect, useCallback, useMemo, useRef, FormEvent } from "react";
import { apiFetch } from "../utils/api";

interface SetEntry {
    id: number;
    set_number: number;
    weight: number | null;
    repetitions: number | null;
    time: number | null;
    note?: string | null;
}

interface WorkoutExercise {
    id: number;
    exercise_id: number;
    exercise_order: number;
    name: string;
    note?: string | null;
    sets: SetEntry[];
}

interface Workout {
    id: number;
    name: string;
    date: string;
    note?: string | null;
    exercises?: WorkoutExercise[];
}

interface Exercise {
    id: number;
    name: string;
    category?: string;
}

export default function Workouts() {
    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);

    const [isLoadingInit, setIsLoadingInit] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Create new workout form
    const [newWorkoutName, setNewWorkoutName] = useState("");
    const [newWorkoutDate, setNewWorkoutDate] = useState(new Date().toISOString().slice(0, 10));
    const [newWorkoutNote, setNewWorkoutNote] = useState("");

    // Add exercise search
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Inline Add/Edit Set State
    const [editingSetId, setEditingSetId] = useState<number | null>(null);
    const [addingSetToBlockId, setAddingSetToBlockId] = useState<number | null>(null);
    const [openExerciseNoteId, setOpenExerciseNoteId] = useState<number | null>(null);
    const [expandedNoteSetId, setExpandedNoteSetId] = useState<number | null>(null);

    // Form for set (shared by Add & Edit)
    const [setWeight, setSetWeight] = useState<number | "">("");
    const [setReps, setSetReps] = useState<number | "">("");
    const [setTime, setSetTime] = useState<number | "">("");
    const [setNoteText, setSetNoteText] = useState("");

    const token = localStorage.getItem("user_login_token");
    const headers = useMemo(() => ({
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
    }), [token]);

    const fetchWorkouts = useCallback(async () => {
        try {
            const res = await apiFetch("/api/workouts", { headers });
            const data = await res.json();
            if (data.success) setWorkouts(data.data);
        } catch (err: any) {
            console.error("Failed to fetch workouts", err);
        }
    }, [headers]);

    const fetchExercises = useCallback(async () => {
        try {
            const res = await apiFetch("/api/exercises", { headers });
            const data = await res.json();
            if (data.success) setExercises(data.data || data.exercises || []);
        } catch (err: any) {
            console.error("Failed to fetch exercises", err);
        }
    }, [headers]);

    useEffect(() => {
        Promise.all([fetchWorkouts(), fetchExercises()]).finally(() => setIsLoadingInit(false));
    }, [fetchWorkouts, fetchExercises]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    async function fetchWorkoutById(id: number) {
        try {
            setError(null);
            const res = await apiFetch(`/api/workouts/${id}`, { headers });
            const data = await res.json();
            if (data.success) {
                setSelectedWorkout(data.data);
                setSearchQuery("");
                setSelectedExercise(null);
                setAddingSetToBlockId(null);
                setEditingSetId(null);
            } else {
                setError(data.error);
            }
        } catch (err: any) {
            setError("Failed to load workout details");
        }
    }

    async function createWorkout(e: FormEvent) {
        e.preventDefault();

        const tempId = -Date.now();
        const tempWorkout: Workout = {
            id: tempId,
            name: newWorkoutName,
            date: newWorkoutDate,
            note: newWorkoutNote,
            exercises: []
        };

        setWorkouts(prev => [tempWorkout, ...prev]);
        setNewWorkoutName("");
        setNewWorkoutNote("");

        try {
            const res = await apiFetch("/api/workouts", {
                method: "POST",
                headers,
                body: JSON.stringify({ name: tempWorkout.name, date: tempWorkout.date, note: tempWorkout.note })
            });
            const data = await res.json();

            if (res.ok && data.success && data.data) {
                setWorkouts(prev => prev.map(w => w.id === tempId ? { ...w, id: data.data.id } : w));
            } else {
                await fetchWorkouts();
            }
        } catch (err: any) {
            setError("Failed to create workout");
            setWorkouts(prev => prev.filter(w => w.id !== tempId));
        }
    }

    async function deleteWorkout(id: number) {
        if (!window.confirm("Are you sure you want to delete this workout?")) return;

        setWorkouts(prev => prev.filter(w => w.id !== id));
        if (selectedWorkout && selectedWorkout.id === id) {
            setSelectedWorkout(null);
        }

        try {
            await apiFetch(`/api/workouts/${id}`, { method: "DELETE", headers });
        } catch (err) {
            console.error("Delete workout failed");
            await fetchWorkouts();
        }
    }

    async function handleAddExercise(e: FormEvent) {
        e.preventDefault();
        if (!selectedWorkout || !selectedExercise) return;

        const tempId = -Date.now();
        const selectedExName = selectedExercise.name;
        const selectedExId = selectedExercise.id;

        setSelectedWorkout(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                exercises: [...(prev.exercises || []), {
                    id: tempId,
                    exercise_id: selectedExId,
                    exercise_order: (prev.exercises?.length || 0) + 1,
                    name: selectedExName,
                    sets: []
                }]
            };
        });

        setSearchQuery("");
        setSelectedExercise(null);

        try {
            const res = await apiFetch(`/api/workouts/${selectedWorkout.id}/exercises`, {
                method: "POST",
                headers,
                body: JSON.stringify({ exercise_id: selectedExId })
            });
            const data = await res.json();

            if (res.ok && data.success && data.data) {
                setSelectedWorkout(prev => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        exercises: prev.exercises?.map(ex => ex.id === tempId ? { ...ex, id: data.data.id, exercise_order: data.data.exercise_order } : ex)
                    };
                });
            } else {
                await fetchWorkoutById(selectedWorkout.id);
            }
        } catch (err: any) {
            setError("Failed to add exercise");
            setSelectedWorkout(prev => {
                if (!prev) return prev;
                return { ...prev, exercises: prev.exercises?.filter(ex => ex.id !== tempId) };
            });
        }
    }

    async function deleteWorkoutExercise(workoutExerciseId: number) {
        if (!selectedWorkout) return;
        if (!window.confirm("Remove this exercise from the workout? All sets will be lost.")) return;

        setSelectedWorkout(prev => {
            if (!prev) return prev;
            return { ...prev, exercises: prev.exercises?.filter(ex => ex.id !== workoutExerciseId) };
        });

        try {
            await apiFetch(`/api/workouts/exercises/${workoutExerciseId}`, { method: "DELETE", headers });
        } catch (err) {
            console.error("Delete exercise failed");
            await fetchWorkoutById(selectedWorkout.id);
        }
    }

    function openAddSet(workoutExerciseId: number) {
        setAddingSetToBlockId(workoutExerciseId);
        setEditingSetId(null);
        setSetWeight("");
        setSetReps("");
        setSetTime("");
        setSetNoteText("");
    }

    function openEditSet(set: SetEntry, blockId: number) {
        setEditingSetId(set.id);
        setAddingSetToBlockId(blockId);
        setSetWeight(set.weight ?? "");
        setSetReps(set.repetitions ?? "");
        setSetTime(set.time ?? "");
        setSetNoteText(set.note ?? "");
    }

    async function submitSet(workoutExerciseId: number) {
        if (!selectedWorkout) return;

        const payload = {
            weight: setWeight === "" ? null : Number(setWeight),
            reps: setReps === "" ? null : Number(setReps),
            time: setTime === "" ? null : Number(setTime),
            note: setNoteText === "" ? null : setNoteText,
        };

        const isEdit = !!editingSetId;
        const tempId = isEdit ? editingSetId : -Date.now();

        setSelectedWorkout(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                exercises: prev.exercises?.map(ex => {
                    if (ex.id !== workoutExerciseId) return ex;

                    if (isEdit) {
                        return {
                            ...ex,
                            sets: ex.sets.map(s => s.id === editingSetId ? {
                                ...s,
                                weight: payload.weight,
                                repetitions: payload.reps, // map reps to repetitions
                                time: payload.time,
                                note: payload.note
                            } : s)
                        };
                    } else {
                        const nextSetNumber = ex.sets.length > 0 ? Math.max(...ex.sets.map(s => s.set_number)) + 1 : 1;
                        const newSet: SetEntry = {
                            id: tempId,
                            set_number: nextSetNumber,
                            weight: payload.weight,
                            repetitions: payload.reps, // map reps to repetitions
                            time: payload.time,
                            note: payload.note
                        };
                        return { ...ex, sets: [...ex.sets, newSet] };
                    }
                })
            };
        });


        const savedEditingId = editingSetId;
        setAddingSetToBlockId(null);
        setEditingSetId(null);
        setSetWeight("");
        setSetReps("");
        setSetTime("");
        setSetNoteText("");

        try {
            let res;
            if (isEdit) {
                res = await apiFetch(`/api/workouts/sets/${savedEditingId}`, {
                    method: "PUT",
                    headers,
                    body: JSON.stringify(payload)
                });
            } else {
                res = await apiFetch(`/api/workouts/exercises/${workoutExerciseId}/sets`, {
                    method: "POST",
                    headers,
                    body: JSON.stringify(payload)
                });
            }
            const data = await res.json();

            if (res.ok && data.success && data.data) {
                if (!isEdit) {
                    setSelectedWorkout(prev => {
                        if (!prev) return prev;
                        return {
                            ...prev,
                            exercises: prev.exercises?.map(ex => {
                                if (ex.id !== workoutExerciseId) return ex;
                                return {
                                    ...ex,
                                    sets: ex.sets.map(s => s.id === tempId ? { ...s, id: data.data.id, set_number: data.data.set_number } : s)
                                };
                            })
                        };
                    });
                }
            } else {
                await fetchWorkoutById(selectedWorkout.id);
            }
        } catch (err) {
            console.error(err);
            await fetchWorkoutById(selectedWorkout.id);
        }
    }

    async function deleteSet(setId: number) {
        if (!selectedWorkout) return;
        if (!window.confirm("Delete this set?")) return;

        setSelectedWorkout(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                exercises: prev.exercises?.map(ex => ({
                    ...ex,
                    sets: ex.sets.filter(s => s.id !== setId)
                }))
            };
        });

        try {
            await apiFetch(`/api/workouts/sets/${setId}`, { method: "DELETE", headers });
        } catch (err) {
            console.error("Delete set failed", err);
            await fetchWorkoutById(selectedWorkout.id);
        }
    }

    function formatWeight(w: number | string | null): string {
        if (w === null || w === undefined || w === "") return "—";
        const num = Number(w);
        if (isNaN(num)) return "—";
        return Number.isInteger(num) ? String(num) : num.toFixed(2);
    }

    const filteredExercises = exercises.filter(ex => ex.name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (isLoadingInit) return <p>Loading...</p>;

    // --- UI Render ---
    return (
        <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
            <h1>Workouts Management</h1>
            {error && <p style={{ fontWeight: "bold", color: "red" }}>Error: {error}</p>}

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
                            <button type="submit" style={{ padding: "10px", border: "1px solid", background: "none", cursor: "pointer", fontWeight: "bold" }}>
                                Create Workout
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
                                        <button onClick={() => deleteWorkout(w.id)} style={{ cursor: "pointer", padding: "5px 10px", border: "1px solid", background: "none", color: "red" }}>Delete</button>
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
                                {selectedWorkout.exercises.map(ex => {
                                    const isCardio = exercises.find(e => e.id === ex.exercise_id)?.category?.toLowerCase() === 'cardio';

                                    return (
                                        <li key={ex.id} style={{ border: "1px solid", padding: "15px", marginBottom: "15px" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                <h4 style={{ margin: "0 0 10px 0" }}>
                                                    {ex.name || `Unknown Exercise ${ex.exercise_id}`}{" "}
                                                    <small style={{ fontWeight: "normal" }}>(Exercise: {ex.exercise_order})</small>
                                                </h4>
                                                <button onClick={() => deleteWorkoutExercise(ex.id)} style={{ cursor: "pointer", border: "1px solid", background: "none", padding: "4px 8px", color: "red" }}>
                                                    Remove Exercise
                                                </button>
                                            </div>

                                            {ex.note && (
                                                <div style={{ marginBottom: "10px" }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setOpenExerciseNoteId(openExerciseNoteId === ex.id ? null : ex.id)}
                                                        style={{ cursor: "pointer", border: "1px solid", background: "none", padding: "4px 8px" }}
                                                    >
                                                        {openExerciseNoteId === ex.id ? "Hide Note" : "Show Note"}
                                                    </button>
                                                    {openExerciseNoteId === ex.id && (
                                                        <div style={{ marginTop: "8px", padding: "8px", border: "1px solid" }}>{ex.note}</div>
                                                    )}
                                                </div>
                                            )}

                                            <ul style={{ listStyleType: "circle", paddingLeft: "25px", margin: 0 }}>
                                                {ex.sets?.map(set => (
                                                    <div key={set.id}>
                                                        <li style={{ margin: "8px 0", display: "flex", alignItems: "center" }}>
                                                            <span style={{ width: "200px" }}>
                                                                Set {set.set_number}:
                                                                {set.time != null ? (
                                                                    <strong> {set.time} mins</strong>
                                                                ) : (
                                                                    <strong> {formatWeight(set.weight)}kg × {set.repetitions} reps</strong>
                                                                )}
                                                            </span>
                                                            {set.note && (
                                                                <button onClick={() => setExpandedNoteSetId(expandedNoteSetId === set.id ? null : set.id)} style={{ cursor: "pointer", fontSize: "0.8em", padding: "2px 6px", marginLeft: "10px", border: "1px solid", background: "none" }}>Expand Note</button>
                                                            )}
                                                            <button onClick={() => openEditSet(set, ex.id)} style={{ cursor: "pointer", fontSize: "0.8em", padding: "2px 6px", marginLeft: "10px", border: "1px solid", background: "none" }}>Edit Set</button>
                                                            <button onClick={() => deleteSet(set.id)} style={{ cursor: "pointer", fontSize: "0.8em", padding: "2px 6px", marginLeft: "10px", border: "1px solid", background: "none" }}>Delete Set</button>
                                                        </li>
                                                        {expandedNoteSetId === set.id && set.note && (
                                                            <div style={{ padding: "5px 10px", backgroundColor: "#f9f9f9", fontStyle: "italic", fontSize: "0.9em", borderLeft: "3px solid #ccc", marginBottom: "5px" }}>
                                                                Note: {set.note}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </ul>

                                            {addingSetToBlockId === ex.id ? (
                                                <div style={{ marginTop: "15px", display: "flex", flexWrap: "wrap", gap: "10px", border: "1px dashed #ccc", padding: "10px" }}>
                                                    {isCardio ? (
                                                        <input type="number" min="0" placeholder="Time (mins)" value={setTime === 0 ? "" : setTime} onChange={e => setSetTime(e.target.value === "" ? "" : Number(e.target.value))} required style={{ padding: "8px", border: "1px solid", width: "100px" }} />
                                                    ) : (
                                                        <>
                                                            <input type="number" min="0" step="0.1" placeholder="Weight (kg)" value={setWeight === 0 ? "" : setWeight} onChange={e => setSetWeight(e.target.value === "" ? "" : Number(e.target.value))} required style={{ padding: "8px", border: "1px solid", width: "100px" }} />
                                                            <input type="number" min="0" placeholder="Reps" value={setReps === 0 ? "" : setReps} onChange={e => setSetReps(e.target.value === "" ? "" : Number(e.target.value))} required style={{ padding: "8px", border: "1px solid", width: "80px" }} />
                                                        </>
                                                    )}
                                                    <input type="text" placeholder="Note (optional)" value={setNoteText} onChange={e => setSetNoteText(e.target.value)} style={{ padding: "8px", border: "1px solid", flex: 1, minWidth: "150px" }} />
                                                    <button onClick={() => submitSet(ex.id)} style={{ padding: "8px 15px", cursor: "pointer" }}>Save</button>
                                                    <button onClick={() => { setAddingSetToBlockId(null); setEditingSetId(null); }} style={{ padding: "8px 15px", cursor: "pointer" }}>Cancel</button>
                                                </div>
                                            ) : (
                                                <button onClick={() => openAddSet(ex.id)} style={{ cursor: "pointer", marginTop: "15px", padding: "6px 12px", border: "1px solid", background: "none" }}>+ Add Set</button>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}

                        <hr style={{ margin: "20px 0", border: "none", borderTop: "1px solid" }} />

                        <h3>Add New Exercise to Workout</h3>
                        <form onSubmit={handleAddExercise} style={{ display: "flex", flexDirection: "column", gap: "10px", border: "1px solid", padding: "15px" }}>
                            <div style={{ position: "relative" }} ref={dropdownRef}>
                                <input
                                    type="text"
                                    placeholder="Search and select exercise..."
                                    value={searchQuery}
                                    onChange={e => {
                                        setSearchQuery(e.target.value);
                                        setSelectedExercise(null);
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

                            <button type="submit" disabled={!selectedExercise} style={{ padding: "8px", border: "1px solid", background: "none", cursor: (!selectedExercise) ? "not-allowed" : "pointer", fontWeight: "bold" }}>
                                + Add Exercise block to Workout
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}