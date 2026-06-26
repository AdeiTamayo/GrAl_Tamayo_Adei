import { ReactNode, useEffect } from "react";
import CloseButton from "./CloseButton";

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
    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    if (!open) return null;

    return (
        <div
            className={`fixed inset-0 z-[100] ${backdrop === "darker" ? "bg-black/80" : "bg-black/60"} backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 ${className}`}
        >
            <div className={`relative w-full ${maxWidthClasses[maxWidth] || maxWidthClasses.md} animate-in fade-in zoom-in-95 duration-200 ${containerClassName}`}>
                <CloseButton onClick={onClose} />
                {children}
            </div>
        </div>
    );
}
