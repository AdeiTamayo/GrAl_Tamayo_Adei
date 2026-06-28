import { ReactNode } from 'react';

type CardVariant = 'default' | 'surface' | 'elevated';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps {
    children: ReactNode;
    variant?: CardVariant;
    padding?: CardPadding;
    hover?: boolean;
    className?: string;
    as?: 'div' | 'section' | 'article';
    onClick?: () => void;
}

const variantClasses: Record<CardVariant, string> = {
    default: 'bg-card border border-subtle',
    surface: 'bg-surface border border-subtle',
    elevated: 'bg-elevated border border-subtle',
};

const paddingClasses: Record<CardPadding, string> = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
};

export default function Card({
    children,
    variant = 'default',
    padding = 'md',
    hover = false,
    className = '',
    as: Tag = 'div',
    onClick,
}: CardProps) {
    return (
        <Tag
            onClick={onClick}
            className={`rounded-xl ${variantClasses[variant]} ${paddingClasses[padding]} ${hover ? 'transition-all hover:border-accent/40 hover:shadow-lg' : ''} ${className}`}
        >
            {children}
        </Tag>
    );
}
