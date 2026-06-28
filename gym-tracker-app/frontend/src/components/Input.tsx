import { InputHTMLAttributes, forwardRef } from 'react';

type InputSize = 'sm' | 'md' | 'lg';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    inputSize?: InputSize;
}

const sizeClasses: Record<InputSize, string> = {
    sm: 'px-3 py-2 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-4 py-3 text-sm',
};

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ inputSize = 'md', className = '', ...props }, ref) => {
        return (
            <input
                ref={ref}
                className={`w-full border border-subtle bg-surface ${sizeClasses[inputSize]} text-body placeholder:text-dim focus:border-accent focus:outline-none transition-all rounded-xl ${className}`}
                {...props}
            />
        );
    }
);

Input.displayName = 'Input';

export default Input;
