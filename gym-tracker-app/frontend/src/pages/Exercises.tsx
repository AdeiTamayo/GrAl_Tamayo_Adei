import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import Button from '../components/Button';
import ErrorBanner from '../components/ErrorBanner';
import LoadingSkeleton from '../components/LoadingSkeleton';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import Select from '../components/Select';
import ConfirmModal from '../components/ConfirmModal';
import DeleteButton from '../components/DeleteButton';
import Input from '../components/Input';
import Textarea from '../components/Textarea';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import Badge from '../components/Badge';

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

type ViewMode = 'list' | 'details' | 'edit';

export default function Exercises() {
    const navigate = useNavigate();
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
    const [showCreateModal, setShowCreateModal] = useState(false);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState<string | null>(null);

    const [page, setPage] = useState(1);
    const [exercisesOpen, setExercisesOpen] = useState(true);
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

    }, [viewMode, selectedExercise]);

    // Reset create form when modal opens
    useEffect(() => {
        if (showCreateModal) {
            setSelectedSecondaryMuscles([]);
            setFormName('');
            setFormBodyPart('');
            setFormTarget('');
            setFormEquipment('');
            setFormCategory('');
            setFormDifficulty('beginner');
            setError('');
            setSuccess(null);
        }
    }, [showCreateModal]);

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
            setShowCreateModal(false);
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
        <div className="max-w-7xl mx-auto p-4 md:p-8 mt-4 md:mt-8 space-y-6 animate-in fade-in duration-200">
            <div className="flex justify-between items-center">
                <h1 className="font-display text-4xl font-bold tracking-tight uppercase italic text-accent">Exercises</h1>
                {viewMode === 'list' && (
                    <Button onClick={() => setShowCreateModal(true)} variant="primary">+ Create Exercise</Button>
                )}
            </div>

            {loading && <LoadingSkeleton type="card" count={3} />}
            {error && viewMode !== 'edit' && <ErrorBanner message={error} />}
            {success && <p className="text-sm font-semibold text-accent tracking-wide animate-in fade-in duration-300">{success}</p>}

            <div className="flex flex-col sm:flex-row gap-4">
                {viewMode === 'details' || viewMode === 'edit' ? (
                    <Button type="button" variant="secondary" onClick={backToList}>&larr; Back to List</Button>
                ) : (
                    <div className="flex gap-4 w-full flex-col sm:flex-row">
                        <Input
                            type="text" name="search" placeholder="Search exercises..." value={filters.search} onChange={handleFilterChange}
                            inputSize="lg" className="sm:w-1/5"
                        />
                        <Select
                            value={filters.muscles}
                            onChange={(val) => setFilters({ ...filters, muscles: val })}
                            placeholder="All Muscles"
                            options={[
                                { value: "", label: "All Muscles" },
                                ...filterOptions.muscles?.map(m => ({ value: m, label: m })) || []
                            ]}
                            className="flex-1"
                        />
                        <Select
                            value={filters.equipment}
                            onChange={(val) => setFilters({ ...filters, equipment: val })}
                            placeholder="All Equipment"
                            options={[
                                { value: "", label: "All Equipment" },
                                ...filterOptions.equipment?.map(e => ({ value: e, label: e })) || []
                            ]}
                            className="flex-1"
                        />
                        <Select
                            value={filters.categoryType}
                            onChange={(val) => setFilters({ ...filters, categoryType: val })}
                            placeholder="All Categories"
                            options={[
                                { value: "", label: "All Categories" },
                                ...filterOptions.categoryType?.map(c => ({ value: c, label: c })) || []
                            ]}
                            className="flex-1"
                        />
                    </div>
                )}
            </div>

            <div>
                {viewMode === 'details' && selectedExercise ? (
                    <Card variant="default" padding="lg" className="shadow-xl space-y-4">
                        <h2 className="font-display text-2xl font-bold text-body tracking-wide uppercase">{selectedExercise.name}</h2>
                        <div className="flex flex-wrap gap-4 text-muted mb-6 bg-surface/50 p-4 rounded-lg">
                            <span><strong>Body Part:</strong> {selectedExercise.bodyPart}</span>
                            <span><strong>Target:</strong> {selectedExercise.target}</span>
                            <span><strong>Equipment:</strong> {selectedExercise.equipment}</span>
                            <span><strong>Difficulty:</strong> {selectedExercise.difficulty}</span>
                            <span><strong>Category:</strong> {selectedExercise.category}</span>
                            <span><strong>Secondary Muscles:</strong> {selectedExercise.secondary_muscles?.join(', ') || 'None'}</span>
                        </div>

                        <h3 className="font-display text-lg font-bold text-heading tracking-wide uppercase">Description</h3>
                        <p className="text-muted whitespace-pre-wrap">{selectedExercise.description || 'No description available.'}</p>

                        <h3 className="font-display text-lg font-bold text-heading tracking-wide uppercase mt-6">Instructions</h3>
                        {selectedExercise.instructions && selectedExercise.instructions.length > 0 ? (
                            <ol className="list-decimal list-inside space-y-2 text-muted">
                                {selectedExercise.instructions.map((step, idx) => (<li key={idx}>{step}</li>))}
                            </ol>
                        ) : (
                            <p className="text-muted">No instructions available.</p>
                        )}

                        <div className="flex gap-4 mt-8 pt-4 border-t border-subtle">
                            <Button type="button" variant="secondary" onClick={() => {
                                if (selectedExercise) {
                                    setFormName(selectedExercise.name);
                                    setFormBodyPart(selectedExercise.bodyPart || '');
                                    setFormTarget(selectedExercise.target || '');
                                    setFormEquipment(selectedExercise.equipment || '');
                                    setFormCategory(selectedExercise.category || '');
                                    setFormDifficulty(selectedExercise.difficulty || 'beginner');
                                    setSelectedSecondaryMuscles(selectedExercise.secondary_muscles || []);
                                }
                                setViewMode('edit');
                            }}>Edit Exercise</Button>
                            <Button type="button" variant="primary" onClick={() => navigate(`/exercise-history?exerciseId=${selectedExercise.id}&exerciseName=${encodeURIComponent(selectedExercise.name)}`)}>View History</Button>
                            <DeleteButton onClick={() => setDeleteConfirmId(selectedExercise.id)} />
                        </div>
                    </Card>
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
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-bold text-muted uppercase tracking-wider">{filteredExercises.length} exercises</span>
                        </div>
                        {exercisesOpen && (
                            <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {paginatedExercises.length > 0 ? (
                                    paginatedExercises.map(ex => (
                                        <li
                                            key={ex.id}
                                            onClick={() => fetchExerciseById(ex.id)}
                                            className="bg-surface/40 border cursor-pointer border-subtle/80 rounded-xl p-5 flex flex-col justify-between gap-4 hover:border-accent/50 transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-accent/5 group"
                                        >
                                            <div>
                                                <div className="flex items-center justify-between">
                                                    <h2 className="font-display text-xl font-bold text-body mb-2 truncate">{ex.name}</h2>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); navigate(`/exercise-history?exerciseId=${ex.id}&exerciseName=${encodeURIComponent(ex.name)}`); }}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-dim hover:text-accent hover:bg-accent/10"
                                                        title="View exercise history"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                        </svg>
                                                    </button>
                                                </div>
                                                <div className="text-sm text-muted space-x-2">
                                                    <span className="inline-block bg-elevated px-2 py-1 rounded text-muted">{ex.target}</span>
                                                    <span className="inline-block bg-elevated px-2 py-1 rounded text-muted">{ex.equipment}</span>
                                                </div>
                                            </div>
                                        </li>
                                    ))
                                ) : (
                                    !loading && <p className="text-muted col-span-2">No exercises found.</p>
                                )}
                            </ul>
                        )}
                        <Pagination
                            page={page}
                            totalPages={Math.max(1, Math.ceil(filteredExercises.length / pageSize))}
                            onPageChange={setPage}
                        />
                    </>
                )}
            </div>

            <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} maxWidth="xl">
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
                    onCancel={() => setShowCreateModal(false)}
                />
            </Modal>

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
    const [showNewMuscle, setShowNewMuscle] = useState(false);
    const [showNewEquipment, setShowNewEquipment] = useState(false);
    const [showNewCategory, setShowNewCategory] = useState(false);
    const [showNewSecondary, setShowNewSecondary] = useState(false);
    return (
        <form onSubmit={(e) => onSubmit(e, ex?.id)} className="bg-card border border-subtle rounded-xl p-5 shadow-xl space-y-3">
            <h2 className="font-display text-base font-bold text-body tracking-wide uppercase mb-2">
                {isEdit ? 'Edit Exercise' : 'Create Custom Exercise'}
            </h2>

            {error && (
                <p className="text-xs font-semibold text-rose-500 tracking-wide animate-in fade-in duration-300">
                    {error}
                </p>
            )}

            <div>
                <label className="block text-[10px] font-bold text-dim uppercase tracking-widest mb-1">Exercise Name *</label>
                <Input
                    type="text"
                    name="name"
                    required
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    inputSize="sm"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <label className="block text-[10px] font-bold text-dim uppercase tracking-widest mb-1">Body Part</label>
                    <Input
                        type="text"
                        name="bodyPart"
                        value={formBodyPart}
                        onChange={e => setFormBodyPart(e.target.value)}
                        inputSize="sm"
                    />
                </div>

                <div>
                    <label className="block text-[10px] font-bold text-dim uppercase tracking-widest mb-1">Target Muscle *</label>
                    <Select
                        value={formTarget}
                        onChange={(val) => setFormTarget(val)}
                        placeholder="Select"
                        options={[
                            { value: "", label: "Select" },
                            ...filterOptions.muscles?.map(m => ({ value: m, label: m })) || []
                        ]}
                        className="[&>button]:text-xs [&>button]:py-1.5 [&>button]:px-2"
                    />
                    <input type="hidden" name="target_muscle" value={formTarget} />
                    <div className="mt-2">
                        {showNewMuscle ? (
                            <div className="relative">
                                <Input
                                    type="text"
                                    name="new_target_muscle"
                                    placeholder="Create new muscle..."
                                    inputSize="sm"
                                    className="pr-8"
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewMuscle(false)}
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-dim hover:text-accent transition-colors"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setShowNewMuscle(true)}
                                className="flex items-center gap-1.5 text-xs text-dim hover:text-accent transition-colors"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                                Create new muscle
                            </button>
                        )}
                    </div>
                </div>

                <div>
                    <label className="block text-[10px] font-bold text-dim uppercase tracking-widest mb-1">Equipment *</label>
                    <Select
                        value={formEquipment}
                        onChange={(val) => setFormEquipment(val)}
                        placeholder="Select"
                        options={[
                            { value: "", label: "Select" },
                            ...filterOptions.equipment?.map(e => ({ value: e, label: e })) || []
                        ]}
                        className="[&>button]:text-xs [&>button]:py-1.5 [&>button]:px-2"
                    />
                    <input type="hidden" name="equipment" value={formEquipment} />
                    <div className="mt-2">
                        {showNewEquipment ? (
                            <div className="relative">
                                <Input
                                    type="text"
                                    name="new_equipment"
                                    placeholder="Create new equipment..."
                                    inputSize="sm"
                                    className="pr-8"
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewEquipment(false)}
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-dim hover:text-accent transition-colors"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setShowNewEquipment(true)}
                                className="flex items-center gap-1.5 text-xs text-dim hover:text-accent transition-colors"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                                Create new equipment
                            </button>
                        )}
                    </div>
                </div>

                <div>
                    <label className="block text-[10px] font-bold text-dim uppercase tracking-widest mb-1">Category *</label>
                    <Select
                        value={formCategory}
                        onChange={(val) => setFormCategory(val)}
                        placeholder="Select"
                        options={[
                            { value: "", label: "Select" },
                            ...filterOptions.categoryType?.map(c => ({ value: c, label: c })) || []
                        ]}
                        className="[&>button]:text-xs [&>button]:py-1.5 [&>button]:px-2"
                    />
                    <input type="hidden" name="category" value={formCategory} />
                    <div className="mt-2">
                        {showNewCategory ? (
                            <div className="relative">
                                <Input
                                    type="text"
                                    name="new_category"
                                    placeholder="Create new category..."
                                    inputSize="sm"
                                    className="pr-8"
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewCategory(false)}
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-dim hover:text-accent transition-colors"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setShowNewCategory(true)}
                                className="flex items-center gap-1.5 text-xs text-dim hover:text-accent transition-colors"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                                Create new category
                            </button>
                        )}
                    </div>
                </div>

                <div>
                    <label className="block text-[10px] font-bold text-dim uppercase tracking-widest mb-1">Difficulty</label>
                    <Select
                        value={formDifficulty}
                        onChange={(val) => setFormDifficulty(val)}
                        placeholder="Select"
                        options={[
                            { value: "beginner", label: "Beginner" },
                            { value: "intermediate", label: "Intermediate" },
                            { value: "advanced", label: "Advanced" }
                        ]}
                        className="[&>button]:text-xs [&>button]:py-1.5 [&>button]:px-2"
                    />
                    <input type="hidden" name="difficulty" value={formDifficulty} />
                </div>

                <div>
                    <label className="block text-[10px] font-bold text-dim uppercase tracking-widest mb-1">Secondary Muscles</label>
                    <Select
                        value={formSecondaryPick}
                        onChange={(val) => {
                            if (val && !selectedSecondaryMuscles.includes(val)) {
                                setSelectedSecondaryMuscles(prev => [...prev, val]);
                            }
                            setFormSecondaryPick('');
                        }}
                        placeholder="Select"
                        options={[
                            { value: "", label: "Select" },
                            ...filterOptions.muscles?.map(m => ({ value: m, label: m })) || []
                        ]}
                        className="[&>button]:text-xs [&>button]:py-1.5 [&>button]:px-2"
                    />
                    <div className="mt-2">
                        {showNewSecondary ? (
                            <div className="relative">
                                <Input
                                    type="text"
                                    placeholder="Create new secondary muscle..."
                                    inputSize="sm"
                                    className="pr-8"
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
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewSecondary(false)}
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-dim hover:text-accent transition-colors"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setShowNewSecondary(true)}
                                className="flex items-center gap-1.5 text-xs text-dim hover:text-accent transition-colors"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                                Create new secondary muscle
                            </button>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {selectedSecondaryMuscles.map(muscle => (
                            <Badge key={muscle} variant="default" removable onRemove={() => setSelectedSecondaryMuscles(prev => prev.filter(m => m !== muscle))}>
                                {muscle}
                                <input type="hidden" name="secondary_muscles" value={muscle} />
                            </Badge>
                        ))}
                    </div>
                </div>
            </div>

            <div>
                <label className="block text-[10px] font-bold text-dim uppercase tracking-widest mb-1">Description</label>
                <Textarea
                    name="description"
                    defaultValue={ex?.description || ''}
                    rows={3}
                    inputSize="sm"
                />
            </div>

            <div>
                <label className="block text-[10px] font-bold text-dim uppercase tracking-widest mb-1">Instructions (one per line) *</label>
                <Textarea
                    name="instructions"
                    defaultValue={ex?.instructions?.join('\n') || ''}
                    rows={4}
                    inputSize="sm"
                    className="overflow-y-auto"
                />
            </div>

            <div className="flex gap-2 pt-1">
                <Button type="button" variant="secondary" fullWidth onClick={onCancel} className="text-xs py-2">
                    Cancel
                </Button>
                <Button type="submit" variant="primary" fullWidth disabled={saving} className="text-xs py-2">
                    {saving ? 'Saving...' : isEdit ? 'Update Exercise' : 'Save Custom Exercise'}
                </Button>
            </div>
        </form>
    );
}