import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import Notification from './Notification';

type NotificationType = 'success' | 'error';

interface NotificationContextValue {
    showNotification: (message: string, type?: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotification() {
    const ctx = useContext(NotificationContext);
    if (!ctx) {
        throw new Error('useNotification must be used within NotificationProvider');
    }
    return ctx;
}

interface NotificationItem {
    id: number;
    message: string;
    type: NotificationType;
}

let nextId = 0;

export default function NotificationProvider({ children }: { children: ReactNode }) {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);

    const showNotification = useCallback((message: string, type: NotificationType = 'success') => {
        const id = nextId++;
        setNotifications(prev => [...prev, { id, message, type }]);
    }, []);

    const removeNotification = useCallback((id: number) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    return (
        <NotificationContext.Provider value={{ showNotification }}>
            {children}
            <div className="fixed top-16 right-4 z-[200] flex flex-col gap-2">
                {notifications.map(n => (
                    <Notification
                        key={n.id}
                        message={n.message}
                        type={n.type}
                        onClose={() => removeNotification(n.id)}
                    />
                ))}
            </div>
        </NotificationContext.Provider>
    );
}
