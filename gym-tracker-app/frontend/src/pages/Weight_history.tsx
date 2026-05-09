import { useEffect, useMemo, useState, FormEvent } from "react";
import { apiFetch } from "../utils/api";

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
    const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));

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
            // Adjust this path if your route is different
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

    function resetForm() {
        setEditingId(null);
        setWeight("");
        setDate(new Date().toISOString().slice(0, 10));
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
                // Matches controller: updateWeight expects { id, weight, date }
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
                // Matches controller: addWeight expects { weight, date }
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
            // Matches controller: deleteWeight expects req.params.id
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

    if (isLoading) return <p style={{ padding: "20px" }}>Loading weight history...</p>;

    return (
        <div style={{ padding: "20px", fontFamily: "Arial, sans-serif", maxWidth: "900px", margin: "0 auto" }}>
            <h1>Weight History</h1>
            {error && <p style={{ fontWeight: "bold", color: "red" }}>Error: {error}</p>}

            <div style={{ display: "flex", gap: "30px", alignItems: "flex-start" }}>
                {/* Form */}
                <div style={{ flex: 1, border: "1px solid", padding: "20px" }}>
                    <h3 style={{ marginTop: 0 }}>{editingId ? "Edit Weight Entry" : "Add Weight Entry"}</h3>
                    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <input
                            type="number"
                            step="0.1"
                            placeholder="Weight (kg)"
                            value={weight}
                            onChange={e => setWeight(e.target.value === "" ? "" : Number(e.target.value))}
                            required
                            style={{ padding: "8px", border: "1px solid" }}
                        />
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            required
                            style={{ padding: "8px", border: "1px solid" }}
                        />

                        <div style={{ display: "flex", gap: "10px" }}>
                            <button type="submit" style={{ flex: 1, padding: "10px", border: "1px solid", background: "none", cursor: "pointer", fontWeight: "bold" }}>
                                {editingId ? "Update Entry" : "Add Entry"}
                            </button>
                            {editingId && (
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    style={{ flex: 1, padding: "10px", border: "1px solid", background: "none", cursor: "pointer" }}
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* List */}
                <div style={{ flex: 1.5, border: "1px solid", padding: "20px" }}>
                    <h2 style={{ marginTop: 0 }}>Entries</h2>
                    {entries.length === 0 ? (
                        <p style={{ fontStyle: "italic" }}>No weight entries yet.</p>
                    ) : (
                        <ul style={{ listStyleType: "none", padding: 0, margin: 0 }}>
                            {entries.map(entry => (
                                <li
                                    key={entry.id}
                                    style={{
                                        borderBottom: "1px solid",
                                        padding: "10px 0",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                    }}
                                >
                                    <div>
                                        <strong>{Number(entry.weight)} kg</strong>
                                        <div style={{ marginTop: "4px" }}>{entry.date?.slice(0, 10)}</div>
                                    </div>
                                    <div style={{ display: "flex", gap: "10px" }}>
                                        <button
                                            onClick={() => handleEdit(entry)}
                                            style={{ padding: "5px 10px", border: "1px solid", background: "none", cursor: "pointer" }}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(entry.id)}
                                            style={{ padding: "5px 10px", border: "1px solid", background: "none", cursor: "pointer" }}
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