import { useEffect, useMemo, useState } from "react";
import { getVideos, deleteVideo } from "../data/videos";
import { VideoRecord } from "../data/types";
import Pagination from "../components/Pagination";
import Select from "../components/Select";
import DatePicker from "../components/DatePicker";
import DeleteButton from "../components/DeleteButton";
import ConfirmModal from "../components/ConfirmModal";

export default function UserVideos() {
    const [videos, setVideos] = useState<VideoRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filter states
    const [filterType, setFilterType] = useState<string>("all");
    const [filterDateFrom, setFilterDateFrom] = useState<string>("");
    const [filterDateTo, setFilterDateTo] = useState<string>("");
    const [sortOrder, setSortOrder] = useState<string>("desc");
    const [activeDatePicker, setActiveDatePicker] = useState<'from' | 'to' | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

    async function handleDeleteVideo(id: number) {
        try {
            const video = videos.find((v) => v.id === id);
            await deleteVideo(id, video?.processed_url);
            setVideos((prev) => {
                const remaining = prev.filter((v) => v.id !== id);
                return remaining;
            });
            if (filteredVideos.length - 1 < (videosPage - 1) * pageSize + 1 && videosPage > 1) {
                setVideosPage(videosPage - 1);
            }
        } catch (err: any) {
            setError(err.message || "Failed to delete video");
        } finally {
            setDeleteConfirmId(null);
        }
    }

    // Pagination
    const [videosPage, setVideosPage] = useState(1);
    const pageSize = 9;

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                setLoading(true);
                const allVideos = await getVideos();
                if (!cancelled) {
                    setVideos(allVideos);
                    setError(null);
                }
            } catch (err: any) {
                if (!cancelled) setError(err.message || "Failed to fetch videos");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, []);

    const filteredVideos = useMemo(() => {
        let result = videos;

        if (filterType !== "all") {
            result = result.filter(v => v.process_type === filterType);
        }

        if (filterDateFrom) {
            const from = new Date(filterDateFrom).getTime();
            result = result.filter(v => new Date(v.created_at).getTime() >= from);
        }

        if (filterDateTo) {
            const to = new Date(filterDateTo).getTime();
            result = result.filter(v => new Date(v.created_at).getTime() <= to);
        }

        return [...result].sort((a, b) =>
            sortOrder === "asc"
                ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }, [videos, filterType, filterDateFrom, filterDateTo, sortOrder]);

    useEffect(() => {
        setVideosPage(1);
    }, [filterType, filterDateFrom, filterDateTo, sortOrder]);

    const totalPages = Math.max(1, Math.ceil(filteredVideos.length / pageSize));
    const paginatedVideos = filteredVideos.slice((videosPage - 1) * pageSize, videosPage * pageSize);

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
            ) : paginatedVideos.length === 0 ? (
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
                                    {video.processed_url ? (
                                        <video
                                            className="w-full h-full object-contain"
                                            controls
                                            preload="metadata"
                                        >
                                            <source
                                                src={video.processed_url}
                                                type="video/mp4"
                                            />
                                        </video>
                                    ) : (
                                        <span className="text-dim text-xs font-medium italic">No processed video available</span>
                                    )}
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
                                    <DeleteButton onClick={() => setDeleteConfirmId(video.id)} />
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

            {deleteConfirmId !== null && (
                <ConfirmModal
                    message="Delete this video? The processed video will also be removed from storage."
                    onConfirm={() => handleDeleteVideo(deleteConfirmId)}
                    onCancel={() => setDeleteConfirmId(null)}
                    confirmLabel="Delete"
                />
            )}
        </div>
    );
}
