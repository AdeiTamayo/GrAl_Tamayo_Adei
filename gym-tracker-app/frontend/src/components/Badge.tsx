import { ReactNode } from 'react';

type BadgeVariant = 'accent' | 'danger' | 'warning' | 'default';

interface BadgeProps {
    children: ReactNode;
    variant?: BadgeVariant;
    className?: string;
    removable?: boolean;
    onRemove?: () => void;
}

const variantClasses: Record<BadgeVariant, string> = {
    accent: 'bg-accent/10 text-accent border-accent/20',
    danger: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    warning: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
    default: 'bg-elevated text-muted border-subtle',
};

export default function Badge({ children, variant = 'default', className = '', removable, onRemove }: BadgeProps) {
    return (
        <span className={`inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2.5 py-0.5 border ${variantClasses[variant]} ${className}`}>
            {children}
            {removable && onRemove && (
                <button type="button" onClick={onRemove} className="ml-0.5 hover:text-rose-500 font-bold leading-none">
                    ✕
                </button>
            )}
        </span>
    );
}
