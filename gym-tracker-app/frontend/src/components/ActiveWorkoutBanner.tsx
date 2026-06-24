import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkout } from './WorkoutContext';
import Button from './Button';

const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map(v => v < 10 ? "0" + v : v).filter((v, i) => v !== "00" || i > 0).join(":");
};

export default function ActiveWorkoutBanner() {
    const { isWorkoutActive, elapsedTime, activeExerciseName, workoutName, isRestTimerActive, restTime } = useWorkout();
    const navigate = useNavigate();

    if (!isWorkoutActive) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-subtle shadow-xl">
            <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-3 sm:gap-4 flex-wrap">
                <div className="flex items-center gap-2 shrink-0">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent" />
                    </span>
                    <span className="text-accent font-bold text-xs uppercase tracking-wider hidden sm:inline">
                        Workout
                    </span>
                </div>

                <div className="text-body font-mono text-sm font-bold tabular-nums shrink-0">
                    {formatTime(elapsedTime)}
                </div>

                {isRestTimerActive && (
                    <div className="text-amber-400 font-mono text-xs font-bold tabular-nums bg-amber-400/10 px-2 py-0.5 rounded shrink-0">
                        Rest {formatTime(restTime)}
                    </div>
                )}

                <div className="text-muted text-sm truncate min-w-0 flex-1">
                    {workoutName}
                    {activeExerciseName && <span className="hidden sm:inline"> — {activeExerciseName}</span>}
                </div>

                <div className="flex gap-2 shrink-0">
                    <Button
                        variant="secondary"
                        onClick={() => navigate('/active-workout')}
                        className="text-xs !py-1.5 !px-3"
                    >
                        Resume
                    </Button>
                    <Button
                        variant="danger"
                        onClick={() => navigate('/active-workout?finish=1')}
                        className="text-xs !py-1.5 !px-3"
                    >
                        Finish
                    </Button>
                </div>
            </div>
        </div>
    );
}
