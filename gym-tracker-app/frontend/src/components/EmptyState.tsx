import { ReactNode } from 'react';

interface EmptyStateProps {
    message: string;
    icon?: ReactNode;
    className?: string;
}

export default function EmptyState({ message, icon, className = '' }: EmptyStateProps) {
    return (
        <div className={`text-center py-10 bg-card/40 rounded-xl border border-dashed border-subtle/60 ${className}`}>
            {icon && <div className="mb-3 text-dim">{icon}</div>}
            <p className="text-xs text-dim italic font-medium">{message}</p>
        </div>
    );
}
