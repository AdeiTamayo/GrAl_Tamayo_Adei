import { useState } from "react";
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

    const setOpen = (v: boolean) => {
        if (onOpenChange) onOpenChange(v);
        setInternalOpen(v);
    };

    const displayDate = value
        ? new Date(value + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : null;

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className={`w-full border border-subtle bg-surface rounded-lg px-4 py-3 text-left hover:border-hover transition-colors ${buttonClassName}`}
            >
                {displayDate ? (
                    <span className="text-body">{displayDate}</span>
                ) : (
                    <span className="text-dim">{placeholder}</span>
                )}
            </button>
            {open && (
                <div className={`absolute ${menuAlign === 'right' ? 'right-0' : 'left-0'} mt-1 z-30 animate-in fade-in slide-in-from-top-1 duration-150 min-w-[280px]`}>
                    <div className="relative border border-lime-400/30 rounded-xl bg-card shadow-xl backdrop-blur-md">
                        <button
                            onClick={() => setOpen(false)}
                            className="absolute -top-3 right-3 z-10 px-2.5 py-0.5 text-xs font-semibold text-lime-400 bg-card border border-lime-400/30 rounded-full shadow-sm"
                        >
                            Close
                        </button>
                        <Calendar
                            selectedDate={value || undefined}
                            onSelect={(d) => { onChange(d); setOpen(false); }}
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
