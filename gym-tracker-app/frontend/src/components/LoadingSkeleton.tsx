interface LoadingSkeletonProps {
    type?: 'card' | 'text' | 'page';
    count?: number;
    className?: string;
}

export default function LoadingSkeleton({ type = 'text', count = 1, className = '' }: LoadingSkeletonProps) {
    const items = Array.from({ length: count });

    if (type === 'card') {
        return (
            <div className={`space-y-4 ${className}`}>
                {items.map((_, i) => (
                    <div key={i} className="bg-surface/60 border border-subtle rounded-xl p-5 space-y-3 animate-pulse">
                        <div className="h-3 w-20 bg-elevated rounded" />
                        <div className="h-8 w-16 bg-elevated rounded" />
                        <div className="h-2 w-32 bg-elevated rounded" />
                    </div>
                ))}
            </div>
        );
    }

    if (type === 'page') {
        return (
            <div className={`max-w-7xl mx-auto p-4 md:p-8 mt-4 md:mt-8 space-y-8 animate-pulse ${className}`}>
                <div className="h-8 w-48 bg-elevated rounded-lg" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[1, 2, 3].map(n => (
                        <div key={n} className="bg-surface/60 border border-subtle rounded-xl p-5 space-y-3">
                            <div className="h-3 w-20 bg-elevated rounded" />
                            <div className="h-8 w-16 bg-elevated rounded" />
                        </div>
                    ))}
                </div>
                <div className="h-64 bg-surface/60 border border-subtle rounded-xl" />
            </div>
        );
    }

    return (
        <div className={`space-y-3 animate-pulse ${className}`}>
            {items.map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                    <div className="h-4 w-4 bg-elevated rounded" />
                    <div className="h-3 flex-1 bg-elevated rounded" />
                </div>
            ))}
        </div>
    );
}
