import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { apiFetch } from '../utils/api';

interface Settings {
    show_rpe: boolean;
    show_1rm: boolean;
    default_rest_time: number;
}

interface SettingsContextValue {
    settings: Settings;
    loading: boolean;
    updateSettings: (data: Partial<Settings>) => Promise<void>;
}

const defaultSettings: Settings = {
    show_rpe: true,
    show_1rm: true,
    default_rest_time: 60,
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function useSettings() {
    const ctx = useContext(SettingsContext);
    if (!ctx) {
        throw new Error('useSettings must be used within SettingsProvider');
    }
    return ctx;
}

export default function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<Settings>(defaultSettings);
    const [loading, setLoading] = useState(true);

    const token = localStorage.getItem('user_login_token');

    useEffect(() => {
        if (!token) {
            setLoading(false);
            return;
        }

        apiFetch('/api/user/settings', {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(r => r.json())
            .then(data => {
                if (data.success && data.data) {
                    setSettings({
                        show_rpe: data.data.show_rpe !== undefined ? data.data.show_rpe : defaultSettings.show_rpe,
                        show_1rm: data.data.show_1rm !== undefined ? data.data.show_1rm : defaultSettings.show_1rm,
                        default_rest_time: data.data.default_rest_time || defaultSettings.default_rest_time,
                    });
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [token]);

    const updateSettings = useCallback(async (data: Partial<Settings>) => {
        const token = localStorage.getItem('user_login_token');
        if (!token) return;

        const res = await apiFetch('/api/user/settings', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(data),
        });
        const result = await res.json();
        if (result.success && result.data) {
            setSettings({
                show_rpe: result.data.show_rpe !== undefined ? result.data.show_rpe : settings.show_rpe,
                show_1rm: result.data.show_1rm !== undefined ? result.data.show_1rm : settings.show_1rm,
                default_rest_time: result.data.default_rest_time || settings.default_rest_time,
            });
        } else {
            throw new Error(result.error || 'Failed to update settings');
        }
    }, [settings]);

    return (
        <SettingsContext.Provider value={{ settings, loading, updateSettings }}>
            {children}
        </SettingsContext.Provider>
    );
}
