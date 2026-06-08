import { useState, useEffect, useMemo, useRef } from "react";
import { apiFetch } from "../utils/api";

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
            const res = await apiFetch("/api/exercises", { headers });
            const data = await res.json();
            if (data.success) setExercises(data.data);
        } catch (err: any) {
            console.error("Failed to fetch exercises", err);
        }
    }

    async function fetchPrSummary() {
        try {
            const res = await apiFetch("/api/prs", { headers });
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
            const res = await apiFetch(`/api/prs/${exerciseId}/history`, { headers });
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
            const res = await apiFetch("/api/prs", {
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
            const res = await apiFetch(`/api/prs/${prId}`, {
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

    if (loading) return <div className="p-8 text-zinc-400 font-medium animate-pulse">Loading Personal Records...</div>;

    const filteredExercises = exercises.filter(ex =>
        ex.name.toLowerCase().includes(exerciseSearch.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 mt-4 md:mt-8 space-y-8">
            <div>
                <h1 className="text-3xl font-display text-zinc-100 uppercase tracking-tight mb-2">Personal Records (PRs)</h1>
                <p className="text-zinc-400 font-medium">Keep track of your all-time best lifts.</p>
            </div>
            {error && <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg font-medium text-sm">Error: {error}</div>}

            <div className="flex gap-6 items-start flex-col lg:flex-row">

                {/* --- Left Column: PR Summary --- */}
                <div className="flex-none w-full lg:w-[450px] space-y-6">

                    {/* Add Manual PR Form */}
                    <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-6 shadow-xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-display text-lg font-bold text-zinc-200 tracking-wide uppercase">Manually Log a PR</h3>
                            <button
                                onClick={() => setShowAddForm(!showAddForm)}
                                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all focus:outline-none ${showAddForm ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-lime-400 text-black hover:bg-lime-300 hover:scale-[1.02] active:scale-[0.98]'}`}
                            >
                                {showAddForm ? "Cancel" : "Add PR"}
                            </button>
                        </div>

                        {showAddForm && (
                            <form onSubmit={createPR} className="flex flex-col gap-4 mt-6 border-t border-zinc-800/80 pt-6">
                                <div className="relative" ref={dropdownRef}>
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
                                        className="w-full border border-zinc-800 bg-zinc-900 rounded-lg px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:border-lime-400 focus:outline-none transition-colors"
                                    />
                                    {showDropdown && filteredExercises.length > 0 && (
                                        <ul className="absolute z-10 w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl overflow-y-auto max-h-48 py-2">
                                            {filteredExercises.map(ex => (
                                                <li
                                                    key={ex.id}
                                                    onClick={() => {
                                                        setExerciseSearch(ex.name);
                                                        setFormExerciseId(ex.id);
                                                        setShowDropdown(false);
                                                    }}
                                                    className="px-4 py-2.5 text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer transition-colors"
                                                >
                                                    {ex.name}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        type="number"
                                        step="0.1"
                                        placeholder="Weight (kg)"
                                        value={newWeight}
                                        onChange={e => setNewWeight(Number(e.target.value))}
                                        required
                                        className="w-full border border-zinc-800 bg-zinc-900 rounded-lg px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:border-lime-400 focus:outline-none transition-colors"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Reps"
                                        value={newReps}
                                        onChange={e => setNewReps(Number(e.target.value))}
                                        required
                                        className="w-full border border-zinc-800 bg-zinc-900 rounded-lg px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:border-lime-400 focus:outline-none transition-colors"
                                    />
                                </div>
                                <input
                                    type="date"
                                    value={newDate}
                                    onChange={e => setNewDate(e.target.value)}
                                    className="w-full border border-zinc-800 bg-zinc-900 rounded-lg px-4 py-3 text-zinc-100 focus:border-lime-400 focus:outline-none transition-colors [color-scheme:dark]"
                                />
                                <input
                                    type="text"
                                    placeholder="Note (optional)"
                                    value={newNote}
                                    onChange={e => setNewNote(e.target.value)}
                                    className="w-full border border-zinc-800 bg-zinc-900 rounded-lg px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:border-lime-400 focus:outline-none transition-colors"
                                />
                                <button type="submit" disabled={isCreating || !formExerciseId} className="w-full bg-lime-400 text-black font-bold py-3 mt-2 rounded-lg hover:bg-lime-300 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isCreating ? "Adding..." : "Log PR"}
                                </button>
                            </form>
                        )}
                    </div>

                    <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-6 shadow-xl">
                        <h2 className="font-display text-lg font-bold text-zinc-200 tracking-wide uppercase mb-5">Current Best PRs</h2>
                        {prSummary.length === 0 ? (
                            <div className="text-center py-10 bg-zinc-900/50 rounded-lg border border-zinc-800/80">
                                <p className="text-zinc-500 font-medium italic">No PRs recorded yet. Go lift something heavy!</p>
                            </div>
                        ) : (
                            <ul className="space-y-3">
                                {prSummary.map(pr => (
                                    <li
                                        key={pr.id}
                                        onClick={() => fetchPrHistory(pr.exercise_id, pr.exercise_name)}
                                        className={`bg-zinc-900/40 border border-zinc-800/80 rounded-lg p-4 cursor-pointer hover:border-lime-400/50 hover:bg-zinc-900 transition-all ${selectedExerciseName === pr.exercise_name ? 'border-lime-400/50 bg-zinc-900 shadow-md ring-1 ring-lime-400/20' : ''}`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <strong className="text-lg font-bold text-lime-400 capitalize">{pr.exercise_name}</strong>
                                                <div className="text-sm text-zinc-500 font-medium mt-1">{pr.date?.substring(0, 10)}</div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-2xl font-bold text-zinc-100">{pr.weight} kg</span>
                                                <div className="text-sm text-zinc-400 font-medium mt-1">{pr.repetitions} reps</div>
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
                    <div className="flex-1 w-full bg-zinc-950/80 border border-zinc-800 rounded-xl p-6 lg:p-8 shadow-xl">
                        <div className="flex justify-between items-start mb-6">
                            <h2 className="font-display text-2xl font-bold text-lime-400 tracking-wide uppercase">{selectedExerciseName} Timeline</h2>
                            <button onClick={() => setSelectedExerciseName(null)} className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg font-bold text-sm transition-colors border border-zinc-800">Close</button>
                        </div>

                        <ul className="relative border-l border-zinc-800 ml-3 md:ml-6 pl-6 pb-2 space-y-8 mt-8">
                            {prHistory.map((history, index) => (
                                <li key={history.id} className="relative">
                                    <div className="absolute w-3 h-3 bg-lime-400 rounded-full -left-[1.95rem] top-1.5 ring-4 ring-zinc-950"></div>
                                    <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 md:p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-zinc-700 transition-colors">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-sm font-bold text-zinc-400 uppercase tracking-wider">{history.date?.substring(0, 10)}</span>
                                                {index === 0 && <span className="text-[10px] font-bold uppercase tracking-widest bg-lime-400/10 text-lime-400 border border-lime-400/20 px-2 py-0.5 rounded-full">Current Record</span>}
                                            </div>
                                            <div className="text-xl text-zinc-100 font-medium">
                                                <strong className="font-bold">{history.weight} kg</strong> for <strong className="font-bold">{history.repetitions} reps</strong>
                                            </div>
                                            {history.note && <div className="mt-3 text-sm text-zinc-500 bg-zinc-900 p-3 rounded-lg border border-zinc-800"><span className="text-zinc-600 font-medium">Note:</span> {history.note}</div>}
                                        </div>
                                        <button
                                            onClick={() => deletePR(history.id)}
                                            className="px-4 py-2 md:py-3 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-lg font-medium text-sm border border-rose-500/20 transition-colors shrink-0"
                                        >
                                            Delete Entry
                                        </button>
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