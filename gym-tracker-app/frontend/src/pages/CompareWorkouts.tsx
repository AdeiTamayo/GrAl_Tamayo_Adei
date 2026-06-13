import React, { useState, useEffect, useMemo } from "react";
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
        if (diff === 0) return <span className="text-zinc-500">-</span>;
        const color = diff > 0 ? "text-lime-400" : "text-red-400";
        const sign = diff > 0 ? "+" : "";
        return <span className={`${color} font-bold`}>{sign}{diff.toFixed(1)}{unit}</span>;
    };

    return (
        <div className="p-6 font-sans bg-black text-zinc-100 min-h-screen">
            <div className="max-w-5xl mx-auto">
                <header className="mb-10 text-center">
                    <h1 className="font-display text-4xl font-bold tracking-tight uppercase italic text-lime-400">
                        Workout Comparison
                    </h1>
                    <p className="text-zinc-400 mt-2">Select two workouts to see your progress side by side.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                    <div className="space-y-2">
                        <label className="text-xs uppercase font-bold text-zinc-500 tracking-widest pl-1">Workout A</label>
                        <select
                            value={idA}
                            onChange={(e) => setIdA(Number(e.target.value) || "")}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:border-lime-400 focus:ring-0"
                        >
                            <option value="">Select a workout...</option>
                            {workoutsList.map(w => (
                                <option key={w.id} value={w.id}>{w.date} - {w.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs uppercase font-bold text-zinc-500 tracking-widest pl-1">Workout B (More Recent)</label>
                        <select
                            value={idB}
                            onChange={(e) => setIdB(Number(e.target.value) || "")}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:border-lime-400 focus:ring-0"
                        >
                            <option value="">Select a workout...</option>
                            {workoutsList.map(w => (
                                <option key={w.id} value={w.id}>{w.date} - {w.name}</option>
                            ))}
                        </select>
                    </div>
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
                    <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-2xl text-center text-zinc-400">
                        No common exercises found between these two sessions.
                    </div>
                )}

                {comparisonData.length > 0 && workoutA && workoutB && (
                    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-zinc-900/50 text-zinc-400 text-xs uppercase tracking-widest border-b border-zinc-800">
                                    <th className="py-4 px-6">Exercise</th>
                                    <th className="py-4 px-6">Metric</th>
                                    <th className="py-4 px-6">{workoutA.date}</th>
                                    <th className="py-4 px-6">{workoutB.date}</th>
                                    <th className="py-4 px-6">Difference</th>
                                </tr>
                            </thead>
                            <tbody>
                                {comparisonData.map((row, idx) => (
                                    <tr key={idx} className="border-b border-zinc-900 hover:bg-zinc-900/30 transition-colors">
                                        <td className="py-4 px-6 font-bold text-zinc-100">{row.name}</td>
                                        <td className="py-4 px-6 text-zinc-400 italic text-sm">{row.metric}</td>
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
