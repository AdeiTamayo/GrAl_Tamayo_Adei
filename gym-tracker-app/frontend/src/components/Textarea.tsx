import { TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    inputSize?: 'sm' | 'md' | 'lg';
}

const sizeClasses: Record<string, string> = {
    sm: 'px-3 py-2 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-4 py-3 text-sm',
};

export default function Textarea({ inputSize = 'md', className = '', ...props }: TextareaProps) {
    return (
        <textarea
            className={`w-full border border-subtle bg-surface ${sizeClasses[inputSize]} text-body placeholder:text-dim focus:border-accent focus:outline-none transition-all rounded-xl resize-y ${className}`}
            {...props}
        />
    );
}
