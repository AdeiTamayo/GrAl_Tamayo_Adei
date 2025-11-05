import { useState } from 'react';
import VideoRecorder from './VideoRecorder.jsx';

export default function MyApp() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const CORRECT_PASSWORD = '1111';

    const handleLogin = (e) => {
        e.preventDefault();
        if (password === CORRECT_PASSWORD) {
            setIsAuthenticated(true);
            setError('');
        } else {
            setError('Pasahitz okerra / Incorrect password');
            setPassword('');
        }
    };

    if (!isAuthenticated) {
        return (

            <div>
                <h2>Sartu Pasahitza</h2>
                <p>Enter Password</p>
                <form onSubmit={handleLogin}>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Pasahitza / Password"
                    />
                    {error && <p style={{ color: 'red', fontSize: '14px' }}>{error}</p>}
                    <button
                        type="submit"
                    >
                        Sartu
                    </button>
                </form>
            </div>
        );
    }

    const [recordOption, setRecordOption] = useState("video");
    const toggleRecordOption = (type) => () => {
        setRecordOption(type);
    };

    // Simple AudioRecorder stub to avoid undefined component errors.
    // Replace with your real audio recording implementation as needed.
    const AudioRecorder = () => {
        return (
            <div>
                <h2>Audio Recorder</h2>
                <p>Audio recording not implemented yet.</p>
            </div>
        );
    };

    return (
        <div>
            <h1>React Media Recorder</h1>
            <div className="button-flex">
                <button onClick={toggleRecordOption("video")}>
                    Record Video
                </button>
                <button onClick={toggleRecordOption("audio")}>
                    Record Audio
                </button>
            </div>
            <div>
                {recordOption === "video" ? <VideoRecorder /> : <AudioRecorder />}
            </div>
        </div>
    );
};
