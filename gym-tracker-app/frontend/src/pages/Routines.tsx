import React, { useState, useRef, useEffect, useMemo } from 'react';
import Button from '../components/Button';
import EditableExerciseCard from '../components/EditableExerciseCard';
import ExercisePicker, { Exercise as ExerciseMeta } from '../components/ExercisePicker';
import { apiFetch } from "../utils/api";
import ConfirmModal from '../components/ConfirmModal';

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

export default function RoutinesManagement() {
    const [routines, setRoutines] = useState<Routine[]>([]);
    const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);

    // Form Inputs states
    const [newRoutineName, setNewRoutineName] = useState('');
    const [newRoutineNote, setNewRoutineNote] = useState('');
    const [editName, setEditName] = useState('');
    const [editNote, setEditNote] = useState('');

    // Staging array prior to final configuration post pipeline
    const [stagedExercises, setStagedExercises] = useState<any[]>([]);

    // Dropdown Flow Controls & Visibility Indicators
    const [showCreateDropdown, setShowCreateDropdown] = useState(false);
    const [showDetailsDropdown, setShowDetailsDropdown] = useState(false);
    const [showPicker, setShowPicker] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

    // Layout Reference Focus Wrappers
    const createRoutineRef = useRef<HTMLDivElement>(null);
    const detailsDropdownRef = useRef<HTMLDivElement>(null);

    const token = localStorage.getItem("user_login_token");
    const headers = useMemo(() => ({
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    }), [token]);

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
                setEditName(data.data.name);
                setEditNote(data.data.note || '');
            } else {
                setError(data.error);
            }
        } catch (err: any) {
            setError(err.message);
        }
    }

    async function handleCreateRoutine(e: React.FormEvent) {
        e.preventDefault();
        if (!newRoutineName.trim()) return;

        try {
            setError(null);
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

            if (newRoutineNote.trim()) {
                await apiFetch(`/api/routines/${activeRoutineId}`, {
                    method: "PUT",
                    headers,
                    body: JSON.stringify({ name: newRoutineName, note: newRoutineNote })
                });
            }

            for (let index = 0; index < stagedExercises.length; index++) {
                const ex = stagedExercises[index];
                await apiFetch(`/api/routines/${activeRoutineId}/exercises`, {
                    method: "POST",
                    headers,
                    body: JSON.stringify({
                        exercise_id: ex.id,
                        exercise_order: index + 1
                    })
                });
            }

            setNewRoutineName('');
            setNewRoutineNote('');
            setStagedExercises([]);
            setShowCreateDropdown(false);
            await fetchUserRoutines();
            await fetchRoutineById(activeRoutineId);
        } catch (err: any) {
            setError(err.message || "Failed finalizing compilation pipeline.");
        }
    }

    async function saveRoutineEdit() {
        if (!selectedRoutine) return;
        try {
            setError(null);
            const res = await apiFetch(`/api/routines/${selectedRoutine.id}`, {
                method: "PUT",
                headers,
                body: JSON.stringify({ name: editName.trim(), note: editNote.trim() || undefined })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || "Failed to update routine details");

            setShowDetailsDropdown(false);
            await fetchRoutineById(selectedRoutine.id);
            await fetchUserRoutines();
        } catch (err: any) {
            setError(err.message || "Could not save metadata changes.");
        }
    }

    async function deleteRoutine(id: number) {
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

    function stageNewExercise(exercise: ExerciseMeta) {
        setStagedExercises(prev => [...prev, { ...exercise, tempId: Date.now() + Math.random() }]);
    }

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 mt-4 md:mt-8 space-y-8">
            {/* Top Toolbar Level */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
                <div>
                    <h1 className="font-display text-4xl font-bold tracking-tight uppercase italic text-lime-400">Routines Management</h1>
                </div>

                {/* Create Routine Dropdown Wrapper */}
                <div className="relative" ref={createRoutineRef}>
                    <Button
                        type="button"
                        variant="primary"
                        onClick={() => setShowCreateDropdown(!showCreateDropdown)}
                        className="font-display rounded-xl py-3 px-5 flex items-center gap-2"
                    >
                        <span>Create New Routine</span>
                        <svg className={`w-4 h-4 transition-transform ${showCreateDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                        </svg>
                    </Button>

                    {showCreateDropdown && (
                        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-zinc-950 border border-zinc-800 rounded-xl p-5 shadow-2xl z-30 animate-in fade-in slide-in-from-top-2 duration-150 max-h-[80vh] overflow-y-auto custom-scrollbar">
                            <form onSubmit={handleCreateRoutine} className="flex flex-col gap-4">
                                <div>
                                    <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1.5">Routine Name *</label>
                                    <input
                                        type="text"
                                        value={newRoutineName}
                                        onChange={(e) => setNewRoutineName(e.target.value)}
                                        required
                                        placeholder="e.g., Heavy Push Day"
                                        className="w-full border border-zinc-800 bg-zinc-900 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:border-lime-400 focus:outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1.5">Notes (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="Focus on progressive overload mechanics"
                                        value={newRoutineNote}
                                        onChange={(e) => setNewRoutineNote(e.target.value)}
                                        className="w-full border border-zinc-800 bg-zinc-900 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-lime-400 focus:outline-none transition-all"
                                    />
                                </div>

                                {/* Staged Matrix Matrix Build Zone */}
                                <div className="border-t border-zinc-800/80 pt-4 mt-1">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-xs uppercase tracking-wider text-zinc-400 font-bold">Staged Exercises</label>
                                        <span className="text-xs px-2 py-0.5 font-mono font-bold bg-zinc-800 text-zinc-300 rounded-full border border-zinc-700">
                                            {stagedExercises.length} Added
                                        </span>
                                    </div>

                                    {stagedExercises.length > 0 && (
                                        <div className="mb-3 max-h-32 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                            {stagedExercises.map((se, i) => (
                                                <div key={se.tempId || i} className="flex justify-between items-center bg-zinc-900/60 px-3 py-2 rounded-xl border border-zinc-800/80">
                                                    <span className="text-xs text-zinc-300 font-medium truncate max-w-[75%]">
                                                        <span className="text-zinc-500 font-mono mr-1">{String(i + 1).padStart(2, '0')}</span> {se.name}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setStagedExercises(prev => prev.filter(item => item.tempId !== se.tempId))}
                                                        className="text-zinc-500 hover:text-rose-400 text-xs font-semibold px-1"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-xl p-2">
                                        <ExercisePicker
                                            title="Stage Exercise Entry"
                                            onSelect={stageNewExercise}
                                            onClose={() => setShowCreateDropdown(false)}
                                        />
                                    </div>
                                </div>

                                <Button type="submit" variant="primary" fullWidth className="font-display rounded-xl py-2.5 text-sm mt-1">
                                    Confirm & Save Template
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
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 shadow-md">
                        <h2 className="font-display text-sm font-bold text-zinc-400 tracking-wider uppercase mb-4">Saved Templates Shelf</h2>
                        {routines.length === 0 ? (
                            <div className="text-center py-10 bg-zinc-950/40 rounded-xl border border-zinc-800/60">
                                <p className="text-zinc-500 text-sm font-medium italic px-4">No templates configured yet.</p>
                            </div>
                        ) : (
                            <ul className="space-y-2.5 list-none p-0 m-0">
                                {routines.map((r) => {
                                    const isCurrent = selectedRoutine?.id === r.id;
                                    return (
                                        <li key={r.id} className={`flex justify-between items-center p-3.5 border rounded-xl transition-all group ${isCurrent ? 'bg-zinc-900 border-lime-400/50' : 'bg-zinc-950/40 border-zinc-800/80 hover:border-zinc-700'}`}>
                                            <div className="truncate max-w-[65%]">
                                                <span className="text-sm font-semibold text-zinc-200 block truncate">{r.name}</span>
                                                <span className="text-zinc-500 text-[10px] font-mono tracking-wider uppercase mt-0.5 block">Template Profile</span>
                                            </div>
                                            <div className="flex gap-2 shrink-0">
                                                <Button type="button" onClick={() => fetchRoutineById(r.id)} variant="secondary" className="px-3 py-1.5 text-xs rounded-lg font-medium">
                                                    Open
                                                </Button>
                                                <Button type="button" onClick={() => setDeleteConfirmId(r.id)} variant="danger" className="px-2.5 py-1.5 text-xs rounded-lg">
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

                {/* Right Interactive Workspace Panel */}
                {selectedRoutine && (
                    <div className="flex-1 w-full bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-md space-y-6 relative">

                        {/* Header Details Wrapper with Dropdown Flow Control */}
                        <div className="flex justify-between items-start mb-6" ref={detailsDropdownRef}>
                            <div className="flex-1 mr-4">
                                <h2 className="font-display text-2xl font-bold text-lime-400 uppercase tracking-wide flex items-center gap-3">
                                    {selectedRoutine.name}
                                </h2>

                                {selectedRoutine.note && (
                                    <p className="font-sans text-sm text-zinc-300 mt-2 bg-zinc-950/30 p-3 rounded-xl border border-zinc-800/40">{selectedRoutine.note}</p>
                                )}
                            </div>

                            {/* Dropdown Control Button for Editing Details */}
                            <div className="flex gap-2 shrink-0 relative">
                                <Button
                                    type="button"
                                    onClick={() => setShowDetailsDropdown(!showDetailsDropdown)}
                                    variant="secondary"
                                    className="px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5 font-medium"
                                >
                                    <span>Modify Details</span>
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                                </Button>

                                <Button type="button" onClick={() => setSelectedRoutine(null)} variant="secondary" className="px-3 py-1.5 text-xs rounded-lg font-medium">
                                    Close
                                </Button>

                                {showDetailsDropdown && (
                                    <div className="absolute right-0 top-full mt-2 w-80 bg-zinc-950 border border-zinc-800 rounded-xl p-4 shadow-xl z-20 flex flex-col gap-3 animate-in fade-in duration-100">
                                        <h4 className="text-xs uppercase tracking-wider text-zinc-400 font-bold">Edit Core Metadata</h4>
                                        <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Routine template name" className="w-full border border-zinc-800 bg-zinc-900 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:border-lime-400 focus:outline-none" />
                                        <input value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="Template description notes" className="w-full border border-zinc-800 bg-zinc-900 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:border-lime-400 focus:outline-none" />
                                        <div className="flex gap-2 justify-end mt-1">
                                            <button type="button" onClick={() => setShowDetailsDropdown(false)} className="text-zinc-400 text-xs font-semibold px-2.5 py-1.5 hover:text-zinc-200">Cancel</button>
                                            <Button type="button" onClick={saveRoutineEdit} variant="primary" className="px-3 py-1 text-xs rounded-md">Save Changes</Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <hr className="border-none border-t border-zinc-800/60" />

                        {/* Exercises List Display Block */}
                        <h3 className="font-sans text-xs font-bold tracking-widest text-lime-400 uppercase">Routine Exercices</h3>
                        {!selectedRoutine.exercises || selectedRoutine.exercises.length === 0 ? (
                            <p className="text-xs text-zinc-500 font-sans py-6 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-950/20">
                                No exercises configured for this routine template yet. Append elements via the container panel below.
                            </p>
                        ) : (
                            <ul className="list-none p-0 m-0 space-y-4">
                                {selectedRoutine.exercises.map((ex) => (
                                    <EditableExerciseCard
                                        key={ex.item_id}
                                        exerciseName={ex.exercise_name || ex.name || 'Unknown Target'}
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
                                ))}
                            </ul>
                        )}

                        {/* Search Exercises Dropdown Selection Panel */}
                        <div className="pt-6 border-t border-zinc-800/60">
                            <h3 className="font-sans text-xs font-bold tracking-widest text-lime-400 uppercase mb-3">Add New Exercise to Template</h3>

                            <div className="flex flex-col gap-4">
                                {!showPicker ? (
                                    <Button
                                        variant="secondary"
                                        fullWidth
                                        className="py-4 border-dashed border-zinc-800 hover:border-lime-500/50 hover:bg-lime-500/5 transition-all text-sm font-semibold"
                                        onClick={() => setShowPicker(true)}
                                    >
                                        Add exercise
                                    </Button>
                                ) : (
                                    <div className="animate-in fade-in zoom-in-95 duration-200">
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
                )}
            </div>

            {deleteConfirmId !== null && (
                <ConfirmModal
                    message="Are you sure you want to completely remove this routine template?"
                    onConfirm={() => deleteRoutine(deleteConfirmId)}
                    onCancel={() => setDeleteConfirmId(null)}
                    confirmLabel="Delete"
                />
            )}
        </div>
    );
}