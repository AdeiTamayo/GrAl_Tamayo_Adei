import React, { useState, useRef, useEffect } from 'react';
import Button from '../components/Button';
import Calendar from '../components/Calendar';

// Mock types for the schedule
type ScheduledWorkout = {
    id: number;
    date: string;
    routineName: string;
    status: 'completed' | 'pending' | 'missed' | 'rest';
};

export default function Schedule() {
    const [selectedDayIndex, setSelectedDayIndex] = useState<number>(new Date().getDay());
    const [showCalendar, setShowCalendar] = useState(false);
    const calendarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
                setShowCalendar(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const mockSchedule: Record<number, ScheduledWorkout> = {
        1: { id: 1, date: 'Monday', routineName: 'Push Day (Chest/Tris)', status: 'completed' },
        2: { id: 2, date: 'Tuesday', routineName: 'Pull Day (Back/Bis)', status: 'completed' },
        3: { id: 3, date: 'Wednesday', routineName: 'Active Recovery', status: 'rest' },
        4: { id: 4, date: 'Thursday', routineName: 'Leg Day (Quads/Calves)', status: 'pending' },
        5: { id: 5, date: 'Friday', routineName: 'Upper Body Power', status: 'pending' },
    };

    const selectedWorkout = mockSchedule[selectedDayIndex];
    const isToday = selectedDayIndex === new Date().getDay();

    function handleDateSelect(dateStr: string) {
        const dayIndex = new Date(dateStr + 'T00:00:00').getDay();
        setSelectedDayIndex(dayIndex);
        setShowCalendar(false);
    }

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 mt-4 md:mt-8 space-y-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-display text-body uppercase tracking-tight mb-2">Schedule</h1>
                <div className="relative" ref={calendarRef}>
                    <Button onClick={() => setShowCalendar(!showCalendar)} variant="secondary">
                        Select Week
                    </Button>
                    {showCalendar && (
                        <div className="absolute right-0 mt-2 z-30 animate-in fade-in slide-in-from-top-2 duration-150">
                            <Calendar onSelect={handleDateSelect} />
                        </div>
                    )}
                </div>
            </div>

            {/* Weekly Strip */}
            <div className="grid grid-cols-7 gap-2 md:gap-4 mb-8">
                {weekDays.map((day, index) => {
                    const workout = mockSchedule[index];
                    const isSelected = selectedDayIndex === index;
                    const isCurrentDay = index === new Date().getDay();

                    return (
                        <div
                            key={day}
                            onClick={() => setSelectedDayIndex(index)}
                            className={`cursor-pointer border rounded-xl p-3 flex flex-col items-center transition-all ${isSelected
                                ? 'bg-surface border-lime-400 shadow-lg shadow-lime-400/10'
                                : 'bg-card border-subtle hover:border-hover'
                                }`}
                        >
                            <span className={`text-xs font-bold uppercase ${isCurrentDay ? 'text-lime-400' : 'text-dim'}`}>
                                {day.substring(0, 3)}
                            </span>

                            {/* Status Dots */}
                            <div className="mt-3 w-3 h-3 rounded-full flex-shrink-0">
                                {!workout ? (
                                    <div className="w-full h-full bg-elevated rounded-full" />
                                ) : workout.status === 'completed' ? (
                                    <div className="w-full h-full bg-lime-400 rounded-full shadow-[0_0_8px_rgba(163,230,53,0.6)]" />
                                ) : workout.status === 'rest' ? (
                                    <div className="w-full h-full bg-blue-400 rounded-full" />
                                ) : workout.status === 'missed' ? (
                                    <div className="w-full h-full bg-rose-500 rounded-full" />
                                ) : (
                                    <div className="w-full h-full border-2 border-lime-400 rounded-full" />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Selected Day Details Panel */}
            <div className="bg-card border border-subtle rounded-xl p-6 shadow-xl space-y-4 min-h-[300px]">
                <div className="flex justify-between items-start border-b border-subtle pb-4 mb-4">
                    <div>
                        <h2 className="font-display text-2xl font-bold text-body tracking-wide uppercase">
                            {weekDays[selectedDayIndex]} {isToday && <span className="text-lime-400 text-lg ml-2">(Today)</span>}
                        </h2>
                        <p className="text-muted mt-1">Plan for the day</p>
                    </div>
                </div>

                {selectedWorkout ? (
                    <div className="space-y-6 flex flex-col items-start">
                        <div className="bg-surface/50 p-4 rounded-lg border border-subtle/80 w-full">
                            <h3 className="text-xl font-bold text-heading mb-1">{selectedWorkout.routineName}</h3>
                            <div className="flex items-center gap-2 mt-2 text-sm">
                                <span className={`px-2 py-1 rounded text-heading font-bold ${selectedWorkout.status === 'completed' ? 'bg-lime-400' :
                                    selectedWorkout.status === 'rest' ? 'bg-blue-400' :
                                        selectedWorkout.status === 'missed' ? 'bg-rose-500' :
                                            'bg-zinc-300'
                                    }`}>
                                    {selectedWorkout.status.toUpperCase()}
                                </span>
                            </div>
                        </div>

                        {selectedWorkout.status === 'pending' && isToday && (
                            <Button variant="primary" onClick={() => alert('Start workout!')}>
                                Start Workout Now
                            </Button>
                        )}

                        <div className="flex gap-4 w-full border-t border-subtle pt-6 mt-4">
                            <Button variant="secondary">Change Routine</Button>
                            <Button variant="danger">Clear Day</Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-8 text-center bg-surface/40 rounded-lg border border-dashed border-subtle">
                        <h3 className="text-muted font-bold mb-2">Rest Day</h3>
                        <p className="text-dim mb-6">No routines scheduled for this day.</p>
                        <Button variant="primary" onClick={() => alert('Open routine assignment modal')}>
                            + Assign Routine
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}