import React from 'react';

interface NumericInputProps {
    value: number | string;
    onChange: (value: string) => void;
    placeholder?: string;
    min?: number;
    max?: number;
    step?: number;
    className?: string; // Container class
    inputClassName?: string; // Input element class
    disabled?: boolean;
}

export default function TransparentNumericInput({
    value,
    onChange,
    placeholder = "",
    min = 0,
    max = 999,
    step = 1,
    className = "w-[72px] sm:w-20",
    inputClassName = "pl-1.5 pr-6 py-1 text-xs font-mono text-lime-400",
    disabled = false
}: NumericInputProps) {

    const handleIncrement = () => {
        const current = value === "" ? 0 : Number(value);
        if (current + step <= max) {
            const nextValue = (current + step).toFixed(1);
            onChange(String(Number(nextValue)));
        }
    };

    const handleDecrement = () => {
        const current = value === "" ? 0 : Number(value);
        if (current - step >= min) {
            const nextValue = (current - step).toFixed(1);
            onChange(String(Number(nextValue)));
        }
    };

    return (
        <div className={`relative flex items-center group ${className}`}>
            {/* The Input Field */}
            <input
                type="number"
                value={value}
                placeholder={placeholder}
                min={min}
                max={max}
                step={step}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
                className={`w-full bg-transparent border border-subtle rounded-lg focus:border-lime-400 focus:outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-50 ${inputClassName}`}
            />

            {/* Micro-Arrows Control Panel */}
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col justify-center gap-0.5 opacity-30 group-hover:opacity-100 transition-opacity pointer-events-auto">
                <button
                    type="button"
                    onClick={handleIncrement}
                    className="text-[7px] text-dim hover:text-lime-400 p-0.4 leading-none focus:outline-none select-none"
                    title="Increase"
                >
                    ▲
                </button>
                <button
                    type="button"
                    onClick={handleDecrement}
                    className="text-[7px] text-dim hover:text-lime-400 p-0.4 leading-none focus:outline-none select-none"
                    title="Decrease"
                >
                    ▼
                </button>
            </div>
        </div>
    );
}