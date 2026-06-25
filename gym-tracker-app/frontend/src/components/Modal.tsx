import { ReactNode } from "react";

interface ModalProps {
    open: boolean;
    onClose: () => void;
    children: ReactNode;
    maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
    backdrop?: "dark" | "darker";
    className?: string;
    containerClassName?: string;
}

const maxWidthClasses: Record<string, string> = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
};

export default function Modal({
    open,
    onClose,
    children,
    maxWidth = "md",
    backdrop = "dark",
    className = "",
    containerClassName = "",
}: ModalProps) {
    if (!open) return null;

    return (
        <div
            className={`fixed inset-0 z-[100] ${backdrop === "darker" ? "bg-black/80" : "bg-black/60"} backdrop-blur-sm flex items-center justify-center p-4 ${className}`}
        >
            <div className={`relative w-full ${maxWidthClasses[maxWidth] || maxWidthClasses.md} ${containerClassName}`}>
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 z-10 px-2.5 py-0.5 text-xs font-semibold text-accent bg-card border border-accent/30 rounded-full shadow-sm hover:bg-accent hover:text-black transition-colors"
                >
                    Close
                </button>
                {children}
            </div>
        </div>
    );
}
