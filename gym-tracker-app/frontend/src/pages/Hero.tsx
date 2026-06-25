import { useEffect, useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import Calendar from '../components/Calendar';

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

interface VideoItem {
    id: string;
    process_type: string;
    processed_url: string;
    created_at: string;
}

interface WeightEntry {
    id: number;
    weight: number | string;
    date: string;
}

const primaryNav = [
    { to: '/active-workout', label: 'Active Workout', desc: 'Start or continue a training session', icon: 'M8 5v14l11-7z' },
    { to: '/workouts', label: 'Workouts', desc: 'View logs, compare sessions, track history & calendar', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { to: '/routines', label: 'Routines', desc: 'Create and manage training routines', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
    { to: '/prs', label: 'PRs', desc: 'Personal records and achievements', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
    { to: '/goals', label: 'Goals', desc: 'Set and track your fitness goals', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
];

const secondaryNav = [
    { to: '/compare-workouts', label: 'Compare Workouts', desc: 'Side-by-side workout comparison', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
    { to: '/exercise-history', label: 'Exercise History', desc: 'Track progress for each exercise', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
    { to: '/Weight_history', label: 'Weight History', desc: 'Track your body weight over time', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { to: '/exercises', label: 'Exercises', desc: 'Browse the exercise library', icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' },
    { to: '/videos', label: 'Videos', desc: 'View your recorded video sessions', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
    { to: '/upload', label: 'Upload', desc: 'Upload a new video for analysis', icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12' },
];

function NavIcon({ path }: { path: string }) {
    const found = [...primaryNav, ...secondaryNav].find(n => n.to === path);
    if (!found) return null;
    return (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={found.icon} />
        </svg>
    );
}

export default function Hero() {
    const location = useLocation();
    const { user, email: stateEmail } = (location.state as LocationState) || {};
    const displayEmail = localStorage.getItem('email') || user?.email || stateEmail || 'N/A';
    const isLoggedIn = displayEmail !== 'N/A';

    const [workoutCount, setWorkoutCount] = useState<number | null>(null);
    const [weeklyVolume, setWeeklyVolume] = useState<number | null>(null);
    const [currentStreak, setCurrentStreak] = useState<number | null>(null);
    const [allWorkouts, setAllWorkouts] = useState<Workout[]>([]);
    const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);
    const [videos, setVideos] = useState<VideoItem[]>([]);
    const [latestWeight, setLatestWeight] = useState<WeightEntry | null>(null);
    const [plannedDates, setPlannedDates] = useState<Set<string>>(new Set());
    const [goalDates, setGoalDates] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [dashboardError, setDashboardError] = useState<string | null>(null);
    const [showMore, setShowMore] = useState(false);

    const token = localStorage.getItem('user_login_token');

    useEffect(() => {
        if (!isLoggedIn || !token) {
            setLoading(false);
            return;
        }

        const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

        Promise.all([
            apiFetch('/api/dashboard/stats', { headers }).then(r => r.json()),
            apiFetch('/api/workouts', { headers }).then(r => r.json()),
            apiFetch('/api/videos?sort=desc', { headers }).then(r => r.json()),
            apiFetch('/api/user/weights', { headers }).then(r => r.json()),
            apiFetch('/api/planned-workouts', { headers }).then(r => r.json()),
            apiFetch('/api/goals', { headers }).then(r => r.json()),
        ])
            .then(([statsData, workoutData, videoData, weightData, plannedData, goalsData]) => {
                if (statsData.success) {
                    setWorkoutCount(statsData.data.workoutCount);
                    setWeeklyVolume(statsData.data.weeklyVolume);
                    setCurrentStreak(statsData.data.currentStreak);
                }
                if (workoutData.success) {
                    const w = workoutData.data || [];
                    setAllWorkouts(w);
                    setRecentWorkouts(w.slice(0, 5));
                }
                if (videoData.success) {
                    setVideos((videoData.videos || []).slice(0, 3));
                }
                if (weightData.success) {
                    const entries: WeightEntry[] = weightData.data || [];
                    entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    if (entries.length > 0) setLatestWeight(entries[0]);
                }
                if (plannedData.success) {
                    const dates = new Set<string>();
                    (plannedData.data || []).forEach((p: any) => {
                        if (p.date) dates.add(p.date.substring(0, 10));
                    });
                    setPlannedDates(dates);
                }
                if (goalsData.success) {
                    const dates = new Set<string>();
                    (goalsData.goals || []).forEach((g: any) => {
                        if (g.expected_date) dates.add(g.expected_date.substring(0, 10));
                    });
                    setGoalDates(dates);
                }
            })
            .catch((err) => { setDashboardError("Failed to load dashboard data."); console.error(err); })
            .finally(() => setLoading(false));
    }, [isLoggedIn, token]);

    const workoutEvents = useMemo(() => {
        const events: Record<string, { date: string; status: 'completed' }> = {};
        allWorkouts.forEach(w => {
            if (w.date) {
                const dateStr = w.date.substring(0, 10);
                events[dateStr] = { date: dateStr, status: 'completed' };
            }
        });
        return events;
    }, [allWorkouts]);

    if (!isLoggedIn) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-body text-body p-4">
                <div className="w-full max-w-md text-center space-y-8">
                    <div className="space-y-3">
                        <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tight text-accent uppercase">Gym Tracker</h1>
                        <p className="text-muted text-lg font-medium max-w-sm mx-auto">Track your workouts, analyze your form, and crush your goals.</p>
                    </div>
                    <div className="bg-card border border-subtle rounded-2xl p-8 shadow-xl space-y-4">
                        <div className="space-y-1">
                            <h2 className="font-display text-lg font-bold uppercase tracking-tight text-heading">Welcome back</h2>
                            <p className="text-sm text-dim font-medium">Sign in to access your dashboard.</p>
                        </div>
                        <div className="flex flex-col gap-3 pt-2">
                            <Link to="/login" className="w-full bg-accent text-black font-bold rounded-lg hover:bg-accent-hover hover:scale-[1.02] active:scale-[0.98] border border-transparent px-6 py-3 transition-all text-center block">Log In</Link>
                            <Link to="/register" className="w-full px-4 py-3 bg-elevated hover:bg-hover text-body font-bold border border-subtle text-sm rounded-lg transition-all text-center block">Create an account</Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-body text-body p-4 md:p-8 pb-24 md:pb-8">
            <div className="max-w-6xl mx-auto space-y-8">
                <header className="flex items-center justify-between pb-6 border-b border-subtle gap-3">
                    <h1 className="font-display text-4xl font-bold tracking-tight uppercase italic text-accent shrink-0">Dashboard</h1>
                    <div className="flex items-center gap-2">
                        <Link to="/active-workout" className="hidden md:inline-flex items-center gap-2 bg-accent text-black font-bold rounded-lg hover:bg-accent-hover hover:scale-[1.02] active:scale-[0.98] px-4 py-2 text-sm transition-all">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Start Workout</span>
                        </Link>
                        <Link to="/settings" className="p-2 rounded-lg hover:bg-elevated text-muted hover:text-body transition-colors" aria-label="Settings">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </Link>
                        <Link to="/profile" className="p-2 rounded-lg hover:bg-elevated text-muted hover:text-body transition-colors" aria-label="Profile">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </Link>
                    </div>
                </header>

                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-pulse">
                        {[1, 2, 3].map(n => <div key={n} className="bg-surface/60 border border-subtle rounded-xl h-24" />)}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-card border border-subtle rounded-xl p-5">
                            <p className="text-xs font-bold tracking-widest uppercase text-dim">Total Workouts</p>
                            <p className="text-3xl font-bold text-body mt-2 font-mono">{workoutCount ?? '—'}</p>
                        </div>
                        <div className="bg-card border border-subtle rounded-xl p-5">
                            <p className="text-xs font-bold tracking-widest uppercase text-dim">Weekly Volume</p>
                            <p className="text-3xl font-bold text-accent mt-2 font-mono">{weeklyVolume != null ? `${(weeklyVolume / 1000).toFixed(1)}k` : '—'}</p>
                            <p className="text-[10px] text-dim mt-0.5">total kg this week</p>
                        </div>
                        <div className="bg-card border border-subtle rounded-xl p-5">
                            <p className="text-xs font-bold tracking-widest uppercase text-dim">Current Streak</p>
                            <p className="text-3xl font-bold text-body mt-2 font-mono">{currentStreak ?? '—'}</p>
                            {currentStreak != null && currentStreak > 0 && (
                                <p className="text-[10px] text-dim mt-0.5">{currentStreak === 1 ? 'week' : 'weeks'} straight</p>
                            )}
                        </div>
                    </div>
                )}

                {dashboardError && (
                    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl p-4 font-medium text-sm">
                        Error: {dashboardError}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                    <div className="flex flex-col gap-4">
                        <Calendar events={workoutEvents} plannedDates={plannedDates} goalDates={goalDates} compact />
                        <Link to="/workout-calendar" className="w-full bg-elevated hover:bg-hover text-body font-bold border border-subtle text-sm rounded-xl px-4 py-2.5 transition-all text-center">
                            View Full Calendar
                        </Link>
                    </div>
                    <div className="flex flex-col gap-4">
                        {latestWeight && (
                            <div className="bg-card border border-subtle rounded-xl p-5">
                                <p className="text-xs font-bold tracking-widest uppercase text-dim">Current Weight</p>
                                <p className="text-3xl font-bold text-body mt-2 font-mono">{Number(latestWeight.weight)} <span className="text-lg text-dim font-normal">kg</span></p>
                                <p className="text-[10px] text-dim mt-0.5">as of {latestWeight.date?.substring(0, 10)}</p>
                                <Link to="/Weight_history" className="mt-4 block text-center text-xs font-bold text-accent hover:text-accent-hover uppercase tracking-wider transition-colors">Track Weight</Link>
                            </div>
                        )}
                        <div className="bg-surface/30 border border-subtle rounded-xl p-5 flex-1">
                            <h2 className="font-display text-xs font-bold tracking-[0.15em] uppercase text-dim mb-4">Recent Workouts</h2>
                            {recentWorkouts.length === 0 ? (
                                <p className="text-xs text-dim italic">No workouts logged yet.</p>
                            ) : (
                                <ul className="space-y-3">
                                    {recentWorkouts.slice(0, 3).map(w => (
                                        <li key={w.id}>
                                            <Link to="/workouts" state={{ preselectedWorkoutId: w.id }} className="block bg-surface/20 border border-subtle rounded-lg p-3 hover:border-accent/40 hover:bg-surface/40 transition-all">
                                                <p className="text-sm font-semibold text-heading truncate">{w.name}</p>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-xs font-mono text-dim">{w.date?.substring(0, 10)}</span>
                                                    {w.exercises && <span className="text-xs text-dim">{w.exercises.length} exercises</span>}
                                                </div>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <Link to="/workouts" className="mt-4 block text-center text-xs font-bold text-accent hover:text-accent-hover uppercase tracking-wider transition-colors">View All Workouts</Link>
                        </div>
                    </div>
                </div>

                <div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {primaryNav.map(link => (
                            <Link key={link.to} to={link.to} className="flex items-center gap-3 bg-surface/30 border border-subtle rounded-xl px-4 py-3 hover:border-accent/40 hover:bg-elevated/40 transition-all hover:shadow-lg hover:shadow-accent/5 group">
                                <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0 group-hover:bg-accent/20 transition-colors">
                                    <NavIcon path={link.to} />
                                </div>
                                <div>
                                    <p className="font-display text-sm font-bold text-heading group-hover:text-accent transition-colors uppercase tracking-wide">{link.label}</p>
                                    <p className="text-xs text-dim leading-relaxed group-hover:text-muted transition-colors">{link.desc}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {!loading && videos.length > 0 && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-display text-xs font-bold tracking-[0.15em] uppercase text-dim">Recent Videos</h2>
                            <Link to="/upload" className="text-xs font-bold text-accent hover:text-accent-hover uppercase tracking-wider transition-colors">
                                + Upload Video
                            </Link>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {videos.map(video => (
                                <Link key={video.id} to="/videos" className="group bg-card border border-subtle/80 rounded-xl overflow-hidden hover:border-accent/40 transition-all hover:shadow-lg">
                                    <div className="bg-black aspect-video flex items-center justify-center">
                                        <video className="w-full h-full object-contain" src={`http://localhost:8000${video.processed_url}`} preload="metadata" />
                                    </div>
                                    <div className="p-3">
                                        <p className="text-xs font-bold text-accent uppercase tracking-wider truncate">{video.process_type}</p>
                                        <p className="text-[10px] text-dim mt-0.5 font-mono">{new Date(video.created_at).toLocaleDateString()}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                <div>
                    <button onClick={() => setShowMore(!showMore)} className="flex items-center gap-2 text-xs font-bold tracking-[0.15em] uppercase text-dim hover:text-body transition-colors mb-4">
                        <span>More — {secondaryNav.length} sections</span>
                        <svg className={`w-3.5 h-3.5 transition-transform ${showMore ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    {showMore && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-1 duration-150">
                            {secondaryNav.map(link => (
                                <Link key={link.to} to={link.to} className="flex items-center gap-3 bg-surface/30 border border-subtle rounded-xl px-4 py-3 hover:border-accent/40 hover:bg-elevated/40 transition-all hover:shadow-lg hover:shadow-accent/5 group">
                                    <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0 group-hover:bg-accent/20 transition-colors">
                                        <NavIcon path={link.to} />
                                    </div>
                                    <div>
                                        <p className="font-display text-sm font-bold text-heading group-hover:text-accent transition-colors uppercase tracking-wide">{link.label}</p>
                                        <p className="text-xs text-dim leading-relaxed group-hover:text-muted transition-colors">{link.desc}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <Link to="/active-workout" className="fixed bottom-4 left-4 right-4 md:hidden bg-accent text-black font-bold rounded-xl hover:bg-accent-hover active:scale-[0.98] border border-transparent px-6 py-3.5 transition-all text-center shadow-2xl shadow-accent/20 z-40 flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Start Workout</span>
            </Link>
        </div>
    );
}
