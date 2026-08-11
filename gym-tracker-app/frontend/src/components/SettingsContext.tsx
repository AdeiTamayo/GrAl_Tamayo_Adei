import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getSettings, updateSettings as updateSettingsData } from '../data/user';

interface Settings {
    show_rpe: boolean;
    show_1rm: boolean;
    show_goals: boolean;
    show_rest_time: boolean;
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
    show_goals: true,
    show_rest_time: true,
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

    useEffect(() => {
        getSettings()
            .then(data => {
                setSettings({
                    show_rpe: data.show_rpe !== undefined ? data.show_rpe : defaultSettings.show_rpe,
                    show_1rm: data.show_1rm !== undefined ? data.show_1rm : defaultSettings.show_1rm,
                    show_goals: data.show_goals !== undefined ? data.show_goals : defaultSettings.show_goals,
                    show_rest_time: data.show_rest_time !== undefined ? data.show_rest_time : defaultSettings.show_rest_time,
                    default_rest_time: data.default_rest_time ?? defaultSettings.default_rest_time,
                });
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const updateSettings = useCallback(async (data: Partial<Settings>) => {
        const result = await updateSettingsData(data);
        setSettings(prev => ({
            show_rpe: result.show_rpe !== undefined ? result.show_rpe : prev.show_rpe,
            show_1rm: result.show_1rm !== undefined ? result.show_1rm : prev.show_1rm,
            show_goals: result.show_goals !== undefined ? result.show_goals : prev.show_goals,
            show_rest_time: result.show_rest_time !== undefined ? result.show_rest_time : prev.show_rest_time,
            default_rest_time: result.default_rest_time ?? prev.default_rest_time,
        }));
    }, []);

    return (
        <SettingsContext.Provider value={{ settings, loading, updateSettings }}>
            {children}
        </SettingsContext.Provider>
    );
}
