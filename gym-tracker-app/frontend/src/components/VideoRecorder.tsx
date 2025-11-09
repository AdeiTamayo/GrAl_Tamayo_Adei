import { useState, useRef, useEffect } from "react";
import UploadVideo from "./UploadVideo";

const VideoRecorder = () => {
    const [permission, setPermission] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [recordingStatus, setRecordingStatus] = useState<'inactive' | 'recording'>('inactive');
    const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);

    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);

    const getCameraPermission = async () => {
        if ("MediaRecorder" in window) {
            try {
                const streamData = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: true,
                });
                setPermission(true);
                setStream(streamData);
            } catch (err: any) {
                alert(err.message);
            }
        } else {
            alert("The MediaRecorder API is not supported in your browser.");
        }
    };

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    const startRecording = () => {
        if (!stream) return;

        setRecordedChunks([]);
        const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'video/webm'
        });

        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                setRecordedChunks((prev) => [...prev, event.data]);
            }
        };

        mediaRecorder.start();
        setRecordingStatus('recording');
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setRecordingStatus('inactive');
        }
    };

    const downloadVideo = () => {
        if (recordedChunks.length === 0) {
            alert("No recording available to download");
            return;
        }

        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `recording-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    };

    // Cleanup stream on unmount
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h2>Video Recorder</h2>
            <main>
                <div style={{ marginBottom: '20px' }}>
                    {permission && (
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            style={{
                                width: '100%',
                                maxWidth: '640px',
                                borderRadius: '8px',
                                border: '2px solid #ddd'
                            }}
                        />
                    )}
                </div>

                <div className="video-controls" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {!permission ? (
                        <button
                            onClick={getCameraPermission}
                            type="button"
                            style={{
                                padding: '10px 20px',
                                fontSize: '16px',
                                cursor: 'pointer',
                                backgroundColor: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px'
                            }}
                        >
                            Get Camera
                        </button>
                    ) : null}

                    {permission && recordingStatus === 'inactive' ? (
                        <button
                            onClick={startRecording}
                            type="button"
                            style={{
                                padding: '10px 20px',
                                fontSize: '16px',
                                cursor: 'pointer',
                                backgroundColor: '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px'
                            }}
                        >
                            Start Recording
                        </button>
                    ) : null}

                    {recordingStatus === 'recording' ? (
                        <button
                            onClick={stopRecording}
                            type="button"
                            style={{
                                padding: '10px 20px',
                                fontSize: '16px',
                                cursor: 'pointer',
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px'
                            }}
                        >
                            Stop Recording
                        </button>
                    ) : null}

                    {recordedChunks.length > 0 && recordingStatus === 'inactive' ? (
                        <>
                            <button
                                onClick={downloadVideo}
                                type="button"
                                style={{
                                    padding: '10px 20px',
                                    fontSize: '16px',
                                    cursor: 'pointer',
                                    backgroundColor: '#17a2b8',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '5px'
                                }}
                            >
                                Download Video
                            </button>
                            <UploadVideo />
                        </>

                    ) : null}
                </div>

                {
                    recordingStatus === 'recording' && (
                        <div style={{ marginTop: '20px', color: '#dc3545', fontWeight: 'bold' }}>
                            🔴 Recording...
                        </div>
                    )
                }
            </main >
        </div >
    );
};

export default VideoRecorder;