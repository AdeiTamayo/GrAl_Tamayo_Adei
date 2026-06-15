interface EditButtonProps {
    onClick: () => void;
    className?: string;
}

export default function EditButton({ onClick, className = "" }: EditButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`p-2 bg-lime-500/10 hover:bg-lime-500 text-lime-500 hover:text-black rounded-lg border border-lime-500/20 transition-colors shrink-0 ${className}`}
            title="Edit"
        >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
        </button>
    );
}
