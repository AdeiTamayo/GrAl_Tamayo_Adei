import React, { useState } from 'react';


export default function Exercises() {
    const [exercises, setExercises] = useState([]);
    const [loading, setLoading] = useState(false);
    const [offset, setOffset] = useState(0);
    const [limit, setLimit] = useState(10);
    const [sortMethod, setSortMethod] = useState('id');
    const [sortOrder, setSortOrder] = useState('ascending');
    const [error, setError] = useState("");

    async function getExercise() {
        try {
            setLoading(true);
            setError("");

            const response = await fetch("http://localhost:8000/api/exercises", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("user_login_token")}`,
                },
            });

            if (!response.ok) throw new Error("Failed to fetch exercise");

            const result = await response.json();

            if (result.success) {
                // result.data is the array [result.rows[0]] from the backend
                return result.data;
            } else {
                throw new Error(result.error || "Unknown error");
            }

        } catch (err: any) {
            setError(err.message || "Could not load data.");
            return [];
        } finally {
            setLoading(false);
        }
    }

    const handleFetchExercises = async () => {
        const data = await getExercise();
        setExercises(data);
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
                <button type="button" onClick={handleFetchExercises} className="border">Load Exercises</button>
            </div>
            {loading && <p>Loading...</p>}
            <ul>
                {exercises.length > 0 ? (
                    exercises.map((ex: any) => (
                        <li key={ex.id || ex.name} className="my-2 p-2 mb-5 border">
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
