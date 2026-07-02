import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useSettings } from './SettingsContext';

interface SetEntry {
    set_number: number;
    weight: number | string;
    repetitions: number | string;
    note: string;
    is_done: boolean;
    rpe?: number | string;
    rest_time?: number;
}

interface ActiveExercise {
    exercise_id: number;
    name: string;
    rest_time: number;
    sets: SetEntry[];
}

interface WorkoutContextValue {
    isWorkoutActive: boolean;
    startTime: number | null;
    elapsedTime: number;
    workoutName: string;
    exercises: ActiveExercise[];
    isRestTimerActive: boolean;
    restTime: number;
    restDuration: number;
    activeExerciseName: string | null;
    setWorkoutName: (name: string) => void;
    startWorkout: () => void;
    resetWorkout: () => void;
    setExercises: (exercises: ActiveExercise[]) => void;
    addExercise: (exercise: { id: number; name: string }) => void;
    addSet: (exerciseIndex: number) => void;
    toggleSetDone: (exerciseIndex: number, setIndex: number) => void;
    updateSet: (exerciseIndex: number, setIndex: number, field: keyof SetEntry, value: any) => void;
    updateExerciseRest: (exerciseIndex: number, value: number) => void;
    removeSet: (exerciseIndex: number, setIndex: number) => void;
    removeExercise: (exerciseIndex: number) => void;
    skipRestTimer: () => void;
    addRestTime: (seconds: number) => void;
}

const WorkoutContext = createContext<WorkoutContextValue | null>(null);

export function useWorkout() {
    const ctx = useContext(WorkoutContext);
    if (!ctx) {
        throw new Error('useWorkout must be used within WorkoutProvider');
    }
    return ctx;
}

export default function WorkoutProvider({ children }: { children: ReactNode }) {
    const { settings } = useSettings();
    const defaultRest = settings?.default_rest_time || 60;

    const [isWorkoutActive, setIsWorkoutActive] = useState(false);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [workoutName, setWorkoutName] = useState("New Workout");
    const [exercises, setExercises] = useState<ActiveExercise[]>([]);

    const [restTime, setRestTime] = useState(0);
    const [isRestTimerActive, setIsRestTimerActive] = useState(false);
    const [restStartTime, setRestStartTime] = useState<number | null>(null);
    const [restDuration, setRestDuration] = useState(defaultRest);

    const activeExerciseName = isWorkoutActive && exercises.length > 0
        ? (exercises.find(ex => ex.sets.some(s => !s.is_done)) || exercises[exercises.length - 1]).name
        : null;

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isWorkoutActive && startTime) {
            interval = setInterval(() => {
                setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isWorkoutActive, startTime]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isRestTimerActive && restStartTime) {
            interval = setInterval(() => {
                const elapsed = Math.floor((Date.now() - restStartTime) / 1000);
                const remaining = restDuration - elapsed;
                if (remaining <= 0) {
                    setIsRestTimerActive(false);
                    setRestTime(0);
                } else {
                    setRestTime(remaining);
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isRestTimerActive, restStartTime, restDuration]);

    const startWorkout = useCallback(() => {
        setIsWorkoutActive(true);
        setStartTime(Date.now());
    }, []);

    const resetWorkout = useCallback(() => {
        setIsWorkoutActive(false);
        setStartTime(null);
        setElapsedTime(0);
        setWorkoutName("New Workout");
        setExercises([]);
        setIsRestTimerActive(false);
        setRestTime(0);
        setRestStartTime(null);
        setRestDuration(defaultRest);
    }, [defaultRest]);

    const addExercise = useCallback((exercise: { id: number; name: string }) => {
        const rest = settings?.default_rest_time || 60;
        setExercises(prev => [...prev, {
            exercise_id: exercise.id,
            name: exercise.name,
            rest_time: rest,
            sets: [{ set_number: 1, weight: "", repetitions: "", note: "", is_done: false, rpe: "", rest_time: rest }]
        }]);
    }, [settings?.default_rest_time]);

    const addSet = useCallback((exerciseIndex: number) => {
        setExercises(prev => {
            const updated = [...prev];
            const lastSet = updated[exerciseIndex].sets[updated[exerciseIndex].sets.length - 1];
            updated[exerciseIndex] = {
                ...updated[exerciseIndex],
                sets: [...updated[exerciseIndex].sets, {
                    set_number: updated[exerciseIndex].sets.length + 1,
                    weight: lastSet?.weight || "",
                    repetitions: lastSet?.repetitions || "",
                    note: "",
                    is_done: false,
                    rpe: "",
                    rest_time: lastSet?.rest_time ?? updated[exerciseIndex].rest_time,
                }]
            };
            return updated;
        });
    }, []);

    const toggleSetDone = useCallback((exerciseIndex: number, setIndex: number) => {
        setExercises(prev => {
            const updated = [...prev];
            const currentSet = { ...updated[exerciseIndex].sets[setIndex] };
            currentSet.is_done = !currentSet.is_done;
            const newSets = [...updated[exerciseIndex].sets];
            newSets[setIndex] = currentSet;
            updated[exerciseIndex] = { ...updated[exerciseIndex], sets: newSets };

            if (currentSet.is_done) {
                const exerciseRestDuration = currentSet.rest_time ?? updated[exerciseIndex].rest_time;
                setRestDuration(exerciseRestDuration);
                setRestTime(exerciseRestDuration);
                setRestStartTime(Date.now());
                setIsRestTimerActive(true);
            }

            return updated;
        });
    }, []);

    const updateSet = useCallback((exerciseIndex: number, setIndex: number, field: keyof SetEntry, value: any) => {
        setExercises(prev => {
            const updated = [...prev];
            const newSets = [...updated[exerciseIndex].sets];
            newSets[setIndex] = { ...newSets[setIndex], [field]: value };
            updated[exerciseIndex] = { ...updated[exerciseIndex], sets: newSets };
            return updated;
        });
    }, []);

    const updateExerciseRest = useCallback((exerciseIndex: number, value: number) => {
        setExercises(prev => {
            const updated = [...prev];
            updated[exerciseIndex] = { ...updated[exerciseIndex], rest_time: value < 0 ? 0 : value };
            return updated;
        });
    }, []);

    const removeSet = useCallback((exerciseIndex: number, setIndex: number) => {
        setExercises(prev => {
            const updated = [...prev];
            const newSets = updated[exerciseIndex].sets.filter((_, i) => i !== setIndex)
                .map((s, i) => ({ ...s, set_number: i + 1 }));
            updated[exerciseIndex] = { ...updated[exerciseIndex], sets: newSets };
            return updated;
        });
    }, []);

    const removeExercise = useCallback((exerciseIndex: number) => {
        setExercises(prev => prev.filter((_, i) => i !== exerciseIndex));
    }, []);

    const skipRestTimer = useCallback(() => {
        setIsRestTimerActive(false);
        setRestTime(0);
    }, []);

    const addRestTime = useCallback((seconds: number) => {
        setRestDuration(prev => prev + seconds);
        setRestTime(prev => prev + seconds);
    }, []);

    return (
        <WorkoutContext.Provider value={{
            isWorkoutActive,
            startTime,
            elapsedTime,
            workoutName,
            exercises,
            isRestTimerActive,
            restTime,
            restDuration,
            activeExerciseName,
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
        }}>
            {children}
        </WorkoutContext.Provider>
    );
}
