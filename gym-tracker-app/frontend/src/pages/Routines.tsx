import { useState, useEffect, useMemo, FormEvent, useRef } from "react";
import { apiFetch } from "../utils/api";

interface RoutineSet {
    id: number;
    set_number: number;
    planned_weight: number | null;
    planned_reps: number | null;
    planned_time: number | null;
}

interface RoutineExercise {
    item_id: number;
    id?: number;
    exercise_id: number;
    exercise_name?: string;
    name?: string;
    exercise_order: number;
    note: string | null;
    sets?: RoutineSet[];
}

interface Routine {
    id: number;
    name: string;
    note?: string | null;
    created_at?: string;
    exercises?: RoutineExercise[];
}

interface Exercise {
    id: number;
    name: string;
    equipment?: string;
    category?: string;
}

export default function Routines() {
    const [routines, setRoutines] = useState<Routine[]>([]);
    const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);

    // Exercises for the dropdown
    const [allExercises, setAllExercises] = useState<Exercise[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    // Create Routine Form
    const [newRoutineName, setNewRoutineName] = useState("");
    const [newRoutineNote, setNewRoutineNote] = useState("");

    // Add Exercise to Routine Form
    const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

    // Add Set Form State
    const [addingSetToItemId, setAddingSetToItemId] = useState<number | null>(null);
    const [newSetWeight, setNewSetWeight] = useState<number | "">("");
    const [newSetReps, setNewSetReps] = useState<number | "">("");
    const [newSetTime, setNewSetTime] = useState<number | "">("");

    // Dropdown handling
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const token = localStorage.getItem("user_login_token");
    const headers = useMemo(() => ({
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
    }), [token]);

    useEffect(() => {
        Promise.all([fetchRoutines(), fetchExercises()]).finally(() => setIsLoading(false));
    }, [headers]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredExercises = allExercises.filter(ex =>
        ex.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    async function fetchRoutines() {
        try {
            const res = await apiFetch("/api/routines", { headers });
            const data = await res.json();
            if (data.success) setRoutines(data.routines || []);
        } catch (err: any) {
            console.error("Failed to fetch routines", err);
        }
    }

    async function fetchExercises() {
        try {
            const res = await apiFetch("/api/exercises", { headers });
            const data = await res.json();
            const fetchedEx = data.exercises || data.data || data || [];
            setAllExercises(fetchedEx);
        } catch (err: any) {
            console.error("Failed to fetch exercises", err);
        }
    }

    async function fetchRoutineById(id: number) {
        setError(null);
        try {
            const res = await apiFetch(`/api/routines/${id}`, { headers });
            const data = await res.json();
            if (data.success) {
                const routineData = data.routine || data.data;
                // Ensure exercises have a sets array property so it doesn't fail mapping
                if (routineData && routineData.exercises) {
                    routineData.exercises = routineData.exercises.map((ex: any) => ({
                        ...ex,
                        sets: Array.isArray(ex.sets) ? ex.sets : []
                    }));
                }
                setSelectedRoutine(routineData);
            } else {
                setError(data.error);
            }
        } catch (err: any) {
            setError("Failed to fetch routine details");
        }
    }

    async function handleCreateRoutine(e: FormEvent) {
        e.preventDefault();
        setError(null);
        try {
            const res = await apiFetch("/api/routines", {
                method: "POST",
                headers,
                body: JSON.stringify({ name: newRoutineName, note: newRoutineNote })
            });
            const data = await res.json();
            if (data.success) {
                await fetchRoutines();
                setNewRoutineName("");
                setNewRoutineNote("");
                fetchRoutineById(data.routine?.id || data.data?.id);
            } else {
                setError(data.error);
            }
        } catch (err: any) {
            setError(err.message || "Failed to create routine");
        }
    }

    async function deleteRoutine(id: number) {
        if (!window.confirm("Are you sure you want to delete this routine?")) return;
        try {
            const res = await apiFetch(`/api/routines/${id}`, { method: "DELETE", headers });
            const data = await res.json();
            if (data.success) {
                setRoutines(prev => prev.filter(r => r.id !== id));
                if (selectedRoutine?.id === id) setSelectedRoutine(null);
            }
        } catch (err: any) {
            setError("Failed to delete routine");
        }
    }

    async function handleAddExercise(e: FormEvent) {
        e.preventDefault();
        if (!selectedRoutine || !selectedExercise) return;

        setError(null);
        const nextOrder = (selectedRoutine.exercises?.length || 0) + 1;

        try {
            const res = await apiFetch(`/api/routines/${selectedRoutine.id}/exercises`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    exercise_id: selectedExercise.id,
                    exercise_order: nextOrder,
                    note: ""
                })
            });
            const data = await res.json();
            if (data.success) {
                await fetchRoutineById(selectedRoutine.id);
                setSelectedExercise(null);
                setSearchQuery("");
            } else {
                setError(data.error);
            }
        } catch (err: any) {
            setError(err.message || "Failed to add exercise");
        }
    }

    async function removeExercise(itemId: number) {
        if (!selectedRoutine) return;
        try {
            const res = await apiFetch(`/api/routines/exercises/${itemId}`, { method: "DELETE", headers });
            const data = await res.json();
            if (data.success) fetchRoutineById(selectedRoutine.id);
        } catch (err: any) {
            setError(err.message || "Failed to remove exercise");
        }
    }

    // --- FORM LOGIC FOR CREATING A NEW SET ---
    function handleOpenAddSetForm(exercise: RoutineExercise) {
        setAddingSetToItemId(exercise.item_id);
        const sets = exercise.sets || [];

        // Duplicate previous set values if they exist
        if (sets.length > 0) {
            const lastSet = sets[sets.length - 1];
            setNewSetWeight(lastSet.planned_weight ?? "");
            setNewSetReps(lastSet.planned_reps ?? "");
            setNewSetTime(lastSet.planned_time ?? "");
        } else {
            setNewSetWeight("");
            setNewSetReps("");
            setNewSetTime("");
        }
    }

    async function submitNewSet(exercise: RoutineExercise) {
        if (!selectedRoutine) return;

        const sets = exercise.sets || [];
        const nextSetNum = sets.length + 1;

        try {
            const res = await apiFetch(`/api/routines/exercises/${exercise.item_id}/sets`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    set_number: nextSetNum,
                    planned_weight: newSetWeight === "" ? null : newSetWeight,
                    planned_reps: newSetReps === "" ? null : newSetReps,
                    planned_time: newSetTime === "" ? null : newSetTime
                })
            });
            const data = await res.json();
            if (data.success) {
                await fetchRoutineById(selectedRoutine.id);
                setAddingSetToItemId(null); // Close the form
            } else {
                setError(data.error);
            }
        } catch (err: any) {
            setError("Failed to add set");
        }
    }

    async function handleRemoveSet(setId: number) {
        if (!selectedRoutine) return;
        try {
            const res = await apiFetch(`/api/routines/sets/${setId}`, { method: "DELETE", headers });
            const data = await res.json();
            if (data.success) fetchRoutineById(selectedRoutine.id);
        } catch (err: any) {
            setError("Failed to remove set");
        }
    }

    // --- INLINE EDITING LOGIC FOR EXISTING SETS ---
    function handleSetChange(exerciseItemId: number, setId: number, field: keyof RoutineSet, value: string) {
        if (!selectedRoutine) return;

        const updatedExercises = selectedRoutine.exercises?.map(ex => {
            if (ex.item_id === exerciseItemId) {
                const updatedSets = ex.sets?.map(set => {
                    if (set.id === setId) {
                        return { ...set, [field]: value === "" ? null : Number(value) };
                    }
                    return set;
                });
                return { ...ex, sets: updatedSets };
            }
            return ex;
        });

        setSelectedRoutine({ ...selectedRoutine, exercises: updatedExercises });
    }

    async function handleSetBlur(exerciseItemId: number, setId: number) {
        if (!selectedRoutine) return;

        const exercise = selectedRoutine.exercises?.find(ex => ex.item_id === exerciseItemId);
        const set = exercise?.sets?.find(s => s.id === setId);

        if (!set) return;

        try {
            await apiFetch(`/api/routines/sets/${setId}`, {
                method: "PUT",
                headers,
                body: JSON.stringify({
                    planned_weight: set.planned_weight,
                    planned_reps: set.planned_reps,
                    planned_time: set.planned_time
                })
            });
        } catch (err: any) {
            console.error("Failed to save set update");
        }
    }

    if (isLoading) return <p style={{ padding: "20px" }}>Loading routines...</p>;

    return (
        <div style={{ padding: "20px", fontFamily: "Arial, sans-serif", maxWidth: "1200px", margin: "0 auto" }}>
            <h1>My Routines (Templates)</h1>
            {error && <p style={{ fontWeight: "bold", color: "red" }}>Error: {error}</p>}

            <div style={{ display: "flex", gap: "40px", alignItems: "flex-start" }}>

                {/* ---------- LEFT COLUMN ---------- */}
                <div style={{ flex: 1, maxWidth: "450px" }}>
                    <div style={{ border: "1px solid", padding: "20px", marginBottom: "20px" }}>
                        <h3 style={{ marginTop: 0 }}>Create New Routine</h3>
                        <form onSubmit={handleCreateRoutine} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            <input
                                type="text"
                                placeholder="Routine Name (e.g. Push Day)"
                                value={newRoutineName}
                                onChange={e => setNewRoutineName(e.target.value)}
                                required
                                style={{ padding: "8px", border: "1px solid" }}
                            />
                            <input
                                type="text"
                                placeholder="Notes (optional)"
                                value={newRoutineNote}
                                onChange={e => setNewRoutineNote(e.target.value)}
                                style={{ padding: "8px", border: "1px solid" }}
                            />
                            <button type="submit" style={{ padding: "10px", border: "1px solid", background: "none", cursor: "pointer", fontWeight: "bold" }}>
                                Create Routine
                            </button>
                        </form>
                    </div>

                    <div style={{ border: "1px solid", padding: "20px" }}>
                        <h2 style={{ marginTop: 0 }}>All Routines</h2>
                        {routines.length === 0 ? (
                            <p style={{ fontStyle: "italic" }}>No routines saved.</p>
                        ) : (
                            <ul style={{ listStyleType: "none", padding: 0, margin: 0 }}>
                                {routines.map(r => (
                                    <li key={r.id} style={{ borderBottom: "1px solid", padding: "15px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <div><strong style={{ fontSize: "1.1em" }}>{r.name}</strong></div>
                                        <div style={{ display: "flex", gap: "10px" }}>
                                            <button onClick={() => fetchRoutineById(r.id)} style={{ padding: "5px 10px", border: "1px solid", background: "none", cursor: "pointer" }}>Select</button>
                                            <button onClick={() => deleteRoutine(r.id)} style={{ padding: "5px 10px", border: "1px solid", background: "none", cursor: "pointer", color: "red" }}>Delete</button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* ---------- RIGHT COLUMN ---------- */}
                {selectedRoutine && (
                    <div style={{ flex: 1.5, border: "1px solid", padding: "25px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                                <h2 style={{ marginTop: 0 }}>{selectedRoutine.name}</h2>
                                <p style={{ margin: "5px 0" }}><strong>Note:</strong> {selectedRoutine.note || "No notes"}</p>
                            </div>
                            <button onClick={() => setSelectedRoutine(null)} style={{ padding: "5px 10px", border: "1px solid", background: "none", cursor: "pointer" }}>Close Panel</button>
                        </div>

                        <hr style={{ margin: "20px 0", border: "none", borderTop: "1px solid" }} />

                        <h3>Planned Exercises</h3>
                        {!selectedRoutine.exercises || selectedRoutine.exercises.length === 0 ? (
                            <p style={{ fontStyle: "italic", marginBottom: "20px" }}>No exercises added to this routine yet.</p>
                        ) : (
                            <ul style={{ listStyleType: "none", padding: 0 }}>
                                {selectedRoutine.exercises.map(ex => (
                                    <li key={ex.item_id} style={{ border: "1px solid", padding: "15px", marginBottom: "15px" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                                            <h4 style={{ margin: "0", textTransform: "capitalize" }}>
                                                {ex.exercise_order}. {ex.exercise_name || ex.name}
                                            </h4>
                                            <button onClick={() => removeExercise(ex.item_id)} style={{ cursor: "pointer", padding: "4px 8px", border: "1px solid", background: "none", color: "red" }}>Remove</button>
                                        </div>

                                        <div style={{ paddingLeft: "15px", marginBottom: "15px" }}>
                                            {/* Existing Sets Table */}
                                            {ex.sets && ex.sets.length > 0 ? (
                                                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "10px" }}>
                                                    <thead>
                                                        <tr>
                                                            <th style={{ textAlign: "left", padding: "5px", borderBottom: "1px solid #ccc", width: "40px" }}>Set</th>
                                                            <th style={{ textAlign: "left", padding: "5px", borderBottom: "1px solid #ccc" }}>Weight (kg)</th>
                                                            <th style={{ textAlign: "left", padding: "5px", borderBottom: "1px solid #ccc" }}>Reps</th>
                                                            <th style={{ textAlign: "left", padding: "5px", borderBottom: "1px solid #ccc" }}>Time (s)</th>
                                                            <th></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {ex.sets.map(set => (
                                                            <tr key={set.id}>
                                                                <td style={{ padding: "5px", borderBottom: "1px solid #eee", fontWeight: "bold" }}>{set.set_number}</td>
                                                                <td style={{ padding: "5px", borderBottom: "1px solid #eee" }}>
                                                                    <input
                                                                        type="number"
                                                                        value={set.planned_weight || ""}
                                                                        onChange={(e) => handleSetChange(ex.item_id, set.id, "planned_weight", e.target.value)}
                                                                        onBlur={() => handleSetBlur(ex.item_id, set.id)}
                                                                        style={{ width: "70px", padding: "4px" }}
                                                                        placeholder="kg"
                                                                    />
                                                                </td>
                                                                <td style={{ padding: "5px", borderBottom: "1px solid #eee" }}>
                                                                    <input
                                                                        type="number"
                                                                        value={set.planned_reps || ""}
                                                                        onChange={(e) => handleSetChange(ex.item_id, set.id, "planned_reps", e.target.value)}
                                                                        onBlur={() => handleSetBlur(ex.item_id, set.id)}
                                                                        style={{ width: "70px", padding: "4px" }}
                                                                        placeholder="reps"
                                                                    />
                                                                </td>
                                                                <td style={{ padding: "5px", borderBottom: "1px solid #eee" }}>
                                                                    <input
                                                                        type="number"
                                                                        value={set.planned_time || ""}
                                                                        onChange={(e) => handleSetChange(ex.item_id, set.id, "planned_time", e.target.value)}
                                                                        onBlur={() => handleSetBlur(ex.item_id, set.id)}
                                                                        style={{ width: "70px", padding: "4px" }}
                                                                        placeholder="sec"
                                                                    />
                                                                </td>
                                                                <td style={{ padding: "5px", borderBottom: "1px solid #eee", textAlign: "right" }}>
                                                                    <button onClick={() => handleRemoveSet(set.id)} style={{ background: "none", border: "none", color: "red", cursor: "pointer", fontSize: "1.2em", fontWeight: "bold" }}>✕</button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            ) : (
                                                <p style={{ fontStyle: "italic", fontSize: "0.9em", margin: "5px 0" }}>No sets planned.</p>
                                            )}

                                            {/* Add New Set Form OR Button */}
                                            {addingSetToItemId === ex.item_id ? (
                                                <div style={{ display: "flex", gap: "10px", marginTop: "10px", alignItems: "center" }}>
                                                    <input
                                                        type="number"
                                                        placeholder="kg"
                                                        value={newSetWeight}
                                                        onChange={e => setNewSetWeight(e.target.value === "" ? "" : Number(e.target.value))}
                                                        style={{ width: "60px", padding: "5px", border: "1px solid" }}
                                                    />
                                                    <input
                                                        type="number"
                                                        placeholder="reps"
                                                        value={newSetReps}
                                                        onChange={e => setNewSetReps(e.target.value === "" ? "" : Number(e.target.value))}
                                                        style={{ width: "60px", padding: "5px", border: "1px solid" }}
                                                    />
                                                    <input
                                                        type="number"
                                                        placeholder="sec"
                                                        value={newSetTime}
                                                        onChange={e => setNewSetTime(e.target.value === "" ? "" : Number(e.target.value))}
                                                        style={{ width: "60px", padding: "5px", border: "1px solid" }}
                                                    />
                                                    <button onClick={() => submitNewSet(ex)} style={{ background: "none", border: "1px solid", padding: "5px 10px", cursor: "pointer" }}>
                                                        Save Set
                                                    </button>
                                                    <button onClick={() => setAddingSetToItemId(null)} style={{ background: "none", border: "1px solid", padding: "5px 10px", cursor: "pointer" }}>
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <button onClick={() => handleOpenAddSetForm(ex)} style={{ background: "none", border: "1px solid", padding: "5px 10px", cursor: "pointer", marginTop: "10px" }}>
                                                    + Add Set
                                                </button>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <div style={{ border: "1px solid", padding: "15px", marginTop: "20px" }}>
                            <h3>Add Exercise to Routine</h3>
                            <form onSubmit={handleAddExercise} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
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
                                <button type="submit" disabled={!selectedExercise} style={{ padding: "10px", border: "1px solid", background: "none", cursor: selectedExercise ? "pointer" : "not-allowed", opacity: selectedExercise ? 1 : 0.5 }}>
                                    Add Exercise
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}