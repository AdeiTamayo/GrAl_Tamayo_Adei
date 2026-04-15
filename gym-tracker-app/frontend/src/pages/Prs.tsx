import { useState, useEffect, useMemo } from "react";

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
    const [prHistory, setPrHistory] = useState<PRHistory[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const headers = useMemo(() => ({
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("user_login_token")}`
    }), []);

    useEffect(() => {
        fetchPrSummary();
    }, [headers]);

    async function fetchPrSummary() {
        try {
            const res = await fetch("/api/prs", { headers });
            const data = await res.json();
            if (data.success) {
                setPrSummary(data.data);
            } else {
                console.log(error);
                setError(data.error);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function fetchPrHistory(exerciseId: number, exerciseName: string) {
        try {
            const res = await fetch(`/api/prs/${exerciseId}/history`, { headers });
            const data = await res.json();
            if (data.success) {
                setPrHistory(data.data);
                setSelectedExerciseName(exerciseName);
            } else {
                setError(data.error);
            }
        } catch (err: any) {
            setError(err.message);
        }
    }

    if (loading) return <p>Loading Personal Records...</p>;

    // ...existing code...
    if (loading) return <p>Loading Personal Records...</p>;

    return (
        <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
            <h1>Personal Records (PRs)</h1>
            {error && <p style={{ fontWeight: "bold" }}>Error: {error}</p>}

            <div style={{ display: "flex", gap: "40px", alignItems: "flex-start" }}>

                {/* --- Left Column: PR Summary --- */}
                <div style={{ flex: 1, maxWidth: "450px" }}>
                    <div style={{ border: "1px solid #ccc", padding: "20px" }}>
                        <h2>Current Best PRs</h2>
                        {prSummary.length === 0 ? (
                            <p>No PRs recorded yet. Go lift something heavy!</p>
                        ) : (
                            <ul style={{ listStyleType: "none", padding: 0 }}>
                                {prSummary.map(pr => (
                                    <li
                                        key={pr.id}
                                        style={{ borderBottom: "1px solid #ccc", padding: "15px 0", cursor: "pointer" }}
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
                    <div style={{ flex: 1.5, border: "1px solid #ccc", padding: "25px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <h2 style={{ marginTop: 0 }}>{selectedExerciseName} - History</h2>
                            <button onClick={() => setSelectedExerciseName(null)} style={{ padding: "5px 10px", cursor: "pointer", border: "1px solid #ccc", background: "none" }}>Close Panel</button>
                        </div>
                        <hr style={{ margin: "20px 0", border: "none", borderTop: "1px solid #ccc" }} />

                        <ul style={{ listStyleType: "none", padding: 0 }}>
                            {prHistory.map((history, index) => (
                                <li key={history.id} style={{ display: "flex", margin: "10px 0", padding: "10px", borderBottom: "1px solid #ccc" }}>
                                    <div style={{ width: "120px", fontWeight: "bold" }}>
                                        {history.date?.substring(0, 10)}
                                    </div>
                                    <div>
                                        <strong>{history.weight}kg</strong> for <strong>{history.repetitions} reps</strong>
                                        {history.note && <p style={{ margin: "5px 0 0 0", fontStyle: "italic", fontSize: "0.9em" }}>Note: {history.note}</p>}
                                        {index === 0 && <span style={{ marginLeft: "10px", fontSize: "0.8em", padding: "2px 6px", border: "1px solid #ccc" }}>Current PR</span>}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}