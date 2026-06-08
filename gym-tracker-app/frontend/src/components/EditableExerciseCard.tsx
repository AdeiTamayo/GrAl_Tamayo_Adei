import React, { useState, useEffect } from 'react';
import Button from './Button';
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
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm">
            {/* Component Action Bar Header */}
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-zinc-800/60">
                <h4 className="font-display font-bold text-zinc-100 uppercase tracking-wide text-base">
                    {exerciseName}
                </h4>
                <button
                    type="button"
                    onClick={onRemoveExercise}
                    className="text-zinc-500 hover:text-rose-400 text-xs font-semibold tracking-wider uppercase transition-colors"
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
                        <div className="hidden md:grid grid-cols-12 gap-3 px-2 text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 pb-1">
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
                                    className="grid grid-cols-4 md:grid-cols-12 gap-2 md:gap-3 items-center bg-zinc-950/40 md:bg-transparent border border-zinc-800/40 md:border-none p-3 md:p-0 rounded-xl md:rounded-none group"
                                >
                                    {/* Set Index Metric Node */}
                                    <div className="col-span-4 md:col-span-1 flex items-center justify-between md:block border-b border-zinc-800/40 md:border-0 pb-2 md:pb-0 mb-1 md:mb-0">
                                        <span className="text-[10px] font-mono uppercase text-zinc-500 md:hidden">Set Count</span>
                                        <span className="text-zinc-400 font-black font-mono text-sm bg-zinc-900 md:bg-transparent px-2.5 py-1 md:p-0 rounded-md">
                                            {set.set_number}
                                        </span>
                                    </div>

                                    {/* Mass Weight Input Wrapper */}
                                    <div className="col-span-2 md:col-span-2">
                                        <span className="text-[9px] font-mono uppercase text-zinc-600 block mb-1 md:hidden">Weight</span>
                                        <TransparentNumericInput
                                            value={set.weight ?? ""}
                                            onChange={(val) => onUpdateSet(set.id, 'weight', val)}
                                            max={999}
                                            step={2.5}
                                        />
                                    </div>

                                    {/* Repeat Executions Wrapper */}
                                    <div className="col-span-2 md:col-span-2">
                                        <span className="text-[9px] font-mono uppercase text-zinc-600 block mb-1 md:hidden">Reps</span>
                                        <TransparentNumericInput
                                            value={set.reps ?? ""}
                                            onChange={(val) => onUpdateSet(set.id, 'reps', val)}
                                            max={100}
                                            step={1}
                                        />
                                    </div>

                                    {/* Temporal Duration Trackings */}
                                    <div className="col-span-2 md:col-span-2">
                                        <span className="text-[9px] font-mono uppercase text-zinc-600 block mb-1 md:hidden">Time (s)</span>
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
                                            <span className="text-[9px] font-mono uppercase text-zinc-600 block mb-1 md:hidden">Notes</span>
                                            <textarea
                                                rows={1}
                                                value={set.note || ""}
                                                onChange={e => onUpdateSet(set.id, 'note', e.target.value)}
                                                onBlur={() => onBlurSet(set.id)}
                                                className="w-full bg-zinc-950 border border-zinc-800 focus:border-lime-400/80 rounded-xl px-3 py-1.5 text-zinc-200 text-xs font-mono focus:outline-none transition-all resize-y min-h-[34px]"
                                                placeholder="Add details..."
                                            />
                                        </div>
                                    )}

                                    {/* Row Destruction Trigger Action */}
                                    <div className="col-span-4 md:col-span-1 text-right mt-2 md:mt-0 pt-2 md:pt-0 border-t border-zinc-800/40 md:border-0">
                                        <button
                                            type="button"
                                            onClick={() => onRemoveSet(set.id)}
                                            className="w-full md:w-auto text-center bg-rose-950/20 md:bg-transparent hover:bg-rose-900/20 md:hover:bg-transparent border border-rose-900/30 md:border-none rounded-lg py-1.5 md:py-0 text-rose-500/70 hover:text-rose-400 font-bold px-2 text-xs md:text-sm transition-all"
                                        >
                                            <span className="md:hidden mr-1">Delete Entry</span>✕
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Explicit Structural CSS Form Layout Grid */}
                {!isAddingSet ? (
                    <Button
                        type="button"
                        variant="secondary"
                        className="w-full py-2.5 rounded-xl border border-dashed border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/40 text-xs font-mono text-zinc-400 transition-all mt-2"
                        onClick={() => setIsAddingSet(true)}
                    >
                        + Add Set
                    </Button>
                ) : (
                    <form onSubmit={handleAddSetSubmit} className="grid grid-cols-1 gap-4 bg-zinc-950/40 p-4 rounded-xl border border-zinc-800 mt-3 shadow-sm animate-in fade-in zoom-in-95 duration-150">
                        {/* Fields Sub-Grid Row Container */}
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-500 mb-1">Weight</label>
                                <TransparentNumericInput value={newWeight} onChange={setNewWeight} max={999} step={2.5} />
                            </div>
                            <div>
                                <label className="block text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-500 mb-1">Reps</label>
                                <TransparentNumericInput value={newReps} onChange={setNewReps} max={100} step={1} />
                            </div>
                            <div>
                                <label className="block text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-500 mb-1">Time (s)</label>
                                <TransparentNumericInput value={newTime} onChange={setNewTime} max={3600} step={5} />
                            </div>
                        </div>

                        {/* Interactive Large Expandable Textarea Field Switcher */}
                        {showNotesField && (
                            <div className="w-full border-t border-zinc-900 pt-2">
                                {!showNoteForm ? (
                                    <button
                                        type="button"
                                        onClick={() => setShowNoteForm(true)}
                                        className="text-xs font-mono text-zinc-500 hover:text-lime-400 transition-colors flex items-center gap-1.5"
                                    >
                                        📝 {newNote ? 'Edit Set Note' : 'Add Set Note'}
                                    </button>
                                ) : (
                                    <div className="space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="block text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-500">Set Note Details</label>
                                            <button
                                                type="button"
                                                onClick={() => setShowNoteForm(false)}
                                                className="text-[10px] font-mono text-zinc-500 hover:text-zinc-300"
                                            >
                                                Hide Field
                                            </button>
                                        </div>
                                        <textarea
                                            rows={3}
                                            value={newNote}
                                            onChange={e => setNewNote(e.target.value)}
                                            placeholder="Specify variables (e.g., dropset, partial reps, warm-up pacing...)"
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-lime-400 transition-colors resize-y shadow-inner"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Primary Interaction Buttons Block */}
                        <div className="flex gap-2 w-full justify-end pt-2 border-t border-zinc-900">
                            <Button type="button" variant="secondary" className="px-3 py-2 text-xs rounded-xl" onClick={() => { setIsAddingSet(false); setShowNoteForm(false); }}>Cancel</Button>
                            <Button type="submit" variant="primary" className="px-4 py-2 text-xs rounded-xl">Add Set</Button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}