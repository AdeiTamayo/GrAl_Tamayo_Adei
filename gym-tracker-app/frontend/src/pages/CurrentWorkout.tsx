import React, { useState, useEffect, useMemo } from "react";
import { apiFetch } from "../utils/api";
import Button from "../components/Button";
import ExercisePicker, { Exercise as ExerciseMeta } from '../components/ExercisePicker';
import TransparentNumericInput from "../components/TransparentNumericInput";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useNotification } from "../components/NotificationProvider";
import { useWorkout } from "../components/WorkoutContext";

interface Routine {
    id: number;
    name: string;
    exercises: any[];
}

export default function CurrentWorkout() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { showNotification } = useNotification();
    const {
        isWorkoutActive,
        elapsedTime,
        workoutName,
        exercises,
        isRestTimerActive,
        restTime,
        setWorkoutName,
        startWorkout,
        resetWorkout,
        setExercises,
        addExercise,
        addSet,
        toggleSetDone,
        updateSet,
        updateExerciseRest,
        removeSet,
        removeExercise,
        skipRestTimer,
        addRestTime,
    } = useWorkout();

    const [showExercisePicker, setShowExercisePicker] = useState(false);
    const [routines, setRoutines] = useState<Routine[]>([]);
    const [showRoutinePicker, setShowRoutinePicker] = useState(false);
    const [showFinishModal, setShowFinishModal] = useState(false);

    const token = localStorage.getItem("user_login_token");
    const headers = useMemo(() => ({
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    }), [token]);

    useEffect(() => {
        if (searchParams.get('finish') === '1') {
            setShowFinishModal(true);
            navigate('/active-workout', { replace: true });
        }
    }, [searchParams, navigate]);

    useEffect(() => {
        fetchRoutines();
    }, [headers]);

    const fetchRoutines = async () => {
        try {
            const res = await apiFetch("/api/routines", { headers });
            const data = await res.json();
            if (data.success) {
                setRoutines(data.routines || []);
            }
        } catch (err) {
            console.error("Failed to fetch routines", err);
        }
    };

    const loadRoutine = async (routineId: number) => {
        try {
            const res = await apiFetch(`/api/routines/${routineId}`, { headers });
            const data = await res.json();
            if (data.success) {
                const routine = data.data;
                setWorkoutName(routine.name);
                const loadedExercises = routine.exercises.map((ex: any) => {
                    const exerciseRest = parseInt(ex.planned_time) || 60;
                    return {
                        exercise_id: ex.exercise_id || ex.id,
                        name: ex.exercise_name || ex.name,
                        rest_time: exerciseRest,
                        sets: Array.from({ length: ex.planned_sets || 1 }, (_, i) => ({
                            set_number: i + 1,
                            weight: ex.planned_weight || "",
                            repetitions: ex.planned_reps || "",
                            note: "",
                            is_done: false
                        }))
                    };
                });
                setExercises(loadedExercises);
                setShowRoutinePicker(false);
                startWorkout();
            }
        } catch (err) {
            console.error("Failed to load routine", err);
        }
    };

    const handleAddExercise = (exercise: ExerciseMeta) => {
        addExercise(exercise);
        setShowExercisePicker(false);
        if (!isWorkoutActive) startWorkout();
    };

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return [h, m, s].map(v => v < 10 ? "0" + v : v).filter((v, i) => v !== "00" || i > 0).join(":");
    };

    const saveWorkout = async () => {
        if (exercises.length === 0) {
            showNotification("No exercises to save!", "error");
            return;
        }

        try {
            const workoutRes = await apiFetch("/api/workouts", {
                method: "POST",
                headers,
                body: JSON.stringify({
                    name: workoutName,
                    date: new Date().toISOString().split('T')[0],
                    note: `Duration: ${formatTime(elapsedTime)}`
                })
            });
            const workoutData = await workoutRes.json();
            if (!workoutData.success) throw new Error("Failed to create workout");

            const workoutId = workoutData.data.id;

            let savedCount = 0;
            let failedCount = 0;

            for (const ex of exercises) {
                const exRes = await apiFetch(`/api/workouts/${workoutId}/exercises`, {
                    method: "POST",
                    headers,
                    body: JSON.stringify({ exercise_id: ex.exercise_id })
                });
                const exData = await exRes.json();
                if (!exData.success) {
                    failedCount += ex.sets.length;
                    continue;
                }

                const workoutExerciseId = exData.data.id;

                for (const set of ex.sets) {
                    try {
                        const setRes = await apiFetch(`/api/workouts/exercises/${workoutExerciseId}/sets`, {
                            method: "POST",
                            headers,
                            body: JSON.stringify({
                                weight: set.weight || 0,
                                reps: set.repetitions || 0,
                                time: ex.rest_time,
                                note: set.is_done ? "Completed" : "Skipped"
                            })
                        });
                        const setData = await setRes.json();
                        if (setData.success) {
                            savedCount++;
                        } else {
                            failedCount++;
                        }
                    } catch {
                        failedCount++;
                    }
                }
            }

            resetWorkout();

            if (failedCount === 0) {
                showNotification(`Workout saved successfully! (${savedCount} sets)`, "success");
                navigate("/workouts");
            } else {
                showNotification(`Workout saved with ${failedCount} failed set(s).`, "error");
                navigate("/workouts");
            }
        } catch (err) {
            console.error("Failed to save workout", err);
            showNotification("Error saving workout.", "error");
        }
    };

    return (
        <div className="p-6 font-sans bg-black text-zinc-100 min-h-screen">
            <div className="max-w-4xl mx-auto">
                <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <input
                            type="text"
                            value={workoutName}
                            onChange={(e) => setWorkoutName(e.target.value)}
                            className="bg-transparent text-3xl font-bold font-display uppercase italic text-lime-400 border-none focus:ring-0 w-full"
                        />
                        <div className="text-zinc-400 font-mono mt-1 text-lg">
                            {formatTime(elapsedTime)}
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {!isWorkoutActive ? (
                            <>
                                <Button variant="secondary" onClick={() => setShowRoutinePicker(true)}>Load Routine</Button>
                                <Button variant="primary" onClick={startWorkout}>Start Empty Workout</Button>
                            </>
                        ) : (
                            <Button variant="danger" onClick={() => setShowFinishModal(true)}>Finish Workout</Button>
                        )}
                    </div>
                </header>

                {isRestTimerActive && (
                    <div className="bg-zinc-900 border border-zinc-700 p-4 rounded-xl mb-6 flex flex-wrap items-center gap-3 shadow-lg">
                        <span className="font-bold uppercase tracking-wider text-lime-400 text-sm">Rest</span>
                        <span className="font-mono text-2xl font-black text-lime-400">{formatTime(restTime)}</span>
                        <div className="flex gap-2 ml-auto">
                            <Button variant="secondary" onClick={() => addRestTime(15)}>
                                +15s
                            </Button>
                            <Button variant="danger" onClick={skipRestTimer}>
                                Skip
                            </Button>
                        </div>
                    </div>
                )}

                <div className="space-y-6">
                    {exercises.map((ex, exIdx) => (
                        <div key={exIdx} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-zinc-100">{ex.name}</h3>
                                    {/* Inline Exercise rest modification control */}
                                    <div className="flex items-center gap-1 mt-1 text-zinc-400 text-sm">
                                        <span>Target Rest:</span>
                                        <button
                                            onClick={() => updateExerciseRest(exIdx, ex.rest_time - 5)}
                                            className="px-1.5 py-0.5 bg-zinc-800 rounded hover:bg-zinc-700 font-bold"
                                        >
                                            -
                                        </button>
                                        <span className="font-mono font-bold text-lime-400 mx-1">{ex.rest_time}s</span>
                                        <button
                                            onClick={() => updateExerciseRest(exIdx, ex.rest_time + 5)}
                                            className="px-1.5 py-0.5 bg-zinc-800 rounded hover:bg-zinc-700 font-bold"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                                <button onClick={() => removeExercise(exIdx)} className="text-zinc-500 hover:text-red-400 transition-colors self-start sm:self-center">
                                    Remove
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-zinc-500 text-xs uppercase tracking-widest border-b border-zinc-800">
                                            <th className="py-2 px-2 w-12 text-center">Status</th>
                                            <th className="py-2 px-2 w-12">Set</th>
                                            <th className="py-2 px-2">Weight (kg)</th>
                                            <th className="py-2 px-2">Reps</th>
                                            <th className="py-2 px-2 text-right"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ex.sets.map((set, setIdx) => (
                                            <tr key={setIdx} className={`border-b border-zinc-800/50 transition-opacity duration-200 ${set.is_done ? 'opacity-40 bg-zinc-950/30' : ''}`}>
                                                <td className="py-2 px-2 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleSetDone(exIdx, setIdx)}
                                                        className={`w-6 h-6 rounded-md flex items-center justify-center transition-all border ${set.is_done
                                                            ? 'bg-lime-400 border-lime-400 text-black'
                                                            : 'border-zinc-700 hover:border-lime-400 bg-transparent'
                                                            }`}
                                                    >
                                                        {set.is_done && "✓"}
                                                    </button>
                                                </td>
                                                <td className="py-3 px-2 font-mono text-zinc-400">{set.set_number}</td>
                                                <td className="py-2 px-1">
                                                    <TransparentNumericInput
                                                        value={set.weight}
                                                        onChange={(val) => updateSet(exIdx, setIdx, "weight", val)}
                                                        disabled={set.is_done}
                                                        placeholder="0"
                                                        min={0}
                                                        max={999}
                                                        step={0.1}
                                                        className="w-full"
                                                        inputClassName="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-1.5 px-3 text-sm focus:border-lime-400 focus:ring-0 transition-colors disabled:opacity-50"
                                                    />
                                                </td>
                                                <td className="py-2 px-1">
                                                    <TransparentNumericInput
                                                        value={set.repetitions}
                                                        onChange={(val) => updateSet(exIdx, setIdx, "repetitions", val)}
                                                        disabled={set.is_done}
                                                        placeholder="0"
                                                        min={0}
                                                        max={999}
                                                        step={1}
                                                        className="w-full"
                                                        inputClassName="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-1.5 px-3 text-sm focus:border-lime-400 focus:ring-0 transition-colors disabled:opacity-50"
                                                    />
                                                </td>
                                                <td className="py-2 px-2 text-right">
                                                    <button onClick={() => removeSet(exIdx, setIdx)} className="text-zinc-600 hover:text-red-400 font-bold text-lg">×</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <button
                                onClick={() => addSet(exIdx)}
                                className="mt-4 w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-bold transition-colors"
                            >
                                + Add Set
                            </button>
                        </div>
                    ))}
                </div>

                <div className="mt-8 flex flex-col sm:flex-row gap-4">
                    <Button variant="secondary" onClick={() => setShowExercisePicker(true)} className="w-full">
                        Add Exercise
                    </Button>
                </div>

                {showExercisePicker && (
                    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="w-full max-w-2xl max-h-[80vh] overflow-hidden bg-zinc-950 border border-zinc-800 rounded-3xl flex flex-col">
                            <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                                <h2 className="text-xl font-bold uppercase italic text-lime-400">Select Exercise</h2>
                                <button onClick={() => setShowExercisePicker(false)} className="text-zinc-500 hover:text-white">✕</button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4">
                                <ExercisePicker onSelect={handleAddExercise} />
                            </div>
                        </div>
                    </div>
                )}

                {showRoutinePicker && (
                    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold uppercase italic text-lime-400">Load Routine</h2>
                                <button onClick={() => setShowRoutinePicker(false)} className="text-zinc-500 hover:text-white">✕</button>
                            </div>
                            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                                {routines.length === 0 && <p className="text-zinc-500 text-center">No routines found.</p>}
                                {routines.map((r) => (
                                    <button
                                        key={r.id}
                                        onClick={() => loadRoutine(r.id)}
                                        className="w-full text-left p-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-lime-400/50 rounded-2xl transition-all group"
                                    >
                                        <div className="font-bold text-zinc-100 group-hover:text-lime-400 transition-colors">{r.name}</div>
                                        <div className="text-xs text-zinc-500 mt-1">Click to load exercises</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {showFinishModal && (
                    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                            <h2 className="font-display text-lg font-bold text-zinc-100 uppercase tracking-wide mb-2">
                                Finish Workout
                            </h2>
                            <p className="text-sm text-zinc-400 mb-6">
                                Duration: {formatTime(elapsedTime)}
                            </p>
                            <div className="space-y-3">
                                <button
                                    onClick={() => { setShowFinishModal(false); saveWorkout(); }}
                                    className="w-full bg-lime-400 text-black font-bold py-3 rounded-lg hover:bg-lime-300 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                >
                                    Save Workout
                                </button>
                                <button
                                    onClick={() => { setShowFinishModal(false); resetWorkout(); navigate("/"); }}
                                    className="w-full bg-rose-500/10 text-rose-500 font-bold py-3 rounded-lg border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all"
                                >
                                    Delete Workout
                                </button>
                                <button
                                    onClick={() => setShowFinishModal(false)}
                                    className="w-full bg-zinc-800 text-zinc-300 font-bold py-3 rounded-lg hover:bg-zinc-700 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}