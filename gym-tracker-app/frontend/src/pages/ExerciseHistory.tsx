import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { apiFetch } from "../utils/api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Modal from "../components/Modal";
import ExercisePicker, { Exercise as ExerciseMeta } from "../components/ExercisePicker";

interface HistoryPoint {
    date: string;
    workout_name: string;
    max_weight: number;
    total_volume: number;
    max_reps: number;
}

export default function ExerciseHistory() {
    const [searchParams] = useSearchParams();
    const [selectedExercise, setSelectedExercise] = useState<ExerciseMeta | null>(null);
    const [history, setHistory] = useState<HistoryPoint[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [showPicker, setShowPicker] = useState(false);

    const exerciseIdParam = searchParams.get('exerciseId');
    const exerciseNameParam = searchParams.get('exerciseName');

    useEffect(() => {
        if (exerciseIdParam && exerciseNameParam) {
            setSelectedExercise({
                id: Number(exerciseIdParam),
                name: decodeURIComponent(exerciseNameParam),
            } as ExerciseMeta);
        }
    }, [exerciseIdParam, exerciseNameParam]);

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

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

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
        <div className="p-6 font-sans bg-body text-body min-h-screen">
            <div className="max-w-6xl mx-auto">
                <header className="mb-10 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h1 className="font-display text-4xl font-bold tracking-tight uppercase italic text-accent">
                            Progress History
                        </h1>
                    </div>

                    <div className="w-full md:w-auto">
                        <button
                            onClick={() => setShowPicker(true)}
                            className="w-full md:w-64 border border-subtle bg-surface rounded-lg px-4 py-3 text-left hover:border-hover transition-colors"
                        >
                            <span className={selectedExercise ? "text-body" : "text-dim"}>{selectedExercise ? selectedExercise.name : "Select Exercise..."}</span>
                        </button>
                    </div>
                </header>

                <Modal open={showPicker} onClose={() => setShowPicker(false)} maxWidth="2xl" backdrop="darker" containerClassName="max-h-[80vh]">
                    <div className="border border-accent/30 rounded-xl bg-card shadow-xl overflow-hidden">
                        <ExercisePicker
                            onSelect={(ex) => {
                                setSelectedExercise(ex);
                                setShowPicker(false);
                            }}
                            className="!border-0 !rounded-none !shadow-none"
                        />
                    </div>
                </Modal>

                {!selectedExercise && (
                    <div className="text-center py-20 bg-surface/30 rounded-3xl border border-subtle border-dashed">
                        <p className="text-dim text-lg">Choose an exercise to view your progress charts.</p>
                    </div>
                )}

                {fetchError && (
                    <div className="text-center py-8 bg-red-900/20 rounded-3xl border border-red-900 mb-6">
                        <p className="text-red-400 text-lg font-medium">{fetchError}</p>
                        {fetchError.includes("Cannot connect") && (
                            <p className="text-dim text-sm mt-2">Start the backend with <code className="text-accent">cd backend && node server.js</code></p>
                        )}
                        {fetchError.includes("Invalid token") && (
                            <p className="text-dim text-sm mt-2">Please log in again.</p>
                        )}
                    </div>
                )}

                {selectedExercise && history.length === 0 && !isLoading && !fetchError && (
                    <div className="text-center py-20 bg-surface/30 rounded-3xl border border-subtle border-dashed">
                        <p className="text-dim text-lg">No session data found for this exercise yet.</p>
                        <p className="text-dim text-sm mt-2">Save a workout containing this exercise to see your progress.</p>
                    </div>
                )}

                {isLoading && (
                    <div className="flex justify-center items-center py-20">
                        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}

                {selectedExercise && history.length > 0 && (
                    <div className="grid grid-cols-1 gap-10">
                        {/* Max Weight Chart */}
                        <div className="bg-card border border-subtle p-6 rounded-3xl shadow-xl">
                            <h2 className="text-xl font-bold mb-6 text-muted flex items-center gap-2">
                                <span className="w-2 h-6 bg-accent rounded-full"></span>
                                Max Weight (kg)
                            </h2>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={formatData} margin={{ top: 20, right: 20, left: 10, bottom: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1f1f22" vertical={false} />
                                        <XAxis dataKey="dateLabel" stroke="#52525b" fontSize={12} tickMargin={10} />
                                        <YAxis stroke="#52525b" fontSize={12} tickMargin={10} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }}
                                            itemStyle={{ color: 'var(--accent)' }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="max_weight"
                                            stroke="var(--accent)"
                                            strokeWidth={3}
                                            dot={{ fill: 'var(--accent)', r: 5 }}
                                            activeDot={{ r: 8, strokeWidth: 0 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Total Volume Chart */}
                        <div className="bg-card border border-subtle p-6 rounded-3xl shadow-xl">
                            <h2 className="text-xl font-bold mb-6 text-muted flex items-center gap-2">
                                <span className="w-2 h-6 bg-blue-400 rounded-full"></span>
                                Total Volume (kg × reps)
                            </h2>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={formatData} margin={{ top: 20, right: 20, left: 10, bottom: 10 }}>
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
