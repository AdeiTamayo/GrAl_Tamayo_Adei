import React, { useEffect, useMemo, useState, useRef } from 'react';
import { apiFetch } from '../utils/api';
import Button from './Button';
import Select from './Select';

export interface Exercise {
    id: number;
    name: string;
    bodyPart?: string;
    target?: string;
    equipment: string;
    difficulty: string;
    category: string;
    secondary_muscles?: string[];
    is_custom?: boolean;
    description?: string;
    instructions?: string[];
}

interface FilterOptions {
    equipment: string[];
    muscles: string[];
    categoryType: string[];
}

interface Filters {
    search: string;
    equipment: string;
    muscles: string;
    categoryType: string;
}

interface ExercisePickerProps {
    onSelect: (exercise: Exercise) => void;
    onClose?: () => void;
    title?: string;
}

export default function ExercisePicker({ onSelect, onClose, title = "Select Exercise" }: ExercisePickerProps) {
    const [allExercises, setAllExercises] = useState<Exercise[]>([]);
    const [filterOptions, setFilterOptions] = useState<FilterOptions>({
        equipment: [],
        muscles: [],
        categoryType: []
    });
    const [filters, setFilters] = useState<Filters>({
        search: '',
        equipment: '',
        muscles: '',
        categoryType: ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'create'>('list');

    // Create state fields
    const [newName, setNewName] = useState('');
    const [newTarget, setNewTarget] = useState('');
    const [newEquipment, setNewEquipment] = useState('');
    const [newDifficulty, setNewDifficulty] = useState('intermediate');
    const [newCategory, setNewCategory] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            const token = localStorage.getItem('user_login_token');
            const headers = { 'Authorization': `Bearer ${token}` };

            const [fRes, eRes] = await Promise.all([
                apiFetch('/api/exercises/filters', { headers }),
                apiFetch('/api/exercises', { headers })
            ]);

            const fData = await fRes.json();
            const eData = await eRes.json();

            if (fData.success) setFilterOptions(fData.data);
            if (eData.success) setAllExercises(eData.data);
        } catch (err) {
            setError('Failed to load exercises');
        } finally {
            setLoading(false);
        }
    }

    const filteredExercises = useMemo(() => {
        return allExercises.filter(ex => {
            const matchesSearch = !filters.search || ex.name.toLowerCase().includes(filters.search.toLowerCase());
            const matchesEquipment = !filters.equipment || ex.equipment === filters.equipment;
            const matchesMuscle = !filters.muscles || ex.target === filters.muscles;
            const matchesCategory = !filters.categoryType || ex.category === filters.categoryType;
            return matchesSearch && matchesEquipment && matchesMuscle && matchesCategory;
        });
    }, [allExercises, filters]);

    async function handleCreateExercise(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        try {
            const token = localStorage.getItem('user_login_token');
            const response = await apiFetch('/api/exercises', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    exercice_name: newName,
                    target: newTarget,
                    equipment: newEquipment,
                    difficulty: newDifficulty,
                    category: newCategory,
                    secondary_muscles: [],
                    instructions: []
                })
            });
            const result = await response.json();
            if (result.success) {
                onSelect(result.data);
            } else {
                setError(result.error || 'Failed to create exercise');
            }
        } catch (err) {
            setError('Error creating exercise');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="flex flex-col h-full max-h-[80vh] bg-card border border-subtle rounded-2xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-subtle flex justify-between items-center bg-surface/50">
                <h3 className="text-lg font-display font-bold text-body uppercase tracking-tight">{viewMode === 'list' ? title : 'New Exercise'}</h3>
                <div className="flex gap-2">
                    {viewMode === 'list' ? (
                        <Button variant="secondary" onClick={() => setViewMode('create')} className="text-xs px-3 py-1.5">Create Custom</Button>
                    ) : (
                        <Button variant="secondary" onClick={() => setViewMode('list')} className="text-xs px-3 py-1.5">Back to Search</Button>
                    )}
                    {onClose && (
                        <button onClick={onClose} className="p-1.5 text-dim hover:text-body transition-colors">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    )}
                </div>
                        {error && (
                <div className="mx-4 mt-2 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl font-medium text-sm">
                    {error}
                </div>
            )}

            </div>

            {viewMode === 'list' ? (
                <>
                    {/* Search & Filters */}
                    <div className="p-4 border-b border-subtle space-y-3 bg-surface/20">
                        <input
                            type="text"
                            placeholder="Filter by name..."
                            value={filters.search}
                            onChange={e => setFilters({ ...filters, search: e.target.value })}
                            className="w-full bg-surface border border-subtle rounded-xl px-4 py-2.5 text-sm text-body focus:outline-none focus:border-lime-400 transition-colors"
                        />
                        <div className="grid grid-cols-3 gap-2">
                            <Select
                                value={filters.muscles}
                                onChange={(val) => setFilters({ ...filters, muscles: val })}
                                placeholder="Target"
                                options={[
                                    { value: "", label: "Target" },
                                    ...filterOptions.muscles.map(m => ({ value: m, label: m }))
                                ]}
                                className="[&>button]:text-xs [&>button]:py-1.5 [&>button]:px-2"
                            />
                            <Select
                                value={filters.equipment}
                                onChange={(val) => setFilters({ ...filters, equipment: val })}
                                placeholder="Equipment"
                                options={[
                                    { value: "", label: "Equipment" },
                                    ...filterOptions.equipment.map(e => ({ value: e, label: e }))
                                ]}
                                className="[&>button]:text-xs [&>button]:py-1.5 [&>button]:px-2"
                            />
                            <Select
                                value={filters.categoryType}
                                onChange={(val) => setFilters({ ...filters, categoryType: val })}
                                placeholder="Category"
                                options={[
                                    { value: "", label: "Category" },
                                    ...filterOptions.categoryType.map(c => ({ value: c, label: c }))
                                ]}
                                className="[&>button]:text-xs [&>button]:py-1.5 [&>button]:px-2"
                            />
                        </div>
                    </div>

                    {/* Results List */}
                    <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-zinc-800">
                        {loading ? (
                            <div className="p-8 text-center text-dim animate-pulse">Loading exercises...</div>
                        ) : filteredExercises.length === 0 ? (
                            <div className="p-8 text-center text-dim">No exercises found</div>
                        ) : (
                            <div className="space-y-1">
                                {filteredExercises.map(ex => (
                                    <button
                                        key={ex.id}
                                        onClick={() => onSelect(ex)}
                                        className="w-full text-left p-3 rounded-xl hover:bg-surface group transition-all border border-transparent hover:border-subtle"
                                    >
                                        <div className="font-bold text-heading group-hover:text-lime-400 transition-colors uppercase tracking-tight text-sm">{ex.name}</div>
                                        <div className="flex gap-2 mt-1 blur-[0.2px] group-hover:blur-0 transition-all">
                                            <span className="text-[10px] uppercase font-bold text-dim bg-elevated/50 px-1.5 py-0.5 rounded tracking-widest">{ex.target}</span>
                                            <span className="text-[10px] uppercase font-bold text-dim bg-elevated/50 px-1.5 py-0.5 rounded tracking-widest">{ex.equipment}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <form onSubmit={handleCreateExercise} className="p-6 space-y-4 overflow-y-auto flex-1">
                    <div>
                        <label className="block text-xs font-bold text-dim uppercase tracking-widest mb-1.5">Exercise Name</label>
                        <input
                            type="text"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            required
                            className="w-full bg-surface border border-subtle rounded-xl px-4 py-2.5 text-body focus:outline-none focus:border-lime-400"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-dim uppercase tracking-widest mb-1.5">Target Muscle</label>
                            <Select
                                value={newTarget}
                                onChange={(val) => setNewTarget(val)}
                                placeholder="Select"
                                options={[
                                    { value: "", label: "Select" },
                                    ...filterOptions.muscles.map(m => ({ value: m, label: m }))
                                ]}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-dim uppercase tracking-widest mb-1.5">Equipment</label>
                            <Select
                                value={newEquipment}
                                onChange={(val) => setNewEquipment(val)}
                                placeholder="Select"
                                options={[
                                    { value: "", label: "Select" },
                                    ...filterOptions.equipment.map(e => ({ value: e, label: e }))
                                ]}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-dim uppercase tracking-widest mb-1.5">Category</label>
                            <Select
                                value={newCategory}
                                onChange={(val) => setNewCategory(val)}
                                placeholder="Select"
                                options={[
                                    { value: "", label: "Select" },
                                    ...filterOptions.categoryType.map(c => ({ value: c, label: c }))
                                ]}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-dim uppercase tracking-widest mb-1.5">Difficulty</label>
                            <Select
                                value={newDifficulty}
                                onChange={(val) => setNewDifficulty(val)}
                                placeholder="Select"
                                options={[
                                    { value: "beginner", label: "Beginner" },
                                    { value: "intermediate", label: "Intermediate" },
                                    { value: "expert", label: "Expert" }
                                ]}
                            />
                        </div>
                    </div>
                    <Button type="submit" fullWidth disabled={saving} className="mt-4">
                        {saving ? 'Creating...' : 'Create and Select'}
                    </Button>
                </form>
            )}
        </div>
    );
}

