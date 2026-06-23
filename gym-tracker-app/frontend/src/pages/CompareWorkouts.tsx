import React, { useState, useEffect, useMemo, useRef } from "react";
import { apiFetch } from "../utils/api";
import Button from "../components/Button";

interface SetEntry {
    weight: number;
    repetitions: number;
}

interface WorkoutExercise {
    exercise_id: number;
    name: string;
    sets: SetEntry[];
}

interface Workout {
    id: number;
    name: string;
    date: string;
    exercises: WorkoutExercise[];
}

interface ComparisonRow {
    name: string;
    metric: "Max Weight" | "Total Volume" | "Max Reps";
    valA: number;
    valB: number;
    unit: string;
}

function WorkoutDropdown({
    label, workouts, value, onChange
}: {
    label: string;
    workouts: { id: number; name: string; date: string }[];
    value: number | "";
    onChange: (v: number | "") => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const selected = workouts.find(w => w.id === value);

    return (
        <div className="space-y-2 relative" ref={ref}>
            <label className="text-xs uppercase font-bold text-dim tracking-widest pl-1">{label}</label>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full bg-card border border-subtle rounded-xl px-4 py-3 text-left flex justify-between items-center hover:border-hover transition-colors"
            >
                <span className={selected ? "text-body" : "text-dim"}>
                    {selected ? `${selected.date} - ${selected.name}` : "Select a workout..."}
                </span>
                <svg className={`w-4 h-4 text-dim transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {open && (
                <ul className="absolute z-20 w-full mt-1 bg-card border border-subtle rounded-xl shadow-2xl overflow-y-auto max-h-60 py-2 animate-in fade-in slide-in-from-top-1 duration-150">
                    <li
                        onClick={() => { onChange(""); setOpen(false); }}
                        className="px-4 py-2.5 text-dim hover:bg-surface hover:text-body cursor-pointer transition-colors text-sm"
                    >
                        Select a workout...
                    </li>
                    {workouts.map(w => (
                        <li
                            key={w.id}
                            onClick={() => { onChange(w.id); setOpen(false); }}
                            className={`px-4 py-2.5 cursor-pointer transition-colors text-sm flex justify-between items-center ${value === w.id ? "bg-lime-400/10 text-lime-400" : "text-muted hover:bg-surface hover:text-white"}`}
                        >
                            <span>{w.date} - {w.name}</span>
                            {value === w.id && (
                                <svg className="w-4 h-4 text-lime-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default function CompareWorkouts() {
    const [workoutsList, setWorkoutsList] = useState<{ id: number; name: string; date: string }[]>([]);
    const [idA, setIdA] = useState<number | "">("");
    const [idB, setIdB] = useState<number | "">("");
    const [workoutA, setWorkoutA] = useState<Workout | null>(null);
    const [workoutB, setWorkoutB] = useState<Workout | null>(null);
    const [error, setError] = useState<string | null>(null);

    const token = localStorage.getItem("user_login_token");
    const headers = useMemo(() => ({
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    }), [token]);

    useEffect(() => {
        fetchWorkouts();
    }, []);

    const fetchWorkouts = async () => {
        try {
            const res = await apiFetch("/api/workouts", { headers });
            const data = await res.json();
            if (data.success) {
                setWorkoutsList(data.data || []);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchComparison = async () => {
        if (!idA || !idB) return;
        setError(null);
        try {
            const [resA, resB] = await Promise.all([
                apiFetch(`/api/workouts/${idA}`, { headers }),
                apiFetch(`/api/workouts/${idB}`, { headers })
            ]);
            const dataA = await resA.json();
            const dataB = await resB.json();

            if (dataA.success && dataB.success) {
                setWorkoutA(dataA.data);
                setWorkoutB(dataB.data);
            } else {
                setError("Failed to load workout data.");
            }
        } catch (err) {
            setError("Error fetching workout data.");
        }
    };

    const comparisonData = useMemo(() => {
        if (!workoutA || !workoutB) return [];

        const rows: ComparisonRow[] = [];
        const exercisesA = workoutA.exercises || [];
        const exercisesB = workoutB.exercises || [];

        const commonIds = exercisesA
            .filter(exA => exercisesB.some(exB => exB.exercise_id === exA.exercise_id))
            .map(ex => ex.exercise_id);

        commonIds.forEach(exId => {
            const exA = exercisesA.find(e => e.exercise_id === exId)!;
            const exB = exercisesB.find(e => e.exercise_id === exId)!;

            const calculateMaxWeight = (ex: WorkoutExercise) => Math.max(...ex.sets.map(s => s.weight || 0), 0);
            const calculateVolume = (ex: WorkoutExercise) => ex.sets.reduce((sum, s) => sum + (Number(s.weight || 0) * Number(s.repetitions || 0)), 0);
            const calculateMaxReps = (ex: WorkoutExercise) => Math.max(...ex.sets.map(s => s.repetitions || 0), 0);

            rows.push({
                name: exA.name,
                metric: "Max Weight",
                valA: calculateMaxWeight(exA),
                valB: calculateMaxWeight(exB),
                unit: "kg"
            });
            rows.push({
                name: exA.name,
                metric: "Total Volume",
                valA: calculateVolume(exA),
                valB: calculateVolume(exB),
                unit: ""
            });
            rows.push({
                name: exA.name,
                metric: "Max Reps",
                valA: calculateMaxReps(exA),
                valB: calculateMaxReps(exB),
                unit: ""
            });
        });

        return rows;
    }, [workoutA, workoutB]);

    const renderDiff = (valA: number, valB: number, unit: string) => {
        const diff = valB - valA;
        if (diff === 0) return <span className="text-dim">-</span>;
        const color = diff > 0 ? "text-lime-400" : "text-red-400";
        const sign = diff > 0 ? "+" : "";
        return <span className={`${color} font-bold`}>{sign}{diff.toFixed(1)}{unit}</span>;
    };

    return (
        <div className="p-6 font-sans bg-body text-body min-h-screen">
            <div className="mxa-w-5xl mx-auto">
                <header className="mb-10 text-center">
                    <h1 className="font-display text-4xl font-bold tracking-tight uppercase italic text-lime-400">
                        Workout Comparison
                    </h1>
                    <p className="text-muted mt-2">Select two workouts to see your progress side by side.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                    <WorkoutDropdown
                        label="Workout A"
                        workouts={workoutsList}
                        value={idA}
                        onChange={setIdA}
                    />
                    <WorkoutDropdown
                        label="Workout B (More Recent)"
                        workouts={workoutsList}
                        value={idB}
                        onChange={setIdB}
                    />
                </div>

                <div className="flex justify-center mb-10">
                    <Button
                        variant="primary"
                        disabled={!idA || !idB}
                        onClick={fetchComparison}
                        className="px-10"
                    >
                        Compare Now
                    </Button>
                </div>

                {error && (
                    <div className="bg-red-900/20 border border-red-500/50 text-red-100 p-4 rounded-xl text-center mb-10">
                        {error}
                    </div>
                )}

                {workoutA && workoutB && comparisonData.length === 0 && (
                    <div className="bg-surface/50 border border-subtle p-8 rounded-2xl text-center text-muted">
                        No common exercises found between these two sessions.
                    </div>
                )}

                {comparisonData.length > 0 && workoutA && workoutB && (
                    <div className="overflow-hidden rounded-2xl border border-subtle bg-card shadow-2xl">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-surface/50 text-muted text-xs uppercase tracking-widest border-b border-subtle">
                                    <th className="py-4 px-6">Exercise</th>
                                    <th className="py-4 px-6">Metric</th>
                                    <th className="py-4 px-6">{workoutA.date}</th>
                                    <th className="py-4 px-6">{workoutB.date}</th>
                                    <th className="py-4 px-6">Difference</th>
                                </tr>
                            </thead>
                            <tbody>
                                {comparisonData.map((row, idx) => (
                                    <tr key={idx} className="border-b border-subtle hover:bg-surface/30 transition-colors">
                                        <td className="py-4 px-6 font-bold text-body">{row.name}</td>
                                        <td className="py-4 px-6 text-muted italic text-sm">{row.metric}</td>
                                        <td className="py-4 px-6 font-mono">{row.valA.toFixed(1)}{row.unit}</td>
                                        <td className="py-4 px-6 font-mono">{row.valB.toFixed(1)}{row.unit}</td>
                                        <td className="py-4 px-6 font-mono">{renderDiff(row.valA, row.valB, row.unit)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
