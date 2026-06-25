import React, { useState, useEffect, useMemo, useCallback } from "react";
import { apiFetch } from "../utils/api";
import { formatTime } from "../utils/helpers";
import Button from "../components/Button";
import Modal from "../components/Modal";
import ExercisePicker, { Exercise as ExerciseMeta } from '../components/ExercisePicker';
import TransparentNumericInput from "../components/TransparentNumericInput";
import DeleteButton from "../components/DeleteButton";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useNotification } from "../components/NotificationProvider";
import { useWorkout } from "../components/WorkoutContext";
import { useSettings } from "../components/SettingsContext";

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

    const { settings } = useSettings();
    const showRpe = settings?.show_rpe !== false;
    const show1rm = settings?.show_1rm !== false;
    const [showExercisePicker, setShowExercisePicker] = useState(false);
    const [routines, setRoutines] = useState<Routine[]>([]);
    const [showRoutinePicker, setShowRoutinePicker] = useState(false);
    const [showFinishModal, setShowFinishModal] = useState(false);
    const [showSaveRoutineModal, setShowSaveRoutineModal] = useState(false);
    const [routineName, setRoutineName] = useState("");

    // Goals state
    const [goals, setGoals] = useState<Record<number, { target_weight: string; target_reps: number }>>({});

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
        window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        if (showExercisePicker || showRoutinePicker || showFinishModal || showSaveRoutineModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [showExercisePicker, showRoutinePicker, showFinishModal, showSaveRoutineModal]);

    const fetchRoutines = useCallback(async () => {
        try {
            const res = await apiFetch("/api/routines", { headers });
            const data = await res.json();
            if (data.success) {
                setRoutines(data.routines || []);
            }
        } catch (err) {
            console.error("Failed to fetch routines", err);
            showNotification("Failed to fetch routines", "error");
        }
    }, [headers, showNotification]);

    const fetchGoals = useCallback(async () => {
        try {
            const res = await apiFetch("/api/goals", { headers });
            const data = await res.json();
            if (data.success) {
                const goalsMap: Record<number, { target_weight: string; target_reps: number }> = {};
                for (const g of data.goals || []) {
                    goalsMap[g.exercise_id] = { target_weight: g.target_weight, target_reps: g.target_reps };
                }
                setGoals(goalsMap);
            }
        } catch (err) {
            console.error("Failed to fetch goals", err);
        }
    }, [headers]);

    useEffect(() => {
        fetchRoutines();
        fetchGoals();
    }, [headers, fetchRoutines, fetchGoals]);

    const loadRoutine = async (routineId: number) => {
        try {
            const res = await apiFetch(`/api/routines/${routineId}`, { headers });
            const data = await res.json();
            if (data.success) {
                const routine = data.data;
                setWorkoutName(routine.name);
                const loadedExercises = routine.exercises.map((ex: any) => {
                    const exerciseRest = parseInt(ex.planned_time) || 60;
                    const hasSets = ex.sets && ex.sets.length > 0;
                    return {
                        exercise_id: ex.exercise_id || ex.id,
                        name: ex.exercise_name || ex.name,
                        rest_time: exerciseRest,
                        sets: hasSets ? ex.sets.map((s: any) => ({
                            set_number: s.set_number,
                            weight: s.planned_weight || "",
                            repetitions: s.planned_reps || "",
                            note: "",
                            is_done: false
                        })) : Array.from({ length: ex.planned_sets || 1 }, (_, i) => ({
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
            showNotification("Failed to load routine", "error");
        }
    };

    useEffect(() => {
        const loadRoutineId = searchParams.get('loadRoutine');
        if (loadRoutineId) {
            const id = parseInt(loadRoutineId);
            if (!isNaN(id)) {
                const name = searchParams.get('name');
                if (name) setWorkoutName(name);
                loadRoutine(id);
                navigate('/active-workout', { replace: true });
            }
        }
    }, [searchParams, navigate]);

    const handleAddExercise = (exercise: ExerciseMeta) => {
        addExercise(exercise);
        setShowExercisePicker(false);
        if (!isWorkoutActive) startWorkout();
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
            const prExercises: string[] = [];

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
                                    note: set.note || null,
                                    rpe: set.rpe || null
                                })
                        });
                        const setData = await setRes.json();
                        if (setData.success) {
                            savedCount++;
                            if (setData.isPr) {
                                prExercises.push(ex.name);
                            }
                        } else {
                            failedCount++;
                        }
                    } catch {
                        failedCount++;
                    }
                }
            }

            resetWorkout();

            const uniquePrs = Array.from(new Set(prExercises));

            if (failedCount === 0) {
                const msg = uniquePrs.length > 0
                    ? `Workout saved! New PR${uniquePrs.length > 1 ? 's' : ''}: ${uniquePrs.join(', ')}`
                    : `Workout saved successfully! (${savedCount} sets)`;
                showNotification(msg, "success");
                navigate("/workouts");
            } else {
                const msg = uniquePrs.length > 0
                    ? `Saved with ${failedCount} failed set(s). New PRs: ${uniquePrs.join(', ')}`
                    : `Workout saved with ${failedCount} failed set(s).`;
                showNotification(msg, "error");
                navigate("/workouts");
            }
        } catch (err) {
            console.error("Failed to save workout", err);
            showNotification("Error saving workout.", "error");
        }
    };

    const saveAsRoutine = async () => {
        if (!routineName.trim()) {
            showNotification("Please enter a routine name", "error");
            return;
        }
        try {
            const res = await apiFetch("/api/routines", {
                method: "POST",
                headers,
                body: JSON.stringify({ name: routineName.trim() })
            });
            const data = await res.json();
            if (!data.success) throw new Error("Failed to create routine");

            const routineId = data.data.id;
            let exCount = 0;

            for (const ex of exercises) {
                const reps = ex.sets.map(s => Number(s.repetitions) || 0).filter(r => r > 0);
                const avgReps = reps.length > 0 ? Math.round(reps.reduce((a, b) => a + b, 0) / reps.length) : 10;
                const weights = ex.sets.map(s => Number(s.weight) || 0).filter(w => w > 0);
                const avgWeight = weights.length > 0 ? (weights.reduce((a, b) => a + b, 0) / weights.length) : 0;

                const exRes = await apiFetch(`/api/routines/${routineId}/exercises`, {
                    method: "POST",
                    headers,
                    body: JSON.stringify({
                        exercise_id: ex.exercise_id,
                        planned_sets: ex.sets.length,
                        planned_reps: avgReps,
                        planned_weight: avgWeight,
                        planned_time: ex.rest_time
                    })
                });
                const exData = await exRes.json();
                if (exData.success && exData.data) {
                    const itemId = exData.data.id || exData.data.item_id;
                    if (itemId) {
                        for (let i = 0; i < ex.sets.length; i++) {
                            const s = ex.sets[i];
                            await apiFetch(`/api/routines/exercises/${itemId}/sets`, {
                                method: "POST",
                                headers,
                                body: JSON.stringify({
                                    set_number: i + 1,
                                    planned_weight: Number(s.weight) || 0,
                                    planned_reps: Number(s.repetitions) || 0,
                                    planned_time: 0
                                })
                            });
                        }
                    }
                }
                exCount++;
            }

            setShowSaveRoutineModal(false);
            setRoutineName("");
            showNotification(`Routine created with ${exCount} exercise(s)!`, "success");
        } catch (err) {
            console.error("Failed to save routine", err);
            showNotification("Error saving routine.", "error");
        }
    };

    return (
        <div className="p-6 font-sans bg-body text-body min-h-screen animate-in fade-in duration-200">
            <div className="max-w-4xl mx-auto">
                <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <input
                            type="text"
                            value={workoutName}
                            onChange={(e) => setWorkoutName(e.target.value)}
                            className="bg-transparent text-3xl font-bold font-display uppercase italic text-accent border-none focus:ring-0 w-full"
                        />
                        <div className="text-muted font-mono mt-1 text-lg">
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
                    <div className="bg-surface border border-subtle p-4 rounded-xl mb-6 flex flex-wrap items-center gap-3 shadow-lg">
                        <span className="font-bold uppercase tracking-wider text-accent text-sm">Rest</span>
                        <span className="font-mono text-2xl font-black text-accent">{formatTime(restTime)}</span>
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
                        <div key={exIdx} className="bg-surface border border-subtle rounded-2xl p-5 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-body">{ex.name}</h3>
                                    {(() => {
                                        const goal = goals[ex.exercise_id];
                                        if (!goal) return null;
                                        const targetWeight = Number(goal.target_weight);
                                        if (!targetWeight) return null;
                                        const bestWeight = Math.max(...ex.sets.map(s => Number(s.weight) || 0));
                                        const diff = targetWeight - bestWeight;
                                        const achieved = diff <= 0;
                                        return (
                                            <div className="flex items-center gap-2 mt-1 text-sm">
                                                <span className={`font-semibold ${achieved ? 'text-accent' : 'text-dim'}`}>
                                                    Goal: {targetWeight} kg
                                                </span>
                                                {bestWeight > 0 && (
                                                    <span className={`font-medium ${achieved ? 'text-accent' : 'text-amber-400'}`}>
                                                        ({achieved ? '✓' : `${-diff.toFixed(1)} kg`})
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })()}
                                    {/* Inline Exercise rest presets */}
                                    <div className="flex items-center gap-2 mt-1 text-muted text-sm flex-wrap">
                                        <span>Target Rest:</span>
                                        <span className="font-mono font-bold text-accent">{ex.rest_time}s</span>
                                        <div className="flex gap-1">
                                            {[60, 90, 120].map(preset => (
                                                <button
                                                    key={preset}
                                                    onClick={() => updateExerciseRest(exIdx, preset)}
                                                    className={`px-2 py-0.5 rounded font-bold text-xs transition-colors ${
                                                        ex.rest_time === preset
                                                            ? 'bg-accent text-white'
                                                            : 'bg-elevated hover:bg-hover text-muted'
                                                    }`}
                                                >
                                                    {preset}s
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => removeExercise(exIdx)} className="text-dim hover:text-red-400 transition-colors self-start sm:self-center">
                                    Remove
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-dim text-xs uppercase tracking-widest border-b border-subtle">
                                            <th className="py-2 px-2 w-12 text-center">Status</th>
                                            <th className="py-2 px-2 w-12">Set</th>
                                            <th className="py-2 px-2 text-right">Weight (kg)</th>
                                            <th className="py-2 px-2 text-right">Reps</th>
                                            {showRpe && <th className="py-2 px-2 w-16 text-center">RPE</th>}
                                            {show1rm && <th className="py-2 px-2 w-16 text-center">e1RM</th>}
                                            <th className="py-2 px-2 text-center">Goal</th>
                                            <th className="py-2 px-2 min-w-[100px]">Notes</th>
                                            <th className="py-2 px-2 text-right"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ex.sets.map((set, setIdx) => (
                                            <tr key={setIdx} className={`border-b border-subtle/50 transition-opacity duration-200 ${set.is_done ? 'opacity-40 bg-card/30' : ''}`}>
                                                <td className="py-2 px-2 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleSetDone(exIdx, setIdx)}
                                                        className={`w-6 h-6 rounded-md flex items-center justify-center transition-all border ${set.is_done
                                                            ? 'bg-accent border-accent text-black'
                                                            : 'border-subtle hover:border-accent bg-transparent'
                                                            }`}
                                                    >
                                                        {set.is_done && "✓"}
                                                    </button>
                                                </td>
                                                <td className="py-3 px-2 font-mono text-muted">{set.set_number}</td>
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
                                                        inputClassName="w-full bg-card border border-subtle rounded-lg py-1.5 px-3 text-sm focus:border-accent focus:ring-0 transition-colors disabled:opacity-50"
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
                                                        inputClassName="w-full bg-card border border-subtle rounded-lg py-1.5 px-3 text-sm focus:border-accent focus:ring-0 transition-colors disabled:opacity-50"
                                                    />
                                                </td>
                                                {showRpe && (
                                                    <td className="py-2 px-1">
                                                        <TransparentNumericInput
                                                            value={set.rpe ?? ""}
                                                            onChange={(val) => updateSet(exIdx, setIdx, "rpe", val)}
                                                            disabled={set.is_done}
                                                            placeholder="—"
                                                            min={1}
                                                            max={10}
                                                            step={0.5}
                                                            className="w-full"
                                                            inputClassName="w-full bg-card border border-subtle rounded-lg py-1.5 px-2 text-sm focus:border-accent focus:ring-0 transition-colors disabled:opacity-50 text-center"
                                                        />
                                                    </td>
                                                )}
                                                {show1rm && (
                                                    <td className="py-2 px-2">
                                                        {set.weight && set.repetitions ? (
                                                            <span className="font-mono text-xs text-accent/80">
                                                                {(Number(set.weight) * (1 + Number(set.repetitions) / 30)).toFixed(1)}
                                                            </span>
                                                        ) : (
                                                            <span className="text-dim text-xs">—</span>
                                                        )}
                                                    </td>
                                                )}
                                                <td className="py-2 px-2 text-center">
                                                    {(() => {
                                                        const goal = goals[ex.exercise_id];
                                                        if (!goal) return <span className="text-dim text-xs">—</span>;
                                                        const targetWeight = Number(goal.target_weight);
                                                        if (!targetWeight) return <span className="text-dim text-xs">—</span>;
                                                        const setWeight = Number(set.weight) || 0;
                                                        if (!setWeight) return <span className="text-dim text-xs">—</span>;
                                                        const diff = targetWeight - setWeight;
                                                        const achieved = diff <= 0;
                                                        return (
                                                            <span className={`font-mono text-xs font-semibold ${achieved ? 'text-accent' : 'text-amber-400'}`}>
                                                                {achieved ? '✓' : `-${diff.toFixed(1)} kg`}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="py-2 px-2 min-w-[100px]">
                                                    <input
                                                        type="text"
                                                        value={set.note}
                                                        onChange={(e) => updateSet(exIdx, setIdx, "note", e.target.value)}
                                                        disabled={set.is_done}
                                                        placeholder="Note"
                                                        className="w-full bg-transparent border-b border-subtle/50 text-xs text-body placeholder:text-dim focus:border-accent focus:outline-none py-1 disabled:opacity-50"
                                                    />
                                                </td>
                                                <td className="py-2 px-2 text-right">
                                                    <DeleteButton onClick={() => removeSet(exIdx, setIdx)} className="!p-1 !w-7 !h-7" />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <button
                                onClick={() => addSet(exIdx)}
                                className="mt-4 w-full py-2 bg-elevated hover:bg-hover text-muted rounded-xl text-sm font-bold transition-colors"
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

                <Modal open={showExercisePicker} onClose={() => setShowExercisePicker(false)} maxWidth="2xl" backdrop="darker">
                    <div className="max-h-[80vh] overflow-hidden bg-card border border-subtle rounded-2xl flex flex-col">
                        <div className="p-4 border-b border-subtle">
                            <h2 className="text-xl font-bold uppercase italic text-accent">Select Exercise</h2>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            <ExercisePicker onSelect={handleAddExercise} />
                        </div>
                    </div>
                </Modal>

                <Modal open={showRoutinePicker} onClose={() => setShowRoutinePicker(false)} maxWidth="lg" backdrop="darker">
                    <div className="bg-card border border-subtle rounded-2xl p-6">
                        <h2 className="text-xl font-bold uppercase italic text-accent mb-6">Load Routine</h2>
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                            {routines.length === 0 && <p className="text-dim text-center">No routines found.</p>}
                            {routines.map((r) => (
                                <button
                                    key={r.id}
                                    onClick={() => loadRoutine(r.id)}
                                    className="w-full text-left p-4 bg-surface hover:bg-elevated border border-subtle hover:border-accent/50 rounded-2xl transition-all group"
                                >
                                    <div className="font-bold text-body group-hover:text-accent transition-colors">{r.name}</div>
                                    <div className="text-xs text-dim mt-1">Click to load exercises</div>
                                </button>
                            ))}
                        </div>
                    </div>
                </Modal>

                <Modal open={showSaveRoutineModal} onClose={() => { setShowSaveRoutineModal(false); setRoutineName(""); }} maxWidth="sm" backdrop="darker">
                    <div className="w-full bg-card border border-subtle rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                    <h2 className="font-display text-lg font-bold text-body uppercase tracking-wide mb-2">
                        Save as Routine
                    </h2>
                    <p className="text-sm text-muted mb-6">
                        Create a routine from {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}.
                    </p>
                    <input
                        type="text"
                        value={routineName}
                        onChange={(e) => setRoutineName(e.target.value)}
                        placeholder="Routine name"
                        className="w-full bg-surface border border-subtle rounded-lg py-2.5 px-3 text-sm text-body placeholder:text-dim focus:border-accent focus:ring-0 transition-colors mb-4"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') saveAsRoutine(); }}
                    />
                    <div className="space-y-3">
                        <Button onClick={saveAsRoutine} variant="primary" fullWidth>
                            Create Routine
                        </Button>
                        <Button onClick={() => { setShowSaveRoutineModal(false); setRoutineName(""); }} variant="secondary" fullWidth>
                            Cancel
                        </Button>
                    </div>
                </div>
                </Modal>

                <Modal open={showFinishModal} onClose={() => setShowFinishModal(false)} maxWidth="sm" backdrop="darker">
                    <div className="w-full bg-card border border-subtle rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                    <h2 className="font-display text-lg font-bold text-body uppercase tracking-wide mb-2">
                        Finish Workout
                    </h2>
                    <p className="text-sm text-muted mb-6">
                        Duration: {formatTime(elapsedTime)}
                    </p>
                    <div className="space-y-3">
                        <Button onClick={() => { setShowFinishModal(false); saveWorkout(); }} variant="primary" fullWidth>
                            Save Workout
                        </Button>
                        <Button onClick={() => { setShowFinishModal(false); setShowSaveRoutineModal(true); }} variant="secondary" fullWidth>
                            Save as Routine
                        </Button>
                        <Button onClick={() => { setShowFinishModal(false); resetWorkout(); navigate("/"); }} variant="danger" fullWidth>
                            Delete Workout
                        </Button>
                        <Button onClick={() => setShowFinishModal(false)} variant="secondary" fullWidth>
                            Cancel
                        </Button>
                    </div>
                </div>
                </Modal>
            </div>
        </div>
    );
}
