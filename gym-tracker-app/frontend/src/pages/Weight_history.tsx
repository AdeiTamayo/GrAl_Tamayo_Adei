import { useEffect, useMemo, useState, FormEvent } from "react";
import { apiFetch } from "../utils/api";
import TransparentNumericInput from "../components/TransparentNumericInput";
// 1. Import Recharts components
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface WeightEntry {
    id: number;
    user_id: number;
    weight: number | string;
    date: string; // yyyy-mm-dd
}

export default function WeightHistory() {
    const [entries, setEntries] = useState<WeightEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [editingId, setEditingId] = useState<number | null>(null);
    const [weight, setWeight] = useState<number | "">("");
    const [date, setDate] = useState<string>(new Date().toLocaleDateString('en-CA'));

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
    }

    function handleEdit(entry: WeightEntry) {
        setEditingId(entry.id);
        setWeight(Number(entry.weight));
        setDate(entry.date?.slice(0, 10));
        setError(null);
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

    if (isLoading) return <div className="p-8 text-zinc-400 font-medium animate-pulse">Loading weight history...</div>;

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8 mt-4 md:mt-8 space-y-8">
            <div>
                <h1 className="text-3xl font-display text-zinc-100 uppercase tracking-tight mb-2">Weight History</h1>
            </div>

            {error && <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg font-medium text-sm">Error: {error}</div>}

            {/* 3. Added Weight Progress Line Chart Graphic */}
            {entries.length > 0 && (
                <div className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl p-6 shadow-xl">
                    <h3 className="font-display text-lg font-bold text-zinc-200 tracking-wide uppercase mb-4">
                        Progress Overview
                    </h3>
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
                                    itemStyle={{ color: '#a3e635' }}
                                    labelClassName="text-zinc-500 text-xs font-semibold"
                                    formatter={(value) => [`${value} kg`, 'Weight']}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="weightNum"
                                    stroke="#a3e635" /* lime-400 matched */
                                    strokeWidth={3}
                                    dot={{ fill: '#a3e635', strokeWidth: 2, r: 4 }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            <div className="flex gap-6 items-start flex-col md:flex-row">
                {/* Form */}
                <div className="flex-none w-full md:w-[350px] bg-zinc-950/80 border border-zinc-800 rounded-xl p-6 shadow-xl">
                    <h3 className="font-display text-lg font-bold text-zinc-200 tracking-wide uppercase mb-5">
                        {editingId ? "Edit Weight Entry" : "Add Weight Entry"}
                    </h3>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <TransparentNumericInput
                            placeholder="Weight (kg)"
                            value={weight}
                            onChange={(val) => setWeight(val === "" ? "" : Number(val))}
                            className="w-full"
                            inputClassName="px-4 py-3 text-zinc-100 placeholder:text-zinc-600 bg-zinc-900 border-zinc-800"
                            step={0.1}
                            min={0}
                            max={500}
                        />
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            required
                            className="w-full border border-zinc-800 bg-zinc-900 rounded-lg px-4 py-3 text-zinc-100 focus:border-lime-400 focus:outline-none transition-colors [color-scheme:dark]"
                        />

                        <div className="flex gap-3 mt-2">
                            <button type="submit" className="flex-1 bg-lime-400 text-black font-bold py-3 rounded-lg hover:bg-lime-300 transition-all hover:scale-[1.02] active:scale-[0.98]">
                                {editingId ? "Update" : "Add Entry"}
                            </button>
                            {editingId && (
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="flex-1 bg-transparent border border-zinc-700 text-zinc-300 font-bold py-3 rounded-lg hover:bg-zinc-800 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* List */}
                <div className="flex-1 w-full bg-zinc-950/80 border border-zinc-800 rounded-xl p-6 shadow-xl">
                    <h2 className="font-display text-lg font-bold text-zinc-200 tracking-wide uppercase mb-5">Entries</h2>
                    {entries.length === 0 ? (
                        <div className="text-center py-10 bg-zinc-900/50 rounded-lg border border-zinc-800/80">
                            <p className="text-zinc-500 font-medium italic">No weight entries yet.</p>
                        </div>
                    ) : (
                        <ul className="space-y-3">
                            {entries.map(entry => (
                                <li
                                    key={entry.id}
                                    className="bg-zinc-900/40 border border-zinc-800/80 rounded-lg p-4 flex justify-between items-center hover:border-zinc-700 transition-colors"
                                // ... rest of list items
                                >
                                    <div>
                                        <strong className="text-xl font-bold text-zinc-100">{Number(entry.weight)} kg</strong>
                                        <div className="text-sm text-zinc-500 font-medium mt-1">{entry.date?.slice(0, 10)}</div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleEdit(entry)}
                                            className="px-3 py-1.5"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(entry.id)}
                                            className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-md font-medium text-sm border border-rose-500/20 transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}