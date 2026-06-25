interface PaginationProps {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    compact?: boolean;
}

export default function Pagination({ page, totalPages, onPageChange, compact = false }: PaginationProps) {
    if (totalPages <= 1) return null;

    const btnBase = compact
        ? "w-20 px-3 py-1.5 bg-surface border border-subtle rounded text-sm text-body disabled:opacity-40 hover:border-accent transition-colors"
        : "text-xs font-semibold text-dim hover:text-body disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-2 py-1";

    const wrapperBase = compact
        ? "flex items-center justify-center gap-2 mt-5 pt-4 border-t border-subtle"
        : "flex items-center justify-center gap-3 mt-4 pt-4 border-t border-subtle/60";

    return (
        <div className={wrapperBase}>
            <button
                onClick={() => onPageChange(Math.max(1, page - 1))}
                disabled={page === 1}
                className={btnBase}
            >
                &larr; Prev
            </button>
            <span className="text-xs text-muted font-medium">
                Page {page} of {totalPages}
            </span>
            <button
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className={btnBase}
            >
                Next &rarr;
            </button>
        </div>
    );
}
