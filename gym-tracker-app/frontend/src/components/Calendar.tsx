import { useState, useMemo } from 'react';

interface CalendarEvent {
    date: string;
    status?: 'completed' | 'pending' | 'missed' | 'rest';
    label?: string;
}

interface CalendarProps {
    selectedDate?: string;
    onSelect?: (date: string) => void;
    events?: Record<string, CalendarEvent>;
    plannedDates?: Set<string>;
    goalDates?: Set<string>;
    className?: string;
    compact?: boolean;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
    return (new Date(year, month, 1).getDay() + 6) % 7;
}

function formatDate(year: number, month: number, day: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function Calendar({ selectedDate, onSelect, events = {}, goalDates, className = '', compact = false }: CalendarProps) {
    const today = useMemo(() => {
        const d = new Date();
        return formatDate(d.getFullYear(), d.getMonth(), d.getDate());
    }, []);

    const [viewDate, setViewDate] = useState(() => {
        if (selectedDate) {
            const d = new Date(selectedDate + 'T00:00:00');
            return { year: d.getFullYear(), month: d.getMonth() };
        }
        const d = new Date();
        return { year: d.getFullYear(), month: d.getMonth() };
    });

    const daysInMonth = getDaysInMonth(viewDate.year, viewDate.month);
    const firstDay = getFirstDayOfMonth(viewDate.year, viewDate.month);

    const days = useMemo(() => {
        const result: (number | null)[] = [];
        for (let i = 0; i < firstDay; i++) {
            result.push(null);
        }
        for (let d = 1; d <= daysInMonth; d++) {
            result.push(d);
        }
        return result;
    }, [firstDay, daysInMonth]);

    function prevMonth() {
        setViewDate(prev => {
            if (prev.month === 0) {
                return { year: prev.year - 1, month: 11 };
            }
            return { year: prev.year, month: prev.month - 1 };
        });
    }

    function nextMonth() {
        setViewDate(prev => {
            if (prev.month === 11) {
                return { year: prev.year + 1, month: 0 };
            }
            return { year: prev.year, month: prev.month + 1 };
        });
    }

    const monthName = new Date(viewDate.year, viewDate.month).toLocaleString('default', { month: 'long' });

    return (
        <div className={`bg-card border border-subtle rounded-xl shadow-xl backdrop-blur-md ${compact ? 'p-2.5' : 'p-4'} ${className}`}>
            <div className={`flex items-center justify-between ${compact ? 'mb-2' : 'mb-4'}`}>
                <button onClick={prevMonth} className={`rounded-lg hover:bg-elevated text-muted hover:text-body transition-colors ${compact ? 'p-1' : 'p-2'}`} aria-label="Previous month">
                    <svg className={compact ? 'w-4 h-4' : 'w-5 h-5'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h3 className={`font-bold text-body ${compact ? 'text-sm' : 'text-lg'}`}>
                    {monthName} {viewDate.year}
                </h3>
                <button onClick={nextMonth} className={`rounded-lg hover:bg-elevated text-muted hover:text-body transition-colors ${compact ? 'p-1' : 'p-2'}`} aria-label="Next month">
                    <svg className={compact ? 'w-4 h-4' : 'w-5 h-5'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>

            <div className={`grid grid-cols-7 ${compact ? 'mb-0.5' : 'mb-1'}`}>
                {WEEKDAYS.map(day => (
                    <div key={day} className={`text-center font-bold text-dim uppercase ${compact ? 'text-[10px] py-1' : 'text-xs py-2'}`}>
                        {day}
                    </div>
                ))}
            </div>

            <div className={`grid grid-cols-7 ${compact ? 'gap-0.5' : 'gap-1'}`}>
                {days.map((day, index) => {
                    if (day === null) {
                        return <div key={`empty-${index}`} />;
                    }

                    const dateStr = formatDate(viewDate.year, viewDate.month, day);
                    const isToday = dateStr === today;
                    const isSelected = dateStr === selectedDate;
                    const event = events[dateStr];
                    const hasGoal = goalDates?.has(dateStr);

                    return (
                        <button
                            key={dateStr}
                            onClick={() => onSelect?.(dateStr)}
                            className={`
                                relative rounded-lg transition-all flex items-center justify-center
                                ${compact ? 'aspect-[4/3] text-xs' : 'aspect-square text-sm font-semibold'}
                                ${isSelected
                                    ? 'bg-accent text-black font-bold'
                                    : isToday
                                        ? 'bg-accent/10 text-accent border border-accent/30'
                                        : 'text-muted hover:bg-elevated hover:text-body'
                                }
                            `}
                        >
                            {day}
                            {!isSelected && (event || hasGoal) && (
                                <span className={`absolute flex gap-[3px] items-center ${compact ? 'bottom-0.5' : 'bottom-1'}`}>
                                    {event && (
                                        <span className={`rounded-full ${compact ? 'w-1 h-1' : 'w-1.5 h-1.5'} ${
                                            event.status === 'completed' ? 'bg-accent' :
                                            event.status === 'rest' ? 'bg-blue-400' :
                                            event.status === 'missed' ? 'bg-rose-500' :
                                            'bg-elevated'
                                        }`} />
                                    )}
                                    {hasGoal && !event?.status?.startsWith('completed') && (
                                        <span className={`rounded-full bg-blue-400 ${compact ? 'w-1 h-1' : 'w-1.5 h-1.5'}`} />
                                    )}
                                </span>
                            )}
                            {plannedDates?.has(dateStr) && !isSelected && (
                                <span className={`absolute ${event ? 'bottom-0' : 'bottom-1.5'} w-1.5 h-1.5 rounded-full bg-blue-400/70`} />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
