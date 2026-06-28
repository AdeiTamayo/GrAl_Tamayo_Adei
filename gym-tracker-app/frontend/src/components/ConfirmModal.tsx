import CloseButton from "./CloseButton";
import Button from "./Button";

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
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-sm">
                <CloseButton onClick={onCancel} />
                <div className="w-full bg-card border border-subtle rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                <h2 className="font-display text-lg font-bold text-body uppercase tracking-wide mb-2">Confirm</h2>
                <p className="text-sm text-muted mb-6">{message}</p>
                <div className="space-y-3">
                    <Button
                        onClick={onConfirm}
                        variant={variant === 'danger' ? 'danger' : 'primary'}
                        fullWidth
                    >
                        {confirmLabel}
                    </Button>
                    <Button
                        onClick={onCancel}
                        variant="secondary"
                        fullWidth
                    >
                        {cancelLabel}
                    </Button>
                </div>
            </div>
        </div>
        </div>
    );
}
