import React, { useState, useRef, useEffect, useMemo } from 'react';
import Button from '../components/Button';
import EditableExerciseCard from '../components/EditableExerciseCard';
import ExercisePicker, { Exercise as ExerciseMeta } from '../components/ExercisePicker';
import { apiFetch } from "../utils/api";
import ConfirmModal from '../components/ConfirmModal';
import DeleteButton from '../components/DeleteButton';

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

    // Dropdown Flow Controls & Visibility Indicators
    const [showCreateDropdown, setShowCreateDropdown] = useState(false);
    const [showDetailsDropdown, setShowDetailsDropdown] = useState(false);
    const [showPicker, setShowPicker] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

    // Pagination
    const [routinesPage, setRoutinesPage] = useState(1);
    const pageSize = 20;
    const totalPages = Math.max(1, Math.ceil(routines.length / pageSize));
    const paginatedRoutines = routines.slice((routinesPage - 1) * pageSize, routinesPage * pageSize);

    useEffect(() => {
        setRoutinesPage(1);
    }, [routines.length]);

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
            const res = await apiFetch("/api/routines", {
                method: "POST",
                headers,
                body: JSON.stringify({ name: newRoutineName })
            });
            const data = await res.json();

            if (!data.success || !data.data) {
                setError(data.error || "Failed to create routine.");
                return;
            }

            const routineId = data.data.id;

            if (newRoutineNote.trim()) {
                await apiFetch(`/api/routines/${routineId}`, {
                    method: "PUT",
                    headers,
                    body: JSON.stringify({ name: newRoutineName, note: newRoutineNote })
                });
            }

            setNewRoutineName('');
            setNewRoutineNote('');
            setShowCreateDropdown(false);
            await fetchUserRoutines();
            setSelectedRoutine({ ...data.data, exercises: [] });
        } catch (err: any) {
            setError(err.message || "Failed to create routine.");
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

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 mt-4 md:mt-8 space-y-8">
            {/* Top Toolbar Level */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-subtle pb-5">
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
                        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-card border border-subtle rounded-xl p-5 shadow-2xl z-30 animate-in fade-in slide-in-from-top-2 duration-150 max-h-[80vh] overflow-y-auto custom-scrollbar">
                            <form onSubmit={handleCreateRoutine} className="flex flex-col gap-4">
                                <div>
                                    <label className="block text-xs uppercase tracking-wider text-muted font-bold mb-1.5">Routine Name *</label>
                                    <input
                                        type="text"
                                        value={newRoutineName}
                                        onChange={(e) => setNewRoutineName(e.target.value)}
                                        required
                                        placeholder="e.g., Heavy Push Day"
                                        className="w-full border border-subtle bg-surface rounded-xl px-4 py-2.5 text-sm text-body focus:border-lime-400 focus:outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase tracking-wider text-muted font-bold mb-1.5">Notes (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="Focus on progressive overload mechanics"
                                        value={newRoutineNote}
                                        onChange={(e) => setNewRoutineNote(e.target.value)}
                                        className="w-full border border-subtle bg-surface rounded-xl px-4 py-2.5 text-sm text-body placeholder:text-dim focus:border-lime-400 focus:outline-none transition-all"
                                    />
                                </div>

                                <Button type="submit" variant="primary" fullWidth className="font-display rounded-xl py-2.5 text-sm mt-1">
                                    Create Routine
                                </Button>
                            </form>
                        </div>
                    )}
                </div>
            </div>

            {error && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl font-medium text-sm flex items-start justify-between gap-3">
                    <span>Error: {error}</span>
                    <button type="button" onClick={() => setError(null)} className="shrink-0 mt-0.5 text-rose-400/60 hover:text-rose-400 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
            )}

            <div className="flex gap-6 items-start flex-col xl:flex-row">
                {/* Left Listing Sidebar */}
                <div className="flex-none w-full xl:w-[400px]">
                    <div className="bg-surface/60 border border-subtle rounded-xl p-5 shadow-md">
                        <h2 className="font-display text-sm font-bold text-muted tracking-wider uppercase mb-4">Saved Templates Shelf</h2>
                        {routines.length === 0 ? (
                            <div className="text-center py-10 bg-card/40 rounded-xl border border-subtle/60">
                                <p className="text-dim text-sm font-medium italic px-4">No templates configured yet.</p>
                            </div>
                        ) : (
                            <>
                                <ul className="space-y-2.5 list-none p-0 m-0">
                                    {paginatedRoutines.map((r) => {
                                        const isCurrent = selectedRoutine?.id === r.id;
                                        return (
                                            <li
                                                key={r.id}
                                                onClick={() => fetchRoutineById(r.id)}
                                                className={`flex justify-between items-center p-3.5 border rounded-xl transition-all group cursor-pointer ${isCurrent ? 'bg-surface border-lime-400/50' : 'bg-card/40 border-subtle/80 hover:border-hover'}`}
                                            >
                                                <div className="truncate max-w-[65%]">
                                                    <span className="text-sm font-semibold text-heading block truncate">{r.name}</span>
                                                    <span className="text-dim text-[10px] font-mono tracking-wider uppercase mt-0.5 block">Template Profile</span>
                                                </div>
                                                <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                                                    <DeleteButton onClick={() => setDeleteConfirmId(r.id)} />
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>

                                {totalPages > 1 && (
                                    <div className="flex items-center justify-center gap-3 mt-4 pt-4 border-t border-subtle/60">
                                        <button
                                            onClick={() => setRoutinesPage((p) => Math.max(1, p - 1))}
                                            disabled={routinesPage === 1}
                                            className="text-xs font-semibold text-dim hover:text-body disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-2 py-1"
                                        >
                                            &larr; Prev
                                        </button>
                                        <span className="text-xs text-muted font-medium">
                                            Page {routinesPage} of {totalPages}
                                        </span>
                                        <button
                                            onClick={() => setRoutinesPage((p) => Math.min(totalPages, p + 1))}
                                            disabled={routinesPage === totalPages}
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
                {selectedRoutine && (
                    <div className="flex-1 w-full bg-surface border border-subtle rounded-xl p-6 shadow-md space-y-6 relative">

                        {/* Header Details Wrapper with Dropdown Flow Control */}
                        <div className="flex justify-between items-start mb-6" ref={detailsDropdownRef}>
                            <div className="flex-1 mr-4">
                                <h2 className="font-display text-2xl font-bold text-lime-400 uppercase tracking-wide flex items-center gap-3">
                                    {selectedRoutine.name}
                                </h2>

                                {selectedRoutine.note && (
                                    <p className="font-sans text-sm text-muted mt-2 bg-card/30 p-3 rounded-xl border border-subtle/40">{selectedRoutine.note}</p>
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
                                    <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-subtle rounded-xl p-4 shadow-xl z-20 flex flex-col gap-3 animate-in fade-in duration-100">
                                        <h4 className="text-xs uppercase tracking-wider text-muted font-bold">Edit Core Metadata</h4>
                                        <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Routine template name" className="w-full border border-subtle bg-surface rounded-lg px-3 py-2 text-xs text-body focus:border-lime-400 focus:outline-none" />
                                        <input value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="Template description notes" className="w-full border border-subtle bg-surface rounded-lg px-3 py-2 text-xs text-body focus:border-lime-400 focus:outline-none" />
                                        <div className="flex gap-2 justify-end mt-1">
                                            <button type="button" onClick={() => setShowDetailsDropdown(false)} className="text-muted text-xs font-semibold px-2.5 py-1.5 hover:text-heading">Cancel</button>
                                            <Button type="button" onClick={saveRoutineEdit} variant="primary" className="px-3 py-1 text-xs rounded-md">Save Changes</Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <hr className="border-none border-t border-subtle/60" />

                        {/* Exercises List Display Block */}
                        <h3 className="font-sans text-xs font-bold tracking-widest text-lime-400 uppercase">Routine Exercices</h3>
                        {!selectedRoutine.exercises || selectedRoutine.exercises.length === 0 ? (
                            <p className="text-xs text-dim font-sans py-6 text-center border border-dashed border-subtle rounded-xl bg-card/20">
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
                                            try {
                                            const num = (ex.sets?.length || 0) + 1;
                                            await apiFetch(`/api/routines/exercises/${ex.item_id}/sets`, {
                                                method: "POST", headers, body: JSON.stringify({ set_number: num, planned_weight: w, planned_reps: r, planned_time: t })
                                            });
                                            fetchRoutineById(selectedRoutine.id);
                                        } catch (err: any) {
                                                setError(err.message || "Failed to add set");
                                            }
                                        }}
                                        onRemoveSet={async (id) => {
                                            try {
                                            await apiFetch(`/api/routines/sets/${id}`, { method: "DELETE", headers });
                                            fetchRoutineById(selectedRoutine.id);
                                        } catch (err: any) {
                                                setError(err.message || "Failed to remove set");
                                            }
                                        }}
                                        onUpdateSet={async (id, f, v) => {
                                            const val = v === "" ? null : Number(v);
                                            if (val !== null && Math.abs(val) >= 1000) { setError("Value must be less than 1000"); return; }
                                            setSelectedRoutine(prev => {
                                                if (!prev) return prev;
                                                return { ...prev, exercises: prev.exercises.map(ex => ({ ...ex, sets: ex.sets.map(s => s.id === id ? { ...s, [f === 'weight' ? 'planned_weight' : f === 'reps' ? 'planned_reps' : 'planned_time']: val } : s) })) };
                                            });
                                            try {
                                                const bodyPayload: any = {};
                                                bodyPayload[`planned_${f}`] = val;
                                                const res = await apiFetch(`/api/routines/sets/${id}`, { method: "PUT", headers, body: JSON.stringify(bodyPayload) });
                                                const data = await res.json();
                                                if (!data.success) setError(data.error || "Failed to update set");
                                            } catch (err: any) { setError(err.message || "Failed to update set"); }
                                        }}
                                        onBlurSet={() => fetchRoutineById(selectedRoutine.id)}
                                    />
                                ))}
                            </ul>
                        )}

                        {/* Search Exercises Dropdown Selection Panel */}
                        <div className="pt-6 border-t border-subtle/60">
                            <h3 className="font-sans text-xs font-bold tracking-widest text-lime-400 uppercase mb-3">Add New Exercise to Template</h3>

                            <div className="flex flex-col gap-4">
                                <Button
                                    variant="secondary"
                                    fullWidth
                                    className="py-4 border-dashed border-subtle hover:border-lime-500/50 hover:bg-lime-500/5 transition-all text-sm font-semibold"
                                    onClick={() => setShowPicker(true)}
                                >
                                    + Add New Exercise Entry
                                </Button>
                            </div>
                        </div>

                        {/* Exercise Picker Modal */}
                        {showPicker && (
                            <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                                <div className="relative w-full max-w-xl">
                                    <button
                                        onClick={() => setShowPicker(false)}
                                        className="absolute -top-3 right-0 z-10 px-2.5 py-0.5 text-xs font-semibold text-lime-400 bg-card border border-lime-400/30 rounded-full shadow-sm"
                                    >
                                        Close
                                    </button>
                                    <ExercisePicker
                                        title="Add Exercise to Routine"
                                        onSelect={handleLiveAddExercise}
                                        onClose={() => setShowPicker(false)}
                                    />
                                </div>
                            </div>
                        )}
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
