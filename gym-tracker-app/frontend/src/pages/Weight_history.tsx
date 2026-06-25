import { useEffect, useMemo, useState, FormEvent } from "react";
import { apiFetch } from "../utils/api";
import Button from "../components/Button";
import Modal from "../components/Modal";
import Pagination from "../components/Pagination";
import TransparentNumericInput from "../components/TransparentNumericInput";
import DatePicker from "../components/DatePicker";
import Select from "../components/Select";
import DeleteButton from "../components/DeleteButton";
import EditButton from "../components/EditButton";
// 1. Import Recharts components
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import ErrorBanner from "../components/ErrorBanner";

interface WeightEntry {
    id: number;
    user_id: number;
    weight: number | string;
    date: string; // yyyy-mm-dd
}

const PAGE_SIZE = 10;

export default function WeightHistory() {
    const [entries, setEntries] = useState<WeightEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [editingId, setEditingId] = useState<number | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [weight, setWeight] = useState<number | "">("");
    const [date, setDate] = useState<string>(new Date().toLocaleDateString('en-CA'));


    // Pagination & sorting state
    const [currentPage, setCurrentPage] = useState(1);
    const [sortBy, setSortBy] = useState<'date' | 'weight'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [hidden, setHidden] = useState(false);

    const token = localStorage.getItem("user_login_token");
    const headers = useMemo(
        () => ({
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        }),
        [token]
    );

    useEffect(() => {
        fetchWeightHistory().finally(() => setIsLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [headers]);

    async function fetchWeightHistory() {
        try {
            setError(null);
            const res = await apiFetch("/api/user/weights", { headers });
            const data = await res.json();

            if (!data.success) {
                setError(data.error || "Failed to fetch weight history");
                return;
            }

            const rows: WeightEntry[] = data.data || [];
            setEntries(rows);
        } catch (err: any) {
            setError(err.message || "Failed to fetch weight history");
        }
    }

    // Map entry id → previous entry's weight (chronologically)
    const prevWeightMap = useMemo(() => {
        const sorted = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const map = new Map<number, number | null>();
        for (let i = 0; i < sorted.length; i++) {
            map.set(sorted[i].id, i > 0 ? Number(sorted[i - 1].weight) : null);
        }
        return map;
    }, [entries]);

    // Paginated & sorted slice for the list
    const sortedEntries = useMemo(() => {
        return [...entries].sort((a, b) => {
            let cmp: number;
            if (sortBy === 'date') {
                cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
            } else {
                cmp = Number(a.weight) - Number(b.weight);
            }
            return sortOrder === 'asc' ? cmp : -cmp;
        });
    }, [entries, sortBy, sortOrder]);

    const totalPages = Math.max(1, Math.ceil(sortedEntries.length / PAGE_SIZE));

    // Clamp page when entries change (e.g. after delete)
    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [totalPages, currentPage]);

    const paginatedEntries = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return sortedEntries.slice(start, start + PAGE_SIZE);
    }, [sortedEntries, currentPage]);

    // 2. Prepare chart data (Sorted chronologically from oldest to newest)
    const chartData = useMemo(() => {
        return [...entries]
            .map(entry => ({
                ...entry,
                displayDate: entry.date?.slice(5, 10), // Simplifies yyyy-mm-dd to mm-dd for clean X-axis labels
                weightNum: Number(entry.weight)
            }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [entries]);

    function resetForm() {
        setEditingId(null);
        setWeight("");
        setDate(new Date().toLocaleDateString('en-CA'));
        setError(null);
        setShowAddModal(false);
    }

    function handleEdit(entry: WeightEntry) {
        setEditingId(entry.id);
        setWeight(Number(entry.weight));
        setDate(entry.date?.slice(0, 10));
        setError(null);
        setShowAddModal(true);
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (weight === "" || !date) return;

        try {
            setError(null);

            if (editingId) {
                const res = await apiFetch("/api/user/weights", {
                    method: "PUT",
                    headers,
                    body: JSON.stringify({
                        id: editingId,
                        weight: Number(weight),
                        date,
                    }),
                });
                const data = await res.json();
                if (!data.success) {
                    setError(data.error || "Failed to update weight");
                    return;
                }
            } else {
                const res = await apiFetch("/api/user/weights", {
                    method: "POST",
                    headers,
                    body: JSON.stringify({
                        weight: Number(weight),
                        date,
                    }),
                });
                const data = await res.json();
                if (!data.success) {
                    setError(data.error || "Failed to add weight");
                    return;
                }
            }

            await fetchWeightHistory();
            if (!editingId) setCurrentPage(1);
            resetForm();
        } catch (err: any) {
            setError(err.message || "Failed to save weight");
        }
    }

    async function handleDelete(id: number) {
        try {
            setError(null);
            const res = await apiFetch(`/api/user/weights/${id}`, {
                method: "DELETE",
                headers,
            });
            const data = await res.json();

            if (!data.success) {
                setError(data.error || "Failed to delete weight");
                return;
            }

            setEntries(prev => prev.filter(e => e.id !== id));
            if (editingId === id) resetForm();
        } catch (err: any) {
            setError(err.message || "Failed to delete weight");
        }
    }

    if (isLoading) return <div className="p-8 text-muted font-medium animate-pulse">Loading weight history...</div>;

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8 mt-4 md:mt-8 space-y-8">
            <div>
                <h1 className="font-display text-4xl font-bold tracking-tight uppercase italic text-accent">Weight History</h1>
            </div>

            {error && <ErrorBanner message={error} />}

            <div className="w-full bg-card border border-subtle rounded-xl p-6 shadow-xl">
                <h3 className="font-display text-lg font-bold text-heading tracking-wide uppercase mb-4">
                    Progress Overview
                </h3>
                {entries.length > 0 ? (
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                <XAxis
                                    dataKey="displayDate"
                                    stroke="#71717a"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    dy={10}
                                />
                                <YAxis
                                    stroke="#71717a"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    domain={['dataMin - 3', 'dataMax + 3']}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#09090b',
                                        borderColor: '#27272a',
                                        borderRadius: '8px',
                                        color: '#f4f4f5'
                                    }}
                                    itemStyle={{ color: 'var(--accent)' }}
                                    labelClassName="text-dim text-xs font-semibold"
                                    formatter={(value) => [`${value} kg`, 'Weight']}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="weightNum"
                                    stroke="var(--accent)"
                                    strokeWidth={3}
                                    dot={{ fill: 'var(--accent)', strokeWidth: 2, r: 4 }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="h-[250px] w-full flex items-center justify-center bg-surface/30 rounded-lg border border-subtle/50">
                        <p className="text-dim font-medium italic text-sm">
                            Add weight entries to see your progress chart.
                        </p>
                    </div>
                )}
            </div>

            <div className="flex gap-6 items-start flex-col md:flex-row">
                {/* Form */}
                <div className="flex-none w-full md:w-[350px]">
                    <Button
                        onClick={() => { resetForm(); setShowAddModal(true); }}
                        variant="primary"
                        fullWidth
                        className="!py-3"
                    >
                        Add Weight Entry
                    </Button>
                </div>

                <Modal open={showAddModal} onClose={() => { resetForm(); }} maxWidth="sm">
                    <div className="bg-card border border-subtle rounded-xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                        <h3 className="font-display text-lg font-bold text-accent mb-4">
                            {editingId ? "Edit Weight Entry" : "Add Weight Entry"}
                        </h3>
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <TransparentNumericInput
                                placeholder="Weight (kg)"
                                value={weight}
                                onChange={(val) => setWeight(val === "" ? "" : Number(val))}
                                className="w-full"
                                inputClassName="px-4 py-3 text-body placeholder:text-dim bg-surface border-subtle"
                                step={0.1}
                                min={0}
                                max={500}
                            />
                            <DatePicker value={date} onChange={setDate} />

                            <div className="flex gap-2 justify-end mt-1">
                                <Button type="button" onClick={resetForm} variant="secondary" className="px-4 py-2 text-xs">Cancel</Button>
                                <Button type="submit" variant="primary" className="px-4 py-2 text-xs">
                                    {editingId ? "Update" : "Add Entry"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </Modal>

                {/* List */}
                <div className="flex-1 w-full bg-card border border-subtle rounded-xl p-6 shadow-xl">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <h2 className="font-display text-lg font-bold text-heading tracking-wide uppercase">Entries</h2>
                            <button
                                onClick={() => setHidden(h => !h)}
                                className="text-xs font-semibold text-dim hover:text-body transition-colors"
                            >
                                {hidden ? `Show (${entries.length})` : 'Hide'}
                            </button>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                            <span className="text-dim">Sort by</span>
                            <div className="w-28">
                                <Select
                                    value={sortBy}
                                    onChange={v => { setSortBy(v as 'date' | 'weight'); setCurrentPage(1); }}
                                    options={[
                                        { value: 'date', label: 'Date' },
                                        { value: 'weight', label: 'Weight' },
                                    ]}
                                    buttonClassName="px-2 py-1 text-xs text-left"
                                />
                            </div>
                            <button
                                onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
                                className="bg-surface border border-subtle rounded px-2 py-1 text-xs text-body hover:border-accent transition-colors"
                                title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                            >
                                {sortOrder === 'asc' ? '\u2191' : '\u2193'}
                            </button>
                        </div>
                    </div>
                    {hidden ? null : entries.length === 0 ? (
                        <div className="text-center py-10 bg-surface/50 rounded-lg border border-subtle/80">
                            <p className="text-dim font-medium italic">No weight entries yet.</p>
                        </div>
                    ) : (
                        <>
                            <ul className="space-y-3">
                                {paginatedEntries.map(entry => (
                                    <li
                                        key={entry.id}
                                        className="bg-surface/40 border border-subtle/80 rounded-lg p-4 flex justify-between items-center hover:border-hover transition-colors"
                                    >
                                        <div>
                                            <strong className="text-xl font-bold text-body">{Number(entry.weight)} kg</strong>
                                            {(() => {
                                                const prev = prevWeightMap.get(entry.id);
                                                if (prev === null || prev === undefined) return null;
                                                const diff = Number(entry.weight) - prev;
                                                const sign = diff > 0 ? '+' : '';
                                                return (
                                                    <span className={`ml-2 text-sm font-semibold ${diff > 0 ? 'text-accent' : diff < 0 ? 'text-rose-400' : 'text-dim'}`}>
                                                        ({sign}{diff.toFixed(1)} kg)
                                                    </span>
                                                );
                                            })()}
                                            <div className="text-sm text-dim font-medium mt-1">{entry.date?.slice(0, 10)}</div>
                                        </div>
                                        <div className="flex gap-2 shrink-0">
                                            <EditButton onClick={() => handleEdit(entry)} />
                                            <DeleteButton onClick={() => handleDelete(entry.id)} />
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            <Pagination
                                page={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                                compact
                            />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}