import { useState, useEffect, useMemo, useRef } from "react";

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

interface Exercise {
    id: number;
    name: string;
}

export default function PersonalRecords() {
    const [prSummary, setPrSummary] = useState<PRSummary[]>([]);
    const [selectedExerciseName, setSelectedExerciseName] = useState<string | null>(null);
    const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null);
    const [prHistory, setPrHistory] = useState<PRHistory[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Form state
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [formExerciseId, setFormExerciseId] = useState<number | "">("");
    const [newWeight, setNewWeight] = useState<number | "">("");
    const [newReps, setNewReps] = useState<number | "">("");
    const [newDate, setNewDate] = useState("");
    const [newNote, setNewNote] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    // UX states
    const [showAddForm, setShowAddForm] = useState(false);
    const [exerciseSearch, setExerciseSearch] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const headers = useMemo(() => ({
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("user_login_token")}`
    }), []);

    useEffect(() => {
        Promise.all([fetchPrSummary(), fetchExercises()]).finally(() => setLoading(false));
    }, [headers]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    async function fetchExercises() {
        try {
            const res = await fetch("http://localhost:8000/api/exercises", { headers });
            const data = await res.json();
            if (data.success) setExercises(data.data);
        } catch (err: any) {
            console.error("Failed to fetch exercises", err);
        }
    }

    async function fetchPrSummary() {
        try {
            const res = await fetch("http://localhost:8000/api/prs", { headers });
            const data = await res.json();
            if (data.success) {
                setPrSummary(data.data);
            } else {
                setError(data.error);
            }
        } catch (err: any) {
            setError(err.message);
        }
    }

    async function fetchPrHistory(exerciseId: number, exerciseName: string) {
        try {
            const res = await fetch(`http://localhost:8000/api/prs/${exerciseId}/history`, { headers });
            const data = await res.json();
            if (data.success) {
                setPrHistory(data.data);
                setSelectedExerciseName(exerciseName);
                setSelectedExerciseId(exerciseId);
            } else {
                setError(data.error);
            }
        } catch (err: any) {
            setError(err.message);
        }
    }

    async function createPR(e: React.FormEvent) {
        e.preventDefault();
        setIsCreating(true);
        setError(null);
        try {
            const res = await fetch("http://localhost:8000/api/prs", {
                method: "POST",
                headers,
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
                setExerciseSearch("");
                setNewWeight("");
                setNewReps("");
                setNewDate("");
                setNewNote("");
                setShowAddForm(false);

                // Refresh history if the created PR is for the currently open panel
                if (formExerciseId === selectedExerciseId && selectedExerciseName) {
                    fetchPrHistory(selectedExerciseId, selectedExerciseName);
                }
            } else {
                setError(data.error);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsCreating(false);
        }
    }

    async function deletePR(prId: number) {
        if (!window.confirm("Are you sure you want to delete this PR?")) return;
        try {
            const res = await fetch(`http://localhost:8000/api/prs/${prId}`, {
                method: "DELETE",
                headers
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
        } catch (err: any) {
            setError(err.message);
        }
    }

    if (loading) return <p>Loading Personal Records...</p>;

    const filteredExercises = exercises.filter(ex =>
        ex.name.toLowerCase().includes(exerciseSearch.toLowerCase())
    );

    return (
        <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
            <h1>Personal Records (PRs)</h1>
            {error && <p style={{ fontWeight: "bold" }}>Error: {error}</p>}

            <div style={{ display: "flex", gap: "40px", alignItems: "flex-start" }}>

                {/* --- Left Column: PR Summary --- */}
                <div style={{ flex: 1, maxWidth: "450px" }}>

                    {/* Add Manual PR Form */}
                    <div style={{ border: "1px solid", padding: "20px", marginBottom: "20px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h3 style={{ margin: 0 }}>Manually Log a PR</h3>
                            <button
                                onClick={() => setShowAddForm(!showAddForm)}
                                style={{ padding: "5px 10px", cursor: "pointer", border: "1px solid", background: "none" }}
                            >
                                {showAddForm ? "Cancel" : "Add PR"}
                            </button>
                        </div>

                        {showAddForm && (
                            <form onSubmit={createPR} style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "20px" }}>
                                <div style={{ position: "relative" }} ref={dropdownRef}>
                                    <input
                                        type="text"
                                        placeholder="Search and select exercise..."
                                        value={exerciseSearch}
                                        onChange={e => {
                                            setExerciseSearch(e.target.value);
                                            setFormExerciseId("");
                                            setShowDropdown(true);
                                        }}
                                        onFocus={() => setShowDropdown(true)}
                                        required
                                        style={{ padding: "8px", width: "100%", boxSizing: "border-box", border: "1px solid" }}
                                    />
                                    {showDropdown && filteredExercises.length > 0 && (
                                        <ul style={{ position: "absolute", zIndex: 10, width: "100%", background: "white", border: "1px solid", listStyle: "none", padding: 0, margin: 0, maxHeight: "200px", overflowY: "auto" }}>
                                            {filteredExercises.map(ex => (
                                                <li
                                                    key={ex.id}
                                                    onClick={() => {
                                                        setExerciseSearch(ex.name);
                                                        setFormExerciseId(ex.id);
                                                        setShowDropdown(false);
                                                    }}
                                                    style={{ padding: "10px", cursor: "pointer", borderBottom: "1px solid" }}
                                                >
                                                    {ex.name}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                <div style={{ display: "flex", gap: "10px" }}>
                                    <input
                                        type="number"
                                        step="0.1"
                                        placeholder="Weight (kg)"
                                        value={newWeight}
                                        onChange={e => setNewWeight(Number(e.target.value))}
                                        required
                                        style={{ padding: "8px", flex: 1, border: "1px solid" }}
                                    />
                                    <input
                                        type="number"
                                        placeholder="Reps"
                                        value={newReps}
                                        onChange={e => setNewReps(Number(e.target.value))}
                                        required
                                        style={{ padding: "8px", flex: 1, border: "1px solid" }}
                                    />
                                </div>
                                <input
                                    type="date"
                                    value={newDate}
                                    onChange={e => setNewDate(e.target.value)}
                                    style={{ padding: "8px", border: "1px solid" }}
                                />
                                <input
                                    type="text"
                                    placeholder="Note (optional)"
                                    value={newNote}
                                    onChange={e => setNewNote(e.target.value)}
                                    style={{ padding: "8px", border: "1px solid" }}
                                />
                                <button type="submit" disabled={isCreating || !formExerciseId} style={{ padding: "10px", border: "1px solid", background: "none", cursor: (isCreating || !formExerciseId) ? "not-allowed" : "pointer" }}>
                                    {isCreating ? "Adding..." : "Log PR"}
                                </button>
                            </form>
                        )}
                    </div>

                    <div style={{ border: "1px solid", padding: "20px" }}>
                        <h2>Current Best PRs</h2>
                        {prSummary.length === 0 ? (
                            <p>No PRs recorded yet. Go lift something heavy!</p>
                        ) : (
                            <ul style={{ listStyleType: "none", padding: 0 }}>
                                {prSummary.map(pr => (
                                    <li
                                        key={pr.id}
                                        style={{ borderBottom: "1px solid", padding: "15px 0", cursor: "pointer" }}
                                        onClick={() => fetchPrHistory(pr.exercise_id, pr.exercise_name)}
                                    >
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <div>
                                                <strong style={{ fontSize: "1.1em" }}>{pr.exercise_name}</strong>
                                                <br />
                                                <small>{pr.date?.substring(0, 10)}</small>
                                            </div>
                                            <div style={{ textAlign: "right" }}>
                                                <span style={{ fontSize: "1.2em", fontWeight: "bold" }}>{pr.weight}kg</span>
                                                <br />
                                                <span>{pr.repetitions} reps</span>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* --- Right Column: PR History Timeline --- */}
                {selectedExerciseName && (
                    <div style={{ flex: 1.5, border: "1px solid", padding: "25px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <h2 style={{ marginTop: 0 }}>{selectedExerciseName} - History</h2>
                            <button onClick={() => setSelectedExerciseName(null)} style={{ padding: "5px 10px", cursor: "pointer", border: "1px solid", background: "none" }}>Close Panel</button>
                        </div>
                        <hr style={{ margin: "20px 0", border: "none", borderTop: "1px solid" }} />

                        <ul style={{ listStyleType: "none", padding: 0 }}>
                            {prHistory.map((history, index) => (
                                <li key={history.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "10px 0", padding: "10px", borderBottom: "1px solid" }}>
                                    <div style={{ display: "flex", flex: 1 }}>
                                        <div style={{ width: "120px", fontWeight: "bold" }}>
                                            {history.date?.substring(0, 10)}
                                        </div>
                                        <div>
                                            <strong>{history.weight}kg</strong> for <strong>{history.repetitions} reps</strong>
                                            {history.note && <p style={{ margin: "5px 0 0 0", fontStyle: "italic", fontSize: "0.9em" }}>Note: {history.note}</p>}
                                            {index === 0 && <span style={{ marginLeft: "10px", fontSize: "0.8em", padding: "2px 6px", border: "1px solid" }}>Current PR</span>}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => deletePR(history.id)}
                                        style={{ cursor: "pointer", fontSize: "0.8em", padding: "4px 8px", border: "1px solid", background: "none" }}
                                    >
                                        Delete
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}