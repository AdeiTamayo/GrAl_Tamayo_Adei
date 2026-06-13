import { useState, useRef, DragEvent, useCallback } from 'react';
import { apiFetch } from '../utils/api';
import Button from '../components/Button';
import Notification from '../components/Notification';

export default function UploadVideo() {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<string>('');
    const [isDragging, setIsDragging] = useState(false);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const token = localStorage.getItem("user_login_token");

    const clearNotification = useCallback(() => setNotification(null), []);

    // ==========================================================================
    // BARBELL TRACKING HANDLER
    // ==========================================================================
    const handleBarbellTracking = async () => {
        if (!file) return;

        setIsProcessing(true);
        setError(null);
        setProgress('Uploading video for barbell tracking...');

        const formData = new FormData();
        formData.append('video', file);

        try {
            setProgress('Tracking barbell path...');

            if (!token) {
                throw new Error('Please login first');
            }

            const response = await apiFetch('/api/videos/barbell-tracking', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Barbell tracking failed');
            }

            setProgress('Barbell tracking complete!');
            setNotification({ message: 'Barbell tracking complete!', type: 'success' });
            setFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }

        } catch (error) {
            console.error('Barbell tracking failed:', error);
            setError(error instanceof Error ? error.message : 'Barbell tracking failed');
            setProgress('');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0] || null;
        setFile(selectedFile);
        setError(null);
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);

        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile && droppedFile.type.startsWith('video/')) {
            setFile(droppedFile);
            setError(null);
        } else {
            setError('Please drop a valid video file');
        }
    };

    // ==========================================================================
    // POSE ESTIMATION & BIOMECHANICAL ANALYZER HANDLER
    // ==========================================================================
    const handleUpload = async (mode: 'normal' | 'squat') => {
        if (!file) return;

        setIsProcessing(true);
        setError(null);
        setProgress(mode === 'squat' ? 'Initializing squat biomechanics engine...' : 'Uploading video...');

        const formData = new FormData();
        formData.append('video', file);
        formData.append('mode', mode);

        try {
            setProgress(mode === 'squat' ? 'Analyzing squat depth & reps...' : 'Processing skeleton layout...');

            if (!token) {
                throw new Error('Please login first');
            }

            const response = await apiFetch('/api/videos/pose-estimation', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Processing failed');
            }

            const successMsg = mode === 'squat' ? 'Squat analysis complete!' : 'Pose Estimation complete!';
            setProgress(successMsg);
            setNotification({ message: successMsg, type: 'success' });
            setFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }

        } catch (error) {
            console.error('Upload failed:', error);
            setError(error instanceof Error ? error.message : 'Upload failed');
            setNotification({ message: 'Video processing failed', type: 'error' });
            setProgress('');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <>
            {notification && (
                <Notification
                    message={notification.message}
                    type={notification.type}
                    onClose={clearNotification}
                />
            )}
            <div className="max-w-7xl mx-auto p-4 md:p-8 mt-4 md:mt-8 space-y-8">
            <div>
                <h1 className="font-display text-4xl font-bold tracking-tight uppercase italic text-lime-400">Video Analysis</h1>
            </div>

            <div className="max-w-xl mx-auto bg-zinc-950/80 border border-zinc-800 rounded-xl p-6 shadow-xl space-y-6">
                <h2 className="font-display text-lg font-bold text-zinc-200 tracking-wide uppercase">Upload Video</h2>

                {/* Drop zone */}
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => !isProcessing && fileInputRef.current?.click()}
                    className={`
                        border-2 border-dashed rounded-xl py-16 px-6 text-center transition-all duration-200 select-none
                        ${isDragging
                            ? 'border-lime-400 bg-zinc-900/50 text-lime-400 shadow-[0_0_20px_rgba(163,230,53,0.15)]'
                            : 'border-zinc-700 bg-zinc-900/40 text-zinc-400 hover:border-lime-400/50 hover:bg-zinc-900/60'
                        }
                        ${isProcessing ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}
                    `}
                >
                    {file ? (
                        <div className="space-y-3">
                            <div className="text-lime-400 text-4xl mb-2">✓</div>
                            <p className="font-bold text-zinc-200 text-sm truncate max-w-full px-2">
                                {file.name}
                            </p>
                            <p className="text-xs text-zinc-500 font-mono">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="text-4xl text-zinc-600 mb-2">↑</div>
                            <p className="text-sm font-bold text-zinc-300 tracking-wide">
                                Click to upload or drag and drop
                            </p>
                            <p className="text-xs text-zinc-500 font-mono tracking-widest">
                                MP4, MOV, AVI
                            </p>
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

                {/* Process Buttons Layout Menu */}
                {file && (
                    <div className="flex flex-col gap-3 pt-4 border-t border-zinc-800/80">
                        <h3 className="font-display text-sm font-bold text-zinc-400 tracking-wide uppercase mb-2">Analysis Options</h3>

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

                {/* Progress Message */}
                {progress && !error && (
                    <div className="mt-6 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg text-center">
                        <p className="text-sm text-lime-400 font-bold animate-pulse tracking-wide font-mono">
                            {progress}
                        </p>
                    </div>
                )}

                {/* Error Message */}
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