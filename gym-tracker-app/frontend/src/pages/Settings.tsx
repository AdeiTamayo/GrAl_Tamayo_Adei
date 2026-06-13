import { useState } from "react";

type UnitSystem = "kg" | "lbs";

export default function Settings() {
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
                <h1 className="font-display text-3xl font-bold tracking-tight text-zinc-100 uppercase italic">
                    Settings
                </h1>
                <p className="text-zinc-500 mt-1 text-sm">Manage your application preferences.</p>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 md:p-8 shadow-xl">
                <h2 className="font-display text-lg font-bold text-zinc-200 uppercase tracking-wide mb-1">
                    Preferences
                </h2>
                <p className="text-xs text-zinc-500 mb-6">Customise your experience.</p>

                <div>
                    <label className="block text-xs uppercase tracking-wider text-zinc-500 font-bold mb-2">Unit System</label>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleUnitChange("kg")}
                            className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                                unitSystem === "kg"
                                    ? "bg-lime-400 text-black"
                                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                            }`}
                        >
                            Kilograms (kg)
                        </button>
                        <button
                            onClick={() => handleUnitChange("lbs")}
                            className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                                unitSystem === "lbs"
                                    ? "bg-lime-400 text-black"
                                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
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
