
import { useEffect, useState } from 'react';

import { Video } from '../../types';
import { apiFetch } from '../utils/api';


export default function UserVideos() {

    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);


    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            setError('Please login first');
        }

        apiFetch('/api/videos', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) setVideos(data.videos);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    if (loading) return <div>Loading...</div>;

    return (
        <div>
            <h2>Your Videos</h2>
            {error ? (
                <p className="mt-4 text-red-500">Error: {error}</p>
            ) : videos.length === 0 ? (
                <p>No videos found.</p>
            ) : (
                <ul>
                    {videos.map((video: Video) => (
                        <li key={video.id}>
                            <strong>{video.process_type}</strong> <br />
                            <a href={video.processed_url} target="_blank" rel="noopener noreferrer">
                                {video.id}
                            </a>
                            <br />
                            Uploaded: {new Date(video.created_at).toLocaleString()}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}