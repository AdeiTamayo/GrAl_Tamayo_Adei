import React, { useState, useEffect, useMemo } from 'react';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import ErrorBanner from '../components/ErrorBanner';
import EditableExerciseCard from '../components/EditableExerciseCard';
import ExercisePicker, { Exercise as ExerciseMeta } from '../components/ExercisePicker';
import { apiFetch } from "../utils/api";
import ConfirmModal from '../components/ConfirmModal';
import DeleteButton from '../components/DeleteButton';
import CloseButton from '../components/CloseButton';

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
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDetailsDropdown, setShowDetailsDropdown] = useState(false);
    const [showPicker, setShowPicker] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

    // Sidebar toggle
    const [sidebarHidden, setSidebarHidden] = useState(false);

    // Pagination
    const [routinesPage, setRoutinesPage] = useState(1);
    const pageSize = 20;
    const totalPages = Math.max(1, Math.ceil(routines.length / pageSize));
    const paginatedRoutines = routines.slice((routinesPage - 1) * pageSize, routinesPage * pageSize);

    useEffect(() => {
        setRoutinesPage(1);
    }, [routines.length]);

    // Layout Reference Focus Wrappers


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
            setShowCreateModal(false);
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
        <div className="max-w-7xl mx-auto p-4 md:p-8 mt-4 md:mt-8 space-y-8 animate-in fade-in duration-200">
            {/* Top Toolbar Level */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-subtle pb-5">
                <div>
                    <h1 className="font-display text-4xl font-bold tracking-tight uppercase italic text-accent">Routines Management</h1>
                </div>

                <Button
                    type="button"
                    variant="primary"
                    onClick={() => setShowCreateModal(true)}
                    className="font-display rounded-xl py-3 px-5"
                >
                    Create New Routine
                </Button>

                <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} maxWidth="sm">
                    <div className="bg-card border border-subtle rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                        <h3 className="font-display text-lg font-bold text-accent mb-4">Create New Routine</h3>
                        <form onSubmit={handleCreateRoutine} className="flex flex-col gap-4">
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-muted font-bold mb-1.5">Routine Name *</label>
                                <input
                                    type="text"
                                    value={newRoutineName}
                                    onChange={(e) => setNewRoutineName(e.target.value)}
                                    required
                                    placeholder="e.g., Heavy Push Day"
                                    className="w-full border border-subtle bg-surface rounded-xl px-4 py-2.5 text-sm text-body focus:border-accent focus:outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-muted font-bold mb-1.5">Notes (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="Focus on progressive overload mechanics"
                                    value={newRoutineNote}
                                    onChange={(e) => setNewRoutineNote(e.target.value)}
                                    className="w-full border border-subtle bg-surface rounded-xl px-4 py-2.5 text-sm text-body placeholder:text-dim focus:border-accent focus:outline-none transition-all"
                                />
                            </div>
                            <div className="flex gap-2 justify-end mt-1">
                                <Button type="button" onClick={() => setShowCreateModal(false)} variant="secondary" className="px-4 py-2 text-xs">Cancel</Button>
                                <Button type="submit" variant="primary" className="px-4 py-2 text-xs">Create Routine</Button>
                            </div>
                        </form>
                    </div>
                </Modal>
            </div>

            {error && (
                <ErrorBanner message={error} onDismiss={() => setError(null)} />
            )}

            <div className="flex gap-6 items-start flex-col xl:flex-row">
                {/* Left Listing Sidebar */}
                <div className={`flex-none w-full animate-in fade-in duration-200 ${sidebarHidden ? 'hidden' : 'xl:w-[400px]'}`}>
                    <div className="bg-surface/60 border border-subtle rounded-xl p-5 shadow-md">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-display text-sm font-bold text-muted tracking-wider uppercase">Saved Templates Shelf</h2>
                            <button
                                onClick={() => setSidebarHidden(true)}
                                className="p-1.5 rounded-lg text-dim hover:text-body hover:bg-surface/80 transition-colors"
                                title="Hide sidebar"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                                </svg>
                            </button>
                        </div>
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
                                                className={`flex justify-between items-center p-3.5 border rounded-xl transition-all group cursor-pointer ${isCurrent ? 'bg-surface border-accent/50' : 'bg-card/40 border-subtle/80 hover:border-hover'}`}
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

                                <Pagination
                                    page={routinesPage}
                                    totalPages={totalPages}
                                    onPageChange={setRoutinesPage}
                                />
                            </>
                        )}
                    </div>
                </div>

                {/* Right Interactive Workspace Panel */}
                {sidebarHidden && !selectedRoutine && (
                    <div className="flex-1 w-full text-center py-12">
                        <button
                            onClick={() => setSidebarHidden(false)}
                            className="bg-surface border border-subtle rounded-xl px-6 py-3 text-sm font-semibold text-muted hover:text-body hover:border-hover transition-all inline-flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                            </svg>
                            Show sidebar
                        </button>
                    </div>
                )}
                {selectedRoutine && (
                    <div className="flex-1 w-full bg-surface border border-subtle rounded-xl p-6 shadow-md space-y-6 relative animate-in fade-in slide-in-from-right-4 duration-300">

                        {/* Header Details Wrapper with Dropdown Flow Control */}
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex-1 mr-4">
                                {sidebarHidden && (
                                    <button
                                        onClick={() => setSidebarHidden(false)}
                                        className="text-xs font-semibold text-dim hover:text-body transition-colors mb-2 block"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                )}
                                <h2 className="font-display text-2xl font-bold text-accent uppercase tracking-wide flex items-center gap-3">
                                    {selectedRoutine.name}
                                </h2>

                                {selectedRoutine.note && (
                                    <p className="font-sans text-sm text-muted mt-2 bg-card/30 p-3 rounded-xl border border-subtle/40">{selectedRoutine.note}</p>
                                )}
                            </div>

                            <div className="flex gap-2 shrink-0">
                                <Button
                                    type="button"
                                    onClick={() => setShowDetailsDropdown(true)}
                                    variant="secondary"
                                    className="px-3 py-1.5 text-xs font-medium"
                                >
                                    Modify Details
                                </Button>

                                <CloseButton onClick={() => setSelectedRoutine(null)} floating={false} />
                            </div>
                        </div>

                        <hr className="border-none border-t border-subtle/60" />

                        {/* Exercises List Display Block */}
                        <h3 className="font-sans text-xs font-bold tracking-widest text-accent uppercase">Routine Exercices</h3>
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
                            <h3 className="font-sans text-xs font-bold tracking-widest text-accent uppercase mb-3">Add New Exercise to Template</h3>

                            <div className="flex flex-col gap-4">
                                <Button
                                    variant="secondary"
                                    fullWidth
                                    className="py-4 border-dashed border-subtle hover:border-accent/50 hover:bg-accent/5 transition-all text-sm font-semibold"
                                    onClick={() => setShowPicker(true)}
                                >
                                    + Add New Exercise Entry
                                </Button>
                            </div>
                        </div>

                        {/* Exercise Picker Modal */}
                        <Modal open={showPicker} onClose={() => setShowPicker(false)} maxWidth="xl">
                            <ExercisePicker
                                title="Add Exercise to Routine"
                                onSelect={handleLiveAddExercise}
                                onClose={() => setShowPicker(false)}
                            />
                        </Modal>
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

            <Modal open={showDetailsDropdown} onClose={() => setShowDetailsDropdown(false)} maxWidth="sm">
                <div className="bg-card border border-subtle rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                    <h3 className="font-display text-lg font-bold text-accent mb-4">Edit Core Metadata</h3>
                    <div className="flex flex-col gap-3">
                        <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Routine template name" className="w-full border border-subtle bg-surface rounded-xl px-4 py-2.5 text-sm text-body focus:border-accent focus:outline-none transition-all" />
                        <input value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="Template description notes" className="w-full border border-subtle bg-surface rounded-xl px-4 py-2.5 text-sm text-body focus:border-accent focus:outline-none transition-all" />
                    </div>
                    <div className="flex gap-2 justify-end mt-4">
                        <Button type="button" onClick={() => setShowDetailsDropdown(false)} variant="secondary" className="px-4 py-2 text-xs">Cancel</Button>
                        <Button type="button" onClick={saveRoutineEdit} variant="primary" className="px-4 py-2 text-xs">Save Changes</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
