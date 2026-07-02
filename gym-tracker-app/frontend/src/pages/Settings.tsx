import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../components/ThemeContext";
import { useSettings } from "../components/SettingsContext";
import Button from "../components/Button";
import TransparentNumericInput from "../components/TransparentNumericInput";
import Toggle from '../components/Toggle';
import Card from '../components/Card';

export default function Settings() {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const { settings, loading, updateSettings } = useSettings();
    const [saving, setSaving] = useState(false);

    async function handleToggle(field: 'show_rpe' | 'show_1rm' | 'show_goals' | 'show_rest_time', value: boolean) {
        setSaving(true);
        try {
            await updateSettings({ [field]: value });
        } catch {
            // silently fail
        } finally {
            setSaving(false);
        }
    }

    async function saveDefaultRest(value: string) {
        const num = parseInt(value) || 0;
        if (num < 0 || num > 600) return;
        setSaving(true);
        try {
            await updateSettings({ default_rest_time: num });
        } catch {
            // silently fail
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-8 mt-4 md:mt-8 space-y-8 animate-in fade-in duration-200">
            <div>
                <h1 className="font-display text-4xl font-bold tracking-tight uppercase italic text-accent">
                    Settings
                </h1>
                <p className="text-dim mt-1 text-sm">Manage your application preferences.</p>
            </div>

            <Card variant="default" padding="lg" className="md:p-8 shadow-xl space-y-8">
                <h2 className="font-display text-lg font-bold text-body uppercase tracking-wide mb-1">
                    Preferences
                </h2>
                <div className="mb-6">
                    <label className="block text-xs uppercase tracking-wider text-dim font-bold mb-2">Theme</label>
                    <Button
                        onClick={toggleTheme}
                        variant="secondary"
                        className="!px-5 !py-2.5"
                    >
                        {theme === "dark" ? "Light Mode" : "Dark Mode"}
                    </Button>
                </div>

                <div className="border-t border-subtle pt-6 space-y-6">
                    <h3 className="text-sm font-bold text-body uppercase tracking-wide">Workout Display</h3>

                    <Toggle
                        enabled={settings.show_rpe}
                        onChange={(v) => handleToggle('show_rpe', v)}
                        disabled={saving || loading}
                        label="RPE Field"
                        description="Show Rate of Perceived Exertion input per set"
                    />

                    <Toggle
                        enabled={settings.show_1rm}
                        onChange={(v) => handleToggle('show_1rm', v)}
                        disabled={saving || loading}
                        label="Estimated 1RM"
                        description="Show estimated one-rep max column in workouts"
                    />

                    <Toggle
                        enabled={settings.show_goals}
                        onChange={(v) => handleToggle('show_goals', v)}
                        disabled={saving || loading}
                        label="Goals"
                        description="Show goal indicators in active workouts"
                    />

                    <Toggle
                        enabled={settings.show_rest_time}
                        onChange={(v) => handleToggle('show_rest_time', v)}
                        disabled={saving || loading}
                        label="Rest Time"
                        description="Show rest timer, presets, and per-set rest values"
                    />
                </div>

                <div className="border-t border-subtle pt-6">
                    <h3 className="text-sm font-bold text-body uppercase tracking-wide mb-4">Rest Timer</h3>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-body">Default Rest Time</p>
                            <p className="text-xs text-dim">Default seconds between sets for new exercises</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <TransparentNumericInput
                                value={settings.default_rest_time}
                                onChange={(val) => saveDefaultRest(val)}
                                min={0}
                                max={600}
                                step={5}
                                className="w-20"
                                inputClassName="w-full bg-surface border border-subtle rounded-lg py-2 px-3 text-sm text-body text-center focus:border-accent focus:outline-none transition-colors font-mono"
                            />
                            <span className="text-xs text-dim font-mono">s</span>
                        </div>
                    </div>
                </div>
            </Card>

            <div className="flex justify-center pt-4">
                <Button
                    onClick={() => navigate('/')}
                    variant="secondary"
                    className="!px-8 !py-3"
                >
                    Close Settings
                </Button>
            </div>
        </div>
    );
}
