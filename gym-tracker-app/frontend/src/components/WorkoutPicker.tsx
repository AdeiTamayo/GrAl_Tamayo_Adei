import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../utils/api';
import Select from './Select';

interface Workout {
    id: number;
    name: string;
    date: string;
}

interface WorkoutPickerProps {
    onSelect: (workout: Workout) => void;
    onClose?: () => void;
    title?: string;
    className?: string;
    excludeId?: number | null;
}

export default function WorkoutPicker({ onSelect, onClose, title = "Select Workout", className = "", excludeId }: WorkoutPickerProps) {
    const [allWorkouts, setAllWorkouts] = useState<Workout[]>([]);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const ITEMS_PER_PAGE = 5;

    useEffect(() => {
        loadWorkouts();
    }, []);

    useEffect(() => {
        setPage(1);
    }, [search, sortBy, sortOrder]);

    async function loadWorkouts() {
        try {
            setLoading(true);
            const token = localStorage.getItem('user_login_token');
            const res = await apiFetch('/api/workouts', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setAllWorkouts(data.data || []);
            } else {
                setError('Failed to load workouts');
            }
        } catch (err) {
            setError('Error loading workouts');
        } finally {
            setLoading(false);
        }
    }

    const filteredWorkouts = useMemo(() => {
        let list = allWorkouts;

        if (excludeId) {
            list = list.filter(w => w.id !== excludeId);
        }

        if (search) {
            const q = search.toLowerCase();
            list = list.filter(w =>
                w.name.toLowerCase().includes(q) || w.date?.substring(0, 10).includes(q)
            );
        }

        return [...list].sort((a, b) => {
            let cmp: number;
            if (sortBy === 'name') {
                cmp = a.name.localeCompare(b.name);
            } else {
                cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
            }
            return sortOrder === 'asc' ? cmp : -cmp;
        });
    }, [allWorkouts, search, sortBy, sortOrder, excludeId]);

    const paginatedWorkouts = useMemo(() => {
        const start = (page - 1) * ITEMS_PER_PAGE;
        return filteredWorkouts.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredWorkouts, page]);

    return (
        <div className={`flex flex-col h-full max-h-[80vh] bg-card border border-subtle rounded-2xl overflow-hidden shadow-2xl ${className}`}>
            {/* Header */}
            <div className="p-4 border-b border-subtle flex justify-between items-center bg-surface/50">
                <h3 className="text-lg font-display font-bold text-body uppercase tracking-tight">{title}</h3>
                <div className="flex gap-2">
                    {onClose && (
                        <button onClick={onClose} className="p-1.5 text-dim hover:text-body transition-colors">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="mx-4 mt-3 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl font-medium text-sm">
                    {error}
                </div>
            )}

            {/* Search */}
            <div className="p-4 border-b border-subtle bg-surface/20 space-y-3">
                <input
                    type="text"
                    placeholder="Search by name or date..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-surface border border-subtle rounded-xl px-4 py-2.5 text-sm text-body focus:outline-none focus:border-accent transition-colors"
                    autoFocus
                />
                <div className="flex items-center gap-2 text-xs">
                    <span className="text-dim">Sort by</span>
                    <div className="w-28">
                        <Select
                            value={sortBy}
                            onChange={v => { setSortBy(v as 'date' | 'name'); setPage(1); }}
                            options={[
                                { value: 'date', label: 'Date' },
                                { value: 'name', label: 'Name' },
                            ]}
                            buttonClassName="px-2 py-1 text-xs text-left"
                        />
                    </div>
                    <button
                        onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
                        className="bg-surface border border-subtle rounded px-2 py-1 text-xs text-body hover:border-accent transition-colors"
                        title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                    >
                        {sortOrder === 'asc' ? '\u2191' : '\u2193'}
                    </button>
                </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-zinc-800">
                {loading ? (
                    <div className="p-8 text-center text-dim animate-pulse">Loading workouts...</div>
                ) : filteredWorkouts.length === 0 ? (
                    <div className="p-8 text-center text-dim">
                        {search ? 'No workouts match your search.' : 'No workouts found.'}
                    </div>
                ) : (
                    <>
                        <div className="space-y-1">
                            {paginatedWorkouts.map(w => (
                                <button
                                    key={w.id}
                                    onClick={() => onSelect(w)}
                                    className="w-full text-left p-3 rounded-xl hover:bg-surface group transition-all border border-transparent hover:border-subtle"
                                >
                                    <div className="font-bold text-heading group-hover:text-accent transition-colors uppercase tracking-tight text-sm">{w.name}</div>
                                    <div className="flex gap-2 mt-1">
                                        <span className="text-[10px] uppercase font-bold text-dim bg-elevated/50 px-1.5 py-0.5 rounded tracking-widest">{w.date?.substring(0, 10)}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                        {filteredWorkouts.length > ITEMS_PER_PAGE && (
                            <div className="flex items-center justify-center gap-3 mt-3 pb-1">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="text-xs font-semibold text-dim hover:text-body disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-2 py-1"
                                >
                                    &larr; Prev
                                </button>
                                <span className="text-xs text-muted font-medium">
                                    Page {page} of {Math.ceil(filteredWorkouts.length / ITEMS_PER_PAGE)}
                                </span>
                                <button
                                    onClick={() => setPage(p => Math.min(Math.ceil(filteredWorkouts.length / ITEMS_PER_PAGE), p + 1))}
                                    disabled={page === Math.ceil(filteredWorkouts.length / ITEMS_PER_PAGE)}
                                    className="text-xs font-semibold text-dim hover:text-body disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-2 py-1"
                                >
                                    Next &rarr;
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
