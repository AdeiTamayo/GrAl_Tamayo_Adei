import React, { useState, useEffect, useCallback, useMemo, FormEvent } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { apiFetch } from "../utils/api";
import Button from "../components/Button";
import Modal from "../components/Modal";
import Pagination from "../components/Pagination";
import EditableExerciseCard from '../components/EditableExerciseCard';
import ExercisePicker, { Exercise as ExerciseMeta } from '../components/ExercisePicker';
import DatePicker from '../components/DatePicker';
import ConfirmModal from '../components/ConfirmModal';
import DeleteButton from '../components/DeleteButton';
import ErrorBanner from '../components/ErrorBanner';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { useNotification } from "../components/NotificationProvider";

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
    const [searchParams] = useSearchParams();
    const preselectedId = (location.state as { preselectedWorkoutId?: number })?.preselectedWorkoutId;
    const { showNotification } = useNotification();

    // ---- STATE MANAGEMENT ----
    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
    const [isLoadingInit, setIsLoadingInit] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Toggle Dropdowns UI States
    const [showDetailsDropdown, setShowDetailsDropdown] = useState(false);

    // Create new workout form
    const urlDate = searchParams.get('date');
    const [newWorkoutName, setNewWorkoutName] = useState("");
    const [newWorkoutDate, setNewWorkoutDate] = useState(urlDate || new Date().toLocaleDateString('en-CA'));
    const [newWorkoutNote, setNewWorkoutNote] = useState("");
    // Edit workout form
    const [editName, setEditName] = useState("");
    const [editDate, setEditDate] = useState("");
    const [editNote, setEditNote] = useState("");

    // Add exercise search
    const [showPicker, setShowPicker] = useState(false);

    // Goals state
    const [goals, setGoals] = useState<Record<number, number>>({});

    const [deleteWorkoutConfirmId, setDeleteWorkoutConfirmId] = useState<number | null>(null);
    const [deleteExerciseConfirmId, setDeleteExerciseConfirmId] = useState<number | null>(null);

    // Save as routine state
    const [showSaveRoutineModal, setShowSaveRoutineModal] = useState(false);
    const [routineName, setRoutineName] = useState("");

    // Search, filter, pagination
    const [searchQuery, setSearchQuery] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    // Calendar control – only one date picker open at a time
    const [activeDatePicker, setActiveDatePicker] = useState<'from' | 'to' | null>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 20;

    const [showCreateModal, setShowCreateModal] = useState(false);

    // ---- API HEADERS MEMO ----
    const token = localStorage.getItem("user_login_token");
    const headers = useMemo(
        () => ({
            Authorization: "Bearer " + token,
            "Content-Type": "application/json",
        }),
        [token]
    );

    // ---- COMPUTED VALUES ----
    const filteredWorkouts = useMemo(() => {
        return workouts.filter(w => {
            if (searchQuery && !w.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            if (dateFrom && w.date && w.date < dateFrom) return false;
            if (dateTo && w.date && w.date > dateTo) return false;
            return true;
        });
    }, [workouts, searchQuery, dateFrom, dateTo]);

    const totalPages = Math.max(1, Math.ceil(filteredWorkouts.length / pageSize));
    const paginatedWorkouts = filteredWorkouts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, dateFrom, dateTo]);

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
            setError("Failed to fetch workouts");
        }
    }, []);

    const fetchGoalsMap = useCallback(async () => {
        try {
            const res = await apiFetch("/api/goals", { headers });
            const data = await res.json();
            if (data.success) {
                const gMap: Record<number, number> = {};
                for (const g of data.goals || []) {
                    const w = Number(g.target_weight);
                    if (w) gMap[g.exercise_id] = w;
                }
                setGoals(gMap);
            }
        } catch (err: any) {
            console.error("Failed to fetch goals", err);
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
            setError("Failed to fetch exercises");
        }
    }, []);

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
        Promise.all([fetchWorkouts(), fetchExercises(), fetchGoalsMap()])
            .then(() => {
                if (preselectedId) fetchWorkoutById(preselectedId);
            })
            .finally(() => setIsLoadingInit(false));
    }, [fetchWorkouts, fetchExercises, fetchWorkoutById, fetchGoalsMap, preselectedId]);



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
        setShowCreateModal(false);

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
                setSelectedWorkout({ ...data.data, exercises: [] });
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
                setSelectedWorkout({ ...data.data, exercises: selectedWorkout.exercises || [] });
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
            setError("Failed to delete workout");
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
            setError("Failed to save set update");
        }
    }

    // ---- SAVE AS ROUTINE ----
    const saveAsRoutine = async () => {
        if (!routineName.trim()) {
            showNotification("Please enter a routine name", "error");
            return;
        }
        if (!selectedWorkout || !selectedWorkout.exercises || selectedWorkout.exercises.length === 0) {
            showNotification("No exercises to save.", "error");
            return;
        }
        try {
            const res = await apiFetch("/api/routines", {
                method: "POST",
                headers,
                body: JSON.stringify({ name: routineName.trim() })
            });
            const data = await res.json();
            if (!data.success) throw new Error("Failed to create routine");

            const routineId = data.data.id;
            let exCount = 0;

            for (const ex of selectedWorkout.exercises) {
                const reps = ex.sets.map(s => Number(s.repetitions) || 0).filter(r => r > 0);
                const avgReps = reps.length > 0 ? Math.round(reps.reduce((a, b) => a + b, 0) / reps.length) : 10;
                const weights = ex.sets.map(s => Number(s.weight) || 0).filter(w => w > 0);
                const avgWeight = weights.length > 0 ? (weights.reduce((a, b) => a + b, 0) / weights.length) : 0;

                const exRes = await apiFetch(`/api/routines/${routineId}/exercises`, {
                    method: "POST",
                    headers,
                    body: JSON.stringify({
                        exercise_id: ex.exercise_id,
                        planned_sets: ex.sets.length,
                        planned_reps: avgReps,
                        planned_weight: avgWeight,
                        planned_time: 0
                    })
                });
                const exData = await exRes.json();
                if (exData.success && exData.data) {
                    const itemId = exData.data.id || exData.data.item_id;
                    if (itemId) {
                        for (let i = 0; i < ex.sets.length; i++) {
                            const s = ex.sets[i];
                            await apiFetch(`/api/routines/exercises/${itemId}/sets`, {
                                method: "POST",
                                headers,
                                body: JSON.stringify({
                                    set_number: i + 1,
                                    planned_weight: Number(s.weight) || 0,
                                    planned_reps: Number(s.repetitions) || 0,
                                    planned_time: 0
                                })
                            });
                        }
                    }
                }
                exCount++;
            }

            setShowSaveRoutineModal(false);
            setRoutineName("");
            showNotification(`Routine created with ${exCount} exercise(s)!`, "success");
        } catch (err) {
            console.error("Failed to save routine", err);
            showNotification("Error saving routine.", "error");
        }
    };

    if (isLoadingInit) return <LoadingSkeleton type="page" />;

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 mt-4 md:mt-8 space-y-8 animate-in fade-in duration-200">
            {/* Top Toolbar Level */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-subtle pb-5">
                <div>
                    <h1 className="font-display text-4xl font-bold tracking-tight uppercase italic text-accent">Workouts Management</h1>
                </div>

                <Button
                    type="button"
                    variant="primary"
                    onClick={() => setShowCreateModal(true)}
                    className="font-display rounded-xl py-3 px-5"
                >
                    Create New Workout
                </Button>

                <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} maxWidth="sm">
                    <div className="bg-card border border-subtle rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                        <h3 className="font-display text-lg font-bold text-accent mb-4">Create New Workout</h3>
                        <form onSubmit={createWorkout} className="flex flex-col gap-4">
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-muted font-bold mb-1.5">Workout Name</label>
                                <input
                                    type="text"
                                    value={newWorkoutName}
                                    onChange={(e) => setNewWorkoutName(e.target.value)}
                                    required
                                    className="w-full border border-subtle bg-surface rounded-xl px-4 py-2.5 text-sm text-body focus:border-accent focus:outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-muted font-bold mb-1.5">Session Date</label>
                                <DatePicker value={newWorkoutDate} onChange={setNewWorkoutDate} />
                            </div>
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-muted font-bold mb-1.5">Notes (Optional)</label>
                                <input
                                    type="text"
                                    value={newWorkoutNote}
                                    onChange={(e) => setNewWorkoutNote(e.target.value)}
                                    className="w-full border border-subtle bg-surface rounded-xl px-4 py-2.5 text-sm text-body placeholder:text-dim focus:border-accent focus:outline-none transition-all"
                                />
                            </div>
                            <div className="flex gap-2 justify-end mt-1">
                                <Button type="button" onClick={() => setShowCreateModal(false)} variant="secondary" className="px-4 py-2 text-xs">Cancel</Button>
                                <Button type="submit" variant="primary" className="px-4 py-2 text-xs">Confirm & Save</Button>
                            </div>
                        </form>
                    </div>
                </Modal>
            </div>

            {error && (
                <ErrorBanner message={error} />
            )}

            <div className="flex gap-6 items-start flex-col xl:flex-row">
                {/* Left Listing Sidebar */}
                <div className="flex-none w-full xl:w-[400px]">
                    <div className="bg-surface/60 border border-subtle rounded-xl p-5 shadow-md">
                        <h2 className="font-display text-sm font-bold text-muted tracking-wider uppercase mb-4">Saved Logs List</h2>

                        {/* Search & Filter Bar */}
                        <div className="flex flex-col sm:flex-row gap-2 mb-4">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by name..."
                                className="flex-1 border border-subtle bg-surface rounded-xl px-3 py-2 text-xs text-body placeholder:text-dim focus:border-accent focus:outline-none transition-all"
                            />
                            <div className="flex gap-2 items-center">
                                <DatePicker
                                    value={dateFrom}
                                    onChange={(d) => { setDateFrom(d); setActiveDatePicker(null); }}
                                    placeholder="From"
                                    buttonClassName="w-auto rounded-xl px-3 py-2 text-xs"
                                    open={activeDatePicker === 'from'}
                                    onOpenChange={(o) => setActiveDatePicker(o ? 'from' : null)}
                                />
                                <DatePicker
                                    value={dateTo}
                                    onChange={(d) => { setDateTo(d); setActiveDatePicker(null); }}
                                    placeholder="To"
                                    buttonClassName="w-auto rounded-xl px-3 py-2 text-xs"
                                    open={activeDatePicker === 'to'}
                                    onOpenChange={(o) => setActiveDatePicker(o ? 'to' : null)}
                                    menuAlign="right"
                                />
                            </div>
                        </div>

                        {filteredWorkouts.length === 0 ? (
                            <div className="text-center py-10 bg-card/40 rounded-xl border border-subtle/60">
                                <p className="text-dim text-sm font-medium italic px-4">{workouts.length === 0 ? "No sessions logged yet." : "No workouts match your filters."}</p>
                            </div>
                        ) : (
                            <>
                                <ul className="space-y-2.5 list-none p-0 m-0">
                                    {paginatedWorkouts.map((w) => (
                                        <li
                                            key={w.id}
                                            onClick={() => fetchWorkoutById(w.id)}
                                            className={`flex justify-between items-center p-3.5 border rounded-xl transition-all group cursor-pointer ${selectedWorkout?.id === w.id ? 'bg-surface border-accent/50' : 'bg-card/40 border-subtle/80 hover:border-hover'}`}
                                        >
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className="min-w-0">
                                                    <span className="text-sm stroke-zinc-100 font-semibold text-heading block truncate">{w.name}</span>
                                                    <span className="font-mono text-xs text-dim mt-0.5 block">{w.date?.substring(0, 10)}</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                                                <DeleteButton onClick={() => setDeleteWorkoutConfirmId(w.id)} />
                                            </div>
                                        </li>
                                    ))}
                                </ul>

                                <Pagination
                                    page={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={setCurrentPage}
                                />
                            </>
                        )}
                    </div>
                </div>

                {/* Right Interactive Workspace Panel */}
                {selectedWorkout && (
                    <div className="flex-1 w-full bg-surface border border-subtle rounded-xl p-6 shadow-md space-y-6 relative">

                        {/* Header Details Wrapper */}
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex-1 mr-4">
                                <h2 className="font-display text-2xl font-bold text-accent uppercase tracking-wide flex items-center gap-3">
                                    {selectedWorkout.name}
                                </h2>
                                <p className="font-mono text-xs text-dim mt-1">{selectedWorkout.date?.substring(0, 10)}</p>
                                {selectedWorkout.note && (
                                    <p className="font-sans text-sm text-muted mt-2 bg-card/30 p-3 rounded-xl border border-subtle/40">{selectedWorkout.note}</p>
                                )}
                            </div>

                            <div className="flex gap-2 shrink-0">
                                <Button
                                    type="button"
                                    onClick={() => { openEditWorkout(); setShowDetailsDropdown(true); }}
                                    variant="secondary"
                                    className="px-3 py-1.5 text-xs font-medium"
                                >
                                    Modify Details
                                </Button>

                                <Button type="button" onClick={() => { setRoutineName(selectedWorkout.name || ""); setShowSaveRoutineModal(true); }} variant="secondary" className="px-3 py-1.5 text-xs font-medium">
                                    Save as Routine
                                </Button>

                                <button type="button" onClick={() => setSelectedWorkout(null)} className="px-2.5 py-0.5 text-xs font-semibold text-accent bg-card border border-accent/30 rounded-full shadow-sm hover:bg-accent hover:text-black transition-colors">
                                    Close
                                </button>
                            </div>
                        </div>

                        <hr className="border-none border-t border-subtle/60" />

                        {/* Exercises List Display Block */}
                        <h3 className="font-sans text-xs font-bold tracking-widest text-accent uppercase">Recorded Exercises and Sets</h3>
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
                                        goalWeight={goals[ex.exercise_id]}
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
                            <h3 className="font-sans text-xs font-bold tracking-widest text-accent uppercase mb-3">Add New Exercise to Workout</h3>

                            <div className="flex flex-col gap-4">
                                <Button
                                    variant="secondary"
                                    fullWidth
                                    className="py-4 border-dashed border-subtle hover:border-accent/50 hover:bg-accent/5 transition-all text-sm font-semibold"
                                    onClick={() => setShowPicker(true)}
                                >
                                    + Add New Exercise Entry
                                </Button>
                                <Modal open={showPicker} onClose={() => setShowPicker(false)} maxWidth="xl">
                                    <ExercisePicker
                                        title="Add Exercise to Workout"
                                        onSelect={handleAddExercise}
                                        onClose={() => setShowPicker(false)}
                                    />
                                </Modal>
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

            <Modal open={showDetailsDropdown} onClose={() => setShowDetailsDropdown(false)} maxWidth="sm">
                <div className="bg-card border border-subtle rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                    <h3 className="font-display text-lg font-bold text-accent mb-4">Edit Core Metadata</h3>
                    <div className="flex flex-col gap-3">
                        <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Workout name" className="w-full border border-subtle bg-surface rounded-xl px-4 py-2.5 text-sm text-body focus:border-accent focus:outline-none transition-all" />
                        <DatePicker value={editDate} onChange={setEditDate} />
                        <input value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="Note description" className="w-full border border-subtle bg-surface rounded-xl px-4 py-2.5 text-sm text-body focus:border-accent focus:outline-none transition-all" />
                    </div>
                    <div className="flex gap-2 justify-end mt-4">
                        <Button type="button" onClick={() => setShowDetailsDropdown(false)} variant="secondary" className="px-4 py-2 text-xs">Cancel</Button>
                        <Button type="button" onClick={saveWorkoutEdit} variant="primary" className="px-4 py-2 text-xs">Save Changes</Button>
                    </div>
                </div>
            </Modal>

            <Modal open={showSaveRoutineModal} onClose={() => { setShowSaveRoutineModal(false); setRoutineName(""); }} maxWidth="sm">
                <div className="bg-card border border-subtle rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                    <h3 className="font-display text-lg font-bold text-accent mb-4">Save as Routine</h3>
                    <label className="block text-xs uppercase tracking-wider text-muted font-bold mb-1.5">Routine Name</label>
                    <input
                        type="text"
                        value={routineName}
                        onChange={(e) => setRoutineName(e.target.value)}
                        placeholder="e.g. Push Day"
                        className="w-full border border-subtle bg-surface rounded-xl px-4 py-2.5 text-sm text-body focus:border-accent focus:outline-none transition-all mb-4"
                        autoFocus
                    />
                    <div className="flex gap-3 justify-end">
                        <Button
                            type="button"
                            onClick={() => { setShowSaveRoutineModal(false); setRoutineName(""); }}
                            variant="secondary"
                            className="px-4 py-2 text-xs"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={saveAsRoutine}
                            variant="primary"
                            className="px-4 py-2 text-xs"
                        >
                            Create Routine
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

