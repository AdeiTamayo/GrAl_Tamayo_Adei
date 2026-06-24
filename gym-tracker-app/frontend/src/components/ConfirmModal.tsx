interface ConfirmModalProps {
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'primary';
}

export default function ConfirmModal({ message, onConfirm, onCancel, confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'danger' }: ConfirmModalProps) {
    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="relative w-full max-w-sm">
                <button
                    onClick={onCancel}
                    className="absolute -top-3 right-0 z-10 px-2.5 py-0.5 text-xs font-semibold text-lime-400 bg-card border border-lime-400/30 rounded-full shadow-sm"
                >
                    Close
                </button>
                <div className="w-full bg-card border border-subtle rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                <h2 className="font-display text-lg font-bold text-body uppercase tracking-wide mb-2">Confirm</h2>
                <p className="text-sm text-muted mb-6">{message}</p>
                <div className="space-y-3">
                    <button
                        onClick={() => { onConfirm(); onCancel(); }}
                        className={`w-full font-bold py-3 rounded-lg transition-all ${
                            variant === 'danger'
                                ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white'
                                : 'bg-lime-400 text-black hover:bg-lime-300'
                        }`}
                    >
                        {confirmLabel}
                    </button>
                    <button
                        onClick={onCancel}
                        className="w-full bg-elevated text-muted font-bold py-3 rounded-lg hover:bg-hover transition-all"
                    >
                        {cancelLabel}
                    </button>
                </div>
            </div>
        </div>
        </div>
    );
}
