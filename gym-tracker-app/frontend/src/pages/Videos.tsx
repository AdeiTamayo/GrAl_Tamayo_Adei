import { useEffect, useState } from "react";
import { Video } from "../../types";
import { apiFetch } from "../utils/api";

export default function UserVideos() {
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const token = localStorage.getItem("user_login_token");

    useEffect(() => {
        if (!token) {
            setError("Please login first");
            setLoading(false);
            return;
        }

        apiFetch("/api/videos", {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) setVideos(data.videos);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message || "Failed to fetch videos");
                setLoading(false);
            });
    }, [token]);

    if (loading) return <div className="p-8 text-zinc-400 font-medium animate-pulse">Loading videos...</div>;

    if (error)
        return (
            <div className="p-8 text-rose-400 font-medium">
                Error: {error}
            </div>
        );

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8 mt-4 md:mt-8 space-y-6">
            <div>
                <h1 className="text-3xl font-display text-zinc-100 uppercase tracking-tight mb-2">Your Videos</h1>
                <p className="text-zinc-400 font-medium">Review your processed lifting videos.</p>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 md:p-8 shadow-xl">
                {videos.length === 0 ? (
                    <div className="text-center py-10 bg-zinc-900/50 rounded-lg border border-zinc-800/80">
                        <p className="text-zinc-500 font-medium italic">No videos found. Upload a video to start tracking.</p>
                    </div>
                ) : (
                    <ul className="space-y-6">
                        {videos.map(video => (
                            <li
                                key={video.id}
                                className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 md:p-6 flex flex-col gap-4 shadow-lg"
                            >
                                {/* HEADER ROW */}
                                <div className="flex justify-between items-center pb-4 border-b border-zinc-800/80">
                                    <strong className="text-lg font-bold text-lime-400 uppercase tracking-wider">
                                        {video.process_type}
                                    </strong>

                                    <span className="text-xs uppercase tracking-wider text-zinc-500 font-medium">
                                        {new Date(video.created_at).toLocaleString()}
                                    </span>
                                </div>

                                {/* VIDEO */}
                                <div className="bg-black border border-zinc-800 rounded-xl overflow-hidden mt-2 relative shadow-inner">
                                    <video
                                        className="w-full h-auto max-h-[500px]"
                                        controls
                                    >
                                        <source
                                            src={`http://localhost:8000${video.processed_url}`}
                                            type="video/mp4"
                                        />
                                    </video>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}