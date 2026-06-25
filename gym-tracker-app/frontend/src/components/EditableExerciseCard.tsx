import React, { useState, useEffect } from 'react';
import TransparentNumericInput from './TransparentNumericInput';
import DeleteButton from './DeleteButton';

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
    goalWeight?: number | null;
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
    goalWeight,
    onRemoveExercise,
    onAddSet,
    onRemoveSet,
    onUpdateSet,
    onBlurSet
}: EditableExerciseCardProps) {
    const [isAddingSet, setIsAddingSet] = useState(false);
    const [showNoteForm, setShowNoteForm] = useState(false);
    const [addError, setAddError] = useState("");
    const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set());

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
                {goalWeight ? (
                    <div className="flex items-center justify-center gap-2 mt-1 text-xs">
                        <span className="text-dim">Goal: {goalWeight} kg</span>
                        {(() => {
                            const bestWeight = Math.max(...sets.map(s => s.weight ?? 0));
                            if (bestWeight <= 0) return null;
                            const diff = goalWeight - bestWeight;
                            const achieved = diff <= 0;
                            return (
                                <span className={`font-semibold text-center ${achieved ? 'text-accent' : 'text-amber-400'}`}>
                                    {achieved ? '✓' : `${diff.toFixed(1)} kg left`}
                                </span>
                            );
                        })()}
                    </div>
                ) : null}
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
                            {goalWeight && <div className="col-span-2">Goal</div>}
                            {showNotesField && <div className={goalWeight ? "col-span-2" : "col-span-4"}>Note</div>}
                            <div className="col-span-1 text-right"></div>
                        </div>

                        {/* Metrics Data Loop Rows */}
                        <div className="space-y-2">
                            {sets.map((set) => (
                                <div key={set.id} className="space-y-0">
                                    <div
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

                                        {/* Goal Delta Column */}
                                        {goalWeight && (
                                            <div className="col-span-2 md:col-span-2">
                                                <span className="text-[9px] font-mono uppercase text-dim block mb-1 md:hidden">Goal</span>
                                                {set.weight ? (
                                                    (() => {
                                                        const diff = goalWeight - set.weight;
                                                        const achieved = diff <= 0;
                                                        return (
                                                            <span className={`text-xs font-mono font-semibold ${achieved ? 'text-center text-accent' : 'text-amber-400'}`}>
                                                                {achieved ? '✓' : `-${diff.toFixed(1)} kg`}
                                                            </span>
                                                        );
                                                    })()
                                                ) : (
                                                    <span className="text-dim text-xs">—</span>
                                                )}
                                            </div>
                                        )}

                                        {/* Readable Row Note Toggle Button */}
                                        {showNotesField && (
                                        <div className={`col-span-2 ${goalWeight ? 'md:col-span-2' : 'md:col-span-4'}`}>
                                            <span className="text-[9px] font-mono uppercase text-dim block mb-1 md:hidden">Note</span>
                                            {expandedNotes.has(set.id) ? (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const next = new Set(expandedNotes);
                                                        next.delete(set.id);
                                                        setExpandedNotes(next);
                                                    }}
                                                    className="flex items-center gap-1.5 text-xs font-mono transition-all rounded-lg px-2 py-1.5 border bg-accent/10 border-accent/30 text-accent"
                                                    title="Close note"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M12 20h9" />
                                                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                                    </svg>
                                                </button>
                                            ) : set.note ? (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const next = new Set(expandedNotes);
                                                        next.add(set.id);
                                                        setExpandedNotes(next);
                                                    }}
                                                    className="flex items-center gap-1.5 text-xs font-mono transition-all rounded-lg px-2 py-1.5 border bg-transparent border-subtle text-dim hover:text-accent hover:border-accent/40"
                                                    title="Show note"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M12 20h9" />
                                                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                                    </svg>
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const next = new Set(expandedNotes);
                                                        next.add(set.id);
                                                        setExpandedNotes(next);
                                                    }}
                                                    className="flex items-center gap-1.5 text-xs font-mono transition-all rounded-lg px-2 py-1.5 border bg-transparent border-subtle text-dim hover:text-accent hover:border-accent/40"
                                                    title="Add note"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <line x1="12" y1="5" x2="12" y2="19" />
                                                        <line x1="5" y1="12" x2="19" y2="12" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                        )}

                                        {/* Row Destruction Trigger Action */}
                                        <div className="col-span-4 md:col-span-1 text-right mt-2 md:mt-0 pt-2 md:pt-0 border-t border-subtle/40 md:border-0">
                                            <DeleteButton onClick={() => onRemoveSet(set.id)} />
                                        </div>
                                    </div>
                                    {showNotesField && expandedNotes.has(set.id) && (
                                        <div className="animate-in fade-in slide-in-from-top-1 duration-150 mt-2 space-y-2">
                                            <textarea
                                                rows={2}
                                                value={set.note || ""}
                                                onChange={e => onUpdateSet(set.id, 'note', e.target.value)}
                                                onBlur={() => onBlurSet(set.id)}
                                                placeholder="Add details..."
                                                className="w-full bg-card border border-subtle focus:border-accent/80 rounded-xl px-3 py-2 text-xs font-mono text-heading focus:outline-none transition-all resize-y"
                                            />
                                            <div className="flex gap-2 justify-end">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const next = new Set(expandedNotes);
                                                        next.delete(set.id);
                                                        setExpandedNotes(next);
                                                    }}
                                                    className="text-xs font-semibold text-muted hover:text-body px-3 py-1.5 bg-elevated rounded-lg hover:bg-hover transition-all"
                                                >
                                                    Close
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        onUpdateSet(set.id, 'note', '');
                                                        const next = new Set(expandedNotes);
                                                        next.delete(set.id);
                                                        setExpandedNotes(next);
                                                    }}
                                                    className="text-xs font-semibold text-rose-400 hover:text-rose-300 px-3 py-1.5 bg-rose-500/10 rounded-lg hover:bg-rose-500/20 transition-all flex items-center gap-1.5"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    )}
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
                        className="mt-3 mx-auto flex items-center justify-center w-10 h-10 rounded-full bg-surface border border-dashed border-subtle hover:border-accent hover:bg-surface/60 text-muted hover:text-accent transition-all"
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
                                        className={`w-full h-[32px] flex items-center justify-center rounded-lg border transition-all ${showNoteForm ? 'bg-accent/10 border-accent/30 text-accent' : 'bg-transparent border border-subtle text-dim hover:text-accent hover:border-accent/40'}`}
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
                                    className="w-full bg-card border border-subtle rounded-xl px-3 py-2 text-xs text-heading font-mono focus:outline-none focus:border-accent transition-colors resize-y shadow-inner"
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
                            <button type="submit" className="w-9 h-9 flex items-center justify-center rounded-full bg-accent/20 border border-accent/40 hover:bg-accent/30 text-accent hover:text-accent-hover transition-all" title="Add Set">
                                <span className="text-lg font-bold leading-none">+</span>
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}