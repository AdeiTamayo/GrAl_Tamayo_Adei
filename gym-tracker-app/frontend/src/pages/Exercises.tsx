import React, { useEffect, useState, useMemo } from 'react';
import { apiFetch } from '../utils/api';

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

    const headers = useMemo(() => ({
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("user_login_token")}`
    }), []);

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
            const response = await apiFetch("/api/exercises/filters", {
                method: "GET",
                headers
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
            const response = await apiFetch("/api/exercises", {
                method: "GET",
                headers
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

    async function removeExeciseById(id: number) {
        try {
            setLoading(true);
            setError("");
            const response = await apiFetch("/api/exercises/" + id, {
                method: "DELETE",
                headers
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
            const response = await apiFetch("/api/exercises", {
                method: "POST",
                headers,
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
            const response = await apiFetch("/api/exercises/" + id, {
                method: "PUT",
                headers,
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

        const newEquipment = formData.get("new_equipment")?.toString().trim();
        const equipment = newEquipment || formData.get("equipment")?.toString();

        const newCategory = formData.get("new_category")?.toString().trim();
        const category = newCategory || formData.get("category")?.toString();

        const secondaryMuscles = formData.getAll("secondary_muscles") as string[];

        const payload = {
            exercice_name: formData.get("name"),
            body_part: formData.get("body_part"),
            target_muscle: formData.get("target_muscle"),
            equipment: equipment,
            difficulty: formData.get("difficulty"),
            category: category,
            secondary_muscles: secondaryMuscles.filter(Boolean),
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
        <form onSubmit={(e) => handleFormSubmit(e, ex?.id)} style={{ border: "1px solid", padding: "20px", marginBottom: "20px", display: "flex", flexDirection: "column", gap: "15px" }}>
            <h2 style={{ margin: "0 0 10px 0" }}>{isEdit ? 'Edit Exercise' : 'Create Custom Exercise'}</h2>

            <div>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Exercise Name *</label>
                <input type="text" name="name" style={{ width: "100%", padding: "8px", boxSizing: "border-box", border: "1px solid" }} defaultValue={ex?.name || ""} required />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                <div>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Body Part</label>
                    <input type="text" name="body_part" style={{ width: "100%", padding: "8px", boxSizing: "border-box", border: "1px solid" }} defaultValue={ex?.bodyPart || ""} />
                </div>
                <div>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Target Muscle</label>
                    <select name="target_muscle" style={{ width: "100%", padding: "8px", boxSizing: "border-box", border: "1px solid" }} defaultValue={ex?.target || ""}>
                        <option value="">Select Target</option>
                        {filterOptions.muscles?.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
                <div>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Equipment</label>
                    <select name="equipment" style={{ width: "100%", padding: "8px", boxSizing: "border-box", border: "1px solid", marginBottom: "5px" }} defaultValue={ex?.equipment || ""}>
                        <option value="">Select Equipment</option>
                        {filterOptions.equipment?.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                    <input type="text" name="new_equipment" placeholder="Or add new equipment..." style={{ width: "100%", padding: "8px", boxSizing: "border-box", border: "1px solid" }} />
                </div>
                <div>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Difficulty</label>
                    <select name="difficulty" style={{ width: "100%", padding: "8px", boxSizing: "border-box", border: "1px solid" }} defaultValue={ex?.difficulty || "beginner"}>
                        <option value="beginner">beginner</option>
                        <option value="intermediate">intermediate</option>
                        <option value="advanced">advanced</option>
                    </select>
                </div>
                <div>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Category</label>
                    <select name="category" style={{ width: "100%", padding: "8px", boxSizing: "border-box", border: "1px solid", marginBottom: "5px" }} defaultValue={ex?.category || ""}>
                        <option value="">Select Category</option>
                        {filterOptions.categoryType?.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input type="text" name="new_category" placeholder="Or add new category..." style={{ width: "100%", padding: "8px", boxSizing: "border-box", border: "1px solid" }} />
                </div>
                <div>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Secondary Muscles (Ctrl/Cmd+Click to multi-select)</label>
                    <select name="secondary_muscles" multiple style={{ width: "100%", padding: "8px", boxSizing: "border-box", border: "1px solid", height: "100px" }} defaultValue={ex?.secondary_muscles || []}>
                        {filterOptions.muscles?.map(m => <option key={`sec-${m}`} value={m}>{m}</option>)}
                    </select>
                </div>
            </div>

            <div>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Description</label>
                <textarea name="description" style={{ width: "100%", padding: "8px", boxSizing: "border-box", border: "1px solid" }} rows={3} defaultValue={ex?.description || ""}></textarea>
            </div>

            <div>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Instructions (one step per line)</label>
                <textarea name="instructions" style={{ width: "100%", padding: "8px", boxSizing: "border-box", border: "1px solid" }} rows={5} defaultValue={ex?.instructions?.join('\n') || ""}></textarea>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
                <button type="submit" disabled={saving} style={{ padding: "10px", border: "1px solid", background: "none", cursor: saving ? "not-allowed" : "pointer", fontWeight: "bold" }}>
                    {saving ? 'Saving...' : 'Save Exercise'}
                </button>
                <button type="button" style={{ padding: "10px", border: "1px solid", background: "none", cursor: "pointer" }} onClick={() => isEdit ? setEditing(false) : BackToList()}>
                    Cancel
                </button>
            </div>
        </form>
    );

    return (
        <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h1 style={{ margin: 0 }}>Exercises</h1>
                {!showExeciseById && !Creating && (
                    <button onClick={() => setCreating(true)} style={{ padding: "10px", border: "1px solid", background: "none", cursor: "pointer", fontWeight: "bold" }}>
                        + Create Custom Exercise
                    </button>
                )}
            </div>

            {/* Messages */}
            {loading && <p style={{ fontWeight: "bold" }}>Loading...</p>}
            {error && <p style={{ fontWeight: "bold" }}>{error}</p>}
            {success && <p style={{ fontWeight: "bold" }}>{success}</p>}

            {/* Controls / Filter Bar */}
            {!Creating && (
                <div style={{ marginBottom: "20px" }}>
                    {showExeciseById ? (
                        <button type="button" style={{ padding: "8px 12px", border: "1px solid", background: "none", cursor: "pointer" }} onClick={BackToList}>
                            &larr; Back to List
                        </button>
                    ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "15px", padding: "15px", border: "1px solid" }}>
                            <input type="text" name="search" placeholder="Search exercises..." value={selectedFilters.search} onChange={handleFilterChange} style={{ padding: "8px", border: "1px solid", flex: 1, minWidth: "200px" }} />

                            <select name="muscles" value={selectedFilters.muscles} onChange={handleFilterChange} style={{ padding: "8px", border: "1px solid" }}>
                                <option value="">All Muscles</option>
                                {filterOptions.muscles?.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>

                            <select name="equipment" value={selectedFilters.equipment} onChange={handleFilterChange} style={{ padding: "8px", border: "1px solid" }}>
                                <option value="">All Equipment</option>
                                {filterOptions.equipment?.map(e => <option key={e} value={e}>{e}</option>)}
                            </select>

                            <select name="categoryType" value={selectedFilters.categoryType} onChange={handleFilterChange} style={{ padding: "8px", border: "1px solid" }}>
                                <option value="">All Categories</option>
                                {filterOptions.categoryType?.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    )}
                </div>
            )}

            {/* Main Content Area */}
            <div>
                {Creating ? (
                    <ExerciseForm isEdit={false} />
                ) : (
                    <ul style={{ listStyleType: "none", padding: 0, margin: 0 }}>
                        {exercises.length > 0 ? (
                            exercises.map((ex: Exercise) => (
                                <li key={ex.id || ex.name} style={{ border: "1px solid", padding: "20px", marginBottom: "15px" }}>

                                    {/* LIST VIEW */}
                                    {!showExeciseById && (
                                        <div>
                                            <h2 style={{ margin: "0 0 10px 0", cursor: "pointer", textDecoration: "underline" }} onClick={() => FetchExercisesById(ex.id)}>
                                                {ex.name}
                                            </h2>
                                            <div style={{ fontSize: "0.9em" }}>
                                                <strong>Target:</strong> {ex.target_muscle || ex.target} &bull;
                                                <strong> Equipment:</strong> {ex.equipment} &bull;
                                                <strong> Category:</strong> {ex.category}
                                            </div>
                                        </div>
                                    )}

                                    {/* DETAILED VIEW */}
                                    {showExeciseById && !editing && (
                                        <div>
                                            <h2 style={{ margin: "0 0 20px 0", textTransform: "capitalize" }}>{ex.name}</h2>

                                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", border: "1px solid", padding: "15px", marginBottom: "20px" }}>
                                                <span><strong>Body Part:</strong> {ex.body_part || ex.bodyPart}</span>
                                                <span><strong>Target:</strong> {ex.target_muscle || ex.target}</span>
                                                <span><strong>Equipment:</strong> {ex.equipment}</span>
                                                <span><strong>Difficulty:</strong> {ex.difficulty}</span>
                                                <span><strong>Category:</strong> {ex.category}</span>
                                                <span><strong>Custom:</strong> {ex.is_custom ? 'Yes' : 'No'}</span>
                                                <span style={{ gridColumn: "span 2" }}><strong>Secondary Muscles:</strong> {(ex.secondary_muscles)?.join(', ') || 'None'}</span>
                                            </div>

                                            <h3 style={{ borderBottom: "1px solid", paddingBottom: "5px", marginBottom: "10px" }}>Description</h3>
                                            <p style={{ marginBottom: "20px" }}>{ex.description || "No description available."}</p>

                                            <h3 style={{ borderBottom: "1px solid", paddingBottom: "5px", marginBottom: "10px" }}>Instructions</h3>
                                            {ex.instructions && ex.instructions.length > 0 ? (
                                                <ol style={{ paddingLeft: "20px", marginBottom: "20px" }}>
                                                    {ex.instructions.map((step, index) => (
                                                        <li key={index} style={{ marginBottom: "5px" }}>{step}</li>
                                                    ))}
                                                </ol>
                                            ) : (
                                                <p style={{ marginBottom: "20px", fontStyle: "italic" }}>No instructions available.</p>
                                            )}

                                            <div style={{ display: "flex", gap: "10px", borderTop: "1px solid", paddingTop: "15px" }}>
                                                <button type="button" style={{ padding: "8px 15px", border: "1px solid", background: "none", cursor: "pointer", fontWeight: "bold" }} onClick={() => setEditing(true)}>
                                                    Edit
                                                </button>
                                                <button type="button" style={{ padding: "8px 15px", border: "1px solid", background: "none", cursor: "pointer", fontWeight: "bold" }} onClick={() => removeExeciseById(ex.id)}>
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
                            !loading && <p style={{ padding: "20px 0" }}>No exercises found.</p>
                        )}
                    </ul>
                )}
            </div>
        </div>
    );
}