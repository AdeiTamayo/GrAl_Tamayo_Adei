import { useState, useRef, DragEvent, useEffect } from 'react';
import { apiUrl } from '../utils/api';
import Card from '../components/Card';
import { useNotification } from '../components/NotificationProvider';

const ANALYSIS_MODES = [
    {
        id: 'pose',
        label: 'General Pose Estimation',
        description: 'Analyse full-body pose from your video',
        icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    },
    {
        id: 'squat',
        label: 'Squat Analysis + Feedback',
        description: 'Get form feedback on your squat technique',
        icon: 'M13 10V3L4 14h7v7l9-11h-7z',
    },
    {
        id: 'barbell',
        label: 'Track Barbell Path',
        description: 'Map the trajectory of your barbell',
        icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    },
] as const;

export default function UploadVideo() {
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<string>('');
    const [activeMode, setActiveMode] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const token = localStorage.getItem("user_login_token");
    const { showNotification } = useNotification();
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    async function streamFetch(url: string, formData: FormData) {
        if (!token) throw new Error('Please login first');

        const controller = new AbortController();
        abortRef.current = controller;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
            signal: controller.signal,
        });

        if (!response.ok) {
            const text = await response.text();
            let msg = 'Request failed';
            try { const d = JSON.parse(text); msg = d.error || msg; } catch { }
            throw new Error(msg);
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (!line.trim()) continue;
                const data = JSON.parse(line);

                if (data.type === 'progress') {
                    setProgress(data.message);
                } else if (data.type === 'done') {
                    return { processedVideoUrl: data.processedVideoUrl };
                } else if (data.type === 'error') {
                    throw new Error(data.message);
                }
            }
        }

        throw new Error('Connection closed before processing completed');
    }

    const resetFile = () => {
        setFile(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleBarbellTracking = async () => {
        if (!file) return;

        setIsProcessing(true);
        setActiveMode('barbell');
        setError(null);
        setProgress('Starting barbell tracking...');

        const formData = new FormData();
        formData.append('video', file);

        try {
            await streamFetch(apiUrl('/api/videos/barbell-tracking'), formData);

            setProgress('Barbell tracking complete!');
            showNotification('Barbell tracking complete!', 'success');
            resetFile();

        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            const msg = error instanceof Error ? error.message : 'Barbell tracking failed';
            setError(msg);
            setProgress('');
            showNotification('Barbell tracking failed', 'error');
        } finally {
            setIsProcessing(false);
            setActiveMode(null);
            abortRef.current = null;
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0] || null;
        setFile(f);
        if (f) {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(URL.createObjectURL(f));
        }
        setError(null);
        setProgress('');
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(false); };
    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile && droppedFile.type.startsWith('video/')) {
            setFile(droppedFile);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(URL.createObjectURL(droppedFile));
            setError(null);
            setProgress('');
        } else {
            setError('Please drop a valid video file');
        }
    };

    const handleUpload = async (mode: 'normal' | 'squat') => {
        if (!file) return;

        setIsProcessing(true);
        setActiveMode(mode === 'squat' ? 'squat' : 'pose');
        setError(null);
        setProgress(mode === 'squat' ? 'Starting squat analysis...' : 'Starting pose estimation...');

        const formData = new FormData();
        formData.append('video', file);
        formData.append('mode', mode);

        try {
            await streamFetch(apiUrl('/api/videos/pose-estimation'), formData);

            const successMsg = mode === 'squat' ? 'Squat analysis complete!' : 'Pose estimation complete!';
            setProgress(successMsg);
            showNotification(successMsg, 'success');
            resetFile();

        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            const msg = error instanceof Error ? error.message : 'Upload failed';
            setError(msg);
            setProgress('');
            showNotification('Video processing failed', 'error');
        } finally {
            setIsProcessing(false);
            setActiveMode(null);
            abortRef.current = null;
        }
    };

    const handleCancel = () => {
        abortRef.current?.abort();
        setIsProcessing(false);
        setActiveMode(null);
        setProgress('');
    };

    const formatFileSize = (bytes: number) => {
        const mb = bytes / 1024 / 1024;
        if (mb >= 1) return `${mb.toFixed(2)} MB`;
        return `${(bytes / 1024).toFixed(1)} KB`;
    };

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-8 mt-4 md:mt-8 space-y-6 animate-in fade-in duration-200">
            <h1 className="font-display text-4xl font-bold tracking-tight uppercase italic text-accent">Video Analysis</h1>

            {/* Upload Zone */}
            <Card variant="default" padding="lg">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display text-lg font-bold text-heading tracking-wide uppercase">Upload Video</h2>
                    {file && !isProcessing && (
                        <button onClick={resetFile} className="text-xs font-semibold text-dim hover:text-body transition-colors">
                            Change
                        </button>
                    )}
                </div>

                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => !isProcessing && fileInputRef.current?.click()}
                    className={`
                        border-2 border-dashed rounded-xl transition-all duration-200 select-none
                        ${isProcessing ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}
                        ${isDragging ? 'border-accent bg-surface/50' : 'border-subtle bg-surface/40 hover:border-accent/50 hover:bg-surface/60'}
                    `}
                >
                    {file && previewUrl ? (
                        <div className="flex flex-col items-center p-4">
                            <div className="w-full max-w-md aspect-video bg-black rounded-lg overflow-hidden mb-3">
                                <video className="w-full h-full object-contain" src={previewUrl} preload="metadata" muted />
                            </div>
                            <p className="font-bold text-heading text-sm truncate max-w-full px-2">{file.name}</p>
                            <p className="text-xs text-dim font-mono mt-0.5">{formatFileSize(file.size)}</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 px-6">
                            <svg className="w-10 h-10 text-dim mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <p className="text-sm font-bold text-muted tracking-wide">Browse files or drag & drop</p>
                            <p className="text-xs text-dim font-mono tracking-widest mt-2">MP4, MOV, AVI</p>
                        </div>
                    )}
                    <input ref={fileInputRef} type="file" className="hidden" accept="video/*" onChange={handleFileSelect} disabled={isProcessing} />
                </div>
            </Card>

            {file && (
                <Card variant="default" padding="lg">
                    <h2 className="font-display text-lg font-bold text-heading tracking-wide uppercase mb-4">Analysis Options</h2>

                    <div className="space-y-3">
                        {ANALYSIS_MODES.map(mode => {
                            const isActive = activeMode === mode.id;
                            const isDisabled = isProcessing && !isActive;
                            return (
                                <button
                                    key={mode.id}
                                    onClick={() => {
                                        if (mode.id === 'barbell') handleBarbellTracking();
                                        else handleUpload(mode.id === 'squat' ? 'squat' : 'normal');
                                    }}
                                    disabled={isDisabled}
                                    className={`
                                        w-full flex items-start gap-3 p-4 rounded-xl border text-left transition-all duration-200
                                        ${isActive
                                            ? 'border-accent/40 bg-accent/5'
                                            : isDisabled
                                                ? 'border-subtle/30 bg-surface/20 opacity-40 cursor-not-allowed'
                                                : 'border-subtle bg-surface/40 hover:border-accent/30 hover:bg-accent/5 cursor-pointer'
                                        }
                                    `}
                                >
                                    <div className={`p-2 rounded-lg shrink-0 ${isActive ? 'bg-accent/10 text-accent' : 'bg-surface text-dim'}`}>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d={mode.icon} />
                                        </svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-bold text-sm text-heading truncate">{mode.label}</span>
                                            {isActive && (
                                                <svg className="w-4 h-4 text-accent shrink-0 animate-spin" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                </svg>
                                            )}
                                        </div>
                                        <p className="text-xs text-dim mt-0.5">{mode.description}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </Card>
            )}

            {/* Progress / Error */}
            {(progress || error) && (
                <Card variant="default" padding="lg" className={error ? 'border-rose-500/20 bg-rose-500/5' : ''}>
                    <div className="flex items-start gap-3">
                        {progress && !error && (
                            <svg className="w-5 h-5 text-accent shrink-0 mt-0.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        )}
                        {error && (
                            <svg className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                            </svg>
                        )}
                        <div className="flex-1 min-w-0">
                            {error ? (
                                <>
                                    <p className="text-sm text-rose-400 font-bold tracking-wide">Processing failed</p>
                                    <p className="text-xs text-rose-300/80 mt-1 font-mono">{error}</p>
                                    <button onClick={() => { setError(null); setProgress(''); }} className="mt-3 text-xs font-semibold text-accent hover:text-accent-hover transition-colors">
                                        Try again
                                    </button>
                                </>
                            ) : (
                                <>
                                    <p className="text-sm text-accent font-bold tracking-wide font-mono leading-relaxed whitespace-pre-wrap">{progress}</p>
                                    <button onClick={handleCancel} className="mt-3 text-xs font-semibold text-dim hover:text-rose-400 transition-colors">
                                        Cancel
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
}
