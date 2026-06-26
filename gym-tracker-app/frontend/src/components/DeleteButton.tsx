interface DeleteButtonProps {
    onClick: () => void;
    className?: string;
}

export default function DeleteButton({ onClick, className = "" }: DeleteButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`p-2 flex items-center justify-center bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-lg border border-rose-500/20 transition-colors shrink-0 ${className}`}
            title="Delete"
        >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
        </button>
    );
}
