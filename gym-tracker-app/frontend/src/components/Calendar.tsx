import { useState, useMemo } from "react";

interface CalendarEvent {
  date: string;
  status?: "completed" | "pending" | "missed" | "rest";
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

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function Calendar({
  selectedDate,
  onSelect,
  events = {},
  goalDates,
  plannedDates,
  className = "",
  compact = false,
}: CalendarProps) {
  const today = useMemo(() => {
    const d = new Date();
    return formatDate(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);

  const [viewDate, setViewDate] = useState(() => {
    if (selectedDate) {
      const d = new Date(selectedDate + "T00:00:00");
      return { year: d.getFullYear(), month: d.getMonth() };
    }
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(viewDate.year);

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
    setViewDate((prev) => {
      if (prev.month === 0) {
        return { year: prev.year - 1, month: 11 };
      }
      return { year: prev.year, month: prev.month - 1 };
    });
  }

  function nextMonth() {
    setViewDate((prev) => {
      if (prev.month === 11) {
        return { year: prev.year + 1, month: 0 };
      }
      return { year: prev.year, month: prev.month + 1 };
    });
  }

  const monthName = new Date(viewDate.year, viewDate.month).toLocaleString(
    "default",
    { month: "long" },
  );
  const months = Array.from({ length: 12 }, (_, i) =>
    new Date(pickerYear, i).toLocaleString("default", { month: "long" }),
  );

  return (
    <div
      className={`bg-card border border-accent/30 rounded-2xl shadow-xl backdrop-blur-md ${compact ? "p-2.5" : "p-4"} ${className}`}
    >
      <div
        className={`flex items-center justify-between ${compact ? "mb-2" : "mb-4"}`}
      >
        <button
          onClick={prevMonth}
          className={`rounded-lg hover:bg-elevated text-muted hover:text-body transition-colors ${compact ? "p-1" : "p-2"}`}
          aria-label="Previous month"
        >
          <svg
            className={compact ? "w-4 h-4" : "w-5 h-5"}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              // Re-seed the year stepper from the month actually in view,
              // otherwise stepping past December leaves the picker on the
              // previous year and selecting a month jumps to the wrong one.
              setPickerYear(viewDate.year);
              setShowMonthPicker((prev) => !prev);
            }}
            className={`font-bold text-body hover:text-accent transition-colors ${compact ? "text-sm" : "text-lg"}`}
          >
            {monthName} {viewDate.year}
          </button>

          {showMonthPicker && (
            <div className="absolute left-1/2 top-full z-20 mt-2 w-[280px] -translate-x-1/2 rounded-2xl border border-subtle bg-card p-3 shadow-2xl">
              <div className="mb-3 flex items-center justify-between gap-2 rounded-xl bg-surface p-2">
                <button
                  type="button"
                  onClick={() => setPickerYear((prev) => prev - 1)}
                  className="rounded-lg px-2 py-1 text-muted hover:bg-elevated hover:text-body"
                  aria-label="Previous year"
                >
                  ◀
                </button>
                <span className="text-sm font-bold text-heading">
                  {pickerYear}
                </span>
                <button
                  type="button"
                  onClick={() => setPickerYear((prev) => prev + 1)}
                  className="rounded-lg px-2 py-1 text-muted hover:bg-elevated hover:text-body"
                  aria-label="Next year"
                >
                  ▶
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {months.map((monthLabel, idx) => {
                  const isSelected =
                    viewDate.year === pickerYear && viewDate.month === idx;
                  return (
                    <button
                      key={monthLabel}
                      type="button"
                      onClick={() => {
                        setViewDate({ year: pickerYear, month: idx });
                        setShowMonthPicker(false);
                      }}
                      className={`rounded-xl border px-2 py-2 text-xs font-semibold transition-all ${
                        isSelected
                          ? "border-accent bg-accent text-black"
                          : "border-subtle bg-surface text-body hover:border-accent/40 hover:bg-elevated"
                      }`}
                    >
                      {monthLabel.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <button
          onClick={nextMonth}
          className={`rounded-lg hover:bg-elevated text-muted hover:text-body transition-colors ${compact ? "p-1" : "p-2"}`}
          aria-label="Next month"
        >
          <svg
            className={compact ? "w-4 h-4" : "w-5 h-5"}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>

      <div className={`grid grid-cols-7 ${compact ? "mb-0.5" : "mb-1"}`}>
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className={`text-center font-bold text-dim uppercase ${compact ? "text-[10px] py-1" : "text-xs py-2"}`}
          >
            {day}
          </div>
        ))}
      </div>

      <div className={`grid grid-cols-7 ${compact ? "gap-0.5" : "gap-1"}`}>
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
                                relative rounded-xl transition-all flex items-center justify-center border-2
                                ${compact ? "aspect-[4/4] text-xs" : "aspect-square text-sm font-semibold"}
                                ${
                                  isSelected
                                    ? "bg-accent text-black font-bold border-accent"
                                    : isToday
                                      ? "bg-accent/10 text-accent border-accent/50"
                                      : "border-transparent text-muted hover:bg-elevated hover:text-body"
                                }
                            `}
            >
              {day}
              {!isSelected &&
                (event || hasGoal || plannedDates?.has(dateStr)) && (
                  <span
                    className={`absolute ${compact ? "bottom-0.5" : "bottom-1"} flex gap-0.5`}
                  >
                    {event && (
                      <span
                        className={`rounded-full block mx-auto ${compact ? "w-1 h-1" : "w-1.5 h-1.5"} ${
                          event.status === "completed"
                            ? "bg-accent"
                            : event.status === "rest"
                              ? "bg-blue-400"
                              : event.status === "missed"
                                ? "bg-rose-500"
                                : "bg-accent"
                        }`}
                      />
                    )}
                    {plannedDates?.has(dateStr) && (
                      <span
                        className={`rounded-full block mx-auto ${compact ? "w-1 h-1" : "w-1.5 h-1.5"} bg-blue-400`}
                      />
                    )}
                    {hasGoal && (
                      <span
                        className={`rounded-full block mx-auto ${compact ? "w-1 h-1" : "w-1.5 h-1.5"} bg-amber-400`}
                      />
                    )}
                  </span>
                )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
