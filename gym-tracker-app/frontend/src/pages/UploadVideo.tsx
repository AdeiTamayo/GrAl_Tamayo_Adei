import { useState, useRef, DragEvent } from 'react';

export default function UploadVideo() {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<string>('');
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ==========================================================================
    // BARBELL TRACKING HANDLER
    // ==========================================================================
    // Sends video to barbell tracking endpoint and downloads the processed result

    const handleBarbellTracking = async () => {
        if (!file) return;

        setIsProcessing(true);
        setError(null);
        setProgress('Uploading video for barbell tracking...');

        const formData = new FormData();
        formData.append('video', file);

        try {
            setProgress('Tracking barbell path...');

            // Send video to barbell tracking API endpoint
            const response = await fetch('http://localhost:8000/api/videos/barbell-tracking', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Barbell tracking failed');
            }

            setProgress('Downloading tracked video...');

            // Fetch the processed video from the returned URL
            const videoResponse = await fetch(data.processedVideoUrl);
            const blob = await videoResponse.blob();
            const url = window.URL.createObjectURL(blob);

            // Trigger download of the processed video
            const link = document.createElement('a');
            link.href = url;
            link.download = `barbell-tracked-${file.name}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            window.URL.revokeObjectURL(url);

            setProgress('Barbell tracking complete! Download started.');
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
    // POSE ESTIMATION HANDLER
    //==========================================================================
    // Sends video to pose estimation endpoint and downloads the processed result

    const handleUpload = async () => {
        if (!file) return;

        setIsProcessing(true);
        setError(null);
        setProgress('Uploading video...');

        const formData = new FormData();
        formData.append('video', file);

        try {
            setProgress('Processing video...');

            const response = await fetch('http://localhost:8000/api/videos/pose-estimation', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Processing failed');
            }

            setProgress('Downloading processed video...');

            const videoResponse = await fetch(data.processedVideoUrl);
            const blob = await videoResponse.blob();
            const url = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `processed-${file.name}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            window.URL.revokeObjectURL(url);

            setProgress('Download complete!');
            setFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }

        } catch (error) {
            console.error('Upload failed:', error);
            setError(error instanceof Error ? error.message : 'Upload failed');
            setProgress('');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="p-5 max-w-md mx-auto">
            {/* Drop zone */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                    border-2 border-dashed rounded-lg py-10 px-5 text-center mt-5
                    ${isDragging ? 'border-black bg-gray-100' : 'border-gray-300'}
                    ${isProcessing ? 'cursor-not-allowed' : 'cursor-pointer'}
                `}
            >
                {file ? (
                    <div>
                        <p className="font-bold">{file.name}</p>
                        <p>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                ) : (
                    <div>
                        <p>Click to upload or drag and drop</p>
                        <p className="text-xs text-gray-500">MP4, MOV, AVI</p>
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

            {/* Process Buttons */}
            {file && (
                <div className="flex flex-col gap-3 mt-5">
                    {/* Pose Estimation Button*/}
                    <button
                        type="button"
                        onClick={handleUpload}
                        disabled={isProcessing}
                        className={`
                            w-full py-2 px-5 border rounded
                            ${isProcessing ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-100'}
                        `}
                    >
                        {isProcessing ? 'Processing...' : ' Pose Estimation'}
                    </button>

                    {/* Barbell Tracking Button*/}
                    <button
                        type="button"
                        onClick={handleBarbellTracking}
                        disabled={isProcessing}
                        className={`
                            w-full py-2 px-5 border rounded
                            ${isProcessing ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-100'}
                        `}
                    >
                        {isProcessing ? 'Processing...' : ' Track Barbell'}
                    </button>
                </div>
            )}

            {/* Progress Message */}
            {progress && !error && (
                <p className="mt-4">{progress}</p>
            )}

            {/* Error Message */}
            {error && (
                <p className="mt-4 text-red-500">
                    Error: {error}
                </p>
            )}
        </div>
    );
}