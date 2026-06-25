import React, { useState, useEffect, useCallback, useMemo, useRef, FormEvent } from "react";
import { useLocation } from "react-router-dom";
import { apiFetch } from "../utils/api";
import Button from "../components/Button";
import EditableExerciseCard from '../components/EditableExerciseCard';
import ExercisePicker, { Exercise as ExerciseMeta } from '../components/ExercisePicker';
import DatePicker from '../components/DatePicker';
import ConfirmModal from '../components/ConfirmModal';
import DeleteButton from '../components/DeleteButton';
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
    const preselectedId = (location.state as { preselectedWorkoutId?: number })?.preselectedWorkoutId;
    const { showNotification } = useNotification();

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

    // Bulk delete
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

    // Calendar control – only one date picker open at a time
    const [activeDatePicker, setActiveDatePicker] = useState<'from' | 'to' | null>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 20;

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
        setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
        if (selectedWorkout && selectedWorkout.id === id) {
            setSelectedWorkout(null);
        }

        try {
            await apiFetch("/api/workouts/" + id, { method: "DELETE", headers });
        } catch (err: any) {
            console.error("Delete workout failed", err);
            console.error("Delete workout failed", err);
            setError("Failed to delete workout");
            await fetchWorkouts();
        }
    }

    async function deleteBulkWorkouts() {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) return;

        setWorkouts((prev) => prev.filter((w) => !selectedIds.has(w.id)));
        if (selectedWorkout && selectedIds.has(selectedWorkout.id)) {
            setSelectedWorkout(null);
        }
        setSelectedIds(new Set());
        setBulkDeleteConfirm(false);

        let failed = 0;
        for (const id of ids) {
            try {
                await apiFetch("/api/workouts/" + id, { method: "DELETE", headers });
            } catch (err: any) {
                console.error("Bulk delete failed for id", id, err);
                failed++;
            }
        }
        if (failed > 0) {
            setError(`Failed to delete ${failed} workout(s).`);
            await fetchWorkouts();
        } else {
            showNotification(`Deleted ${ids.length} workout(s).`, "success");
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

    if (isLoadingInit) return <p className="text-muted p-8">Loading...</p>;

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 mt-4 md:mt-8 space-y-8">
            {/* Top Toolbar Level */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-subtle pb-5">
                <div>
                    <h1 className="font-display text-4xl font-bold tracking-tight uppercase italic text-accent">Workouts Management</h1>
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
                                <span className="text-dim text-xs">From</span>
                                <DatePicker
                                    value={dateFrom}
                                    onChange={(d) => { setDateFrom(d); setActiveDatePicker(null); }}
                                    placeholder="From"
                                    buttonClassName="w-auto rounded-xl px-3 py-2 text-xs"
                                    open={activeDatePicker === 'from'}
                                    onOpenChange={(o) => setActiveDatePicker(o ? 'from' : null)}
                                />
                                <span className="text-dim text-xs">To</span>
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

                        {/* Bulk Delete Bar */}
                        {selectedIds.size > 0 && (
                            <div className="flex items-center justify-between mb-3 px-2">
                                <span className="text-xs text-muted font-semibold">{selectedIds.size} selected</span>
                                <Button
                                    type="button"
                                    onClick={() => setBulkDeleteConfirm(true)}
                                    variant="danger"
                                    className="px-3 py-1 text-xs rounded-lg"
                                >
                                    Delete Selected
                                </Button>
                            </div>
                        )}

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
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(w.id)}
                                                    onChange={() => {
                                                        setSelectedIds((prev) => {
                                                            const next = new Set(prev);
                                                            if (next.has(w.id)) next.delete(w.id); else next.add(w.id);
                                                            return next;
                                                        });
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="accent-accent cursor-pointer shrink-0"
                                                />
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

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-center gap-3 mt-4 pt-4 border-t border-subtle/60">
                                        <button
                                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className="text-xs font-semibold text-dim hover:text-body disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-2 py-1"
                                        >
                                            &larr; Prev
                                        </button>
                                        <span className="text-xs text-muted font-medium">
                                            Page {currentPage} of {totalPages}
                                        </span>
                                        <button
                                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                            className="text-xs font-semibold text-dim hover:text-body disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-2 py-1"
                                        >
                                            Next &rarr;
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Right Interactive Workspace Panel */}
                {selectedWorkout && (
                    <div className="flex-1 w-full bg-surface border border-subtle rounded-xl p-6 shadow-md space-y-6 relative">

                        {/* Header Details Wrapper with Dropdown Flow Control */}
                        <div className="flex justify-between items-start mb-6" ref={detailsDropdownRef}>
                            <div className="flex-1 mr-4">
                                <h2 className="font-display text-2xl font-bold text-accent uppercase tracking-wide flex items-center gap-3">
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

                                <Button type="button" onClick={() => { setRoutineName(selectedWorkout.name || ""); setShowSaveRoutineModal(true); }} variant="secondary" className="px-3 py-1.5 text-xs rounded-lg font-medium">
                                    Save as Routine
                                </Button>

                                <Button type="button" onClick={() => setSelectedWorkout(null)} variant="secondary" className="px-3 py-1.5 text-xs rounded-lg font-medium">
                                    Close
                                </Button>

                                {showDetailsDropdown && (
                                    <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-subtle rounded-xl p-4 shadow-xl z-20 flex flex-col gap-3 animate-in fade-in duration-100">
                                        <h4 className="text-xs uppercase tracking-wider text-muted font-bold">Edit Core Metadata</h4>
                                        <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Workout name" className="w-full border border-subtle bg-surface rounded-lg px-3 py-2 text-xs text-body focus:border-accent focus:outline-none" />
                                        <DatePicker value={editDate} onChange={setEditDate} />
                                        <input value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="Note description" className="w-full border border-subtle bg-surface rounded-lg px-3 py-2 text-xs text-body focus:border-accent focus:outline-none" />
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
                                {showPicker && (
                                    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                                        <div className="relative w-full max-w-xl">
                                            <button
                                                onClick={() => setShowPicker(false)}
                                                className="absolute -top-3 right-0 z-10 px-2.5 py-0.5 text-xs font-semibold text-accent bg-card border border-accent/30 rounded-full shadow-sm"
                                            >
                                                Close
                                            </button>
                                            <ExercisePicker
                                                title="Add Exercise to Workout"
                                                onSelect={handleAddExercise}
                                                onClose={() => setShowPicker(false)}
                                            />
                                        </div>
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

            {bulkDeleteConfirm && (
                <ConfirmModal
                    message={`Are you sure you want to delete ${selectedIds.size} workout(s)?`}
                    onConfirm={deleteBulkWorkouts}
                    onCancel={() => setBulkDeleteConfirm(false)}
                    confirmLabel="Delete All"
                />
            )}

            {showSaveRoutineModal && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-card border border-subtle rounded-xl p-6 shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-150">
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
                                className="px-4 py-2 text-xs rounded-lg"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                onClick={saveAsRoutine}
                                variant="primary"
                                className="px-4 py-2 text-xs rounded-lg"
                            >
                                Create Routine
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

