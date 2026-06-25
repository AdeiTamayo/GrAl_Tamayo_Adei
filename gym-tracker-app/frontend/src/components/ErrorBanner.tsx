interface ErrorBannerProps {
    message: string;
    onDismiss?: () => void;
}

export default function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
    return (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl font-medium text-sm flex items-start justify-between gap-3">
            <span>Error: {message}</span>
            {onDismiss && (
                <button type="button" onClick={onDismiss} className="shrink-0 mt-0.5 text-rose-400/60 hover:text-rose-400 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            )}
        </div>
    );
}
