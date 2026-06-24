import { useState, useRef, DragEvent } from 'react';
import { apiUrl } from '../utils/api';
import Button from '../components/Button';
import { useNotification } from '../components/NotificationProvider';

export default function UploadVideo() {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<string>('');
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const token = localStorage.getItem("user_login_token");
    const { showNotification } = useNotification();
    const abortRef = useRef<AbortController | null>(null);

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
            try { const d = JSON.parse(text); msg = d.error || msg; } catch {}
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

    const handleBarbellTracking = async () => {
        if (!file) return;

        setIsProcessing(true);
        setError(null);
        setProgress('Starting barbell tracking...');

        const formData = new FormData();
        formData.append('video', file);

        try {
            await streamFetch(apiUrl('/api/videos/barbell-tracking'), formData);

            setProgress('Barbell tracking complete!');
            showNotification('Barbell tracking complete!', 'success');
            setFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';

        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            const msg = error instanceof Error ? error.message : 'Barbell tracking failed';
            setError(msg);
            setProgress('');
            showNotification('Barbell tracking failed', 'error');
        } finally {
            setIsProcessing(false);
            abortRef.current = null;
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFile(e.target.files?.[0] || null);
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
            setError(null);
            setProgress('');
        } else {
            setError('Please drop a valid video file');
        }
    };

    const handleUpload = async (mode: 'normal' | 'squat') => {
        if (!file) return;

        setIsProcessing(true);
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
            setFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';

        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            const msg = error instanceof Error ? error.message : 'Upload failed';
            setError(msg);
            setProgress('');
            showNotification('Video processing failed', 'error');
        } finally {
            setIsProcessing(false);
            abortRef.current = null;
        }
    };

    return (
        <>
            <div className="max-w-7xl mx-auto p-4 md:p-8 mt-4 md:mt-8 space-y-8">
            <div>
                <h1 className="font-display text-4xl font-bold tracking-tight uppercase italic text-accent">Video Analysis</h1>
            </div>

            <div className="max-w-xl mx-auto bg-card border border-subtle rounded-xl p-6 shadow-xl space-y-6">
                <h2 className="font-display text-lg font-bold text-heading tracking-wide uppercase">Upload Video</h2>

                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => !isProcessing && fileInputRef.current?.click()}
                    style={{ boxShadow: isDragging ? '0 0 20px rgba(var(--accent-rgb), 0.15)' : undefined }}
                    className={`
                        border-2 border-dashed rounded-xl py-16 px-6 text-center transition-all duration-200 select-none
                        ${isDragging
                            ? 'border-accent bg-surface/50 text-accent'
                            : 'border-subtle bg-surface/40 text-muted hover:border-accent/50 hover:bg-surface/60'
                        }
                        ${isProcessing ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}
                    `}
                >
                    {file ? (
                        <div className="space-y-3">
                            <div className="text-accent text-4xl mb-2">✓</div>
                            <p className="font-bold text-heading text-sm truncate max-w-full px-2">
                                {file.name}
                            </p>
                            <p className="text-xs text-dim font-mono">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="text-4xl text-dim mb-2">↑</div>
                            <p className="text-sm font-bold text-muted tracking-wide">Click to upload or drag and drop</p>
                            <p className="text-xs text-dim font-mono tracking-widest">MP4, MOV, AVI</p>
                        </div>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept="video/*"
                        onChange={handleFileSelect}
                        disabled={isProcessing}
                    />
                </div>

                {file && (
                    <div className="flex flex-col gap-3 pt-4 border-t border-subtle/80">
                        <h3 className="font-display text-sm font-bold text-muted tracking-wide uppercase mb-2">Analysis Options</h3>

                        <Button
                            type="button"
                            onClick={() => handleUpload('normal')}
                            disabled={isProcessing}
                            variant="secondary"
                            fullWidth
                        >
                            {isProcessing ? 'Processing...' : 'General Pose Estimation'}
                        </Button>

                        <Button
                            type="button"
                            onClick={() => handleUpload('squat')}
                            disabled={isProcessing}
                            variant="primary"
                            fullWidth
                        >
                            {isProcessing ? 'Processing...' : 'Squat Analysis + Feedback'}
                        </Button>

                        <Button
                            type="button"
                            onClick={handleBarbellTracking}
                            disabled={isProcessing}
                            variant="secondary"
                            fullWidth
                        >
                            {isProcessing ? 'Processing...' : 'Track Barbell Path'}
                        </Button>
                    </div>
                )}

                {progress && !error && (
                    <div className="mt-6 p-4 bg-surface/50 border border-subtle rounded-lg">
                        <p className="text-sm text-accent font-bold tracking-wide font-mono leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                            {progress}
                        </p>
                    </div>
                )}

                {error && (
                    <div className="mt-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-center">
                        <p className="text-sm text-rose-400 font-bold tracking-wide">
                            Error: {error}
                        </p>
                    </div>
                )}
            </div>
        </div>
        </>
    );
}
