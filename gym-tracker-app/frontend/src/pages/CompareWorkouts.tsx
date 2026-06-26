import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";
import Button from "../components/Button";
import Modal from "../components/Modal";
import WorkoutPicker from "../components/WorkoutPicker";

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

interface PickedWorkout {
    id: number;
    name: string;
    date: string;
}

interface SetComparison {
    setNumber: number;
    weightA: number | null;
    repsA: number | null;
    weightB: number | null;
    repsB: number | null;
}

export default function CompareWorkouts() {
    const [workoutA, setWorkoutA] = useState<Workout | null>(null);
    const [workoutB, setWorkoutB] = useState<Workout | null>(null);
    const [pickedA, setPickedA] = useState<PickedWorkout | null>(null);
    const [pickedB, setPickedB] = useState<PickedWorkout | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showPickerA, setShowPickerA] = useState(false);
    const [showPickerB, setShowPickerB] = useState(false);

    useEffect(() => { window.scrollTo(0, 0); }, []);

    const navigate = useNavigate();
    const token = localStorage.getItem("user_login_token");
    const headers = useMemo(() => ({
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    }), [token]);

    const fetchComparison = async () => {
        if (!pickedA || !pickedB) return;
        setError(null);
        setLoading(true);
        try {
            const [resA, resB] = await Promise.all([
                apiFetch(`/api/workouts/${pickedA.id}`, { headers }),
                apiFetch(`/api/workouts/${pickedB.id}`, { headers })
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
        } finally {
            setLoading(false);
        }
    };

    const commonExercises = useMemo(() => {
        if (!workoutA || !workoutB) return [];
        const exercisesA = workoutA.exercises || [];
        const exercisesB = workoutB.exercises || [];
        const ids = exercisesA
            .filter(exA => exercisesB.some(exB => exB.exercise_id === exA.exercise_id))
            .map(ex => ex.exercise_id);

        return ids.map(exId => {
            const exA = exercisesA.find(e => e.exercise_id === exId)!;
            const exB = exercisesB.find(e => e.exercise_id === exId)!;

            const volumeA = exA.sets.reduce((sum, s) => sum + (Number(s.weight || 0) * Number(s.repetitions || 0)), 0);
            const volumeB = exB.sets.reduce((sum, s) => sum + (Number(s.weight || 0) * Number(s.repetitions || 0)), 0);

            const maxLen = Math.max(exA.sets.length, exB.sets.length);
            const setComparisons: SetComparison[] = [];
            for (let i = 0; i < maxLen; i++) {
                const sA = exA.sets[i];
                const sB = exB.sets[i];
                setComparisons.push({
                    setNumber: i + 1,
                    weightA: sA?.weight ?? null,
                    repsA: sA?.repetitions ?? null,
                    weightB: sB?.weight ?? null,
                    repsB: sB?.repetitions ?? null,
                });
            }

            return { exId, name: exA.name, volumeA, volumeB, setComparisons };
        });
    }, [workoutA, workoutB]);

    const summaryStats = useMemo(() => {
        if (!workoutA || !workoutB || commonExercises.length === 0) return null;

        const totalVolumeA = commonExercises.reduce((sum, ex) => sum + ex.volumeA, 0);
        const totalVolumeB = commonExercises.reduce((sum, ex) => sum + ex.volumeB, 0);
        const totalSetsA = commonExercises.reduce((sum, ex) => {
            const exA = workoutA.exercises.find(e => e.exercise_id === ex.exId)!;
            return sum + exA.sets.length;
        }, 0);
        const totalSetsB = commonExercises.reduce((sum, ex) => {
            const exB = workoutB.exercises.find(e => e.exercise_id === ex.exId)!;
            return sum + exB.sets.length;
        }, 0);

        return { totalVolumeA, totalVolumeB, totalSetsA, totalSetsB };
    }, [workoutA, workoutB, commonExercises]);

    const renderDiff = (valA: number, valB: number, decimals = 1, showPct = false) => {
        const diff = valB - valA;
        if (diff === 0) return <span className="text-dim">—</span>;
        const sign = diff > 0 ? "+" : "";
        const color = diff > 0 ? "text-emerald-400" : "text-rose-400";
        const arrow = diff > 0 ? "" : "";
        const pct = valA !== 0 ? ((diff / valA) * 100) : 0;
        return (
            <span className={`${color} font-mono`}>
                {arrow} {sign}{diff.toFixed(decimals)}{showPct ? ` (${sign}${pct.toFixed(1)}%)` : ""}
            </span>
        );
    };

    const resetComparison = () => {
        setPickedA(null);
        setPickedB(null);
        setWorkoutA(null);
        setWorkoutB(null);
        setError(null);
    };

    return (
        <div className="p-6 font-sans bg-body text-body min-h-screen animate-in fade-in duration-200">
            <div className="max-w-6xl mx-auto relative">
                <header className="mb-10 text-center">
                    <h1 className="font-display text-4xl font-bold tracking-tight uppercase italic text-accent">
                        Workout Comparison
                    </h1>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                    {/* Workout A Picker */}
                    <div className="space-y-2">
                        <label className="text-xs uppercase font-bold text-dim tracking-widest pl-1">Workout A</label>
                        <button
                            type="button"
                            onClick={() => setShowPickerA(true)}
                            className="w-full bg-card border border-subtle rounded-xl px-4 py-3 text-left flex justify-between items-center hover:border-hover transition-colors"
                        >
                            <span className={pickedA ? "text-body" : "text-dim"}>
                                {pickedA ? `${pickedA.date} - ${pickedA.name}` : "Select a workout..."}
                            </span>
                            <svg className="w-4 h-4 text-dim" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </button>
                    </div>

                    {/* Workout B Picker */}
                    <div className="space-y-2">
                        <label className="text-xs uppercase font-bold text-dim tracking-widest pl-1">Workout B</label>
                        <button
                            type="button"
                            onClick={() => setShowPickerB(true)}
                            className="w-full bg-card border border-subtle rounded-xl px-4 py-3 text-left flex justify-between items-center hover:border-hover transition-colors"
                        >
                            <span className={pickedB ? "text-body" : "text-dim"}>
                                {pickedB ? `${pickedB.date} - ${pickedB.name}` : "Select a workout..."}
                            </span>
                            <svg className="w-4 h-4 text-dim" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Picker Modals */}
                <Modal open={showPickerA} onClose={() => setShowPickerA(false)} maxWidth="lg" backdrop="darker">
                    <div className="border border-accent/30 rounded-xl bg-card shadow-xl overflow-hidden">
                        <WorkoutPicker
                            onSelect={(w) => {
                                setPickedA(w);
                                setShowPickerA(false);
                            }}
                            title="Select Workout A"
                            excludeId={pickedB?.id}
                            className="!border-0 !rounded-none !shadow-none"
                        />
                    </div>
                </Modal>

                <Modal open={showPickerB} onClose={() => setShowPickerB(false)} maxWidth="lg" backdrop="darker">
                    <div className="border border-accent/30 rounded-xl bg-card shadow-xl overflow-hidden">
                        <WorkoutPicker
                            onSelect={(w) => {
                                setPickedB(w);
                                setShowPickerB(false);
                            }}
                            title="Select Workout B"
                            excludeId={pickedA?.id}
                            className="!border-0 !rounded-none !shadow-none"
                        />
                    </div>
                </Modal>

                <div className="flex justify-center gap-4 mb-10">
                    <Button
                        variant="primary"
                        disabled={!pickedA || !pickedB || loading}
                        onClick={fetchComparison}
                        className="px-10"
                    >
                        {loading ? "Loading..." : "Compare Now"}
                    </Button>
                    {(workoutA || workoutB) && (
                        <Button variant="secondary" onClick={resetComparison} className="px-6">
                            Reset
                        </Button>
                    )}
                </div>

                {error && (
                    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-center mb-10">
                        {error}
                    </div>
                )}

                {workoutA && workoutB && commonExercises.length === 0 && (
                    <div className="bg-surface/50 border border-subtle p-8 rounded-2xl text-center text-muted">
                        No common exercises found between these two sessions.
                    </div>
                )}

                {summaryStats && workoutA && workoutB && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                        <div className="bg-card border border-subtle rounded-xl p-5 text-center">
                            <div className="text-xs uppercase tracking-widest text-dim font-bold mb-2">Common Exercises</div>
                            <div className="text-3xl font-black text-accent">{commonExercises.length}</div>
                        </div>

                        {[{
                            label: "Total Volume",
                            valA: summaryStats.totalVolumeA,
                            valB: summaryStats.totalVolumeB,
                            format: (v: number) => v.toFixed(0),
                            colorA: "text-blue-400",
                            colorB: "text-accent",
                        }, {
                            label: "Total Sets",
                            valA: summaryStats.totalSetsA,
                            valB: summaryStats.totalSetsB,
                            format: (v: number) => String(v),
                            colorA: "text-blue-400",
                            colorB: "text-accent",
                        }].map(stat => {
                            const total = stat.valA + stat.valB;
                            const pctA = total > 0 ? (stat.valA / total) * 100 : 50;
                            const diff = stat.valB - stat.valA;
                            const diffPct = stat.valA !== 0 ? (diff / stat.valA) * 100 : 0;
                            const sign = diff > 0 ? "+" : "";
                            const diffColor = diff > 0 ? "text-emerald-400" : diff < 0 ? "text-rose-400" : "text-dim";
                            const arrow = diff > 0 ? "" : diff < 0 ? "" : "";
                            return (
                                <div key={stat.label} className="bg-card border border-subtle rounded-xl p-5">
                                    <div className="text-xs uppercase tracking-widest text-dim font-bold mb-3 text-center">
                                        {stat.label}
                                    </div>
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="text-center flex-1">
                                            <div className="text-[10px] text-dim uppercase">A — {workoutA.date}</div>
                                            <div className={`text-sm font-bold font-mono ${stat.colorA}`}>
                                                {stat.format(stat.valA)}
                                            </div>
                                        </div>
                                        <div className="text-center flex-1">
                                            <div className="text-[10px] text-dim uppercase">B — {workoutB.date}</div>
                                            <div className={`text-sm font-bold font-mono ${stat.colorB}`}>
                                                {stat.format(stat.valB)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-center text-xs font-mono">
                                        <span className={diffColor}>
                                            {arrow} {sign}{diff.toFixed(0)} ({sign}{diffPct.toFixed(1)}%)
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {workoutA && workoutB && commonExercises.length > 0 && (
                    <div className="space-y-6">
                        {commonExercises.map(ex => (
                            <div key={ex.exId} className="bg-card border border-subtle rounded-2xl p-6 shadow-2xl">
                                <h3 className="font-display text-lg font-bold text-accent uppercase tracking-wide mb-4">
                                    {ex.name}
                                </h3>

                                <div className="flex items-center gap-3 mb-4 text-sm">
                                    <span className="text-dim font-medium">Volume:</span>
                                    <span className="font-mono font-semibold text-body">{ex.volumeA.toFixed(0)}</span>
                                    <span className="text-dim">→</span>
                                    <span className="font-mono font-semibold text-body">{ex.volumeB.toFixed(0)}</span>
                                    <span className="text-xs text-muted">({renderDiff(ex.volumeA, ex.volumeB, 0)})</span>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-sm">
                                        <thead>
                                            <tr className="text-dim text-xs uppercase tracking-widest border-b border-subtle">
                                                <th className="py-3 px-3 w-16">Set</th>
                                                <th className="py-3 px-3 w-[26%]">
                                                    <span className="text-body">A — {workoutA.date}</span>
                                                </th>
                                                <th className="py-3 px-3 w-[26%]">
                                                    <span className="text-body">B — {workoutB.date}</span>
                                                </th>
                                                <th className="py-3 px-3 w-28">Weight</th>
                                                <th className="py-3 px-3 w-28">Reps</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {ex.setComparisons.map(sc => (
                                                <tr key={sc.setNumber} className="border-b border-subtle/50 hover:bg-surface/20 transition-colors">
                                                    <td className="py-3 px-3 font-mono text-muted">{sc.setNumber}</td>
                                                    <td className="py-3 px-3">
                                                        {sc.weightA !== null ? (
                                                            <span className="font-mono font-medium text-body">
                                                                {sc.weightA} kg × {sc.repsA} reps
                                                            </span>
                                                        ) : (
                                                            <span className="text-dim italic">—</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        {sc.weightB !== null ? (
                                                            <span className="font-mono font-medium text-body">
                                                                {sc.weightB} kg × {sc.repsB} reps
                                                            </span>
                                                        ) : (
                                                            <span className="text-dim italic">—</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-3 font-mono text-sm">
                                                        {sc.weightA !== null && sc.weightB !== null
                                                            ? renderDiff(sc.weightA, sc.weightB)
                                                            : <span className="text-dim">-</span>
                                                        }
                                                    </td>
                                                    <td className="py-3 px-3 font-mono text-sm">
                                                        {sc.repsA !== null && sc.repsB !== null
                                                            ? renderDiff(sc.repsA, sc.repsB, 0)
                                                            : <span className="text-dim">-</span>
                                                        }
                                                    </td>
                                                </tr>
                                            ))}
                                            {/* Totals row */}
                                            {(() => {
                                                const totalVolA = ex.setComparisons.reduce((s, sc) => s + ((sc.weightA ?? 0) * (sc.repsA ?? 0)), 0);
                                                const totalVolB = ex.setComparisons.reduce((s, sc) => s + ((sc.weightB ?? 0) * (sc.repsB ?? 0)), 0);
                                                return (
                                                    <tr className="border-t-2 border-subtle bg-surface/30 font-semibold">
                                                        <td className="py-3 px-3 font-mono text-accent text-xs uppercase tracking-wider">Total</td>
                                                        <td className="py-3 px-3">
                                                            <span className="font-mono text-body">Vol: {totalVolA.toFixed(0)}</span>
                                                        </td>
                                                        <td className="py-3 px-3">
                                                            <span className="font-mono text-body">Vol: {totalVolB.toFixed(0)}</span>
                                                        </td>
                                                        <td className="py-3 px-3 font-mono text-sm">
                                                            {totalVolA > 0 || totalVolB > 0
                                                                ? renderDiff(totalVolA, totalVolB)
                                                                : <span className="text-dim">-</span>
                                                            }
                                                        </td>
                                                        <td className="py-3 px-3" />
                                                    </tr>
                                                );
                                            })()}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
