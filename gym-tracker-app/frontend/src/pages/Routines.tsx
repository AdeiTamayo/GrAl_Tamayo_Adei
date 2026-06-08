import React, { useState, useRef, useEffect, useMemo } from 'react';
import Button from '../components/Button';
import EditableExerciseCard from '../components/EditableExerciseCard';
import ExercisePicker, { Exercise as ExerciseMeta } from '../components/ExercisePicker';
import { apiFetch } from "../utils/api";

interface SetTemplate {
    id: number;
    set_number: number;
    planned_weight: number | null;
    planned_reps: number | null;
    planned_time: number | null;
}

interface ExerciseTemplate {
    item_id: number;
    exercise_name?: string;
    name?: string;
    exercise_order: number;
    sets: SetTemplate[];
}

interface Routine {
    id: number;
    name: string;
    note?: string;
    exercises: ExerciseTemplate[];
}

interface ExerciseLookup {
    id: number;
    name: string;
}

export default function RoutinesManagement() {
    const [routines, setRoutines] = useState<Routine[]>([]);
    const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);

    // Form Creation Workspace States
    const [newRoutineName, setNewRoutineName] = useState('');
    const [newRoutineNote, setNewRoutineNote] = useState('');
    const [stagedExercises, setStagedExercises] = useState<any[]>([]); // Staging block prior to post creation

    // UI Search Lookup controls
    const [showPicker, setShowPicker] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const token = localStorage.getItem("user_login_token");
    const headers = useMemo(() => ({
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    }), [token]);

    // Load initial listings
    useEffect(() => {
        fetchUserRoutines();
    }, [headers]);

    // --- API Interactions Handlers ---

    async function fetchUserRoutines() {
        try {
            setError(null);
            const res = await apiFetch("/api/routines", { headers });
            const data = await res.json();
            if (data.success) {
                setRoutines(data.routines || []);
            } else {
                setError(data.error || "Failed loading routines.");
            }
        } catch (err: any) {
            setError(err.message || "Network layout exception fetching templates.");
        }
    }

    async function fetchRoutineById(id: number) {
        try {
            setError(null);
            const res = await apiFetch(`/api/routines/${id}`, { headers });
            const data = await res.json();
            if (data.success) {
                setSelectedRoutine(data.data);
            } else {
                setError(data.error);
            }
        } catch (err: any) {
            setError(err.message);
        }
    }

    // Handles Multi-Step Template Sequential Setup Logic
    async function handleCreateRoutine(e: React.FormEvent) {
        e.preventDefault();
        if (!newRoutineName.trim()) return;

        try {
            setError(null);
            // Step 1: Fire core routine parent entry creation map
            const baseRes = await apiFetch("/api/routines", {
                method: "POST",
                headers,
                body: JSON.stringify({ name: newRoutineName })
            });
            const baseData = await baseRes.json();

            if (!baseData.success || !baseData.data) {
                setError(baseData.error || "Base configuration template dropped.");
                return;
            }

            const activeRoutineId = baseData.data.id;

            // Step 2: If notes exist, update via PUT route instantly
            if (newRoutineNote.trim()) {
                await apiFetch(`/api/routines/${activeRoutineId}`, {
                    method: "PUT",
                    headers,
                    body: JSON.stringify({ name: newRoutineName, note: newRoutineNote })
                });
            }

            // Step 3: Map across all pre-staged exercises, firing iterative POST requests
            for (let index = 0; index < stagedExercises.length; index++) {
                const ex = stagedExercises[index];
                await apiFetch(`/api/routines/${activeRoutineId}/exercises`, {
                    method: "POST",
                    headers,
                    body: JSON.stringify({
                        exercise_id: ex.id,
                        exercise_order: index + 1,
                        planned_sets: 0,
                        planned_reps: 0,
                        planned_weight: 0,
                        note: ""
                    })
                });
            }

            // Reset form UI context elements
            setNewRoutineName('');
            setNewRoutineNote('');
            setStagedExercises([]);
            await fetchUserRoutines();
            await fetchRoutineById(activeRoutineId);
        } catch (err: any) {
            setError(err.message || "Failed finalizing compilation pipeline.");
        }
    }

    async function deleteRoutine(id: number) {
        if (!window.confirm("Are you sure you want to completely remove this routine template?")) return;
        try {
            const res = await apiFetch(`/api/routines/${id}`, { method: "DELETE", headers });
            const data = await res.json();
            if (data.success) {
                setRoutines(prev => prev.filter(r => r.id !== id));
                if (selectedRoutine?.id === id) setSelectedRoutine(null);
            }
        } catch (err: any) {
            setError(err.message);
        }
    }

    // Live workspace management additions
    async function handleLiveAddExercise(exercise: ExerciseMeta) {
        if (!selectedRoutine) return;

        try {
            const order = (selectedRoutine.exercises?.length || 0) + 1;
            const res = await apiFetch(`/api/routines/${selectedRoutine.id}/exercises`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    exercise_id: exercise.id,
                    exercise_order: order
                })
            });
            const data = await res.json();
            if (data.success) {
                await fetchRoutineById(selectedRoutine.id);
                setShowPicker(false);
            }
        } catch (err: any) {
            setError(err.message);
        }
    }

    async function removeExercise(itemId: number) {
        try {
            const res = await apiFetch(`/api/routines/exercises/${itemId}`, { method: "DELETE", headers });
            if (res.ok) {
                if (selectedRoutine) await fetchRoutineById(selectedRoutine.id);
            }
        } catch (err: any) {
            setError(err.message);
        }
    }

    // Stage Exercise in temporary layout array before parent template initialization
    function stageNewExercise(exercise: ExerciseMeta) {
        setStagedExercises(prev => [...prev, { ...exercise, tempId: Date.now() + Math.random() }]);
        setShowPicker(false);
    }

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 antialiased selection:bg-lime-500/30 selection:text-lime-300">
            {/* Header Block */}
            <div className="border-b border-zinc-800/80 pb-6">
                <h1 className="text-3xl sm:text-4xl font-display font-black text-zinc-100 uppercase tracking-tight mb-2">
                    My Routines <span className="text-lime-400/90 font-medium text-lg sm:text-xl normal-case tracking-normal block sm:inline sm:ml-2">(Templates)</span>
                </h1>
                <p className="text-sm sm:text-base text-zinc-400 font-normal max-w-2xl">
                    Build and structure custom reusable templates to map seamlessly into your training schedule.
                </p>
            </div>

            {/* Global Error Banner */}
            {error && (
                <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl font-medium text-sm animate-in fade-in slide-in-from-top-2 duration-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse shrink-0" />
                    <p><span className="font-bold uppercase tracking-wider text-xs mr-1">Error:</span> {error}</p>
                </div>
            )}

            {/* Dynamic Multi-Column Grid Space */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* Left Workspace Panel Controls */}
                <div className="lg:col-span-5 xl:col-span-4 space-y-6 w-full">

                    {/* Creation Form Frame */}
                    <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-xl shadow-black/40 ring-1 ring-white/5">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-1 h-5 bg-lime-400 rounded-full" />
                            <h3 className="font-display text-lg font-bold text-zinc-100 tracking-wide uppercase">
                                Create New Routine
                            </h3>
                        </div>

                        <form onSubmit={handleCreateRoutine} className="flex flex-col gap-5">
                            <div>
                                <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider mb-2 block">
                                    Routine Title <span className="text-lime-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g., Heavy Push Day"
                                    value={newRoutineName}
                                    onChange={e => setNewRoutineName(e.target.value)}
                                    required
                                    className="w-full border border-zinc-800 bg-zinc-950 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-lime-500 focus:ring-2 focus:ring-lime-500/10 focus:outline-none transition-all duration-200"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider mb-2 block">
                                    Notes <span className="text-zinc-600 font-normal lowercase">(optional)</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Focus on progressive overload mechanics"
                                    value={newRoutineNote}
                                    onChange={e => setNewRoutineNote(e.target.value)}
                                    className="w-full border border-zinc-800 bg-zinc-950 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-lime-500 focus:ring-2 focus:ring-lime-500/10 focus:outline-none transition-all duration-200"
                                />
                            </div>

                            {/* Staged Exercises Segment Box */}
                            <div className="border-t border-zinc-800/80 pt-5 mt-2">
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider block">
                                        Staged Exercises
                                    </label>
                                    <span className="text-xs px-2 py-0.5 font-mono font-bold bg-zinc-800 text-zinc-300 rounded-full border border-zinc-700">
                                        {stagedExercises.length} Added
                                    </span>
                                </div>

                                {stagedExercises.length > 0 && (
                                    <div className="mb-4 max-h-44 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                        {stagedExercises.map((se, i) => (
                                            <div key={se.tempId || i} className="flex justify-between items-center bg-zinc-950/60 px-3.5 py-2.5 rounded-xl border border-zinc-850/80 group/stage hover:border-zinc-800 transition-all">
                                                <span className="text-xs text-zinc-300 font-medium truncate max-w-[80%]">
                                                    <span className="text-zinc-500 font-mono mr-1.5">{String(i + 1).padStart(2, '0')}</span> {se.name}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setStagedExercises(prev => prev.filter(item => item.tempId !== se.tempId))}
                                                    className="text-zinc-500 hover:text-rose-400 text-xs font-semibold px-2 py-1 rounded transition-colors"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="space-y-4">
                                    {!showPicker ? (
                                        <Button
                                            type="button"
                                            onClick={() => setShowPicker(true)}
                                            variant="secondary"
                                            fullWidth
                                            className="py-3 border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-950/40 text-xs font-medium text-zinc-400 hover:text-zinc-200 rounded-xl active:scale-[0.99] transition-all"
                                        >
                                            + Select Exercise to Stage
                                        </Button>
                                    ) : (
                                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
                                            <div className="w-full max-w-lg shadow-2xl transform scale-100 transition-transform">
                                                <ExercisePicker
                                                    title="Stage Exercise"
                                                    onSelect={stageNewExercise}
                                                    onClose={() => setShowPicker(false)}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <Button type="submit" variant="primary" fullWidth className="font-display font-bold tracking-wide rounded-xl py-3.5 mt-3 shadow-lg shadow-lime-950/20 active:scale-[0.99] transition-all">
                                Save Routine Template
                            </Button>
                        </form>
                    </div>

                    {/* Templates Index Shelf Panel */}
                    <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-xl shadow-black/40 ring-1 ring-white/5">
                        <h2 className="font-display text-lg font-bold text-zinc-100 tracking-wide uppercase mb-5 flex items-center gap-2">
                            <span>All Saved Routines</span>
                        </h2>

                        {routines.length === 0 ? (
                            <div className="text-center py-12 bg-zinc-950/40 rounded-xl border border-zinc-850/60 border-dashed">
                                <p className="text-zinc-500 text-sm font-medium italic">No templates configured yet.</p>
                            </div>
                        ) : (
                            <ul className="space-y-2.5 list-none p-0 m-0 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                                {routines.map(r => {
                                    const isCurrent = selectedRoutine?.id === r.id;
                                    return (
                                        <li
                                            key={r.id}
                                            className={`flex justify-between items-center p-3.5 rounded-xl border transition-all group duration-200 ${isCurrent
                                                ? 'bg-lime-950/10 border-lime-500/30 ring-1 ring-lime-500/10'
                                                : 'bg-zinc-950/40 border-zinc-850 hover:border-zinc-700 hover:bg-zinc-900/40'
                                                }`}
                                        >
                                            <span className={`text-sm font-medium truncate max-w-[50%] transition-colors ${isCurrent ? 'text-lime-400' : 'text-zinc-300 group-hover:text-zinc-100'}`}>
                                                {r.name}
                                            </span>
                                            <div className="flex gap-2 shrink-0">
                                                {!isCurrent && (
                                                    <Button
                                                        type="button"
                                                        onClick={() => fetchRoutineById(r.id)}
                                                        variant="secondary"
                                                        className="px-3 py-1.5 text-xs font-semibold rounded-lg"
                                                    >
                                                        Select
                                                    </Button>
                                                )}

                                                <Button
                                                    type="button"
                                                    onClick={() => deleteRoutine(r.id)}
                                                    variant="danger"
                                                    className="px-3 py-1.5 text-xs font-semibold rounded-lg opacity-60 group-hover:opacity-100 transition-opacity"
                                                >
                                                    Delete
                                                </Button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Right Active Configuration Workspace Column */}
                <div className="lg:col-span-7 xl:col-span-8 w-full">
                    {selectedRoutine ? (
                        <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-6 shadow-xl shadow-black/40 ring-1 ring-white/5 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">

                            {/* Selected Header Title Block */}
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 sm:items-center bg-zinc-950/40 p-4 rounded-xl border border-zinc-850/80">
                                <div>
                                    <span className="text-[10px] font-bold tracking-widest text-lime-400 uppercase bg-lime-950/40 border border-lime-800/30 px-2 py-0.5 rounded-md mb-1.5 inline-block">
                                        Active Target
                                    </span>
                                    <h2 className="font-display text-2xl font-black text-zinc-100 uppercase tracking-wide">
                                        {selectedRoutine.name}
                                    </h2>
                                    {selectedRoutine.note && (
                                        <p className="text-xs sm:text-sm text-zinc-400 mt-1 line-clamp-2">
                                            <span className="text-zinc-500 font-semibold uppercase tracking-wider text-[10px] mr-1">Note:</span>
                                            {selectedRoutine.note}
                                        </p>
                                    )}
                                </div>
                                <Button
                                    type="button"
                                    onClick={() => setSelectedRoutine(null)}
                                    variant="secondary"
                                    className="w-full sm:w-auto px-4 py-2 text-xs font-bold rounded-xl active:scale-[0.98]"
                                >
                                    Close View
                                </Button>
                            </div>

                            <hr className="border-t border-zinc-800/60" />

                            {/* List Elements Title Column */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-sans text-xs font-black tracking-widest text-zinc-400 uppercase">
                                        Configured Workout Grid
                                    </h3>
                                    <span className="text-[11px] font-mono font-medium text-zinc-500">
                                        {selectedRoutine.exercises?.length || 0} exercises total
                                    </span>
                                </div>

                                {!selectedRoutine.exercises || selectedRoutine.exercises.length === 0 ? (
                                    <div className="py-12 text-center border-2 border-dashed border-zinc-850 rounded-2xl bg-zinc-950/20 px-4">
                                        <p className="text-sm text-zinc-500 font-medium">
                                            Empty structure profile matrix.
                                        </p>
                                        <p className="text-xs text-zinc-600 mt-1">
                                            Append targets via the component drop-deck container below.
                                        </p>
                                    </div>
                                ) : (
                                    <ul className="list-none p-0 m-0 space-y-4">
                                        {selectedRoutine.exercises.map((ex) => (
                                            <div key={ex.item_id} className="transform transition-transform hover:scale-[1.005]">
                                                <EditableExerciseCard
                                                    exerciseName={ex.exercise_name || ex.name || 'Unknown'}
                                                    exerciseOrder={ex.exercise_order}
                                                    showNotesField={false}
                                                    sets={(ex.sets || []).map(s => ({
                                                        id: s.id,
                                                        set_number: s.set_number,
                                                        weight: s.planned_weight ?? null,
                                                        reps: s.planned_reps ?? null,
                                                        time: s.planned_time ?? null
                                                    }))}
                                                    onRemoveExercise={() => removeExercise(ex.item_id)}
                                                    onAddSet={async (w, r, t) => {
                                                        const num = (ex.sets?.length || 0) + 1;
                                                        await apiFetch(`/api/routines/exercises/${ex.item_id}/sets`, {
                                                            method: "POST", headers, body: JSON.stringify({ set_number: num, planned_weight: w, planned_reps: r, planned_time: t })
                                                        });
                                                        fetchRoutineById(selectedRoutine.id);
                                                    }}
                                                    onRemoveSet={async (id) => {
                                                        await apiFetch(`/api/routines/sets/${id}`, { method: "DELETE", headers });
                                                        fetchRoutineById(selectedRoutine.id);
                                                    }}
                                                    onUpdateSet={async (id, f, v) => {
                                                        const bodyPayload: any = {};
                                                        bodyPayload[`planned_${f}`] = v;
                                                        await apiFetch(`/api/routines/sets/${id}`, { method: "PUT", headers, body: JSON.stringify(bodyPayload) });
                                                    }}
                                                    onBlurSet={() => fetchRoutineById(selectedRoutine.id)}
                                                />
                                            </div>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            {/* Append Bottom Interactive Tray Footer */}
                            <div className="pt-6 border-t border-zinc-800/80">
                                <div className="bg-zinc-950/40 border border-zinc-850 rounded-2xl p-4 sm:p-5">
                                    <h3 className="font-sans text-xs font-black tracking-widest text-lime-400 uppercase mb-3">
                                        Append Active Exercise
                                    </h3>
                                    <div className="flex flex-col gap-4">
                                        {!showPicker ? (
                                            <Button
                                                type="button"
                                                onClick={() => setShowPicker(true)}
                                                variant="secondary"
                                                fullWidth
                                                className="py-4 border-dashed border-zinc-800 bg-zinc-900/20 hover:border-lime-500/40 hover:bg-lime-500/5 hover:text-lime-400 text-sm font-semibold rounded-xl transition-all duration-200 active:scale-[0.995]"
                                            >
                                                + Select Exercise to Append into Live Window
                                            </Button>
                                        ) : (
                                            <div className="animate-in fade-in zoom-in-95 duration-200 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
                                                <ExercisePicker
                                                    title="Add Exercise to Routine"
                                                    onSelect={handleLiveAddExercise}
                                                    onClose={() => setShowPicker(false)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Workspace Empty Placeholder Landing */
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 lg:p-12 border-2 border-dashed border-zinc-800/80 rounded-2xl bg-zinc-900/10 min-h-[450px]">
                            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 font-mono font-bold mb-4 shadow-inner">
                                ?
                            </div>
                            <h3 className="text-base font-bold text-zinc-300 uppercase tracking-wide font-display">No Template Loaded</h3>
                            <p className="text-sm text-zinc-500 mt-1 max-w-sm mx-auto">
                                Select an existing routine configuration deck from the shelf panel, or write a fresh container matrix.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}