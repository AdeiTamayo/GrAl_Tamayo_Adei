import React, { useState } from 'react';

// Justification: Call the backend endpoint with pagination and sorting parameters, not the external API directly.
const getExercisesFromBackend = async (offset = 0, limit = 10, sortMethod = 'id', sortOrder = 'ascending') => {
    try {
        const params = new URLSearchParams({
            offset: String(offset),
            limit: String(limit),
            sortMethod,
            sortOrder
        });
        const response = await fetch(`/api/exercises?$`); // console.error('Error fetching exercises:', error);
        if (!response.ok) throw new Error('Failed to fetch');
        return await response.json();
    } catch (error) {
        console.error('Error fetching exercises:', error);
        return [];
    }
};

export default function Exercises() {
    const [exercises, setExercises] = useState([]);
    const [loading, setLoading] = useState(false);
    const [offset, setOffset] = useState(0);
    const [limit, setLimit] = useState(10);
    const [sortMethod, setSortMethod] = useState('id');
    const [sortOrder, setSortOrder] = useState('ascending');

    const handleFetchExercises = async () => {
        setLoading(true);
        const data = await getExercisesFromBackend(offset, limit, sortMethod, sortOrder);
        setExercises(data || []);
        setLoading(false);
    };

    return (
        <div>
            <h1>Exercises</h1>
            <div className="mb-4 flex gap-2">
                <label>
                    Limit:
                    <input type="number" value={limit} min={1} max={100} onChange={e => setLimit(Number(e.target.value))} className="border px-2 py-1 mx-2" />
                </label>
                <label>
                    Offset:
                    <input type="number" value={offset} min={0} onChange={e => setOffset(Number(e.target.value))} className="border px-2 py-1 mx-2" />
                </label>
                <label>
                    Sort by:
                    <select value={sortMethod} onChange={e => setSortMethod(e.target.value)} className="border px-2 py-1 mx-2">
                        <option value="id">ID</option>
                        <option value="name">Name</option>
                        <option value="bodyPart">Body Part</option>
                        <option value="equipment">Equipment</option>
                    </select>
                </label>
                <label>
                    Order:
                    <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="border px-2 py-1 mx-2">
                        <option value="ascending">Ascending</option>
                        <option value="descending">Descending</option>
                    </select>
                </label>
                <button type="button" onClick={handleFetchExercises} className="py-2 px-5 border rounded bg-blue-500 text-white">Load Exercises</button>
            </div>
            {loading && <p>Loading...</p>}
            <ul>
                {exercises.length > 0 ? (
                    exercises.map((ex: any) => (
                        <li key={ex.id || ex.name} className="my-2 p-2 border-b">
                            <strong>{ex.name}</strong> <br />
                            <span>Body Part: {ex.bodyPart}</span> <br />
                            <span>Target: {ex.target}</span> <br />
                            <span>Equipment: {ex.equipment}</span> <br />
                            <span>Difficulty: {ex.difficulty}</span> <br />
                            <span>Category: {ex.category}</span> <br />
                            <span>Description: {ex.description}</span> <br />
                            <span>Secondary Muscles: {ex.secondaryMuscles?.join(', ')}</span> <br />
                            <span>Instructions:</span>
                            <ul>
                                {ex.instructions?.map((inst: string, idx: number) => (
                                    <li key={idx}>{inst}</li>
                                ))}
                            </ul>
                        </li>
                    ))
                ) : (
                    <p>No exercises loaded.</p>
                )}
            </ul>
        </div>
    );
}
