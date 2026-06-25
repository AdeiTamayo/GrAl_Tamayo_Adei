import { useEffect, useState } from "react";
import { Video } from "../../types";
import { apiFetch } from "../utils/api";
import Pagination from "../components/Pagination";
import Select from "../components/Select";
import DatePicker from "../components/DatePicker";

export default function UserVideos() {
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filter states
    const [filterType, setFilterType] = useState<string>("all");
    const [filterDateFrom, setFilterDateFrom] = useState<string>("");
    const [filterDateTo, setFilterDateTo] = useState<string>("");
    const [sortOrder, setSortOrder] = useState<string>("desc");
    const [activeDatePicker, setActiveDatePicker] = useState<'from' | 'to' | null>(null);

    // Pagination
    const [videosPage, setVideosPage] = useState(1);
    const pageSize = 9;
    const totalPages = Math.max(1, Math.ceil(videos.length / pageSize));
    const paginatedVideos = videos.slice((videosPage - 1) * pageSize, videosPage * pageSize);

    const token = localStorage.getItem("user_login_token");

    useEffect(() => {
        if (!token) {
            setError("Please login first");
            setLoading(false);
            return;
        }

        setLoading(true);
        setVideosPage(1);

        const params = new URLSearchParams();
        if (filterType !== "all") params.append("type", filterType);
        if (filterDateFrom) params.append("date_from", filterDateFrom);
        if (filterDateTo) params.append("date_to", filterDateTo);
        if (sortOrder) params.append("sort", sortOrder);

        apiFetch(`/api/videos?${params.toString()}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setVideos(data.videos);
                } else {
                    setError(data.message || "Failed to load filtered videos");
                }
                setLoading(false);
            })
            .catch(err => {
                setError(err.message || "Failed to fetch videos");
                setLoading(false);
            });
    }, [token, filterType, filterDateFrom, filterDateTo, sortOrder]);

    if (error) {
        return (
            <div className="max-w-5xl mx-auto p-8 text-rose-400 font-medium">
                Error: {error}
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 mt-4 space-y-6 animate-in fade-in duration-200">
            {/* TITLE SECTION */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-subtle pb-5">
                <div>
                    <h1 className="font-display text-4xl font-bold tracking-tight uppercase italic text-accent">Your Videos</h1>
                </div>

                {/* FILTER CONTROLS BAR */}
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    <Select
                        value={filterType}
                        onChange={setFilterType}
                        options={[
                            { value: "all", label: "All Movements" },
                            { value: "pose_estimation", label: "Pose Estimation" },
                            { value: "squat_analysis", label: "Squat Analysis" },
                            { value: "barbell_tracking", label: "Barbell Tracking" },
                        ]}
                        buttonClassName="!px-3 !py-2 text-xs min-w-[140px]"
                    />

                    <div className="flex items-center gap-1.5">
                        <DatePicker
                            value={filterDateFrom}
                            onChange={(d) => { setFilterDateFrom(d); setActiveDatePicker(null); }}
                            placeholder="From"
                            buttonClassName="!px-3 !py-2 text-xs w-auto rounded-xl"
                            open={activeDatePicker === 'from'}
                            onOpenChange={(o) => setActiveDatePicker(o ? 'from' : null)}
                        />
                        <DatePicker
                            value={filterDateTo}
                            onChange={(d) => { setFilterDateTo(d); setActiveDatePicker(null); }}
                            placeholder="To"
                            buttonClassName="!px-3 !py-2 text-xs w-auto rounded-xl"
                            open={activeDatePicker === 'to'}
                            onOpenChange={(o) => setActiveDatePicker(o ? 'to' : null)}
                            menuAlign="right"
                        />
                    </div>

                    <button
                        onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
                        className="bg-surface border border-subtle rounded-lg px-3 py-2 text-xs text-body hover:border-accent transition-colors"
                        title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                    >
                        {sortOrder === 'asc' ? '\u2191' : '\u2193'}
                    </button>
                </div>
            </div>

            {/* VIDEO SHELF GRID */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                    {[1, 2, 3].map(n => (
                        <div key={n} className="bg-surface/40 border border-subtle rounded-xl h-80" />
                    ))}
                </div>
            ) : videos.length === 0 ? (
                <div className="text-center py-16 bg-card rounded-xl border border-subtle">
                    <p className="text-dim font-medium italic text-sm">
                        No videos match your selected filter criteria.
                    </p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {paginatedVideos.map(video => (
                            <div
                                key={video.id}
                                className="bg-card border border-subtle/80 rounded-xl p-4 flex flex-col justify-between shadow-lg hover:border-hover/80 transition-all duration-200"
                            >
                                <div className="bg-black border border-subtle rounded-lg overflow-hidden relative aspect-[3/4] shadow-inner mb-3 flex items-center justify-center">
                                    <video
                                        className="w-full h-full object-contain"
                                        controls
                                        preload="metadata"
                                    >
                                        <source
                                            src={`http://localhost:8000${video.processed_url}`}
                                            type="video/mp4"
                                        />
                                    </video>
                                </div>

                                {/* CARD DETAILS FOOTER */}
                                <div className="pt-2 border-t border-subtle flex items-center justify-between gap-2">
                                    <div className="truncate">
                                        <strong className="text-xs font-bold text-accent uppercase tracking-wider block truncate">
                                            {video.process_type}
                                        </strong>
                                        <span className="text-[10px] tracking-tight text-dim font-mono mt-0.5 block">
                                            {new Date(video.created_at).toLocaleDateString(undefined, {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <Pagination
                        page={videosPage}
                        totalPages={totalPages}
                        onPageChange={setVideosPage}
                    />
                </>
            )}
        </div>
    );
}

