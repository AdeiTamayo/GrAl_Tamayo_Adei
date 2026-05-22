import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../utils/api';

type Exercise = {
    id: number;
    name: string;
    body_part?: string;
    target_muscle?: string;
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

    const [viewMode, setViewMode] = useState<ViewMode>('list');

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState<string | null>(null);

    const headers = useMemo(() => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('user_login_token')} `
    }), []);

    const filteredExercises = useMemo(() => {
        return allExercises.filter(ex => {
            const matchesSearch =
                !filters.search ||
                ex.name.toLowerCase().includes(filters.search.toLowerCase());

            const matchesEquipment =
                !filters.equipment ||
                ex.equipment === filters.equipment;

            const matchesMuscle =
                !filters.muscles ||
                ex.target_muscle === filters.muscles;

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
    }, [allExercises, filters]);

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (viewMode === 'edit' && selectedExercise?.secondary_muscles) {
            setSelectedSecondaryMuscles(selectedExercise.secondary_muscles);
        }

        if (viewMode === 'create') {
            setSelectedSecondaryMuscles([]);
        }
    }, [viewMode, selectedExercise]);

    async function apiRequest<T>(
        url: string,
        options: RequestInit
    ): Promise<T> {
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

    async function getExerciseById(id: number) {
        try {
            setLoading(true);
            setError("");
            const response = await apiFetch("/api/exercises/" + id, {
                method: "GET",
                headers
            });
            if (!response.ok) throw new Error("Failed to fetch exercise");
            const result = await response.json();
            return result.success ? result.data : null;
        } catch (err: any) {
            setError(err.message || "Could not load data.");
            return null;
        } finally {
            setLoading(false);
        }
    }

    async function fetchExerciseById(id: number) {
        try {
            setLoading(true);
            setError('');

            const data = await getExerciseById(id);

            setSelectedExercise(data);
            setViewMode('details');
            setSuccess(null);
        } catch (err: any) {
            setError(err.message || 'Could not load exercise.');
        } finally {
            setLoading(false);
        }
    }

    async function deleteExerciseById(id: number) {
        const confirmed = window.confirm('Delete exercise?');

        if (!confirmed) return;

        try {
            setLoading(true);
            setError('');

            // Use original working approach for DELETE
            const response = await apiFetch(`/api/exercises/${id}`, {
                method: 'DELETE',
                headers
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Unknown error');
            }

            // refresh list
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

            const updatedExercise = await apiRequest<Exercise>(`/ api / exercises / ${id} `, {
                method: 'PUT',
                headers,
                body: JSON.stringify(payload)
            });

            setAllExercises(prev =>
                prev.map(ex =>
                    ex.id === id ? updatedExercise : ex
                )
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
        e: React.FormEvent<HTMLFormElement>,
        id?: number
    ) => {
        e.preventDefault();

        const formData = new FormData(e.currentTarget);

        const newEquipment = formData
            .get('new_equipment')
            ?.toString()
            .trim();

        const equipment =
            newEquipment || formData.get('equipment')?.toString();

        const newCategory = formData
            .get('new_category')
            ?.toString()
            .trim();

        const category =
            newCategory || formData.get('category')?.toString();

        const newTargetMuscle = formData
            .get('new_target_muscle')
            ?.toString()
            .trim();

        const targetMuscle =
            newTargetMuscle || formData.get('target_muscle');

        const secondaryMuscles = formData.getAll(
            'secondary_muscles'
        ) as string[];

        const payload: ExercisePayload = {
            exercice_name: formData.get('name')?.toString().trim(),
            body_part: formData.get('body_part')?.toString().trim(),
            target_muscle: targetMuscle?.toString().trim(),
            equipment: equipment?.trim(),
            difficulty: formData.get('difficulty')?.toString(),
            category: category?.trim(),
            secondary_muscles: secondaryMuscles.filter(Boolean),
            description: formData.get('description')?.toString().trim(),
            instructions:
                formData
                    .get('instructions')
                    ?.toString()
                    .split('\\n')
                    .map(s => s.trim())
                    .filter(Boolean) || []
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

    const ExerciseForm = ({
        ex,
        isEdit
    }: {
        ex?: Exercise;
        isEdit: boolean;
    }) => (
        <form
            onSubmit={(e) => handleFormSubmit(e, ex?.id)}
            style={{
                border: '1px solid',
                padding: '20px',
                marginBottom: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '15px'
            }}
        >
            <h2 style={{ margin: '0 0 10px 0' }}>
                {isEdit ? 'Edit Exercise' : 'Create Custom Exercise'}
            </h2>

            <div>
                <label
                    style={{
                        display: 'block',
                        marginBottom: '5px',
                        fontWeight: 'bold'
                    }}
                >
                    Exercise Name *
                </label>
                <input
                    type="text"
                    name="name"
                    style={{
                        width: '100%',
                        padding: '8px',
                        boxSizing: 'border-box',
                        border: '1px solid'
                    }}
                    defaultValue={ex?.name || ''}
                    required
                />
            </div>

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '15px'
                }}
            >
                <div>
                    <label
                        style={{
                            display: 'block',
                            marginBottom: '5px',
                            fontWeight: 'bold'
                        }}
                    >
                        Body Part
                    </label>
                    <input
                        type="text"
                        name="body_part"
                        style={{
                            width: '100%',
                            padding: '8px',
                            boxSizing: 'border-box',
                            border: '1px solid'
                        }}
                        defaultValue={ex?.body_part || ''}
                    />
                </div>

                <div>
                    <label
                        style={{
                            display: 'block',
                            marginBottom: '5px',
                            fontWeight: 'bold'
                        }}
                    >
                        Target Muscle
                    </label>

                    <select
                        name="target_muscle"
                        style={{
                            width: '100%',
                            padding: '8px',
                            boxSizing: 'border-box',
                            border: '1px solid',
                            marginBottom: '5px'
                        }}
                        defaultValue={ex?.target_muscle || ''}
                    >
                        <option value="">Select Target</option>
                        {filterOptions.muscles?.map(m => (
                            <option key={m} value={m}>
                                {m}
                            </option>
                        ))}
                    </select>

                    <input
                        type="text"
                        name="new_target_muscle"
                        placeholder="Or add new muscle..."
                        style={{
                            width: '100%',
                            padding: '8px',
                            boxSizing: 'border-box',
                            border: '1px solid'
                        }}
                    />
                </div>

                <div>
                    <label
                        style={{
                            display: 'block',
                            marginBottom: '5px',
                            fontWeight: 'bold'
                        }}
                    >
                        Equipment
                    </label>

                    <select
                        name="equipment"
                        style={{
                            width: '100%',
                            padding: '8px',
                            boxSizing: 'border-box',
                            border: '1px solid',
                            marginBottom: '5px'
                        }}
                        defaultValue={ex?.equipment || ''}
                    >
                        <option value="">Select Equipment</option>
                        {filterOptions.equipment?.map(e => (
                            <option key={e} value={e}>
                                {e}
                            </option>
                        ))}
                    </select>

                    <input
                        type="text"
                        name="new_equipment"
                        placeholder="Or add new equipment..."
                        style={{
                            width: '100%',
                            padding: '8px',
                            boxSizing: 'border-box',
                            border: '1px solid'
                        }}
                    />
                </div>

                <div>
                    <label
                        style={{
                            display: 'block',
                            marginBottom: '5px',
                            fontWeight: 'bold'
                        }}
                    >
                        Difficulty
                    </label>

                    <select
                        name="difficulty"
                        style={{
                            width: '100%',
                            padding: '8px',
                            boxSizing: 'border-box',
                            border: '1px solid'
                        }}
                        defaultValue={ex?.difficulty || 'beginner'}
                    >
                        <option value="beginner">beginner</option>
                        <option value="intermediate">intermediate</option>
                        <option value="advanced">advanced</option>
                    </select>
                </div>

                <div>
                    <label
                        style={{
                            display: 'block',
                            marginBottom: '5px',
                            fontWeight: 'bold'
                        }}
                    >
                        Category
                    </label>

                    <select
                        name="category"
                        style={{
                            width: '100%',
                            padding: '8px',
                            boxSizing: 'border-box',
                            border: '1px solid',
                            marginBottom: '5px'
                        }}
                        defaultValue={ex?.category || ''}
                    >
                        <option value="">Select Category</option>
                        {filterOptions.categoryType?.map(c => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                    </select>

                    <input
                        type="text"
                        name="new_category"
                        placeholder="Or add new category..."
                        style={{
                            width: '100%',
                            padding: '8px',
                            boxSizing: 'border-box',
                            border: '1px solid'
                        }}
                    />
                </div>

                <div>
                    <label
                        style={{
                            display: 'block',
                            marginBottom: '5px',
                            fontWeight: 'bold'
                        }}
                    >
                        Secondary Muscles
                    </label>

                    <select
                        onChange={(e) => {
                            const value = e.target.value;

                            if (
                                value &&
                                !selectedSecondaryMuscles.includes(value)
                            ) {
                                setSelectedSecondaryMuscles(prev => [
                                    ...prev,
                                    value
                                ]);
                            }

                            e.target.value = '';
                        }}
                        style={{
                            width: '100%',
                            padding: '8px',
                            boxSizing: 'border-box',
                            border: '1px solid',
                            marginBottom: '5px'
                        }}
                        defaultValue=""
                    >
                        <option value="">Select Secondary Muscle</option>

                        {filterOptions.muscles?.map(m => (
                            <option
                                key={`sec - ${m} `}
                                value={m}
                                disabled={selectedSecondaryMuscles.includes(m)}
                            >
                                {m}
                            </option>
                        ))}
                    </select>

                    <input
                        type="text"
                        placeholder="Or add new secondary muscle..."
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();

                                const value = e.currentTarget.value.trim();

                                if (
                                    value &&
                                    !selectedSecondaryMuscles.includes(value)
                                ) {
                                    setSelectedSecondaryMuscles(prev => [
                                        ...prev,
                                        value
                                    ]);
                                }

                                e.currentTarget.value = '';
                            }
                        }}
                        style={{
                            width: '100%',
                            padding: '8px',
                            boxSizing: 'border-box',
                            border: '1px solid',
                            marginBottom: '10px'
                        }}
                    />

                    <div
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '8px'
                        }}
                    >
                        {selectedSecondaryMuscles.map(muscle => (
                            <div
                                key={muscle}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    border: '1px solid',
                                    padding: '5px 10px',
                                    fontSize: '0.9em'
                                }}
                            >
                                <span>{muscle}</span>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setSelectedSecondaryMuscles(prev =>
                                            prev.filter(m => m !== muscle)
                                        )
                                    }
                                    style={{
                                        border: 'none',
                                        background: 'none',
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                        padding: 0
                                    }}
                                >
                                    ×
                                </button>

                                <input
                                    type="hidden"
                                    name="secondary_muscles"
                                    value={muscle}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div>
                <label
                    style={{
                        display: 'block',
                        marginBottom: '5px',
                        fontWeight: 'bold'
                    }}
                >
                    Description
                </label>

                <textarea
                    name="description"
                    style={{
                        width: '100%',
                        padding: '8px',
                        boxSizing: 'border-box',
                        border: '1px solid'
                    }}
                    rows={3}
                    defaultValue={ex?.description || ''}
                ></textarea>
            </div>

            <div>
                <label
                    style={{
                        display: 'block',
                        marginBottom: '5px',
                        fontWeight: 'bold'
                    }}
                >
                    Instructions (one step per line)
                </label>

                <textarea
                    name="instructions"
                    style={{
                        width: '100%',
                        padding: '8px',
                        boxSizing: 'border-box',
                        border: '1px solid'
                    }}
                    rows={5}
                    defaultValue={ex?.instructions?.join('\n') || ''}
                ></textarea>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
                <button
                    type="submit"
                    disabled={saving}
                    style={{
                        padding: '10px',
                        border: '1px solid',
                        background: 'none',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    {saving ? 'Saving...' : 'Save Exercise'}
                </button>

                <button
                    type="button"
                    style={{
                        padding: '10px',
                        border: '1px solid',
                        background: 'none',
                        cursor: 'pointer'
                    }}
                    onClick={() =>
                        isEdit
                            ? setViewMode('details')
                            : backToList()
                    }
                >
                    Cancel
                </button>
            </div>
        </form>
    );

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px'
                }}
            >
                <h1 style={{ margin: 0 }}>Exercises</h1>

                {viewMode === 'list' && (
                    <button
                        onClick={() => setViewMode('create')}
                        style={{
                            padding: '10px',
                            border: '1px solid',
                            background: 'none',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        + Create Custom Exercise
                    </button>
                )}
            </div>

            {loading && (
                <p style={{ fontWeight: 'bold' }}>
                    Loading...
                </p>
            )}

            {error && (
                <p style={{ fontWeight: 'bold' }}>
                    {error}
                </p>
            )}

            {success && (
                <p style={{ fontWeight: 'bold' }}>
                    {success}
                </p>
            )}

            {viewMode !== 'create' && (
                <div style={{ marginBottom: '20px' }}>
                    {viewMode === 'details' || viewMode === 'edit' ? (
                        <button
                            type="button"
                            style={{
                                padding: '8px 12px',
                                border: '1px solid',
                                background: 'none',
                                cursor: 'pointer'
                            }}
                            onClick={backToList}
                        >
                            &larr; Back to List
                        </button>
                    ) : (
                        <div
                            style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '15px',
                                padding: '15px',
                                border: '1px solid'
                            }}
                        >
                            <input
                                type="text"
                                name="search"
                                placeholder="Search exercises..."
                                value={filters.search}
                                onChange={handleFilterChange}
                                style={{
                                    padding: '8px',
                                    border: '1px solid',
                                    flex: 1,
                                    minWidth: '200px'
                                }}
                            />

                            <select
                                name="muscles"
                                value={filters.muscles}
                                onChange={handleFilterChange}
                                style={{
                                    padding: '8px',
                                    border: '1px solid'
                                }}
                            >
                                <option value="">All Muscles</option>

                                {filterOptions.muscles?.map(m => (
                                    <option key={m} value={m}>
                                        {m}
                                    </option>
                                ))}
                            </select>

                            <select
                                name="equipment"
                                value={filters.equipment}
                                onChange={handleFilterChange}
                                style={{
                                    padding: '8px',
                                    border: '1px solid'
                                }}
                            >
                                <option value="">All Equipment</option>

                                {filterOptions.equipment?.map(e => (
                                    <option key={e} value={e}>
                                        {e}
                                    </option>
                                ))}
                            </select>

                            <select
                                name="categoryType"
                                value={filters.categoryType}
                                onChange={handleFilterChange}
                                style={{
                                    padding: '8px',
                                    border: '1px solid'
                                }}
                            >
                                <option value="">All Categories</option>

                                {filterOptions.categoryType?.map(c => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            )}

            <div>
                {viewMode === 'create' ? (
                    <ExerciseForm isEdit={false} />
                ) : viewMode === 'details' && selectedExercise ? (
                    <div
                        style={{
                            border: '1px solid',
                            padding: '20px',
                            marginBottom: '15px'
                        }}
                    >
                        <h2
                            style={{
                                margin: '0 0 20px 0',
                                textTransform: 'capitalize'
                            }}
                        >
                            {selectedExercise.name}
                        </h2>

                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '10px',
                                border: '1px solid',
                                padding: '15px',
                                marginBottom: '20px'
                            }}
                        >
                            <span>
                                <strong>Body Part:</strong>{' '}
                                {selectedExercise.body_part}
                            </span>

                            <span>
                                <strong>Target:</strong>{' '}
                                {selectedExercise.target_muscle}
                            </span>

                            <span>
                                <strong>Equipment:</strong>{' '}
                                {selectedExercise.equipment}
                            </span>

                            <span>
                                <strong>Difficulty:</strong>{' '}
                                {selectedExercise.difficulty}
                            </span>

                            <span>
                                <strong>Category:</strong>{' '}
                                {selectedExercise.category}
                            </span>

                            <span>
                                <strong>Custom:</strong>{' '}
                                {selectedExercise.is_custom ? 'Yes' : 'No'}
                            </span>

                            <span style={{ gridColumn: 'span 2' }}>
                                <strong>Secondary Muscles:</strong>{' '}
                                {selectedExercise.secondary_muscles?.join(', ') || 'None'}
                            </span>
                        </div>

                        <h3
                            style={{
                                borderBottom: '1px solid',
                                paddingBottom: '5px',
                                marginBottom: '10px'
                            }}
                        >
                            Description
                        </h3>

                        <p style={{ marginBottom: '20px' }}>
                            {selectedExercise.description ||
                                'No description available.'}
                        </p>

                        <h3
                            style={{
                                borderBottom: '1px solid',
                                paddingBottom: '5px',
                                marginBottom: '10px'
                            }}
                        >
                            Instructions
                        </h3>

                        {selectedExercise.instructions &&
                            selectedExercise.instructions.length > 0 ? (
                            <ol
                                style={{
                                    paddingLeft: '20px',
                                    marginBottom: '20px'
                                }}
                            >
                                {selectedExercise.instructions.map(
                                    (step, index) => (
                                        <li
                                            key={index}
                                            style={{ marginBottom: '5px' }}
                                        >
                                            {step}
                                        </li>
                                    )
                                )}
                            </ol>
                        ) : (
                            <p
                                style={{
                                    marginBottom: '20px',
                                    fontStyle: 'italic'
                                }}
                            >
                                No instructions available.
                            </p>
                        )}

                        <div
                            style={{
                                display: 'flex',
                                gap: '10px',
                                borderTop: '1px solid',
                                paddingTop: '15px'
                            }}
                        >
                            <button
                                type="button"
                                style={{
                                    padding: '8px 15px',
                                    border: '1px solid',
                                    background: 'none',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                                onClick={() => setViewMode('edit')}
                            >
                                Edit
                            </button>

                            <button
                                type="button"
                                style={{
                                    padding: '8px 15px',
                                    border: '1px solid',
                                    background: 'none',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                                onClick={() =>
                                    deleteExerciseById(selectedExercise.id)
                                }
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ) : viewMode === 'edit' && selectedExercise ? (
                    <ExerciseForm
                        ex={selectedExercise}
                        isEdit={true}
                    />
                ) : (
                    <ul
                        style={{
                            listStyleType: 'none',
                            padding: 0,
                            margin: 0
                        }}
                    >
                        {filteredExercises.length > 0 ? (
                            filteredExercises.map(ex => (
                                <li
                                    key={ex.id}
                                    style={{
                                        border: '1px solid',
                                        padding: '20px',
                                        marginBottom: '15px'
                                    }}
                                >
                                    <div>
                                        <h2
                                            style={{
                                                margin: '0 0 10px 0',
                                                cursor: 'pointer',
                                                textDecoration: 'underline'
                                            }}
                                            onClick={() =>
                                                fetchExerciseById(ex.id)
                                            }
                                        >
                                            {ex.name}
                                        </h2>

                                        <div style={{ fontSize: '0.9em' }}>
                                            <strong>Target:</strong>{' '}
                                            {ex.target_muscle} &bull;
                                            <strong> Equipment:</strong>{' '}
                                            {ex.equipment} &bull;
                                            <strong> Category:</strong>{' '}
                                            {ex.category}
                                        </div>
                                    </div>
                                </li>
                            ))
                        ) : (
                            !loading && (
                                <p style={{ padding: '20px 0' }}>
                                    No exercises found.
                                </p>
                            )
                        )}
                    </ul>
                )}
            </div>
        </div>
    );
}
