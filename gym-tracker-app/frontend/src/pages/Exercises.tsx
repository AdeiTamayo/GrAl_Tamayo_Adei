import React, { useEffect, useState } from 'react';

type Exercise = {
    id: number;
    name: string;
    body_part?: string;
    bodyPart?: string;
    target_muscle?: string;
    target?: string;
    equipment: string;
    difficulty: string;
    category: string;
    secondary_muscles?: string[];
    is_custom?: boolean;
    description?: string;
    instructions?: string[];
};

type FilterOptions = {
    equipment: string[];
    muscles: string[];
    categoryType: string[];
};

export default function Exercises() {
    const [allExercises, setAllExercises] = useState<Exercise[]>([]);
    const [exercises, setExercises] = useState<Exercise[]>([]);

    const [filterOptions, setFilterOptions] = useState<FilterOptions>({ equipment: [], muscles: [], categoryType: [] });
    const [selectedFilters, setSelectedFilters] = useState({ search: "", equipment: "", muscles: "", categoryType: "" });

    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(false);
    const [Creating, setCreating] = useState(false);
    const [showExeciseById, setshowExeciseById] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        const loadInitialData = async () => {
            const filters = await getFilterOptions();
            if (filters) setFilterOptions(filters);

            const fetchedExercises = await getExercise();
            if (fetchedExercises) {
                setAllExercises(fetchedExercises);
                setExercises(fetchedExercises);
            }
        };
        loadInitialData();
    }, []);

    useEffect(() => {
        let filtered = allExercises;

        if (selectedFilters.search) {
            const query = selectedFilters.search.toLowerCase();
            filtered = filtered.filter(ex => ex.name.toLowerCase().includes(query));
        }
        if (selectedFilters.equipment) {
            filtered = filtered.filter(ex => ex.equipment === selectedFilters.equipment);
        }
        if (selectedFilters.muscles) {
            filtered = filtered.filter(ex => (ex.target_muscle || ex.target) === selectedFilters.muscles);
        }
        if (selectedFilters.categoryType) {
            filtered = filtered.filter(ex => ex.category === selectedFilters.categoryType);
        }

        setExercises(filtered);
    }, [selectedFilters, allExercises]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        setSelectedFilters({
            ...selectedFilters,
            [e.target.name]: e.target.value
        });
    };

    async function getFilterOptions() {
        try {
            const response = await fetch("http://localhost:8000/api/exercises/filters", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("user_login_token")}`
                },
            });
            if (!response.ok) return null;
            const result = await response.json();
            return result.success ? result.data : null;
        } catch (err) {
            return null;
        }
    }

    async function getExercise() {
        try {
            setLoading(true);
            setError("");
            const response = await fetch("http://localhost:8000/api/exercises", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("user_login_token")}`
                },
            });
            if (!response.ok) throw new Error("Failed to fetch exercise");
            const result = await response.json();
            return result.success ? result.data : [];
        } catch (err: any) {
            setError(err.message || "Could not load data.");
            return [];
        } finally {
            setLoading(false);
        }
    }

    async function getExerciseById(id: number) {
        try {
            setLoading(true);
            setError("");
            const response = await fetch("http://localhost:8000/api/exercises/" + id, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("user_login_token")}`
                },
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

    async function removeExeciseById(id: number) {
        try {
            setLoading(true);
            setError("");
            const response = await fetch("http://localhost:8000/api/exercises/" + id, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("user_login_token")}`
                },
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error || "Unknown error");

            const fetchedExercises = await getExercise();
            setAllExercises(fetchedExercises);
            BackToList();
            setSuccess("Exercise deleted.");
        } catch (err: any) {
            setError(err.message || "Could not delete data.");
        } finally {
            setLoading(false);
        }
    }

    async function createExercise(newExerciseData: any) {
        setSaving(true);
        setError("");
        setSuccess(null);
        try {
            const response = await fetch("http://localhost:8000/api/exercises", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("user_login_token")}`
                },
                body: JSON.stringify(newExerciseData),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Failed to create");

            setCreating(false);
            setSuccess("Exercise created successfully.");

            const refreshedData = await getExercise();
            setAllExercises(refreshedData);
        } catch (error: any) {
            setError("Could not create exercise. " + error.message);
        } finally {
            setSaving(false);
        }
    }

    async function modifyExercise(id: number, updatedExerciseData: any) {
        setSaving(true);
        setError("");
        setSuccess(null);
        try {
            const response = await fetch("http://localhost:8000/api/exercises/" + id, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("user_login_token")}`
                },
                body: JSON.stringify(updatedExerciseData),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Failed to save");

            setEditing(false);
            setSuccess("Exercise updated successfully.");

            // Refresh detailed view
            FetchExercisesById(id);
            // Refresh background list silently
            getExercise().then(setAllExercises);

        } catch (error: any) {
            setError("Could not save changes. " + error.message);
        } finally {
            setSaving(false);
        }
    }

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>, id?: number) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        const payload = {
            exercice_name: formData.get("name"),
            body_part: formData.get("body_part"),
            target_muscle: formData.get("target_muscle"),
            equipment: formData.get("equipment"),
            difficulty: formData.get("difficulty"),
            category: formData.get("category"),
            secondary_muscles: formData.get("secondary_muscles")?.toString().split(',').map(s => s.trim()).filter(Boolean),
            description: formData.get("description"),
            instructions: formData.get("instructions")?.toString().split('\n').map(s => s.trim()).filter(Boolean)
        };

        if (id) {
            modifyExercise(id, payload);
        } else {
            createExercise(payload);
        }
    };

    const BackToList = () => {
        setExercises(allExercises);
        setshowExeciseById(false);
        setEditing(false);
        setCreating(false);
        setError("");
        setSuccess(null);
    };

    const FetchExercisesById = async (id: number) => {
        const data = await getExerciseById(id);
        if (data) {
            setExercises([data]);
            setshowExeciseById(true);
            setSuccess(null);
            setError("");
        }
    };

    const ExerciseForm = ({ ex, isEdit }: { ex?: Exercise, isEdit: boolean }) => (
        <form onSubmit={(e) => handleFormSubmit(e, ex?.id)} className="bg-white p-4 border rounded shadow-sm">
            <h2 className="text-2xl font-bold mb-4">{isEdit ? 'Edit Exercise' : 'Create Custom Exercise'}</h2>

            <div className="mb-4">
                <label className="block text-sm font-bold mb-1">Exercise Name *</label>
                <input type="text" name="name" className="w-full p-2 border rounded" defaultValue={ex?.name || ""} required />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                    <label className="block font-bold mb-1">Body Part</label>
                    <input type="text" name="body_part" className="w-full p-2 border rounded" defaultValue={ex?.bodyPart || ""} />
                </div>
                <div>
                    <label className="block font-bold mb-1">Target Muscle</label>
                    <select name="target_muscle" className="w-full p-2 border rounded" defaultValue={ex?.target || ""}>
                        <option value="">Select Target</option>
                        {filterOptions.muscles?.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block font-bold mb-1">Equipment</label>
                    <select name="equipment" className="w-full p-2 border rounded" defaultValue={ex?.equipment || ""}>
                        <option value="">Select Equipment</option>
                        {filterOptions.equipment?.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block font-bold mb-1">Difficulty</label>
                    <select name="difficulty" className="w-full p-2 border rounded" defaultValue={ex?.difficulty || "beginner"}>
                        <option value="beginner">beginner</option>
                        <option value="intermediate">intermediate</option>
                        <option value="advanced">advanced</option>
                    </select>
                </div>
                <div>
                    <label className="block font-bold mb-1">Category</label>
                    <select name="category" className="w-full p-2 border rounded" defaultValue={ex?.category || ""}>
                        <option value="">Select Category</option>
                        {filterOptions.categoryType?.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block font-bold mb-1">Secondary Muscles (comma separated)</label>
                    <input type="text" name="secondary_muscles" className="w-full p-2 border rounded" defaultValue={(ex?.secondary_muscles)?.join(', ') || ""} />
                </div>
            </div>

            <div className="mb-4">
                <label className="block font-bold mb-1">Description</label>
                <textarea name="description" className="w-full p-2 border rounded" rows={3} defaultValue={ex?.description || ""}></textarea>
            </div>

            <div className="mb-6">
                <label className="block font-bold mb-1">Instructions (one step per line)</label>
                <textarea name="instructions" className="w-full p-2 border rounded" rows={5} defaultValue={ex?.instructions?.join('\n') || ""}></textarea>
            </div>

            <div className="flex gap-2">
                <button type="submit" disabled={saving} className="p-2 border rounded font-semibold text-white hover:underline">
                    {saving ? 'Saving...' : 'Save Exercise'}
                </button>
                <button type="button" className="p-2 border rounded bg-gray-100 hover:underline" onClick={() => isEdit ? setEditing(false) : BackToList()}>
                    Cancel
                </button>
            </div>
        </form>
    );

    return (
        <div>
            <div className="flex justify-between items-center p-6">
                <h1 className='font-bold text-2xl'>Exercises</h1>
                {!showExeciseById && !Creating && (
                    <button onClick={() => setCreating(true)} className="p-2 rounded hover:underline">
                        + Create Custom Exercise
                    </button>
                )}
            </div>

            {/* Messages */}
            {loading && <p className="px-6 pb-2 ">Loading...</p>}
            {error && <p className="px-6 pb-2">{error}</p>}
            {success && <p className="px-6 pb-2 ">{success}</p>}

            {/* Controls / Filter Bar */}
            {!Creating && (
                <div className="px-6 mb-4">
                    {showExeciseById ? (
                        <button type="button" className="p-2 rounded border hover:underline" onClick={BackToList}>&larr; Back to List</button>
                    ) : (
                        <div className="flex flex-wrap gap-4 p-4 border rounded">
                            <input type="text" name="search" placeholder="Search exercises..." value={selectedFilters.search} onChange={handleFilterChange} className="p-2 border rounded" />

                            <select name="muscles" value={selectedFilters.muscles} onChange={handleFilterChange} className="p-2 border rounded">
                                <option value="">All Muscles</option>
                                {filterOptions.muscles?.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>

                            <select name="equipment" value={selectedFilters.equipment} onChange={handleFilterChange} className="p-2 border rounded">
                                <option value="">All Equipment</option>
                                {filterOptions.equipment?.map(e => <option key={e} value={e}>{e}</option>)}
                            </select>

                            <select name="categoryType" value={selectedFilters.categoryType} onChange={handleFilterChange} className="p-2 border rounded">
                                <option value="">All Categories</option>
                                {filterOptions.categoryType?.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    )}
                </div>
            )}

            {/* Main Content Area */}
            <div className="px-6">
                {Creating ? (
                    <ExerciseForm isEdit={false} />
                ) : (
                    <ul>
                        {exercises.length > 0 ? (
                            exercises.map((ex: Exercise) => (
                                <li key={ex.id || ex.name} className="my-4 p-4 border rounded">

                                    {/* LIST VIEW */}
                                    {!showExeciseById && (
                                        <div>
                                            <h2 className="text-xl font-bold cursor-pointer hover:underline" onClick={() => FetchExercisesById(ex.id)}>
                                                {ex.name}
                                            </h2>
                                            <div className="text-sm mt-2 text-gray-600">
                                                <strong>Target:</strong> {ex.target_muscle || ex.target} &bull;
                                                <strong> Equipment:</strong> {ex.equipment} &bull;
                                                <strong> Category:</strong> {ex.category}
                                            </div>
                                        </div>
                                    )}

                                    {/* DETAILED VIEW */}
                                    {showExeciseById && !editing && (
                                        <div>
                                            <h2 className="text-2xl font-bold mb-4 capitalize">{ex.name}</h2>

                                            <div className="grid grid-cols-2 gap-2 text-sm border p-4 rounded mb-4">
                                                <span><strong>Body Part:</strong> {ex.body_part || ex.bodyPart}</span>
                                                <span><strong>Target:</strong> {ex.target_muscle || ex.target}</span>
                                                <span><strong>Equipment:</strong> {ex.equipment}</span>
                                                <span><strong>Difficulty:</strong> {ex.difficulty}</span>
                                                <span><strong>Category:</strong> {ex.category}</span>
                                                <span><strong>Custom:</strong> {ex.is_custom ? 'Yes' : 'No'}</span>
                                                <span className="col-span-2"><strong>Secondary Muscles:</strong> {(ex.secondary_muscles)?.join(', ') || 'None'}</span>
                                            </div>

                                            <h3 className="font-semibold text-lg border-b pb-1 mb-2">Description</h3>
                                            <p className="mb-4">{ex.description || "No description available."}</p>

                                            <h3 className="font-semibold text-lg border-b pb-1 mb-2">Instructions</h3>
                                            {ex.instructions && ex.instructions.length > 0 ? (
                                                <ol className="list-decimal pl-5 space-y-2 mt-2 mb-6">
                                                    {ex.instructions.map((step, index) => (
                                                        <li key={index}>{step}</li>
                                                    ))}
                                                </ol>
                                            ) : (
                                                <p className="mb-6 text-gray-500">No instructions available.</p>
                                            )}

                                            <div className="flex gap-2 border-t pt-4">
                                                <button type="button" className="px-4 py-2 border rounded font-semibold hover:underline" onClick={() => setEditing(true)}>
                                                    Edit
                                                </button>
                                                <button type="button" className="px-4 py-2 border rounded font-semibold hover:underline" onClick={() => removeExeciseById(ex.id)}>
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* EDIT VIEW */}
                                    {showExeciseById && editing && (
                                        <ExerciseForm ex={ex} isEdit={true} />
                                    )}
                                </li>
                            ))
                        ) : (
                            !loading && <p className="py-4">No exercises found.</p>
                        )}
                    </ul>
                )}
            </div>
        </div>
    );
}