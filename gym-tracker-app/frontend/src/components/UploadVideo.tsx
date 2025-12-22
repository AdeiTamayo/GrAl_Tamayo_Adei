import { useState } from 'react';

export default function UploadVideo() {
    const [file, setFile] = useState<File | null>(null);

    const handleUpload = async () => {
        if (!file) return; // If no file selected return 

        const formData = new FormData(); // Create form data object
        formData.append('video', file); // Create form data with the video file

        try {
            /* const response =*/
            await fetch('http://localhost:8000/api/videos/upload', {
                method: 'POST',
                body: formData
            });
        } catch (error) {
            console.error('Upload failed:', error);
        }

    };

    return (
        <div className="inline-grid grid-cols-3 gap-4">
            <h2>Upload Video</h2>
            <input
                type="file"
                accept="video/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <button
                type="button"
                onClick={handleUpload}
                hidden={!file}

            > Process Video
            </button>
        </div>
    );
}