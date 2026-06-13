import React, { useState, useEffect, useMemo, useCallback } from "react";
import { apiFetch } from "../utils/api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ExercisePicker, { Exercise as ExerciseMeta } from "../components/ExercisePicker";

interface HistoryPoint {
    date: string;
    workout_name: string;
    max_weight: number;
    total_volume: number;
    max_reps: number;
}

export default function ExerciseHistory() {
    const [selectedExercise, setSelectedExercise] = useState<ExerciseMeta | null>(null);
    const [history, setHistory] = useState<HistoryPoint[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [showPicker, setShowPicker] = useState(false);

    const token = localStorage.getItem("user_login_token");
    const headers = useMemo(() => ({
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    }), [token]);

    const fetchHistory = useCallback(async (id: number) => {
        setIsLoading(true);
        setFetchError(null);
        try {
            const res = await apiFetch(`/api/exercises/${id}/history`, { headers });
            const data = await res.json();
            if (!res.ok || !data.success) {
                setFetchError(data.error || `Server error: ${res.status} ${res.statusText}`);
                setHistory([]);
                return;
            }
            setHistory(data.data || []);
        } catch (err) {
            console.error("[ExerciseHistory] Fetch error:", err);
            setFetchError("Cannot connect to server. Make sure the backend is running.");
            setHistory([]);
        } finally {
            setIsLoading(false);
        }
    }, [headers]);

    useEffect(() => {
        if (selectedExercise) {
            fetchHistory(selectedExercise.id);
        }
    }, [selectedExercise, fetchHistory]);

    const formatData = useMemo(() => {
        return history.map(h => ({
            ...h,
            // Extract YYYY-MM-DD string directly to avoid timezone shifts
            dateLabel: typeof h.date === 'string' ? h.date.split('T')[0] : new Date(h.date).toLocaleDateString('en-CA'),
            max_weight: parseFloat(String(h.max_weight || 0)),
            total_volume: parseFloat(String(h.total_volume || 0))
        }));
    }, [history]);

    return (
        <div className="p-6 font-sans bg-black text-zinc-100 min-h-screen">
            <div className="max-w-6xl mx-auto">
                <header className="mb-10 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h1 className="font-display text-4xl font-bold tracking-tight uppercase italic text-lime-400">
                            Progress History
                        </h1>
                        <p className="text-zinc-400 mt-1">Visualize your strength gains over time.</p>
                    </div>

                    <div className="w-full md:w-auto">
                        <button
                            onClick={() => setShowPicker(true)}
                            className="w-full md:w-64 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 hover:border-lime-400 transition-all flex justify-between items-center"
                        >
                            <span className="truncate">{selectedExercise ? selectedExercise.name : "Select Exercise..."}</span>
                            <span className="text-lime-400">🔍</span>
                        </button>
                    </div>
                </header>

                {showPicker && (
                    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="w-full max-w-2xl max-h-[80vh] overflow-hidden bg-zinc-950 border border-zinc-800 rounded-3xl flex flex-col">
                            <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                                <h2 className="text-xl font-bold uppercase italic text-lime-400">Select Exercise</h2>
                                <button onClick={() => setShowPicker(false)} className="text-zinc-500 hover:text-white">✕</button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4">
                                <ExercisePicker
                                    onSelect={(ex) => {
                                        setSelectedExercise(ex);
                                        setShowPicker(false);
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {!selectedExercise && (
                    <div className="text-center py-20 bg-zinc-900/30 rounded-3xl border border-zinc-900 border-dashed">
                        <p className="text-zinc-500 text-lg">Choose an exercise to view your progress charts.</p>
                    </div>
                )}

                {fetchError && (
                    <div className="text-center py-8 bg-red-900/20 rounded-3xl border border-red-900 mb-6">
                        <p className="text-red-400 text-lg font-medium">{fetchError}</p>
                        {fetchError.includes("Cannot connect") && (
                            <p className="text-zinc-500 text-sm mt-2">Start the backend with <code className="text-lime-400">cd backend && node server.js</code></p>
                        )}
                        {fetchError.includes("Invalid token") && (
                            <p className="text-zinc-500 text-sm mt-2">Please log in again.</p>
                        )}
                    </div>
                )}

                {selectedExercise && history.length === 0 && !isLoading && !fetchError && (
                    <div className="text-center py-20 bg-zinc-900/30 rounded-3xl border border-zinc-900 border-dashed">
                        <p className="text-zinc-500 text-lg">No session data found for this exercise yet.</p>
                        <p className="text-zinc-600 text-sm mt-2">Save a workout containing this exercise to see your progress.</p>
                    </div>
                )}

                {isLoading && (
                    <div className="flex justify-center items-center py-20">
                        <div className="w-10 h-10 border-4 border-lime-400 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}

                {selectedExercise && history.length > 0 && (
                    <div className="grid grid-cols-1 gap-10">
                        {/* Max Weight Chart */}
                        <div className="bg-zinc-950 border border-zinc-900 p-6 rounded-3xl shadow-xl">
                            <h2 className="text-xl font-bold mb-6 text-zinc-300 flex items-center gap-2">
                                <span className="w-2 h-6 bg-lime-400 rounded-full"></span>
                                Max Weight (kg)
                            </h2>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={formatData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1f1f22" vertical={false} />
                                        <XAxis dataKey="dateLabel" stroke="#52525b" fontSize={12} tickMargin={10} />
                                        <YAxis stroke="#52525b" fontSize={12} tickMargin={10} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }}
                                            itemStyle={{ color: '#a3e635' }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="max_weight"
                                            stroke="#a3e635"
                                            strokeWidth={3}
                                            dot={{ fill: '#a3e635', r: 5 }}
                                            activeDot={{ r: 8, strokeWidth: 0 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Total Volume Chart */}
                        <div className="bg-zinc-950 border border-zinc-900 p-6 rounded-3xl shadow-xl">
                            <h2 className="text-xl font-bold mb-6 text-zinc-300 flex items-center gap-2">
                                <span className="w-2 h-6 bg-blue-400 rounded-full"></span>
                                Total Volume (kg × reps)
                            </h2>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={formatData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1f1f22" vertical={false} />
                                        <XAxis dataKey="dateLabel" stroke="#52525b" fontSize={12} tickMargin={10} />
                                        <YAxis stroke="#52525b" fontSize={12} tickMargin={10} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }}
                                            itemStyle={{ color: '#60a5fa' }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="total_volume"
                                            stroke="#60a5fa"
                                            strokeWidth={3}
                                            dot={{ fill: '#60a5fa', r: 5 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
