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

type EditableSetField = "weight" | "repetitions" | "time" | "note";

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

    // Edit workout form
    const [isEditingWorkout, setIsEditingWorkout] = useState(false);
    const [editName, setEditName] = useState("");
    const [editDate, setEditDate] = useState("");
    const [editNote, setEditNote] = useState("");

    // Add exercise search
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Add set form state
    const [addingSetToBlockId, setAddingSetToBlockId] = useState<number | null>(null);
    const [newSetWeight, setNewSetWeight] = useState<number | "">("");
    const [newSetReps, setNewSetReps] = useState<number | "">("");
    const [newSetTime, setNewSetTime] = useState<number | "">("");
    const [newSetNote, setNewSetNote] = useState("");

    const token = localStorage.getItem("user_login_token");
    const headers = useMemo(
        () => ({
            Authorization: "Bearer " + token,
            "Content-Type": "application/json",
        }),
        [token]
    );

    const fetchWorkouts = useCallback(async () => {
        try {
            const res = await apiFetch("/api/workouts", { headers });
            const data = await res.json();
            if (data.success) {
                setWorkouts(data.data || []);
            }
        } catch (err: any) {
            console.error("Failed to fetch workouts", err);
        }
    }, [headers]);

    const fetchExercises = useCallback(async () => {
        try {
            const res = await apiFetch("/api/exercises", { headers });
            const data = await res.json();
            if (data.success) {
                setExercises(data.data || data.exercises || []);
            }
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
            const res = await apiFetch("/api/workouts/" + id, { headers });
            const data = await res.json();
            if (data.success) {
                const workoutData = data.data;
                if (workoutData && Array.isArray(workoutData.exercises)) {
                    workoutData.exercises = workoutData.exercises.map((ex: WorkoutExercise) => ({
                        ...ex,
                        sets: Array.isArray(ex.sets) ? ex.sets : [],
                    }));
                }
                setSelectedWorkout(workoutData);
                setSearchQuery("");
                setSelectedExercise(null);
                setAddingSetToBlockId(null);
            } else {
                setError(data.error || "Failed to load workout details");
            }
        } catch (err: any) {
            setError("Failed to load workout details");
        }
    }

    async function createWorkout(e: FormEvent) {
        e.preventDefault();
        setError(null);

        const tempId = -Date.now();
        const tempWorkout: Workout = {
            id: tempId,
            name: newWorkoutName,
            date: newWorkoutDate,
            note: newWorkoutNote || null,
            exercises: [],
        };

        setWorkouts((prev) => [tempWorkout, ...prev]);
        setNewWorkoutName("");
        setNewWorkoutNote("");

        try {
            const res = await apiFetch("/api/workouts", {
                method: "POST",
                headers,
                body: JSON.stringify({
                    name: tempWorkout.name,
                    date: tempWorkout.date,
                    note: tempWorkout.note,
                }),
            });
            const data = await res.json();

            if (res.ok && data.success && data.data) {
                setWorkouts((prev) =>
                    prev.map((w) => (w.id === tempId ? { ...w, id: data.data.id } : w))
                );
            } else {
                await fetchWorkouts();
            }
        } catch (err: any) {
            setError("Failed to create workout");
            setWorkouts((prev) => prev.filter((w) => w.id !== tempId));
        }
    }

    function openEditWorkout() {
        if (!selectedWorkout) return;
        setEditName(selectedWorkout.name);
        setEditDate(selectedWorkout.date?.substring(0, 10));
        setEditNote(selectedWorkout.note || "");
        setIsEditingWorkout(true);
    }

    function cancelEditWorkout() {
        setIsEditingWorkout(false);
    }

    async function saveWorkoutEdit() {
        if (!selectedWorkout) return;

        try {
            const res = await apiFetch("/api/workouts/" + selectedWorkout.id, {
                method: "PUT",
                headers,
                body: JSON.stringify({
                    name: editName,
                    date: editDate,
                    note: editNote,
                }),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setSelectedWorkout(data.data);
                setWorkouts((prev) =>
                    prev.map((w) => (w.id === selectedWorkout.id ? data.data : w))
                );
                setIsEditingWorkout(false);
            } else {
                setError(data.error || "Update failed");
            }
        } catch (err: any) {
            console.error(err);
            setError("Failed to update workout");
        }
    }

    async function deleteWorkout(id: number) {
        if (!window.confirm("Are you sure you want to delete this workout?")) return;

        setWorkouts((prev) => prev.filter((w) => w.id !== id));
        if (selectedWorkout && selectedWorkout.id === id) {
            setSelectedWorkout(null);
        }

        try {
            await apiFetch("/api/workouts/" + id, { method: "DELETE", headers });
        } catch (err: any) {
            console.error("Delete workout failed", err);
            await fetchWorkouts();
        }
    }

    async function handleAddExercise(e: FormEvent) {
        e.preventDefault();
        if (!selectedWorkout || !selectedExercise) return;

        setError(null);

        const tempId = -Date.now();
        const selectedExName = selectedExercise.name;
        const selectedExId = selectedExercise.id;

        setSelectedWorkout((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                exercises: [
                    ...(prev.exercises || []),
                    {
                        id: tempId,
                        exercise_id: selectedExId,
                        exercise_order: (prev.exercises?.length || 0) + 1,
                        name: selectedExName,
                        sets: [],
                    },
                ],
            };
        });

        setSearchQuery("");
        setSelectedExercise(null);

        try {
            const res = await apiFetch("/api/workouts/" + selectedWorkout.id + "/exercises", {
                method: "POST",
                headers,
                body: JSON.stringify({ exercise_id: selectedExId }),
            });
            const data = await res.json();

            if (res.ok && data.success && data.data) {
                setSelectedWorkout((prev) => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        exercises: prev.exercises?.map((ex) =>
                            ex.id === tempId
                                ? { ...ex, id: data.data.id, exercise_order: data.data.exercise_order }
                                : ex
                        ),
                    };
                });
            } else {
                await fetchWorkoutById(selectedWorkout.id);
            }
        } catch (err: any) {
            setError("Failed to add exercise");
            setSelectedWorkout((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    exercises: prev.exercises?.filter((ex) => ex.id !== tempId),
                };
            });
        }
    }

    async function deleteWorkoutExercise(workoutExerciseId: number) {
        if (!selectedWorkout) return;
        if (!window.confirm("Remove this exercise from the workout? All sets will be lost.")) return;

        try {
            const res = await apiFetch("/api/workouts/exercises/" + workoutExerciseId, {
                method: "DELETE",
                headers,
            });
            const data = await res.json();

            if (data.success) {
                await fetchWorkoutById(selectedWorkout.id);
            } else {
                setError(data.error || "Failed to remove exercise");
            }
        } catch (err: any) {
            setError("Failed to remove exercise");
        }
    }

    // ---- SET MANAGEMENT (ROUTINES-LIKE LOGIC + UI) ----

    function handleOpenAddSetForm(exercise: WorkoutExercise) {
        setAddingSetToBlockId(exercise.id);

        const sets = exercise.sets || [];
        if (sets.length > 0) {
            const lastSet = sets[sets.length - 1];
            setNewSetWeight(lastSet.weight ?? "");
            setNewSetReps(lastSet.repetitions ?? "");
            setNewSetTime(lastSet.time ?? "");
            setNewSetNote(lastSet.note ?? "");
        } else {
            setNewSetWeight("");
            setNewSetReps("");
            setNewSetTime("");
            setNewSetNote("");
        }
    }

    async function submitNewSet(exercise: WorkoutExercise) {
        if (!selectedWorkout) return;

        const sets = exercise.sets || [];
        const nextSetNum = sets.length + 1;

        try {
            const res = await apiFetch("/api/workouts/exercises/" + exercise.id + "/sets", {
                method: "POST",
                headers,
                body: JSON.stringify({
                    set_number: nextSetNum,
                    weight: newSetWeight === "" ? null : Number(newSetWeight),
                    reps: newSetReps === "" ? null : Number(newSetReps),
                    time: newSetTime === "" ? null : Number(newSetTime),
                    note: newSetNote.trim() === "" ? null : newSetNote.trim(),
                }),
            });

            const data = await res.json();

            if (data.success) {
                await fetchWorkoutById(selectedWorkout.id);
                setAddingSetToBlockId(null);
            } else {
                setError(data.error || "Failed to add set");
            }
        } catch (err: any) {
            setError("Failed to add set");
        }
    }

    async function handleRemoveSet(setId: number) {
        if (!selectedWorkout) return;

        try {
            const res = await apiFetch("/api/workouts/sets/" + setId, {
                method: "DELETE",
                headers,
            });
            const data = await res.json();

            if (data.success) {
                await fetchWorkoutById(selectedWorkout.id);
            } else {
                setError(data.error || "Failed to remove set");
            }
        } catch (err: any) {
            setError("Failed to remove set");
        }
    }

    function handleSetChange(
        workoutExerciseId: number,
        setId: number,
        field: EditableSetField,
        value: string
    ) {
        if (!selectedWorkout) return;

        const updatedExercises = selectedWorkout.exercises?.map((ex) => {
            if (ex.id !== workoutExerciseId) return ex;

            const updatedSets = ex.sets?.map((set) => {
                if (set.id !== setId) return set;

                if (field === "note") {
                    return { ...set, note: value === "" ? null : value };
                }

                const numericValue = value === "" ? null : Number(value);
                if (field === "weight") return { ...set, weight: numericValue };
                if (field === "repetitions") return { ...set, repetitions: numericValue };
                return { ...set, time: numericValue };
            });

            return { ...ex, sets: updatedSets };
        });

        setSelectedWorkout({ ...selectedWorkout, exercises: updatedExercises });
    }

    async function handleSetBlur(workoutExerciseId: number, setId: number) {
        if (!selectedWorkout) return;

        const exercise = selectedWorkout.exercises?.find((ex) => ex.id === workoutExerciseId);
        const set = exercise?.sets?.find((s) => s.id === setId);
        if (!set) return;

        try {
            await apiFetch("/api/workouts/sets/" + setId, {
                method: "PUT",
                headers,
                body: JSON.stringify({
                    weight: set.weight,
                    reps: set.repetitions,
                    time: set.time,
                    note: set.note ?? null,
                }),
            });
        } catch (err: any) {
            console.error("Failed to save set update");
        }
    }

    const filteredExercises = exercises.filter((ex) =>
        ex.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isLoadingInit) return <p>Loading...</p>;

    return (
        <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
            <h1>Workouts Management</h1>
            {error && <p style={{ fontWeight: "bold", color: "red" }}>Error: {error}</p>}

            <div style={{ display: "flex", gap: "40px", alignItems: "flex-start" }}>
                <div style={{ flex: 1, maxWidth: "450px" }}>
                    <div style={{ border: "1px solid", padding: "20px", marginBottom: "20px" }}>
                        <h3 style={{ marginTop: 0 }}>Create New Workout</h3>
                        <form
                            onSubmit={createWorkout}
                            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
                        >
                            <input
                                type="text"
                                placeholder="Workout Name"
                                value={newWorkoutName}
                                onChange={(e) => setNewWorkoutName(e.target.value)}
                                required
                                style={{ padding: "8px", border: "1px solid" }}
                            />
                            <input
                                type="date"
                                value={newWorkoutDate}
                                onChange={(e) => setNewWorkoutDate(e.target.value)}
                                style={{ padding: "8px", border: "1px solid" }}
                            />
                            <input
                                type="text"
                                placeholder="Notes (optional)"
                                value={newWorkoutNote}
                                onChange={(e) => setNewWorkoutNote(e.target.value)}
                                style={{ padding: "8px", border: "1px solid" }}
                            />
                            <button
                                type="submit"
                                style={{
                                    padding: "10px",
                                    border: "1px solid",
                                    background: "none",
                                    cursor: "pointer",
                                    fontWeight: "bold",
                                }}
                            >
                                Create Workout
                            </button>
                        </form>
                    </div>

                    <div style={{ border: "1px solid", padding: "20px" }}>
                        <h2 style={{ marginTop: 0 }}>All Workouts</h2>
                        <ul style={{ listStyleType: "none", padding: 0 }}>
                            {workouts.map((w) => (
                                <li
                                    key={w.id}
                                    style={{
                                        borderBottom: "1px solid",
                                        padding: "15px 0",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                    }}
                                >
                                    <div>
                                        <strong style={{ fontSize: "1.1em" }}>{w.name}</strong>
                                        <br />
                                        <small>{w.date?.substring(0, 10)}</small>
                                    </div>
                                    <div style={{ display: "flex", gap: "10px" }}>
                                        <button
                                            onClick={() => fetchWorkoutById(w.id)}
                                            style={{
                                                cursor: "pointer",
                                                padding: "5px 10px",
                                                border: "1px solid",
                                                background: "none",
                                            }}
                                        >
                                            View
                                        </button>
                                        <button
                                            onClick={() => deleteWorkout(w.id)}
                                            style={{
                                                cursor: "pointer",
                                                padding: "5px 10px",
                                                border: "1px solid",
                                                background: "none",
                                                color: "red",
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {selectedWorkout && (
                    <div style={{ flex: 1.5, border: "1px solid", padding: "25px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                                {!isEditingWorkout ? (
                                    <>
                                        <p>
                                            <strong>Workout:</strong> {selectedWorkout.name}
                                        </p>
                                        <p>
                                            <strong>Date:</strong> {selectedWorkout.date?.substring(0, 10)}
                                        </p>
                                        <p>
                                            <strong>Note:</strong> {selectedWorkout.note || "No notes"}
                                        </p>
                                    </>
                                ) : (
                                    <div
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "10px",
                                            marginTop: "10px",
                                        }}
                                    >
                                        <input
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            placeholder="Workout name"
                                        />

                                        <input
                                            type="date"
                                            value={editDate}
                                            onChange={(e) => setEditDate(e.target.value)}
                                        />

                                        <input
                                            value={editNote}
                                            onChange={(e) => setEditNote(e.target.value)}
                                            placeholder="Note"
                                        />

                                        <div style={{ display: "flex", gap: "10px" }}>
                                            <button onClick={saveWorkoutEdit}>Save</button>
                                            <button onClick={cancelEditWorkout}>Cancel</button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: "flex", gap: "10px" }}>
                                {!isEditingWorkout && <button onClick={openEditWorkout}>Edit</button>}
                                <button
                                    onClick={() => setSelectedWorkout(null)}
                                    style={{
                                        padding: "5px 10px",
                                        cursor: "pointer",
                                        border: "1px solid",
                                        background: "none",
                                    }}
                                >
                                    Close Workout
                                </button>
                            </div>
                        </div>

                        <hr style={{ margin: "20px 0", border: "none", borderTop: "1px solid" }} />

                        <h3>Recorded Exercises and Sets</h3>
                        {!selectedWorkout.exercises || selectedWorkout.exercises.length === 0 ? (
                            <p style={{ fontStyle: "italic" }}>No exercises logged for this workout yet.</p>
                        ) : (
                            <ul style={{ listStyleType: "none", padding: 0 }}>
                                {selectedWorkout.exercises.map((ex) => (
                                    <li key={ex.id} style={{ border: "1px solid", padding: "15px", marginBottom: "15px" }}>
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                marginBottom: "10px",
                                            }}
                                        >
                                            <h4 style={{ margin: 0 }}>
                                                {ex.name || "Unknown Exercise " + ex.exercise_id}{" "}
                                                <small style={{ fontWeight: "normal" }}>
                                                    (Exercise: {ex.exercise_order})
                                                </small>
                                            </h4>
                                            <button
                                                onClick={() => deleteWorkoutExercise(ex.id)}
                                                style={{
                                                    cursor: "pointer",
                                                    border: "1px solid",
                                                    background: "none",
                                                    padding: "4px 8px",
                                                    color: "red",
                                                }}
                                            >
                                                Remove Exercise
                                            </button>
                                        </div>

                                        {ex.sets && ex.sets.length > 0 ? (
                                            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "10px" }}>
                                                <thead>
                                                    <tr>
                                                        <th
                                                            style={{
                                                                textAlign: "left",
                                                                padding: "5px",
                                                                borderBottom: "1px solid #ccc",
                                                                width: "40px",
                                                            }}
                                                        >
                                                            Set
                                                        </th>
                                                        <th style={{ textAlign: "left", padding: "5px", borderBottom: "1px solid #ccc" }}>
                                                            Weight (kg)
                                                        </th>
                                                        <th style={{ textAlign: "left", padding: "5px", borderBottom: "1px solid #ccc" }}>
                                                            Reps
                                                        </th>
                                                        <th style={{ textAlign: "left", padding: "5px", borderBottom: "1px solid #ccc" }}>
                                                            Time
                                                        </th>
                                                        <th style={{ textAlign: "left", padding: "5px", borderBottom: "1px solid #ccc" }}>
                                                            Note
                                                        </th>
                                                        <th></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {ex.sets.map((set) => (
                                                        <tr key={set.id}>
                                                            <td
                                                                style={{
                                                                    padding: "5px",
                                                                    borderBottom: "1px solid #eee",
                                                                    fontWeight: "bold",
                                                                }}
                                                            >
                                                                {set.set_number}
                                                            </td>
                                                            <td style={{ padding: "5px", borderBottom: "1px solid #eee" }}>
                                                                <input
                                                                    type="number"
                                                                    value={set.weight ?? ""}
                                                                    onChange={(e) =>
                                                                        handleSetChange(ex.id, set.id, "weight", e.target.value)
                                                                    }
                                                                    onBlur={() => handleSetBlur(ex.id, set.id)}
                                                                    style={{ width: "80px", padding: "4px" }}
                                                                    placeholder="kg"
                                                                />
                                                            </td>
                                                            <td style={{ padding: "5px", borderBottom: "1px solid #eee" }}>
                                                                <input
                                                                    type="number"
                                                                    value={set.repetitions ?? ""}
                                                                    onChange={(e) =>
                                                                        handleSetChange(ex.id, set.id, "repetitions", e.target.value)
                                                                    }
                                                                    onBlur={() => handleSetBlur(ex.id, set.id)}
                                                                    style={{ width: "80px", padding: "4px" }}
                                                                    placeholder="reps"
                                                                />
                                                            </td>
                                                            <td style={{ padding: "5px", borderBottom: "1px solid #eee" }}>
                                                                <input
                                                                    type="number"
                                                                    value={set.time ?? ""}
                                                                    onChange={(e) =>
                                                                        handleSetChange(ex.id, set.id, "time", e.target.value)
                                                                    }
                                                                    onBlur={() => handleSetBlur(ex.id, set.id)}
                                                                    style={{ width: "80px", padding: "4px" }}
                                                                    placeholder="time"
                                                                />
                                                            </td>
                                                            <td style={{ padding: "5px", borderBottom: "1px solid #eee" }}>
                                                                <input
                                                                    type="text"
                                                                    value={set.note ?? ""}
                                                                    onChange={(e) =>
                                                                        handleSetChange(ex.id, set.id, "note", e.target.value)
                                                                    }
                                                                    onBlur={() => handleSetBlur(ex.id, set.id)}
                                                                    style={{ width: "100%", minWidth: "120px", padding: "4px" }}
                                                                    placeholder="note"
                                                                />
                                                            </td>
                                                            <td
                                                                style={{
                                                                    padding: "5px",
                                                                    borderBottom: "1px solid #eee",
                                                                    textAlign: "right",
                                                                }}
                                                            >
                                                                <button
                                                                    onClick={() => handleRemoveSet(set.id)}
                                                                    style={{
                                                                        background: "none",
                                                                        border: "none",
                                                                        color: "red",
                                                                        cursor: "pointer",
                                                                        fontSize: "1.2em",
                                                                        fontWeight: "bold",
                                                                    }}
                                                                >
                                                                    x
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        ) : (
                                            <p style={{ fontStyle: "italic", fontSize: "0.9em", margin: "5px 0" }}>
                                                No sets logged.
                                            </p>
                                        )}

                                        {addingSetToBlockId === ex.id ? (
                                            <div style={{ display: "flex", gap: "10px", marginTop: "10px", alignItems: "center", flexWrap: "wrap" }}>
                                                <input
                                                    type="number"
                                                    placeholder="kg"
                                                    value={newSetWeight}
                                                    onChange={(e) =>
                                                        setNewSetWeight(e.target.value === "" ? "" : Number(e.target.value))
                                                    }
                                                    style={{ width: "70px", padding: "5px", border: "1px solid" }}
                                                />
                                                <input
                                                    type="number"
                                                    placeholder="reps"
                                                    value={newSetReps}
                                                    onChange={(e) =>
                                                        setNewSetReps(e.target.value === "" ? "" : Number(e.target.value))
                                                    }
                                                    style={{ width: "70px", padding: "5px", border: "1px solid" }}
                                                />
                                                <input
                                                    type="number"
                                                    placeholder="time"
                                                    value={newSetTime}
                                                    onChange={(e) =>
                                                        setNewSetTime(e.target.value === "" ? "" : Number(e.target.value))
                                                    }
                                                    style={{ width: "70px", padding: "5px", border: "1px solid" }}
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="note"
                                                    value={newSetNote}
                                                    onChange={(e) => setNewSetNote(e.target.value)}
                                                    style={{ minWidth: "140px", padding: "5px", border: "1px solid" }}
                                                />
                                                <button
                                                    onClick={() => submitNewSet(ex)}
                                                    style={{ background: "none", border: "1px solid", padding: "5px 10px", cursor: "pointer" }}
                                                >
                                                    Save Set
                                                </button>
                                                <button
                                                    onClick={() => setAddingSetToBlockId(null)}
                                                    style={{ background: "none", border: "1px solid", padding: "5px 10px", cursor: "pointer" }}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleOpenAddSetForm(ex)}
                                                style={{ background: "none", border: "1px solid", padding: "5px 10px", cursor: "pointer", marginTop: "10px" }}
                                            >
                                                + Add Set
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}

                        <hr style={{ margin: "20px 0", border: "none", borderTop: "1px solid" }} />

                        <h3>Add New Exercise to Workout</h3>
                        <form
                            onSubmit={handleAddExercise}
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "10px",
                                border: "1px solid",
                                padding: "15px",
                            }}
                        >
                            <div style={{ position: "relative" }} ref={dropdownRef}>
                                <input
                                    type="text"
                                    placeholder="Search and select exercise..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setSelectedExercise(null);
                                        setShowDropdown(true);
                                    }}
                                    onFocus={() => setShowDropdown(true)}
                                    style={{ padding: "8px", width: "100%", boxSizing: "border-box", border: "1px solid" }}
                                />
                                {showDropdown && filteredExercises.length > 0 && (
                                    <ul
                                        style={{
                                            position: "absolute",
                                            zIndex: 10,
                                            width: "100%",
                                            background: "white",
                                            border: "1px solid",
                                            listStyle: "none",
                                            padding: 0,
                                            margin: 0,
                                            maxHeight: "200px",
                                            overflowY: "auto",
                                        }}
                                    >
                                        {filteredExercises.map((ex) => (
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

                            <button
                                type="submit"
                                disabled={!selectedExercise}
                                style={{
                                    padding: "8px",
                                    border: "1px solid",
                                    background: "none",
                                    cursor: !selectedExercise ? "not-allowed" : "pointer",
                                    fontWeight: "bold",
                                }}
                            >
                                + Add Exercise block to Workout
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}