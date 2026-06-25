import React, { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    fullWidth = false,
    className = '',
    ...props
}) => {
    let variantStyles = '';

    switch (variant) {
        case 'primary':
            variantStyles = 'rounded-xl bg-accent text-black font-bold hover:bg-accent-hover hover:scale-[1.02] active:scale-[0.98] border border-transparent px-6 py-3';
            break;
        case 'secondary':
            variantStyles = 'rounded-lg px-4 py-2 bg-elevated hover:bg-hover text-body font-bold border border-subtle text-sm';
            break;
        case 'danger':
            variantStyles = 'rounded-lg px-4 py-2 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white font-bold border border-rose-500/20 text-sm';
            break;
    }

    const widthStyles = fullWidth ? 'w-full block text-center' : '';

    return (
        <button
            className={`transition-all ${variantStyles} ${widthStyles} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;
