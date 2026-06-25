interface CloseButtonProps {
    onClick: () => void;
    className?: string;
}

export default function CloseButton({ onClick, className = "" }: CloseButtonProps) {
    return (
        <button
            onClick={onClick}
            className={`absolute -top-3 right-3 z-10 px-2.5 py-0.5 text-xs font-semibold text-accent bg-card border border-accent/30 rounded-full shadow-sm hover:bg-accent hover:text-black transition-colors ${className}`}
        >
            Close
        </button>
    );
}
