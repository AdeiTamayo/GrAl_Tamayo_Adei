import { useEffect, useState, useRef } from "react";
import { Video } from "../../types";
import { apiFetch } from "../utils/api";
import Select from "../components/Select";
import Calendar from "../components/Calendar";

export default function UserVideos() {
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filter states
    const [filterType, setFilterType] = useState<string>("all");
    const [filterDate, setFilterDate] = useState<string>("");
    const [sortOrder, setSortOrder] = useState<string>("desc");

    const token = localStorage.getItem("user_login_token");

    useEffect(() => {
        if (!token) {
            setError("Please login first");
            setLoading(false);
            return;
        }

        setLoading(true);

        const params = new URLSearchParams();
        if (filterType !== "all") params.append("type", filterType);
        if (filterDate) params.append("date", filterDate);
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
    }, [token, filterType, filterDate, sortOrder]);

    if (error) {
        return (
            <div className="max-w-5xl mx-auto p-8 text-rose-400 font-medium">
                Error: {error}
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 mt-4 space-y-6">
            {/* TITLE SECTION */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-subtle pb-5">
                <div>
                    <h1 className="font-display text-4xl font-bold tracking-tight uppercase italic text-lime-400">Your Videos</h1>
                </div>

                {/* FILTER CONTROLS BAR */}
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="flex flex-col min-w-[140px] flex-1 md:flex-initial">
                        <label className="text-[10px] uppercase font-bold text-dim mb-1 tracking-wider">Analysis Type</label>
                        <Select
                            value={filterType}
                            onChange={setFilterType}
                            options={[
                                { value: "all", label: "All Movements" },
                                { value: "pose_estimation", label: "Pose Estimation" },
                                { value: "squat_analysis", label: "Squat Analysis" },
                                { value: "barbell_tracking", label: "Barbell Tracking" },
                            ]}
                        />
                    </div>

                    <div className="flex flex-col min-w-[140px] flex-1 md:flex-initial">
                        <label className="text-[10px] uppercase font-bold text-dim mb-1 tracking-wider">Date Recorded</label>
                        <DateFilterButton
                            value={filterDate}
                            onChange={setFilterDate}
                        />
                    </div>

                    <div className="flex flex-col min-w-[120px] flex-1 md:flex-initial">
                        <label className="text-[10px] uppercase font-bold text-dim mb-1 tracking-wider">Order By</label>
                        <Select
                            value={sortOrder}
                            onChange={setSortOrder}
                            options={[
                                { value: "desc", label: "Newest First" },
                                { value: "asc", label: "Oldest First" },
                            ]}
                        />
                    </div>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {videos.map(video => (
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
                                    <strong className="text-xs font-bold text-lime-400 uppercase tracking-wider block truncate">
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
            )}
        </div>
    );
}

function DateFilterButton({ value, onChange }: { value: string; onChange: (val: string) => void }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full bg-surface border border-subtle rounded-lg px-4 py-3 text-left flex items-center justify-between gap-2 text-heading hover:border-hover transition-colors focus:border-lime-400 focus:outline-none"
            >
                <span>{value || "Any date"}</span>
                <svg className={`w-3 h-3 text-dim transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {value && (
                <button
                    onClick={() => { onChange(""); setOpen(false); }}
                    className="absolute right-8 top-1/2 -translate-y-1/2 text-dim hover:text-body text-xs font-bold z-10"
                >
                    ✕
                </button>
            )}
            {open && (
                <div className="absolute left-0 mt-1 z-30 animate-in fade-in slide-in-from-top-1 duration-150">
                    <Calendar
                        selectedDate={value || undefined}
                        onSelect={(date) => { onChange(date); setOpen(false); }}
                    />
                </div>
            )}
        </div>
    );
}