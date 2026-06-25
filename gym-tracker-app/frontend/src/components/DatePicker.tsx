import { useState, useRef, useEffect } from "react";
import Calendar from "./Calendar";

interface DatePickerProps {
    value: string;
    onChange: (date: string) => void;
    placeholder?: string;
    buttonClassName?: string;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    menuAlign?: 'left' | 'right';
}

export default function DatePicker({ value, onChange, placeholder = "Select date", buttonClassName = "", open: controlledOpen, onOpenChange, menuAlign = 'left' }: DatePickerProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        function handleClick(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [open]);

    const setOpen = (v: boolean) => {
        if (onOpenChange) onOpenChange(v);
        setInternalOpen(v);
    };

    const displayDate = value
        ? new Date(value + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : null;

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className={`w-full border border-subtle bg-surface rounded-lg px-4 py-3 text-left hover:border-hover transition-colors flex items-center gap-2 ${buttonClassName}`}
            >
                <svg className="w-4 h-4 shrink-0 text-dim" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                {displayDate ? (
                    <span className="text-body">{displayDate}</span>
                ) : (
                    <span className="text-dim">{placeholder}</span>
                )}
            </button>
            {open && (
                <div className={`absolute ${menuAlign === 'right' ? 'right-0' : 'left-0'} mt-1 z-30 animate-in fade-in slide-in-from-top-1 duration-150 min-w-[280px]`}>
                    <div className="relative border border-accent/50 rounded-xl bg-surface shadow-xl">
                        <button
                            onClick={() => setOpen(false)}
                            className="absolute -top-3 right-3 z-10 px-2.5 py-0.5 text-xs font-semibold text-accent bg-surface border border-accent/50 rounded-full shadow-sm"
                        >
                            Close
                        </button>
                        <Calendar
                            selectedDate={value || undefined}
                            onSelect={(d) => { onChange(d); setOpen(false); }}
                            className="!border-0 !shadow-none bg-surface"
                        />
                        {value && (
                            <button
                                type="button"
                                onClick={() => { onChange(""); setOpen(false); }}
                                className="w-full text-xs text-dim hover:text-body font-medium transition-colors pb-3"
                            >
                                Clear date
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
