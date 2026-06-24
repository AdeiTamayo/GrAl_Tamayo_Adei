import { useState, useEffect, useRef } from 'react';

interface Option {
    value: string;
    label: string;
}

interface SelectProps {
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    placeholder?: string;
    label?: string;
    className?: string;
    disabled?: boolean;
    buttonClassName?: string;
}

export default function Select({ value, onChange, options, placeholder = "Select...", label, className = "", disabled = false, buttonClassName = "" }: SelectProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const selected = options.find(o => o.value === value);

    return (
        <div className={`relative ${className}`} ref={ref}>
            {label && (
                <label className="block text-sm font-semibold text-muted mb-2">{label}</label>
            )}
            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen(!open)}
                className={`w-full bg-surface border border-subtle rounded-lg text-left flex justify-between items-center hover:border-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${buttonClassName || 'px-4 py-3'}`}
            >
                <span className={selected ? "text-body" : "text-dim"}>
                    {selected ? selected.label : placeholder}
                </span>
                <svg className={`w-4 h-4 text-dim transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {open && (
                <ul className="absolute z-20 w-full mt-1 bg-card border border-subtle rounded-xl shadow-2xl overflow-y-auto max-h-60 py-2 animate-in fade-in slide-in-from-top-1 duration-150">
                    {options.map(o => (
                        <li
                            key={o.value}
                            onClick={() => { onChange(o.value); setOpen(false); }}
                            className={`px-4 py-2.5 cursor-pointer transition-colors text-sm flex justify-between items-center ${value === o.value ? "bg-accent/10 text-accent" : "text-muted hover:bg-surface hover:text-white"}`}
                        >
                            <span>{o.label}</span>
                            {value === o.value && (
                                <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
