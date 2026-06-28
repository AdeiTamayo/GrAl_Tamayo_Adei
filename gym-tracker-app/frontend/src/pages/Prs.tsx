import { useState, useEffect, useMemo } from "react";
import { apiFetch } from "../utils/api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import Button from "../components/Button";
import Modal from "../components/Modal";
import Pagination from "../components/Pagination";
import TransparentNumericInput from "../components/TransparentNumericInput";
import ExercisePicker from "../components/ExercisePicker";
import DatePicker from "../components/DatePicker";
import ConfirmModal from "../components/ConfirmModal";
import DeleteButton from "../components/DeleteButton";
import EditButton from "../components/EditButton";
import CloseButton from "../components/CloseButton";
import ErrorBanner from "../components/ErrorBanner";
import LoadingSkeleton from "../components/LoadingSkeleton";
import Input from "../components/Input";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import Badge from "../components/Badge";

interface PRSummary {
    id: number;
    exercise_id: number;
    exercise_name: string;
    weight: string;
    repetitions: number;
    date: string;
    note: string | null;
}

interface PRHistory {
    id: number;
    weight: string;
    repetitions: number;
    date: string;
    note: string | null;
}

export default function PersonalRecords() {
    const [prSummary, setPrSummary] = useState<PRSummary[]>([]);
    const [selectedExerciseName, setSelectedExerciseName] = useState<string | null>(null);
    const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null);
    const [prHistory, setPrHistory] = useState<PRHistory[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Form state
    const [formExerciseId, setFormExerciseId] = useState<number | "">("");
    const [formExerciseName, setFormExerciseName] = useState("");
    const [newWeight, setNewWeight] = useState<number | "">("");
    const [newReps, setNewReps] = useState<number | "">("");
    const [newDate, setNewDate] = useState("");
    const [newNote, setNewNote] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    // UX states
    const [showAddForm, setShowAddForm] = useState(false);
    const [showPicker, setShowPicker] = useState(false);
    const [prsOpen, setPrsOpen] = useState(true);
    const [prPage, setPrPage] = useState(1);
    const PRS_PER_PAGE = 5;

    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
    const [editRecord, setEditRecord] = useState<{ id: number; weight: number | ""; repetitions: number | ""; date: string; note: string } | null>(null);

    const getHeaders = () => ({
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("user_login_token")}`
    });

    useEffect(() => {
        fetchPrSummary().finally(() => setLoading(false));
    }, []);

    async function fetchPrSummary() {
        try {
            const res = await apiFetch("/api/prs", { headers: getHeaders() });
            const data = await res.json();
            if (data.success) {
                setPrSummary(data.data);
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load PR summary");
        }
    }

    async function fetchPrHistory(exerciseId: number, exerciseName: string) {
        try {
            const res = await apiFetch(`/api/prs/${exerciseId}/history`, { headers: getHeaders() });
            const data = await res.json();
            if (data.success) {
                const sortedHistory = (data.data as PRHistory[]).sort(
                    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                );
                setPrHistory(sortedHistory);
                setSelectedExerciseName(exerciseName);
                setSelectedExerciseId(exerciseId);
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load history data");
        }
    }

    async function createPR(e: React.FormEvent) {
        e.preventDefault();
        setIsCreating(true);
        setError(null);
        try {
            const res = await apiFetch("/api/prs", {
                method: "POST",
                headers: getHeaders(),
                body: JSON.stringify({
                    exercise_id: formExerciseId,
                    weight: newWeight,
                    repetitions: newReps,
                    date: newDate || undefined,
                    note: newNote || undefined
                })
            });
            const data = await res.json();
            if (data.success) {
                fetchPrSummary();
                setFormExerciseId("");
                setFormExerciseName("");
                setNewWeight("");
                setNewReps("");
                setNewDate("");
                setNewNote("");
                setShowAddForm(false);

                if (formExerciseId === selectedExerciseId && selectedExerciseName) {
                    fetchPrHistory(selectedExerciseId, selectedExerciseName);
                }
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred while creating entry");
        } finally {
            setIsCreating(false);
        }
    }

    async function deletePR(prId: number) {
        try {
            const res = await apiFetch(`/api/prs/${prId}`, {
                method: "DELETE",
                headers: getHeaders()
            });
            const data = await res.json();
            if (data.success) {
                fetchPrSummary();
                if (selectedExerciseId && selectedExerciseName) {
                    fetchPrHistory(selectedExerciseId, selectedExerciseName);
                }
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred while deleting entry");
        }
    }

    async function updatePR() {
        if (!editRecord) return;
        try {
            const res = await apiFetch(`/api/prs/${editRecord.id}`, {
                method: "PUT",
                headers: getHeaders(),
                body: JSON.stringify({
                    weight: editRecord.weight,
                    repetitions: editRecord.repetitions,
                    date: editRecord.date,
                    note: editRecord.note || undefined
                })
            });
            const data = await res.json();
            if (data.success) {
                setEditRecord(null);
                fetchPrSummary();
                if (selectedExerciseId && selectedExerciseName) {
                    fetchPrHistory(selectedExerciseId, selectedExerciseName);
                }
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred while updating entry");
        }
    }

    const chartData = useMemo(() => {
        return [...prHistory]
            .map(h => ({
                date: h.date?.substring(0, 10),
                weight: parseFloat(h.weight),
                reps: h.repetitions
            }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [prHistory]);

    const currentMaxRecordId = useMemo(() => {
        if (prHistory.length === 0) return null;
        return [...prHistory].sort((a, b) => parseFloat(b.weight) - parseFloat(a.weight))[0]?.id;
    }, [prHistory]);

    if (loading) return <div className="p-8"><LoadingSkeleton type="page" /></div>;

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 mt-4 md:mt-8 space-y-8 animate-in fade-in duration-200">
            <div>
                <h1 className="font-display text-4xl font-bold tracking-tight uppercase italic text-accent">Personal Records</h1>
            </div>
            {error && <ErrorBanner message={error} />}

            <div className="flex gap-6 items-start flex-col lg:flex-row">
                <div className="flex-none w-full lg:w-[450px] space-y-6">
                    <Button
                        onClick={() => {
                            setFormExerciseId("");
                            setFormExerciseName("");
                            setNewWeight("");
                            setNewReps("");
                            setNewDate("");
                            setNewNote("");
                            setShowAddForm(true);
                        }}
                        variant="primary"
                        fullWidth
                        className="!py-3"
                    >
                        Log a PR
                    </Button>

                    <Modal open={showAddForm} onClose={() => setShowAddForm(false)} maxWidth="sm">
                        <Card variant="default" padding="lg" className="rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                            <h3 className="font-display text-lg font-bold text-accent mb-4">Log a PR</h3>
                            <form onSubmit={createPR} className="flex flex-col gap-4">
                                <button
                                    type="button"
                                    onClick={() => setShowPicker(true)}
                                    className="w-full border border-subtle bg-surface rounded-lg px-4 py-3 text-left text-body hover:border-hover transition-colors"
                                >
                                    {formExerciseName || <span className="text-dim">Select Exercise</span>}
                                </button>
                                <Modal open={showPicker} onClose={() => setShowPicker(false)} maxWidth="xl">
                                    <ExercisePicker
                                        title="Select Exercise"
                                        onSelect={(ex) => {
                                            setFormExerciseId(ex.id);
                                            setFormExerciseName(ex.name);
                                            setShowPicker(false);
                                        }}
                                        onClose={() => setShowPicker(false)}
                                    />
                                </Modal>
                                <div className="grid grid-cols-2 gap-4">
                                    <TransparentNumericInput
                                        placeholder="Weight (kg)"
                                        value={newWeight}
                                        onChange={(val) => setNewWeight(val === "" ? "" : Number(val))}
                                        className="w-full"
                                        inputClassName="w-full border border-subtle bg-surface rounded-lg px-4 py-3 text-body placeholder:text-dim focus:border-accent focus:outline-none transition-colors"
                                        step={0.1}
                                        min={0}
                                        max={999}
                                    />
                                    <TransparentNumericInput
                                        placeholder="Reps"
                                        value={newReps}
                                        onChange={(val) => setNewReps(val === "" ? "" : Number(val))}
                                        className="w-full"
                                        inputClassName="w-full border border-subtle bg-surface rounded-lg px-4 py-3 text-body placeholder:text-dim focus:border-accent focus:outline-none transition-colors"
                                        step={1}
                                        min={0}
                                        max={999}
                                    />
                                </div>
                                <DatePicker value={newDate} onChange={setNewDate} placeholder="Select date" />
                                <Input
                                    type="text"
                                    placeholder="Note (optional)"
                                    value={newNote}
                                    onChange={e => setNewNote(e.target.value)}
                                    inputSize="lg"
                                />
                                <div className="flex gap-2 justify-end mt-1">
                                    <Button type="button" onClick={() => setShowAddForm(false)} variant="secondary" className="px-4 py-2 text-xs">Cancel</Button>
                                    <Button type="submit" disabled={isCreating || !formExerciseId} variant="primary" className="px-4 py-2 text-xs">
                                        {isCreating ? "Adding..." : "Log PR"}
                                    </Button>
                                </div>
                            </form>
                        </Card>
                    </Modal>

                    <Card padding="lg" className="shadow-xl">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="font-display text-lg font-bold text-heading tracking-wide uppercase">Current Best PRs</h2>
                            <button
                                onClick={() => setPrsOpen(!prsOpen)}
                                className="text-xs font-medium text-dim hover:text-body transition-colors px-2 py-1 rounded-lg hover:bg-elevated"
                            >
                                {prsOpen ? "Hide" : `Show (${prSummary.length})`}
                            </button>
                        </div>
                        {prsOpen && (
                            prSummary.length === 0 ? (
                                <EmptyState message="No PRs recorded yet. Go lift something heavy!" />
                            ) : (
                                <>
                                    <ul className="space-y-3 list-none">
                                        {prSummary.slice((prPage - 1) * PRS_PER_PAGE, prPage * PRS_PER_PAGE).map(pr => (
                                            <li
                                                key={pr.id}
                                                className={`bg-surface/40 border border-subtle/80 rounded-lg p-4 hover:border-accent/50 hover:bg-surface transition-all ${selectedExerciseId === pr.exercise_id ? 'border-accent/50 bg-surface shadow-md ring-1 ring-accent/20' : ''}`}
                                            >
                                                <div
                                                    className="flex justify-between items-center cursor-pointer"
                                                    onClick={() => { setPrPage(1); fetchPrHistory(pr.exercise_id, pr.exercise_name); }}
                                                >
                                                    <div>
                                                        <strong className="text-lg font-bold text-accent capitalize">{pr.exercise_name}</strong>
                                                        <div className="text-sm text-dim font-medium mt-1">{pr.date?.substring(0, 10)}</div>
                                                    </div>
                                                        <div className="text-right">
                                                            <span className="text-xl font-bold text-body">{pr.weight} kg</span>
                                                            <div className="text-sm text-muted font-medium mt-1">{pr.repetitions} reps</div>
                                                </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setFormExerciseId(pr.exercise_id);
                                                        setFormExerciseName(pr.exercise_name);
                                                        setShowAddForm(true);
                                                    }}
                                                    className="mt-2 text-xs font-semibold text-accent bg-accent/10 border border-accent/20 rounded-lg px-3 py-1 hover:bg-accent/20 transition-colors"
                                                >
                                                    + Add PR
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                    <Pagination
                                        page={prPage}
                                        totalPages={Math.ceil(prSummary.length / PRS_PER_PAGE)}
                                        onPageChange={setPrPage}
                                    />
                                </>
                            )
                        )}
                    </Card>
                </div>

                {/* Right Column: PR History Timeline */}
                {selectedExerciseName && (
                    <Card padding="lg" className="flex-1 w-full lg:p-8 shadow-xl animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex justify-between items-start mb-6">
                            <h2 className="font-display text-2xl font-bold text-accent tracking-wide uppercase">{selectedExerciseName} Progress</h2>
                            <CloseButton onClick={() => { setSelectedExerciseName(null); setSelectedExerciseId(null); }} floating={false} />
                        </div>

                        <div className="h-64 md:h-80 w-full mb-10 bg-surface/30 rounded-2xl p-4 border border-subtle/50">
                            {chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            stroke="#71717a"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={10}
                                        />
                                        <YAxis
                                            stroke="#71717a"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            unit="kg"
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '14px' }}
                                            itemStyle={{ color: 'var(--accent)' }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="weight"
                                            stroke="var(--accent)"
                                            strokeWidth={3}
                                            dot={{ fill: 'var(--accent)', r: 4, strokeWidth: 2, stroke: '#000' }}
                                            activeDot={{ r: 6, strokeWidth: 0 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-dim italic text-sm">No chart layout data found</div>
                            )}
                        </div>

                        <h3 className="font-display text-lg font-bold text-heading tracking-wide uppercase mb-6 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-accent rounded-full"></span>
                            History Timeline
                        </h3>

                        <ul className="relative pb-2 space-y-4 mt-4 list-none">
                            {prHistory.map((history) => (
                                <li key={history.id} className="relative">
                                    <div className="bg-surface/40 border border-subtle/80 rounded-xl p-2 md:p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-hover transition-colors">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-sm font-bold text-muted uppercase tracking-wider">{history.date?.substring(0, 10)}</span>
                                                {history.id === currentMaxRecordId && (
                                                    <Badge variant="accent">All-Time Best</Badge>
                                                )}
                                            </div>
                                            <div className="text-xl font-bold text-body">
                                                {history.weight} kg for {history.repetitions} reps
                                            </div>
                                            {history.note && <div className="mt-3 text-sm text-dim bg-surface p-3 rounded-lg border border-subtle"><span className="text-dim font-medium">Note:</span> {history.note}</div>}
                                        </div>
                                        <div className="flex gap-2 shrink-0">
                                            <EditButton onClick={() => setEditRecord({
                                                id: history.id,
                                                weight: parseFloat(history.weight) || "",
                                                repetitions: history.repetitions || "",
                                                date: history.date?.substring(0, 10) || "",
                                                note: history.note || ""
                                            })} />
                                            <DeleteButton onClick={() => setDeleteConfirmId(history.id)} />
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </Card>
                )}
            </div>

            {deleteConfirmId !== null && (
                <ConfirmModal
                    message="Are you sure you want to delete this PR?"
                    onConfirm={() => deletePR(deleteConfirmId)}
                    onCancel={() => setDeleteConfirmId(null)}
                    confirmLabel="Delete"
                />
            )}

            <Modal open={!!editRecord} onClose={() => setEditRecord(null)} maxWidth="sm" backdrop="darker">
                <Card variant="default" padding="lg" className="w-full rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                <h2 className="font-display text-lg font-bold text-body uppercase tracking-wide mb-4">Edit PR</h2>
                <div className="space-y-4">
                    <TransparentNumericInput
                        placeholder="Weight (kg)"
                        value={editRecord?.weight ?? ""}
                        onChange={(val) => editRecord && setEditRecord({ ...editRecord, weight: val === "" ? "" : Number(val) })}
                        className="w-full"
                        inputClassName="w-full border border-subtle bg-surface rounded-lg px-4 py-3 text-body placeholder:text-dim focus:border-accent focus:outline-none transition-colors"
                        step={0.1} min={0} max={999}
                    />
                    <TransparentNumericInput
                        placeholder="Reps"
                        value={editRecord?.repetitions ?? ""}
                        onChange={(val) => editRecord && setEditRecord({ ...editRecord, repetitions: val === "" ? "" : Number(val) })}
                        className="w-full"
                        inputClassName="w-full border border-subtle bg-surface rounded-lg px-4 py-3 text-body placeholder:text-dim focus:border-accent focus:outline-none transition-colors"
                        step={1} min={0} max={999}
                    />
                    <DatePicker value={editRecord?.date ?? ""} onChange={(date) => editRecord && setEditRecord({ ...editRecord, date })} placeholder="Select date" />
                    <Input
                        type="text"
                        placeholder="Note (optional)"
                        value={editRecord?.note ?? ""}
                        onChange={e => editRecord && setEditRecord({ ...editRecord, note: e.target.value })}
                        inputSize="lg"
                    />
                    <div className="space-y-3 pt-2">
                        <Button onClick={updatePR} variant="primary" fullWidth>
                            Save Changes
                        </Button>
                        <Button onClick={() => setEditRecord(null)} variant="secondary" fullWidth>
                            Cancel
                        </Button>
                    </div>
                </div>
            </Card>
            </Modal>
        </div>
    );
}
