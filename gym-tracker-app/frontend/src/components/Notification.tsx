import { useState, useEffect, useCallback } from 'react';

type NotificationType = 'success' | 'error';

interface NotificationProps {
    message: string;
    type?: NotificationType;
    duration?: number;
    onClose: () => void;
}

export default function Notification({ message, type = 'success', duration = 5000, onClose }: NotificationProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    const handleClose = useCallback(() => {
        setIsExiting(true);
        setTimeout(onClose, 300);
    }, [onClose]);

    useEffect(() => {
        setIsVisible(true);
    }, []);

    useEffect(() => {
        const timer = setTimeout(handleClose, duration);
        return () => clearTimeout(timer);
    }, [duration, handleClose]);

    const icon = type === 'success' ? '✓' : '✕';
    const borderColor = type === 'success' ? 'border-accent' : 'border-rose-500';
    const bgColor = type === 'success' ? 'bg-accent/10' : 'bg-rose-500/10';
    const textColor = type === 'success' ? 'text-accent' : 'text-rose-400';
    const iconBg = type === 'success' ? 'bg-accent/20' : 'bg-rose-500/20';

    return (
        <div
            className={`max-w-sm w-full transition-all duration-300 ease-out
                ${isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'}
                ${isExiting ? 'opacity-0 translate-x-8' : ''}
            `}
        >
            <div className={`${bgColor} ${borderColor} border rounded-xl p-4 shadow-2xl backdrop-blur-sm`}>
                <div className="flex items-start gap-3">
                    <div className={`${iconBg} rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <span className={`${textColor} text-sm font-bold`}>{icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className={`${textColor} text-sm font-bold leading-snug`}>{message}</p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-dim hover:text-body transition-colors flex-shrink-0 p-0.5"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
