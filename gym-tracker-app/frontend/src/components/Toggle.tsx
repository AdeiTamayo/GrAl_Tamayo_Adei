interface ToggleProps {
    enabled: boolean;
    onChange: (enabled: boolean) => void;
    disabled?: boolean;
    label?: string;
    description?: string;
}

export default function Toggle({ enabled, onChange, disabled = false, label, description }: ToggleProps) {
    return (
        <div className="flex items-center justify-between">
            {(label || description) && (
                <div>
                    {label && <p className="text-sm font-medium text-body">{label}</p>}
                    {description && <p className="text-xs text-dim">{description}</p>}
                </div>
            )}
            <button
                type="button"
                onClick={() => onChange(!enabled)}
                disabled={disabled}
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${enabled ? 'bg-accent' : 'bg-elevated border border-subtle'} disabled:opacity-50`}
            >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : ''}`} />
            </button>
        </div>
    );
}
