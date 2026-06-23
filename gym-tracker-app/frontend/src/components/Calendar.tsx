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
    className?: string;
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

export default function Calendar({ selectedDate, onSelect, events = {}, className = '' }: CalendarProps) {
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
        <div className={`bg-card border border-subtle rounded-xl p-4 shadow-xl backdrop-blur-md ${className}`}>
            <div className="flex items-center justify-between mb-4">
                <button
                    onClick={prevMonth}
                    className="p-2 rounded-lg hover:bg-elevated text-muted hover:text-body transition-colors"
                    aria-label="Previous month"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h3 className="text-lg font-bold text-body">
                    {monthName} {viewDate.year}
                </h3>
                <button
                    onClick={nextMonth}
                    className="p-2 rounded-lg hover:bg-elevated text-muted hover:text-body transition-colors"
                    aria-label="Next month"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>

            <div className="grid grid-cols-7 mb-1">
                {WEEKDAYS.map(day => (
                    <div key={day} className="text-center text-xs font-bold text-dim uppercase py-2">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
                {days.map((day, index) => {
                    if (day === null) {
                        return <div key={`empty-${index}`} />;
                    }

                    const dateStr = formatDate(viewDate.year, viewDate.month, day);
                    const isToday = dateStr === today;
                    const isSelected = dateStr === selectedDate;
                    const event = events[dateStr];

                    return (
                        <button
                            key={dateStr}
                            onClick={() => onSelect?.(dateStr)}
                            className={`
                                relative aspect-square rounded-lg text-sm font-semibold transition-all flex items-center justify-center
                                ${isSelected
                                    ? 'bg-lime-400 text-black'
                                    : isToday
                                        ? 'bg-lime-400/10 text-lime-400 border border-lime-400/30'
                                        : 'text-muted hover:bg-elevated hover:text-body'
                                }
                            `}
                        >
                            {day}
                            {event && !isSelected && (
                                <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                                    event.status === 'completed' ? 'bg-lime-400' :
                                    event.status === 'rest' ? 'bg-blue-400' :
                                    event.status === 'missed' ? 'bg-rose-500' :
                                    'bg-elevated'
                                }`} />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
