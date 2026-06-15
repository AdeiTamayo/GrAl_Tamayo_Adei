import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { apiFetch } from '../utils/api';

type LocationState = {
    user?: { email?: string };
    email?: string;
};

interface Workout {
    id: number;
    name: string;
    date: string;
    exercises?: { id: number }[];
}

const navItems = [
    {
        category: 'Training',
        links: [
            { to: '/active-workout', label: 'Active Workout', desc: 'Start or continue a training session' },
            { to: '/workouts', label: 'Workouts', desc: 'View and manage your workout logs' },
            { to: '/compare-workouts', label: 'Compare', desc: 'Side-by-side workout comparison' },
            { to: '/routines', label: 'Routines', desc: 'Create and manage training routines' },
        ]
    },
    {
        category: 'Tracking',
        links: [
            { to: '/exercise-history', label: 'Progress History', desc: 'Track your exercise progress over time' },
            { to: '/prs', label: 'PRs', desc: 'Personal records and achievements' },
            { to: '/Weight_history', label: 'Weight History', desc: 'Track your body weight over time' },
            { to: '/goals', label: 'Goals', desc: 'Set and track your fitness goals' },
        ]
    },
    {
        category: 'Library',
        links: [
            { to: '/exercises', label: 'Exercises', desc: 'Browse the exercise library' },
            { to: '/videos', label: 'Videos', desc: 'View your recorded video sessions' },
            { to: '/upload', label: 'Upload', desc: 'Upload a new video for analysis' },
        ]
    },

];

