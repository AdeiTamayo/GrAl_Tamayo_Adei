import React, { useState, useEffect, useCallback, useMemo, useRef, FormEvent } from "react";
import { useLocation } from "react-router-dom";
import { apiFetch } from "../utils/api";
import Button from "../components/Button";
import EditableExerciseCard from '../components/EditableExerciseCard';
import ExercisePicker, { Exercise as ExerciseMeta } from '../components/ExercisePicker';
import Calendar from '../components/Calendar';
import ConfirmModal from '../components/ConfirmModal';

// ---- TYPES & INTERFACES ----
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

export default function WorkoutsManagement() {
    const location = useLocation();
    const preselectedId = (location.state as { preselectedWorkoutId?: number })?.preselectedWorkoutId;

    // ---- STATE MANAGEMENT ----
    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
    const [isLoadingInit, setIsLoadingInit] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Toggle Dropdowns UI States
    const [showCreateDropdown, setShowCreateDropdown] = useState(false);
    const [showDetailsDropdown, setShowDetailsDropdown] = useState(false);

    // Create new workout form
    const [newWorkoutName, setNewWorkoutName] = useState("");
    const [newWorkoutDate, setNewWorkoutDate] = useState(new Date().toLocaleDateString('en-CA'));
    const [newWorkoutNote, setNewWorkoutNote] = useState("");
    const [showCreateDatePicker, setShowCreateDatePicker] = useState(false);

    // Edit workout form
    const [editName, setEditName] = useState("");
    const [editDate, setEditDate] = useState("");
    const [editNote, setEditNote] = useState("");
    const [showEditDatePicker, setShowEditDatePicker] = useState(false);

    // Add exercise search
    const [showPicker, setShowPicker] = useState(false);

    const [deleteWorkoutConfirmId, setDeleteWorkoutConfirmId] = useState<number | null>(null);
    const [deleteExerciseConfirmId, setDeleteExerciseConfirmId] = useState<number | null>(null);

    const createWorkoutRef = useRef<HTMLDivElement>(null);
    const detailsDropdownRef = useRef<HTMLDivElement>(null);

    // ---- API HEADERS MEMO ----
    const token = localStorage.getItem("user_login_token");
    const headers = useMemo(
        () => ({
            Authorization: "Bearer " + token,
            "Content-Type": "application/json",
        }),
        [token]
    );

    // ---- DATA FETCHING HANDLERS ----
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

    const fetchWorkoutById = useCallback(async (id: number) => {
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
                setShowDetailsDropdown(false);
            } else {
                setError(data.error || "Failed to load workout details");
            }
        } catch (err: any) {
            setError("Failed to load workout details");
        }
    }, [headers]);

    // Initial load
    useEffect(() => {
        Promise.all([fetchWorkouts(), fetchExercises()])
            .then(() => {
                if (preselectedId) fetchWorkoutById(preselectedId);
            })
            .finally(() => setIsLoadingInit(false));
    }, [fetchWorkouts, fetchExercises, fetchWorkoutById, preselectedId]);

    // Close dropdowns on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Node;
            if (createWorkoutRef.current && !createWorkoutRef.current.contains(target)) {
                setShowCreateDropdown(false);
            }
            if (detailsDropdownRef.current && !detailsDropdownRef.current.contains(target)) {
                setShowDetailsDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // ---- WORKOUT OPERATIONS ----
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
        setShowCreateDropdown(false);

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
        setShowDetailsDropdown(true);
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
                setShowDetailsDropdown(false);
            } else {
                setError(data.error || "Update failed");
            }
        } catch (err: any) {
            console.error(err);
            setError("Failed to update workout");
        }
    }

    async function deleteWorkout(id: number) {
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

    // ---- EXERCISE MANAGEMENT ----
    async function handleAddExercise(exerciseToHub: ExerciseMeta | Exercise) {
        if (!selectedWorkout) return;
        setError(null);

        const tempId = -Date.now();
        const selectedExName = exerciseToHub.name;
        const selectedExId = exerciseToHub.id;

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

        setShowPicker(false);

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

    // ---- SET MANAGEMENT ----
    async function submitNewSet(exercise: WorkoutExercise, weight: any, reps: any, time: any, note?: any) {
        if (!selectedWorkout) return;

        const sets = exercise.sets || [];
        const nextSetNum = sets.length + 1;

        try {
            const res = await apiFetch("/api/workouts/exercises/" + exercise.id + "/sets", {
                method: "POST",
                headers,
                body: JSON.stringify({
                    set_number: nextSetNum,
                    weight: weight === "" || weight === null ? null : Number(weight),
                    reps: reps === "" || reps === null ? null : Number(reps),
                    time: time === "" || time === null ? null : Number(time),
                    note: !note || note.trim() === "" ? null : note.trim(),
                }),
            });

            const data = await res.json();

            if (data.success) {
                await fetchWorkoutById(selectedWorkout.id);
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

    if (isLoadingInit) return <p className="text-muted p-8">Loading...</p>;

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 mt-4 md:mt-8 space-y-8">
            {/* Top Toolbar Level */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-subtle pb-5">
                <div>
                    <h1 className="font-display text-4xl font-bold tracking-tight uppercase italic text-lime-400">Workouts Management</h1>
                    <p className="text-muted font-medium text-sm">Log and manage your training sessions.</p>
                </div>

                {/* Create Workout Dropdown Wrapper */}
                <div className="relative" ref={createWorkoutRef}>
                    <Button
                        type="button"
                        variant="primary"
                        onClick={() => setShowCreateDropdown(!showCreateDropdown)}
                        className="font-display rounded-xl py-3 px-5 flex items-center gap-2"
                    >
                        <span>Create New Workout</span>
                        <svg className={`w-4 h-4 transition-transform ${showCreateDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                    </Button>

                    {showCreateDropdown && (
                        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-card border border-subtle rounded-xl p-5 shadow-2xl z-30 animate-in fade-in slide-in-from-top-2 duration-150">
                            <form onSubmit={createWorkout} className="flex flex-col gap-4">
                                <div>
                                    <label className="block text-xs uppercase tracking-wider text-muted font-bold mb-1.5">Workout Name</label>
                                    <input
                                        type="text"
                                        value={newWorkoutName}
                                        onChange={(e) => setNewWorkoutName(e.target.value)}
                                        required
                                        className="w-full border border-subtle bg-surface rounded-xl px-4 py-2.5 text-sm text-body focus:border-lime-400 focus:outline-none transition-all"
                                    />
                                </div>
                                <div className="relative">
                                    <label className="block text-xs uppercase tracking-wider text-muted font-bold mb-1.5">Session Date</label>
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateDatePicker(!showCreateDatePicker)}
                                        className="w-full border border-subtle bg-surface rounded-xl px-4 py-2.5 text-sm text-body focus:border-lime-400 focus:outline-none transition-all text-left"
                                    >
                                        {newWorkoutDate}
                                    </button>
                                    {showCreateDatePicker && (
                                        <div className="absolute left-0 mt-1 z-30 animate-in fade-in slide-in-from-top-1 duration-150">
                                            <Calendar
                                                selectedDate={newWorkoutDate}
                                                onSelect={(date) => { setNewWorkoutDate(date); setShowCreateDatePicker(false); }}
                                            />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs uppercase tracking-wider text-muted font-bold mb-1.5">Notes (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="Focusing on controlled negatives"
                                        value={newWorkoutNote}
                                        onChange={(e) => setNewWorkoutNote(e.target.value)}
                                        className="w-full border border-subtle bg-surface rounded-xl px-4 py-2.5 text-sm text-body placeholder:text-dim focus:border-lime-400 focus:outline-none transition-all"
                                    />
                                </div>
                                <Button type="submit" variant="primary" fullWidth className="font-display rounded-xl py-2.5 text-sm mt-1">
                                    Confirm & Save
                                </Button>
                            </form>
                        </div>
                    )}
                </div>
            </div>

            {error && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl font-medium text-sm">
                    Error: {error}
                </div>
            )}

            <div className="flex gap-6 items-start flex-col xl:flex-row">
                {/* Left Listing Sidebar */}
                <div className="flex-none w-full xl:w-[400px]">
                    <div className="bg-surface/60 border border-subtle rounded-xl p-5 shadow-md">
                        <h2 className="font-display text-sm font-bold text-muted tracking-wider uppercase mb-4">Saved Logs List</h2>
                        {workouts.length === 0 ? (
                            <div className="text-center py-10 bg-card/40 rounded-xl border border-subtle/60">
                                <p className="text-dim text-sm font-medium italic px-4">No sessions logged yet.</p>
                            </div>
                        ) : (
                            <ul className="space-y-2.5 list-none p-0 m-0">
                                {workouts.map((w) => (
                                    <li
                                        key={w.id}
                                        onClick={() => fetchWorkoutById(w.id)}
                                        className={`flex justify-between items-center p-3.5 border rounded-xl transition-all group cursor-pointer ${selectedWorkout?.id === w.id ? 'bg-surface border-lime-400/50' : 'bg-card/40 border-subtle/80 hover:border-hover'}`}
                                    >
                                        <div>
                                            <span className="text-sm stroke-zinc-100 font-semibold text-heading block">{w.name}</span>
                                            <span className="font-mono text-xs text-dim mt-0.5 block">{w.date?.substring(0, 10)}</span>
                                        </div>
                                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                            <Button type="button" onClick={() => setDeleteWorkoutConfirmId(w.id)} variant="danger" className="px-2.5 py-1.5 text-xs rounded-lg">
                                                Delete
                                            </Button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Right Interactive Workspace Panel */}
                {selectedWorkout && (
                    <div className="flex-1 w-full bg-surface border border-subtle rounded-xl p-6 shadow-md space-y-6 relative">

                        {/* Header Details Wrapper with Dropdown Flow Control */}
                        <div className="flex justify-between items-start mb-6" ref={detailsDropdownRef}>
                            <div className="flex-1 mr-4">
                                <h2 className="font-display text-2xl font-bold text-lime-400 uppercase tracking-wide flex items-center gap-3">
                                    {selectedWorkout.name}
                                </h2>
                                <p className="font-mono text-xs text-dim mt-1">{selectedWorkout.date?.substring(0, 10)}</p>
                                {selectedWorkout.note && (
                                    <p className="font-sans text-sm text-muted mt-2 bg-card/30 p-3 rounded-xl border border-subtle/40">{selectedWorkout.note}</p>
                                )}
                            </div>

                            {/* Dropdown Control Button for Editing Details */}
                            <div className="flex gap-2 shrink-0 relative">
                                <Button
                                    type="button"
                                    onClick={() => {
                                        if (!showDetailsDropdown) openEditWorkout();
                                        setShowDetailsDropdown(!showDetailsDropdown);
                                    }}
                                    variant="secondary"
                                    className="px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5 font-medium"
                                >
                                    <span>Modify Details</span>
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                                </Button>

                                <Button type="button" onClick={() => setSelectedWorkout(null)} variant="secondary" className="px-3 py-1.5 text-xs rounded-lg font-medium">
                                    Close
                                </Button>

                                {showDetailsDropdown && (
                                    <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-subtle rounded-xl p-4 shadow-xl z-20 flex flex-col gap-3 animate-in fade-in duration-100">
                                        <h4 className="text-xs uppercase tracking-wider text-muted font-bold">Edit Core Metadata</h4>
                                        <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Workout name" className="w-full border border-subtle bg-surface rounded-lg px-3 py-2 text-xs text-body focus:border-lime-400 focus:outline-none" />
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setShowEditDatePicker(!showEditDatePicker)}
                                                className="w-full border border-subtle bg-surface rounded-lg px-3 py-2 text-xs text-body focus:border-lime-400 focus:outline-none transition-all text-left"
                                            >
                                                {editDate}
                                            </button>
                                            {showEditDatePicker && (
                                                <div className="absolute left-0 mt-1 z-30 animate-in fade-in slide-in-from-top-1 duration-150">
                                                    <Calendar
                                                        selectedDate={editDate}
                                                        onSelect={(date) => { setEditDate(date); setShowEditDatePicker(false); }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <input value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="Note description" className="w-full border border-subtle bg-surface rounded-lg px-3 py-2 text-xs text-body focus:border-lime-400 focus:outline-none" />
                                        <div className="flex gap-2 justify-end mt-1">
                                            <button type="button" onClick={() => setShowDetailsDropdown(false)} className="text-muted text-xs font-semibold px-2.5 py-1.5 hover:text-heading">Cancel</button>
                                            <Button type="button" onClick={saveWorkoutEdit} variant="primary" className="px-3 py-1 text-xs rounded-md">Save Changes</Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <hr className="border-none border-t border-subtle/60" />

                        {/* Exercises List Display Block */}
                        <h3 className="font-sans text-xs font-bold tracking-widest text-lime-400 uppercase">Recorded Exercises and Sets</h3>
                        {!selectedWorkout.exercises || selectedWorkout.exercises.length === 0 ? (
                            <p className="text-xs text-dim font-sans py-6 text-center border border-dashed border-subtle rounded-xl bg-card/20">
                                No exercises logged for this workout yet. Search and select from the menu below to start.
                            </p>
                        ) : (
                            <ul className="list-none p-0 m-0 space-y-4">
                                {selectedWorkout.exercises.map((ex: WorkoutExercise) => (
                                    <EditableExerciseCard
                                        key={ex.id}
                                        exerciseName={ex.name || "Unknown Exercise " + ex.exercise_id}
                                        exerciseOrder={ex.exercise_order}
                                        showNotesField={true}
                                        sets={ex.sets.map((s: SetEntry) => ({
                                            id: s.id,
                                            set_number: s.set_number,
                                            weight: s.weight,
                                            reps: s.repetitions,
                                            time: s.time,
                                            note: s.note
                                        }))}
                                        onRemoveExercise={() => setDeleteExerciseConfirmId(ex.id)}
                                        onAddSet={(weight, reps, time, note) => submitNewSet(ex, weight, reps, time, note)}
                                        onRemoveSet={(setId) => handleRemoveSet(setId)}
                                        onUpdateSet={(setId, field, value) => {
                                            const mapField = field === 'reps' ? 'repetitions' : (field as EditableSetField);
                                            handleSetChange(ex.id, setId, mapField, value);
                                        }}
                                        onBlurSet={(setId) => handleSetBlur(ex.id, setId)}
                                    />
                                ))}
                            </ul>
                        )}

                        {/* Search Exercises Dropdown Selection Panel */}
                        <div className="pt-6 border-t border-subtle/60">
                            <h3 className="font-sans text-xs font-bold tracking-widest text-lime-400 uppercase mb-3">Add New Exercise to Workout</h3>

                            <div className="flex flex-col gap-4">
                                {!showPicker ? (
                                    <Button
                                        variant="secondary"
                                        fullWidth
                                        className="py-4 border-dashed border-subtle hover:border-lime-500/50 hover:bg-lime-500/5 transition-all text-sm font-semibold"
                                        onClick={() => setShowPicker(true)}
                                    >
                                        + Add New Exercise Entry
                                    </Button>
                                ) : (
                                    <div className="animate-in fade-in zoom-in-95 duration-200">
                                        <ExercisePicker
                                            title="Add Exercise to Workout"
                                            onSelect={handleAddExercise}
                                            onClose={() => setShowPicker(false)}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {deleteWorkoutConfirmId !== null && (
                <ConfirmModal
                    message="Are you sure you want to delete this workout?"
                    onConfirm={() => deleteWorkout(deleteWorkoutConfirmId)}
                    onCancel={() => setDeleteWorkoutConfirmId(null)}
                    confirmLabel="Delete"
                />
            )}

            {deleteExerciseConfirmId !== null && (
                <ConfirmModal
                    message="Remove this exercise from the workout? All sets will be lost."
                    onConfirm={() => {
                        deleteWorkoutExercise(deleteExerciseConfirmId);
                        setDeleteExerciseConfirmId(null);
                    }}
                    onCancel={() => setDeleteExerciseConfirmId(null)}
                    confirmLabel="Remove"
                />
            )}
        </div>
    );
}