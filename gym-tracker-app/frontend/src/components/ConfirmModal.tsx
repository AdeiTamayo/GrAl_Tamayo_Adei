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
            <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                <h2 className="font-display text-lg font-bold text-zinc-100 uppercase tracking-wide mb-2">Confirm</h2>
                <p className="text-sm text-zinc-400 mb-6">{message}</p>
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
                        className="w-full bg-zinc-800 text-zinc-300 font-bold py-3 rounded-lg hover:bg-zinc-700 transition-all"
                    >
                        {cancelLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
