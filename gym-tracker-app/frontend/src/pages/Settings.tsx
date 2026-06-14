import { useState } from "react";
import { useTheme } from "../components/ThemeContext";

type UnitSystem = "kg" | "lbs";

export default function Settings() {
    const { theme, toggleTheme } = useTheme();
    const [unitSystem, setUnitSystem] = useState<UnitSystem>(
        () => (localStorage.getItem("unit_system") as UnitSystem) || "kg"
    );

    function handleUnitChange(system: UnitSystem) {
        setUnitSystem(system);
        localStorage.setItem("unit_system", system);
    }

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-8 mt-4 md:mt-8 space-y-8">
            <div>
                <h1 className="font-display text-3xl font-bold tracking-tight text-body uppercase italic">
                    Settings
                </h1>
                <p className="text-dim mt-1 text-sm">Manage your application preferences.</p>
            </div>

            <div className="bg-card border border-subtle rounded-xl p-6 md:p-8 shadow-xl">
                <h2 className="font-display text-lg font-bold text-body uppercase tracking-wide mb-1">
                    Preferences
                </h2>
                <p className="text-xs text-dim mb-6">Customise your experience.</p>

                <div className="mb-6">
                    <label className="block text-xs uppercase tracking-wider text-dim font-bold mb-2">Theme</label>
                    <button
                        onClick={toggleTheme}
                        className="px-5 py-2.5 rounded-lg text-sm font-bold transition-all bg-elevated text-muted hover:bg-hover"
                    >
                        {theme === "dark" ? "Light Mode" : "Dark Mode"}
                    </button>
                </div>

                <div>
                    <label className="block text-xs uppercase tracking-wider text-dim font-bold mb-2">Unit System</label>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleUnitChange("kg")}
                            className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                                unitSystem === "kg"
                                    ? "bg-lime-400 text-black"
                                    : "bg-elevated text-muted hover:bg-hover"
                            }`}
                        >
                            Kilograms (kg)
                        </button>
                        <button
                            onClick={() => handleUnitChange("lbs")}
                            className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                                unitSystem === "lbs"
                                    ? "bg-lime-400 text-black"
                                    : "bg-elevated text-muted hover:bg-hover"
                            }`}
                        >
                            Pounds (lbs)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