export default function Hero() {
    const location = useLocation();
    const { user, email: stateEmail } = (location.state as LocationState) || {};
    const displayEmail = localStorage.getItem('email') || user?.email || stateEmail || 'N/A';
    const isLoggedIn = displayEmail !== 'N/A';

    const [workoutCount, setWorkoutCount] = useState<number | null>(null);
    const [prCount, setPrCount] = useState<number | null>(null);
    const [exerciseCount, setExerciseCount] = useState<number | null>(null);
    const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);
    const [loading, setLoading] = useState(true);

    const token = localStorage.getItem('user_login_token');

    useEffect(() => {
        if (!isLoggedIn || !token) {
            setLoading(false);
            return;
        }

        const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

        Promise.all([
            apiFetch('/api/workouts', { headers }).then(r => r.json()),
            apiFetch('/api/prs', { headers }).then(r => r.json()),
            apiFetch('/api/exercises', { headers }).then(r => r.json()),
        ])
            .then(([workoutData, prData, exerciseData]) => {
                if (workoutData.success) {
                    const w = workoutData.data || [];
                    setWorkoutCount(w.length);
                    setRecentWorkouts(w.slice(0, 5));
                }
                if (prData.success) {
                    const p = prData.data || [];
                    setPrCount(p.length);
                }
                if (exerciseData.success) {
                    const e = exerciseData.data || exerciseData.exercises || [];
                    setExerciseCount(e.length);
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [isLoggedIn, token]);

    if (!isLoggedIn) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-body text-body p-4">
                <div className="w-full max-w-md text-center space-y-8">
                    <div className="space-y-3">
                        <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tight text-lime-400 uppercase">
                            Gym Tracker
                        </h1>
                        <p className="text-muted text-lg font-medium max-w-sm mx-auto">
                            Track your workouts, analyze your form, and crush your goals.
                        </p>
                    </div>

                    <div className="bg-card border border-subtle rounded-2xl p-8 shadow-xl space-y-4">
                        <div className="space-y-1">
                            <h2 className="font-display text-lg font-bold uppercase tracking-tight text-heading">
                                Welcome back
                            </h2>
                            <p className="text-sm text-dim font-medium">
                                Sign in to access your dashboard.
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 pt-2">
                            <Link
                                to="/login"
                                className="w-full bg-lime-400 text-black font-bold rounded-lg hover:bg-lime-300 hover:scale-[1.02] active:scale-[0.98] border border-transparent px-6 py-3 transition-all text-center block"
                            >
                                Log In
                            </Link>
                            <Link
                                to="/register"
                                className="w-full px-4 py-3 bg-elevated hover:bg-hover text-body font-bold border border-subtle text-sm rounded-lg transition-all text-center block"
                            >
                                Create an account
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-body text-body p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                <header className="flex items-center justify-between pb-6 border-b border-subtle">
                    <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-body uppercase italic">
                        Dashboard
                    </h1>
                    <div className="flex items-center gap-2">
                        <Link
                            to="/settings"
                            className="p-2 rounded-lg hover:bg-elevated text-muted hover:text-body transition-colors"
                            aria-label="Settings"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </Link>
                        <Link
                            to="/profile"
                            className="p-2 rounded-lg hover:bg-elevated text-muted hover:text-body transition-colors"
                            aria-label="Profile"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </Link>
                    </div>
                </header>

                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-pulse">
                        {[1, 2, 3].map(n => (
                            <div key={n} className="bg-surface/60 border border-subtle rounded-xl h-24" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-card border border-subtle rounded-xl p-5">
                            <p className="text-xs font-bold tracking-widest uppercase text-dim">Total Workouts</p>
                            <p className="text-3xl font-bold text-body mt-2 font-mono">{workoutCount ?? '—'}</p>
                        </div>
                        <div className="bg-card border border-subtle rounded-xl p-5">
                            <p className="text-xs font-bold tracking-widest uppercase text-dim">Personal Records</p>
                            <p className="text-3xl font-bold text-lime-400 mt-2 font-mono">{prCount ?? '—'}</p>
                        </div>
                        <div className="bg-card border border-subtle rounded-xl p-5">
                            <p className="text-xs font-bold tracking-widest uppercase text-dim">Exercise Library</p>
                            <p className="text-3xl font-bold text-body mt-2 font-mono">{exerciseCount ?? '—'}</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-8">
                        {navItems.map(section => (
                            <section key={section.category}>
                                <h2 className="font-display text-xs font-bold tracking-[0.15em] uppercase text-dim mb-4">
                                    {section.category}
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {section.links.map(link => (
                                        <Link
                                            key={link.to}
                                            to={link.to}
                                            className="group bg-surface/30 border-2 border-subtle rounded-xl p-4 hover:border-lime-400/40 hover:bg-elevated/40 transition-all hover:shadow-lg hover:shadow-lime-400/5"
                                        >
                                            <h3 className="font-display text-sm font-bold text-heading group-hover:text-lime-400 transition-colors uppercase tracking-wide">
                                                {link.label}
                                            </h3>
                                            <p className="text-xs text-dim mt-1.5 leading-relaxed group-hover:text-muted transition-colors">
                                                {link.desc}
                                            </p>
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>

                    <div className="space-y-4">
                        <div className="bg-surface/30 border border-subtle rounded-xl p-5">
                            <h2 className="font-display text-xs font-bold tracking-[0.15em] uppercase text-dim mb-4">
                                Recent Workouts
                            </h2>
                            {recentWorkouts.length === 0 ? (
                                <p className="text-xs text-dim italic">No workouts logged yet.</p>
                            ) : (
                                <ul className="space-y-3">
                                    {recentWorkouts.map(w => (
                                        <li key={w.id}>
                                            <Link
                                                to="/workouts"
                                                state={{ preselectedWorkoutId: w.id }}
                                                className="block bg-surface/20 border border-subtle rounded-lg p-3 hover:border-lime-400/40 hover:bg-surface/40 transition-all"
                                            >
                                                <p className="text-sm font-semibold text-heading truncate">{w.name}</p>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-xs font-mono text-dim">{w.date?.substring(0, 10)}</span>
                                                    {w.exercises && (
                                                        <span className="text-xs text-dim">{w.exercises.length} exercises</span>
                                                    )}
                                                </div>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <Link
                                to="/workouts"
                                className="mt-4 block text-center text-xs font-bold text-lime-400 hover:text-lime-300 uppercase tracking-wider transition-colors"
                            >
                                View all workouts
                            </Link>
                        </div>

                        <div className="bg-surface/30 border border-subtle rounded-xl p-5">
                            <h2 className="font-display text-xs font-bold tracking-[0.15em] uppercase text-dim mb-3">
                                Quick Actions
                            </h2>
                            <div className="space-y-2">
                                <Link
                                    to="/active-workout"
                                    className="block w-full bg-lime-400 text-black font-bold rounded-lg hover:bg-lime-300 hover:scale-[1.02] active:scale-[0.98] border border-transparent px-4 py-2.5 text-sm transition-all text-center"
                                >
                                    Start Workout
                                </Link>
                                <Link
                                    to="/upload"
                                    className="block w-full bg-elevated hover:bg-hover text-body font-bold border border-subtle text-sm rounded-lg px-4 py-2.5 transition-all text-center"
                                >
                                    Upload Video
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
