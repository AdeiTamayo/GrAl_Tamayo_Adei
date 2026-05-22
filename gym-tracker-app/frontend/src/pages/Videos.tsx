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

    if (loading) return <p style={{ padding: 20 }}>Loading videos...</p>;

    if (error)
        return (
            <p style={{ padding: 20, color: "red", fontWeight: "bold" }}>
                Error: {error}
            </p>
        );

    return (
        <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
            <h1>Your Videos</h1>

            <div style={{ border: "1px solid", padding: "20px" }}>
                {videos.length === 0 ? (
                    <p style={{ fontStyle: "italic" }}>No videos found.</p>
                ) : (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                        {videos.map(video => (
                            <li
                                key={video.id}
                                style={{
                                    borderBottom: "1px solid",
                                    padding: "20px 0",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "10px",
                                }}
                            >
                                {/* HEADER ROW */}
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                    }}
                                >
                                    <strong style={{ fontSize: "1.1em" }}>
                                        {video.process_type}
                                    </strong>

                                    <span style={{ fontSize: "0.85em", opacity: 0.7 }}>
                                        {new Date(video.created_at).toLocaleString()}
                                    </span>
                                </div>

                                {/* VIDEO */}
                                <div style={{ border: "1px solid", padding: "10px" }}>
                                    <video
                                        width="100%"
                                        controls
                                        style={{ maxHeight: "400px" }}
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