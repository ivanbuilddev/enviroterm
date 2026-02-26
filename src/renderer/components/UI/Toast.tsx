import { useEffect, useState } from 'react';
import { CheckCircle2, Info, AlertCircle } from 'lucide-react';

export type ToastType = 'success' | 'info' | 'error';

interface ToastProps {
    message: string;
    type?: ToastType;
    duration?: number;
    onClose: () => void;
}

export function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Small delay to trigger enter animation
        const enterTimer = requestAnimationFrame(() => setIsVisible(true));

        const exitTimer = setTimeout(() => {
            setIsVisible(false);
            // Wait for exit animation to finish before calling onClose
            setTimeout(onClose, 300);
        }, duration);

        return () => {
            cancelAnimationFrame(enterTimer);
            clearTimeout(exitTimer);
        };
    }, [duration, onClose]);

    const icons = {
        success: <CheckCircle2 className="w-5 h-5 text-status-success" />,
        info: <Info className="w-5 h-5 text-accent-primary" />,
        error: <AlertCircle className="w-5 h-5 text-status-error" />
    };

    return (
        <div
            className={`fixed bottom-8 right-6 z-[9999] flex items-center gap-3 px-4 py-3 bg-bg-elevated border border-border shadow-lg shadow-black/20 transition-all duration-300 ease-out transform ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95'
                }`}
        >
            {icons[type]}
            <span className="text-xs text-fg-primary tracking-wide uppercase font-header">{message}</span>
        </div>
    );
}
