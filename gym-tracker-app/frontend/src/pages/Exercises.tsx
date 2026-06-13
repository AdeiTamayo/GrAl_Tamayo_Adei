import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../utils/api';
import Button from '../components/Button';
import Select from '../components/Select';
import ConfirmModal from '../components/ConfirmModal';

type Exercise = {
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
};

type ExercisePayload = {
    exercice_name?: string;
    body_part?: string;
    target_muscle?: string;
    equipment?: string;
    difficulty?: string;
    category?: string;
    secondary_muscles: string[];
    description?: string;
    instructions: string[];
};

type FilterOptions = {
    equipment: string[];
    muscles: string[];
    categoryType: string[];
};

type Filters = {
    search: string;
    equipment: string;
    muscles: string;
    categoryType: string;
};

type ViewMode = 'list' | 'details' | 'create' | 'edit';

export default function Exercises() {
    const [allExercises, setAllExercises] = useState<Exercise[]>([]);
    const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

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

    const [selectedSecondaryMuscles, setSelectedSecondaryMuscles] = useState<string[]>([]);
    const [formSecondaryPick, setFormSecondaryPick] = useState('');
    const [formName, setFormName] = useState('');
    const [formBodyPart, setFormBodyPart] = useState('');
    const [formTarget, setFormTarget] = useState('');
    const [formEquipment, setFormEquipment] = useState('');
    const [formCategory, setFormCategory] = useState('');
    const [formDifficulty, setFormDifficulty] = useState('beginner');

    const [viewMode, setViewMode] = useState<ViewMode>('list');

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState<string | null>(null);

    const [page, setPage] = useState(1);
    const [totalExercises, setTotalExercises] = useState(0);
    const pageSize = 20;

    const headers = useMemo(() => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('user_login_token')}`
    }), []);

    const filteredExercises = useMemo(() => {
        const filtered = allExercises.filter(ex => {
            const matchesSearch =
                !filters.search ||
                ex.name.toLowerCase().includes(filters.search.toLowerCase());

            const matchesEquipment =
                !filters.equipment ||
                ex.equipment === filters.equipment;

            const matchesMuscle =
                !filters.muscles ||
                ex.target === filters.muscles;

            const matchesCategory =
                !filters.categoryType ||
                ex.category === filters.categoryType;

            return (
                matchesSearch &&
                matchesEquipment &&
                matchesMuscle &&
                matchesCategory
            );
        });
        return filtered;
    }, [allExercises, filters]);

    const paginatedExercises = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredExercises.slice(start, start + pageSize);
    }, [filteredExercises, page, pageSize]);

    const totalPages = Math.max(1, Math.ceil(filteredExercises.length / pageSize));

    const paginationButtons = useMemo(() => {
        if (filteredExercises.length <= pageSize) return null;
        const startPage = Math.max(1, Math.min(page - 2, totalPages - 4));
        const endPage = Math.min(startPage + 4, totalPages);
        const items: React.ReactNode[] = [];
        for (let p = startPage; p <= endPage; p++) {
            const isActive = p === page;
            items.push(
                <button
                    key={p}
                    onClick={function() { setPage(p); }}
                    className={'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors' + (isActive ? ' bg-lime-400 text-black' : ' bg-zinc-800 text-zinc-300 hover:bg-zinc-700')}
                >
                    {p}
                </button>
            );
        }
        return items;
    }, [page, totalPages, filteredExercises.length, pageSize]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setPage(1);
    }, [filters]);

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (viewMode === 'edit' && selectedExercise) {
            setSelectedSecondaryMuscles(selectedExercise.secondary_muscles || []);
            setFormName(selectedExercise.name || '');
            setFormBodyPart(selectedExercise.bodyPart || '');
            setFormTarget(selectedExercise.target || '');
            setFormEquipment(selectedExercise.equipment || '');
            setFormCategory(selectedExercise.category || '');
            setFormDifficulty(selectedExercise.difficulty || 'beginner');
        }

        if (viewMode === 'create') {
            setSelectedSecondaryMuscles([]);
            setFormName('');
            setFormBodyPart('');
            setFormTarget('');
            setFormEquipment('');
            setFormCategory('');
            setFormDifficulty('beginner');
        }
    }, [viewMode, selectedExercise]);

    async function apiRequest<T>(url: string, options: RequestInit): Promise<T> {
        const response = await apiFetch(url, options);
        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Request failed');
        }

        return result.data;
    }

    async function loadInitialData() {
        try {
            setLoading(true);
            setError('');

            const [filtersData, exercisesData] = await Promise.all([
                getFilterOptions(),
                getExercises()
            ]);

            setFilterOptions(filtersData);
            setAllExercises(exercisesData);
        } catch (err: any) {
            setError(err.message || 'Could not load data.');
        } finally {
            setLoading(false);
        }
    }

    async function getFilterOptions(): Promise<FilterOptions> {
        return await apiRequest<FilterOptions>('/api/exercises/filters', {
            method: 'GET',
            headers
        });
    }

    async function getExercises(): Promise<Exercise[]> {
        return await apiRequest<Exercise[]>('/api/exercises', {
            method: 'GET',
            headers
        });
    }

    async function fetchExerciseById(id: number) {
        try {
            setLoading(true);
            setError('');
            setSuccess(null);

            const response = await apiFetch("/api/exercises/" + id, {
                method: "GET",
                headers
            });

            if (!response.ok) {
                throw new Error("Failed to fetch exercise");
            }

            const result = await response.json();

            if (result.success && result.data) {
                setSelectedExercise(result.data);
                setViewMode('details');
            } else {
                throw new Error(result.message || "Exercise not found");
            }

        } catch (err: any) {
            console.error("Fetch exercise failed:", err);
            setError(err.message || "Could not load exercise.");
            setSelectedExercise(null);
        } finally {
            setLoading(false);
        }
    }

    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

    async function deleteExerciseById(id: number) {
        try {
            setLoading(true);
            setError('');

            const response = await apiFetch(`/api/exercises/${id}`, {
                method: 'DELETE',
                headers
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Unknown error');
            }

            const refreshedExercises = await getExercises();
            setAllExercises(refreshedExercises);

            backToList();
            setSuccess('Exercise deleted.');
        } catch (err: any) {
            setError(err.message || 'Could not delete exercise.');
        } finally {
            setLoading(false);
        }
    }

    async function createExercise(payload: ExercisePayload) {
        try {
            setSaving(true);
            setError('');
            setSuccess(null);

            const createdExercise = await apiRequest<Exercise>('/api/exercises', {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
            });

            setAllExercises(prev => [...prev, createdExercise]);
            setViewMode('list');
            setSuccess('Exercise created successfully.');
        } catch (err: any) {
            setError('Could not create exercise. ' + err.message);
        } finally {
            setSaving(false);
        }
    }

    async function updateExercise(id: number, payload: ExercisePayload) {
        try {
            setSaving(true);
            setError('');
            setSuccess(null);

            const updatedExercise = await apiRequest<Exercise>(`/api/exercises/${id}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(payload)
            });

            setAllExercises(prev =>
                prev.map(ex => ex.id === id ? updatedExercise : ex)
            );

            setSelectedExercise(updatedExercise);
            setViewMode('details');
            setSuccess('Exercise updated successfully.');
        } catch (err: any) {
            setError('Could not save changes. ' + err.message);
        } finally {
            setSaving(false);
        }
    }

    const handleFilterChange = (
        e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>
    ) => {
        setFilters(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const handleFormSubmit = (
        ReactEvent: React.FormEvent<HTMLFormElement>,
        id?: number
    ) => {
        ReactEvent.preventDefault();
        setError('');
        setSuccess(null);

        const formData = new FormData(ReactEvent.currentTarget);

        const name = formData.get('name')?.toString().trim() || '';
        const bodyPart = formData.get('bodyPart')?.toString().trim() || '';

        const newEquipment = formData.get('new_equipment')?.toString().trim();
        const equipment = (newEquipment || formData.get('equipment')?.toString() || '').trim();

        const newCategory = formData.get('new_category')?.toString().trim();
        const category = (newCategory || formData.get('category')?.toString() || '').trim();

        const newTargetMuscle = formData.get('new_target_muscle')?.toString().trim();
        const targetMuscle = (newTargetMuscle || formData.get('target_muscle')?.toString() || '').trim();

        const secondaryMuscles = formData.getAll('secondary_muscles') as string[];
        const description = formData.get('description')?.toString().trim() || '';
        const instructions = formData.get('instructions')?.toString().split('\n').map(s => s.trim()).filter(Boolean) || [];

        // --- Client side Limitations & Rule Checkers ---
        if (!name || name.length < 3 || name.length > 50) {
            setError("Exercise name is required and must be between 3 and 50 characters.");
            return;
        }

        if (!targetMuscle) {
            setError("Please select an existing target muscle or provide a custom one.");
            return;
        }

        if (!equipment) {
            setError("Equipment specification cannot be empty.");
            return;
        }

        if (!category) {
            setError("Please specify a core training category.");
            return;
        }

        if (description.length > 500) {
            setError("Description can be up to 500 characters long.");
            return;
        }

        if (instructions.length === 0) {
            setError("Please provide at least one clear instruction step for this exercise.");
            return;
        }

        if (instructions.length > 15) {
            setError("Instructions cannot exceed 15 sequence steps.");
            return;
        }

        const payload: ExercisePayload = {
            exercice_name: name,
            body_part: bodyPart || undefined,
            target_muscle: targetMuscle || undefined,
            equipment,
            difficulty: formData.get('difficulty')?.toString(),
            category,
            secondary_muscles: secondaryMuscles.filter(Boolean),
            description: description || undefined,
            instructions
        };

        if (id) {
            updateExercise(id, payload);
        } else {
            createExercise(payload);
        }
    };

    const backToList = () => {
        setSelectedExercise(null);
        setViewMode('list');
        setError('');
        setSuccess(null);
    };



    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 mt-4 md:mt-8 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="font-display text-4xl font-bold tracking-tight uppercase italic text-lime-400">Exercises</h1>
                {viewMode === 'list' && (
                    <Button onClick={() => setViewMode('create')} variant="primary">+ Create Exercise</Button>
                )}
            </div>

            {/* Clean Status Messages without Box Borders */}
            <div className="flex flex-col gap-1.5">
                {loading && <p className="text-sm text-zinc-400 font-medium">Loading...</p>}
                {error && viewMode !== 'create' && viewMode !== 'edit' && (
                    <p className="text-sm font-semibold text-rose-500 tracking-wide animate-in fade-in duration-300">{error}</p>
                )}
                {success && <p className="text-sm font-semibold text-lime-400 tracking-wide animate-in fade-in duration-300">{success}</p>}
            </div>

            {viewMode !== 'create' && (
                <div className="flex flex-col sm:flex-row gap-4">
                    {viewMode === 'details' || viewMode === 'edit' ? (
                        <Button type="button" variant="secondary" onClick={backToList}>&larr; Back to List</Button>
                    ) : (
                        <div className="flex gap-4 w-full flex-col sm:flex-row">
                            <input
                                type="text" name="search" placeholder="Search exercises..." value={filters.search} onChange={handleFilterChange}
                                className="w-full border border-zinc-800 bg-zinc-900 rounded-lg px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:border-lime-400 focus:outline-none transition-colors"
                            />
                            <Select
                                value={filters.muscles}
                                onChange={(val) => setFilters({ ...filters, muscles: val })}
                                placeholder="All Muscles"
                                options={[
                                    { value: "", label: "All Muscles" },
                                    ...filterOptions.muscles?.map(m => ({ value: m, label: m })) || []
                                ]}
                            />
                            <Select
                                value={filters.equipment}
                                onChange={(val) => setFilters({ ...filters, equipment: val })}
                                placeholder="All Equipment"
                                options={[
                                    { value: "", label: "All Equipment" },
                                    ...filterOptions.equipment?.map(e => ({ value: e, label: e })) || []
                                ]}
                            />
                            <Select
                                value={filters.categoryType}
                                onChange={(val) => setFilters({ ...filters, categoryType: val })}
                                placeholder="All Categories"
                                options={[
                                    { value: "", label: "All Categories" },
                                    ...filterOptions.categoryType?.map(c => ({ value: c, label: c })) || []
                                ]}
                            />
                        </div>
                    )}
                </div>
            )}

            <div>
                {viewMode === 'create' ? (
                    <ExerciseForm
                        isEdit={false}
                        formName={formName}
                        setFormName={setFormName}
                        formBodyPart={formBodyPart}
                        setFormBodyPart={setFormBodyPart}
                        formTarget={formTarget}
                        setFormTarget={setFormTarget}
                        formEquipment={formEquipment}
                        setFormEquipment={setFormEquipment}
                        formCategory={formCategory}
                        setFormCategory={setFormCategory}
                        formDifficulty={formDifficulty}
                        setFormDifficulty={setFormDifficulty}
                        formSecondaryPick={formSecondaryPick}
                        setFormSecondaryPick={setFormSecondaryPick}
                        selectedSecondaryMuscles={selectedSecondaryMuscles}
                        setSelectedSecondaryMuscles={setSelectedSecondaryMuscles}
                        filterOptions={filterOptions}
                        error={error}
                        saving={saving}
                        onSubmit={handleFormSubmit}
                        onCancel={backToList}
                    />
                ) : viewMode === 'details' && selectedExercise ? (
                    <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-6 shadow-xl space-y-4">
                        <h2 className="font-display text-2xl font-bold text-zinc-100 tracking-wide uppercase">{selectedExercise.name}</h2>
                        <div className="flex flex-wrap gap-4 text-zinc-300 mb-6 bg-zinc-900/50 p-4 rounded-lg">
                            <span><strong>Body Part:</strong> {selectedExercise.bodyPart}</span>
                            <span><strong>Target:</strong> {selectedExercise.target}</span>
                            <span><strong>Equipment:</strong> {selectedExercise.equipment}</span>
                            <span><strong>Difficulty:</strong> {selectedExercise.difficulty}</span>
                            <span><strong>Category:</strong> {selectedExercise.category}</span>
                            <span><strong>Secondary Muscles:</strong> {selectedExercise.secondary_muscles?.join(', ') || 'None'}</span>
                        </div>

                        <h3 className="font-display text-lg font-bold text-zinc-200 tracking-wide uppercase">Description</h3>
                        <p className="text-zinc-400 whitespace-pre-wrap">{selectedExercise.description || 'No description available.'}</p>

                        <h3 className="font-display text-lg font-bold text-zinc-200 tracking-wide uppercase mt-6">Instructions</h3>
                        {selectedExercise.instructions && selectedExercise.instructions.length > 0 ? (
                            <ol className="list-decimal list-inside space-y-2 text-zinc-400">
                                {selectedExercise.instructions.map((step, idx) => (<li key={idx}>{step}</li>))}
                            </ol>
                        ) : (
                            <p className="text-zinc-400">No instructions available.</p>
                        )}

                        <div className="flex gap-4 mt-8 pt-4 border-t border-zinc-800">
                            <Button type="button" variant="secondary" onClick={() => setViewMode('edit')}>Edit Exercise</Button>
                            <Button type="button" variant="danger" onClick={() => setDeleteConfirmId(selectedExercise.id)}>Delete Exercise</Button>
                        </div>
                    </div>
                ) : viewMode === 'edit' && selectedExercise ? (
                    <ExerciseForm
                        ex={selectedExercise}
                        isEdit={true}
                        formName={formName}
                        setFormName={setFormName}
                        formBodyPart={formBodyPart}
                        setFormBodyPart={setFormBodyPart}
                        formTarget={formTarget}
                        setFormTarget={setFormTarget}
                        formEquipment={formEquipment}
                        setFormEquipment={setFormEquipment}
                        formCategory={formCategory}
                        setFormCategory={setFormCategory}
                        formDifficulty={formDifficulty}
                        setFormDifficulty={setFormDifficulty}
                        formSecondaryPick={formSecondaryPick}
                        setFormSecondaryPick={setFormSecondaryPick}
                        selectedSecondaryMuscles={selectedSecondaryMuscles}
                        setSelectedSecondaryMuscles={setSelectedSecondaryMuscles}
                        filterOptions={filterOptions}
                        error={error}
                        saving={saving}
                        onSubmit={handleFormSubmit}
                        onCancel={backToList}
                    />
                ) : (
                    <>
                    <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {paginatedExercises.length > 0 ? (
                            paginatedExercises.map(ex => (
                                <li
                                    key={ex.id}
                                    onClick={() => fetchExerciseById(ex.id)}
                                    className="bg-zinc-900/40 border cursor-pointer border-zinc-800/80 rounded-xl p-5 flex flex-col justify-between gap-4 hover:border-lime-400/50 transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-lime-400/5"
                                >
                                    <div>
                                        <h2 className="font-display text-xl font-bold text-zinc-100 mb-2 truncate">{ex.name}</h2>
                                        <div className="text-sm text-zinc-400 space-x-2">
                                            <span className="inline-block bg-zinc-800 px-2 py-1 rounded text-zinc-300">{ex.target}</span>
                                            <span className="inline-block bg-zinc-800 px-2 py-1 rounded text-zinc-300">{ex.equipment}</span>
                                        </div>
                                    </div>
                                </li>
                            ))
                        ) : (
                            !loading && <p className="text-zinc-400 col-span-2">No exercises found.</p>
                        )}
                    </ul>

                    {filteredExercises.length > pageSize && (
                        <div className="flex items-center justify-between pt-4 border-t border-zinc-800/60">
                            <p className="text-xs text-zinc-500 font-mono">
                                Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filteredExercises.length)} of {filteredExercises.length}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Previous
                                </button>
                                {paginationButtons}
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
            </div>

            {deleteConfirmId !== null && (
                <ConfirmModal
                    message="Delete this exercise?"
                    onConfirm={() => deleteExerciseById(deleteConfirmId)}
                    onCancel={() => setDeleteConfirmId(null)}
                    confirmLabel="Delete"
                />
            )}
        </div>
    );
}

type ExerciseFormProps = {
    ex?: Exercise;
    isEdit: boolean;
    formName: string;
    setFormName: React.Dispatch<React.SetStateAction<string>>;
    formBodyPart: string;
    setFormBodyPart: React.Dispatch<React.SetStateAction<string>>;
    formTarget: string;
    setFormTarget: React.Dispatch<React.SetStateAction<string>>;
    formEquipment: string;
    setFormEquipment: React.Dispatch<React.SetStateAction<string>>;
    formCategory: string;
    setFormCategory: React.Dispatch<React.SetStateAction<string>>;
    formDifficulty: string;
    setFormDifficulty: React.Dispatch<React.SetStateAction<string>>;
    formSecondaryPick: string;
    setFormSecondaryPick: React.Dispatch<React.SetStateAction<string>>;
    selectedSecondaryMuscles: string[];
    setSelectedSecondaryMuscles: React.Dispatch<React.SetStateAction<string[]>>;
    filterOptions: FilterOptions;
    error: string;
    saving: boolean;
    onSubmit: (e: React.FormEvent<HTMLFormElement>, id?: number) => void;
    onCancel: () => void;
};

function ExerciseForm({
    ex,
    isEdit,
    formName,
    setFormName,
    formBodyPart,
    setFormBodyPart,
    formTarget,
    setFormTarget,
    formEquipment,
    setFormEquipment,
    formCategory,
    setFormCategory,
    formDifficulty,
    setFormDifficulty,
    formSecondaryPick,
    setFormSecondaryPick,
    selectedSecondaryMuscles,
    setSelectedSecondaryMuscles,
    filterOptions,
    error,
    saving,
    onSubmit,
    onCancel
}: ExerciseFormProps) {
    return (
        <form onSubmit={(e) => onSubmit(e, ex?.id)} className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-6 shadow-xl space-y-4">
            <h2 className="font-display text-xl font-bold text-zinc-100 tracking-wide uppercase mb-4">
                {isEdit ? 'Edit Exercise' : 'Create Custom Exercise'}
            </h2>

            {error && (
                <p className="text-sm font-semibold text-rose-500 tracking-wide animate-in fade-in duration-300">
                    {error}
                </p>
            )}

            <div>
                <label className="block text-sm font-semibold text-zinc-400 mb-2">Exercise Name *</label>
                <input
                    type="text"
                    name="name"
                    required
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    className="w-full border border-zinc-800 bg-zinc-900 rounded-lg px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:border-lime-400 focus:outline-none transition-colors"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-semibold text-zinc-400 mb-2">Body Part</label>
                    <input
                        type="text"
                        name="bodyPart"
                        value={formBodyPart}
                        onChange={e => setFormBodyPart(e.target.value)}
                        className="w-full border border-zinc-800 bg-zinc-900 rounded-lg px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:border-lime-400 focus:outline-none transition-colors"
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-zinc-400 mb-2">Target Muscle *</label>
                    <Select
                        value={formTarget}
                        onChange={(val) => setFormTarget(val)}
                        placeholder="Select Target"
                        options={[
                            { value: "", label: "Select Target" },
                            ...filterOptions.muscles?.map(m => ({ value: m, label: m })) || []
                        ]}
                    />
                    <input type="hidden" name="target_muscle" value={formTarget} />
                    <input
                        type="text"
                        name="new_target_muscle"
                        placeholder="Or add new muscle..."
                        className="w-full mt-2 border border-zinc-800 bg-zinc-900 rounded-lg px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:border-lime-400 focus:outline-none transition-colors"
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-zinc-400 mb-2">Equipment *</label>
                    <Select
                        value={formEquipment}
                        onChange={(val) => setFormEquipment(val)}
                        placeholder="Select Equipment"
                        options={[
                            { value: "", label: "Select Equipment" },
                            ...filterOptions.equipment?.map(e => ({ value: e, label: e })) || []
                        ]}
                    />
                    <input type="hidden" name="equipment" value={formEquipment} />
                    <input
                        type="text"
                        name="new_equipment"
                        placeholder="Or add new equipment..."
                        className="w-full mt-2 border border-zinc-800 bg-zinc-900 rounded-lg px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:border-lime-400 focus:outline-none transition-colors"
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-zinc-400 mb-2">Category *</label>
                    <Select
                        value={formCategory}
                        onChange={(val) => setFormCategory(val)}
                        placeholder="Select Category"
                        options={[
                            { value: "", label: "Select Category" },
                            ...filterOptions.categoryType?.map(c => ({ value: c, label: c })) || []
                        ]}
                    />
                    <input type="hidden" name="category" value={formCategory} />
                    <input
                        type="text"
                        name="new_category"
                        placeholder="Or add new category..."
                        className="w-full mt-2 border border-zinc-800 bg-zinc-900 rounded-lg px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:border-lime-400 focus:outline-none transition-colors"
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-zinc-400 mb-2">Difficulty</label>
                    <Select
                        value={formDifficulty}
                        onChange={(val) => setFormDifficulty(val)}
                        placeholder="Select"
                        options={[
                            { value: "beginner", label: "Beginner" },
                            { value: "intermediate", label: "Intermediate" },
                            { value: "advanced", label: "Advanced" }
                        ]}
                    />
                    <input type="hidden" name="difficulty" value={formDifficulty} />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-zinc-400 mb-2">Secondary Muscles</label>
                    <Select
                        value={formSecondaryPick}
                        onChange={(val) => {
                            if (val && !selectedSecondaryMuscles.includes(val)) {
                                setSelectedSecondaryMuscles(prev => [...prev, val]);
                            }
                            setFormSecondaryPick('');
                        }}
                        placeholder="Select Secondary Muscle"
                        options={[
                            { value: "", label: "Select Secondary Muscle" },
                            ...filterOptions.muscles?.map(m => ({ value: m, label: m })) || []
                        ]}
                    />
                    <input
                        type="text"
                        placeholder="Or add new secondary muscle..."
                        className="w-full border border-zinc-800 bg-zinc-900 rounded-lg px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:border-lime-400 focus:outline-none transition-colors"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                const value = e.currentTarget.value.trim();
                                if (value && !selectedSecondaryMuscles.includes(value)) {
                                    setSelectedSecondaryMuscles(prev => [...prev, value]);
                                }
                                e.currentTarget.value = '';
                            }
                        }}
                    />
                    <div className="flex flex-wrap gap-2 mt-3">
                        {selectedSecondaryMuscles.map(muscle => (
                            <div key={muscle} className="flex items-center gap-2 bg-zinc-800 px-3 py-1 rounded-full text-zinc-200 text-sm">
                                <span>{muscle}</span>
                                <input type="hidden" name="secondary_muscles" value={muscle} />
                                <button type="button" className="text-zinc-400 hover:text-rose-500 font-bold" onClick={() => setSelectedSecondaryMuscles(prev => prev.filter(m => m !== muscle))}>✕</button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div>
                <label className="block text-sm font-semibold text-zinc-400 mb-2">Description</label>
                <textarea
                    name="description"
                    defaultValue={ex?.description || ''}
                    rows={3}
                    className="w-full border border-zinc-800 bg-zinc-900 rounded-lg px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:border-lime-400 focus:outline-none transition-colors"
                />
            </div>

            <div>
                <label className="block text-sm font-semibold text-zinc-400 mb-2">Instructions (one per line)</label>
                <textarea
                    name="instructions"
                    defaultValue={ex?.instructions?.join('\n') || ''}
                    rows={4}
                    className="w-full border border-zinc-800 bg-zinc-900 rounded-lg px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:border-lime-400 focus:outline-none transition-colors"
                />
            </div>

            <div className="pt-2">
                <Button type="submit" variant="primary" fullWidth disabled={saving}>
                    {saving ? 'Saving...' : isEdit ? 'Update Exercise' : 'Save Custom Exercise'}
                </Button>
            </div>
            <div className="pt-2 pb-2">
                <Button type="button" variant="secondary" fullWidth onClick={onCancel}>
                    Cancel
                </Button>
            </div>
        </form>
    );
}