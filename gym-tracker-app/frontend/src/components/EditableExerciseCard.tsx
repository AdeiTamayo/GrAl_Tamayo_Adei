import React, { useState, useEffect } from 'react';
import TransparentNumericInput from './TransparentNumericInput';

export interface GenericSet {
    id: number;
    set_number: number;
    weight: number | null;
    reps: number | null;
    time: number | null;
    note?: string | null;
}

interface EditableExerciseCardProps {
    exerciseName: string;
    exerciseOrder?: number;
    sets: GenericSet[];
    showNotesField?: boolean;
    onRemoveExercise: () => void;
    onAddSet: (weight: number | null, reps: number | null, time: number | null, note: string | null) => void;
    onRemoveSet: (setId: number) => void;
    onUpdateSet: (setId: number, field: 'weight' | 'reps' | 'time' | 'note', value: string) => void;
    onBlurSet: (setId: number) => void;
}

export default function EditableExerciseCard({
    exerciseName,
    sets,
    showNotesField = false,
    onRemoveExercise,
    onAddSet,
    onRemoveSet,
    onUpdateSet,
    onBlurSet
}: EditableExerciseCardProps) {
    const [isAddingSet, setIsAddingSet] = useState(false);
    const [showNoteForm, setShowNoteForm] = useState(false);
    const [addError, setAddError] = useState("");

    const setsExist = sets.length > 0;
    const lastSet = setsExist ? sets[sets.length - 1] : null;

    // Local addition form element inputs
    const [newWeight, setNewWeight] = useState<string>("");
    const [newReps, setNewReps] = useState<string>("");
    const [newTime, setNewTime] = useState<string>("");
    const [newNote, setNewNote] = useState<string>("");

    // Keep fields synchronized when underlying components append metrics
    useEffect(() => {
        if (lastSet) {
            setNewWeight(lastSet.weight?.toString() || "");
            setNewReps(lastSet.reps?.toString() || "");
            setNewTime(lastSet.time?.toString() || "");
            setNewNote(lastSet.note || "");
        } else {
            setNewWeight("");
            setNewReps("");
            setNewTime("");
            setNewNote("");
        }
    }, [sets, lastSet]);

    const handleAddSetSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWeight && !newReps && !newTime) {
            setAddError("Fill in at least one field");
            return;
        }
        setAddError("");
        onAddSet(
            newWeight ? Number(newWeight) : null,
            newReps ? Number(newReps) : null,
            newTime ? Number(newTime) : null,
            newNote || null
        );
        setIsAddingSet(false);
        setShowNoteForm(false);
    };

    return (
        <div className="bg-surface border border-subtle rounded-xl p-5 shadow-sm">
            {/* Component Action Bar Header */}
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-subtle/60">
                <h4 className="font-display font-bold text-body uppercase tracking-wide text-base">
                    {exerciseName}
                </h4>
                <button
                    type="button"
                    onClick={onRemoveExercise}
                    className="text-dim hover:text-rose-400 text-xs font-semibold tracking-wider uppercase transition-colors"
                >
                    Remove
                </button>
            </div>

            {/* Content Body Block */}
            <div className="space-y-3">
                {/* Fluid Responsive Grid Implementation */}
                {setsExist && (
                    <div className="space-y-2">
                        {/* Widescreen Columns Headers Metadata Labelings */}
                        <div className="hidden md:grid grid-cols-12 gap-3 px-2 text-[10px] font-mono font-bold uppercase tracking-widest text-dim pb-1">
                            <div className="col-span-1">Set</div>
                            <div className="col-span-2">Weight (kg)</div>
                            <div className="col-span-2">Reps</div>
                            <div className="col-span-2">Time (s)</div>
                            {showNotesField && <div className="col-span-4">Notes</div>}
                            <div className="col-span-1 text-right"></div>
                        </div>

                        {/* Metrics Data Loop Rows */}
                        <div className="space-y-2">
                            {sets.map((set) => (
                                <div
                                    key={set.id}
                                    className="grid grid-cols-4 md:grid-cols-12 gap-2 md:gap-3 items-center bg-card/40 md:bg-transparent border border-subtle/40 md:border-none p-3 md:p-0 rounded-xl md:rounded-none group"
                                >
                                    {/* Set Index Metric Node */}
                                    <div className="col-span-4 md:col-span-1 flex items-center justify-between md:block border-b border-subtle/40 md:border-0 pb-2 md:pb-0 mb-1 md:mb-0">
                                        <span className="text-[10px] font-mono uppercase text-dim md:hidden">Set Count</span>
                                        <span className="text-muted font-black font-mono text-sm bg-surface md:bg-transparent px-2.5 py-1 md:p-0 rounded-md">
                                            {set.set_number}
                                        </span>
                                    </div>

                                    {/* Mass Weight Input Wrapper */}
                                    <div className="col-span-2 md:col-span-2">
                                        <span className="text-[9px] font-mono uppercase text-dim block mb-1 md:hidden">Weight</span>
                                        <TransparentNumericInput
                                            value={set.weight ?? ""}
                                            onChange={(val) => onUpdateSet(set.id, 'weight', val)}
                                            max={999}
                                            step={2.5}
                                        />
                                    </div>

                                    {/* Repeat Executions Wrapper */}
                                    <div className="col-span-2 md:col-span-2">
                                        <span className="text-[9px] font-mono uppercase text-dim block mb-1 md:hidden">Reps</span>
                                        <TransparentNumericInput
                                            value={set.reps ?? ""}
                                            onChange={(val) => onUpdateSet(set.id, 'reps', val)}
                                            max={100}
                                            step={1}
                                        />
                                    </div>

                                    {/* Temporal Duration Trackings */}
                                    <div className="col-span-2 md:col-span-2">
                                        <span className="text-[9px] font-mono uppercase text-dim block mb-1 md:hidden">Time (s)</span>
                                        <TransparentNumericInput
                                            value={set.time ?? ""}
                                            onChange={(val) => onUpdateSet(set.id, 'time', val)}
                                            max={3600}
                                            step={5}
                                        />
                                    </div>

                                    {/* Readable Row Note Area field */}
                                    {showNotesField && (
                                        <div className="col-span-2 md:col-span-4">
                                            <span className="text-[9px] font-mono uppercase text-dim block mb-1 md:hidden">Notes</span>
                                            <textarea
                                                rows={1}
                                                value={set.note || ""}
                                                onChange={e => onUpdateSet(set.id, 'note', e.target.value)}
                                                onBlur={() => onBlurSet(set.id)}
                                                className="w-full bg-card border border-subtle focus:border-lime-400/80 rounded-xl px-3 py-1.5 text-heading text-xs font-mono focus:outline-none transition-all resize-y min-h-[34px]"
                                                placeholder="Add details..."
                                            />
                                        </div>
                                    )}

                                    {/* Row Destruction Trigger Action */}
                                    <div className="col-span-4 md:col-span-1 text-right mt-2 md:mt-0 pt-2 md:pt-0 border-t border-subtle/40 md:border-0">
                                        <button
                                            type="button"
                                            onClick={() => onRemoveSet(set.id)}
                                            className="w-full md:w-auto text-center bg-rose-950/20 md:bg-transparent hover:bg-rose-900/20 md:hover:bg-transparent border border-rose-900/30 md:border-none rounded-lg py-1.5 md:py-0 text-rose-500/70 hover:text-rose-400 px-2 text-xs md:text-sm transition-all"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Explicit Structural CSS Form Layout Grid */}
                {!isAddingSet ? (
                    <button
                        type="button"
                        onClick={() => { setIsAddingSet(true); setAddError(""); }}
                        className="mt-3 mx-auto flex items-center justify-center w-10 h-10 rounded-full bg-surface border border-dashed border-subtle hover:border-lime-400 hover:bg-surface/60 text-muted hover:text-lime-400 transition-all"
                        title="Add Set"
                    >
                        <span className="text-lg font-bold leading-none">+</span>
                    </button>
                ) : (
                    <form onSubmit={handleAddSetSubmit} className="grid grid-cols-1 gap-4 bg-card/40 p-4 rounded-xl border border-subtle mt-3 shadow-sm animate-in fade-in zoom-in-95 duration-150">
                        {/* Fields Sub-Grid Row Container */}
                        <div className="grid grid-cols-4 gap-3">
                            <div>
                                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-dim mb-1.5">Weight</label>
                                <TransparentNumericInput value={newWeight} onChange={setNewWeight} max={999} step={2.5} className="w-full" inputClassName="pl-2.5 pr-8 py-2.5 text-sm font-mono text-body" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-dim mb-1.5">Reps</label>
                                <TransparentNumericInput value={newReps} onChange={setNewReps} max={100} step={1} className="w-full" inputClassName="pl-2.5 pr-8 py-2.5 text-sm font-mono text-body" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-dim mb-1.5">Time (s)</label>
                                <TransparentNumericInput value={newTime} onChange={setNewTime} max={3600} step={5} className="w-full" inputClassName="pl-2.5 pr-8 py-2.5 text-sm font-mono text-body" />
                            </div>
                            {showNotesField && (
                                <div>
                                    <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-dim mb-1.5">Note</label>
                                    <button
                                        type="button"
                                        onClick={() => setShowNoteForm(!showNoteForm)}
                                        className={`w-full h-[32px] flex items-center justify-center rounded-lg border transition-all ${showNoteForm ? 'bg-lime-500/10 border-lime-500/30 text-lime-400' : 'bg-transparent border border-subtle text-dim hover:text-lime-400 hover:border-lime-400/40'}`}
                                        title={showNoteForm ? 'Hide note' : 'Add note'}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 20h9" />
                                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Note textarea (shown when toggle is active) */}
                        {showNotesField && showNoteForm && (
                            <div className="animate-in fade-in slide-in-from-top-1 duration-150">
                                <textarea
                                    rows={3}
                                    value={newNote}
                                    onChange={e => setNewNote(e.target.value)}
                                    placeholder="Specify variables (e.g., dropset, partial reps, warm-up pacing...)"
                                    className="w-full bg-card border border-subtle rounded-xl px-3 py-2 text-xs text-heading font-mono focus:outline-none focus:border-lime-400 transition-colors resize-y shadow-inner"
                                />
                            </div>
                        )}

                        {addError && (
                            <p className="text-[11px] font-mono text-rose-400 text-center">{addError}</p>
                        )}

                        {/* Primary Interaction Buttons Block */}
                        <div className="flex gap-2 w-full justify-end pt-2 border-t border-subtle">
                            <button type="button" onClick={() => { setIsAddingSet(false); setShowNoteForm(false); }} className="w-full md:w-auto text-center bg-rose-950/20 md:bg-transparent hover:bg-rose-900/20 md:hover:bg-transparent border border-rose-900/30 md:border-none rounded-lg py-1.5 md:py-0 text-rose-500/70 hover:text-rose-400 px-2 text-xs md:text-sm transition-all" title="Cancel">
                                <span className="text-sm leading-none">✕</span>
                            </button>
                            <button type="submit" className="w-9 h-9 flex items-center justify-center rounded-full bg-lime-500/20 border border-lime-500/40 hover:bg-lime-500/30 text-lime-400 hover:text-lime-300 transition-all" title="Add Set">
                                <span className="text-lg font-bold leading-none">+</span>
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}