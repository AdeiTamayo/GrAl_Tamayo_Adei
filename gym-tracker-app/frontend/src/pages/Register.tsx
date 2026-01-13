import { useState } from "react";

export default function Register() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setMessage("");

        // Check if passwords match
        if (password !== confirmPassword) {
            setMessage('Passwords do not match');
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch('http://localhost:8000/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                setMessage('Registration successful!');
                console.log('Registration successful:', data);
            } else {
                setMessage(data.error || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration failed:', error);
            setMessage('Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <h2>Register</h2>

            <h4>Email</h4>
            <input
                type="email"
                value={email}
                required
                onChange={e => setEmail(e.target.value)}
            />

            <h4>Password</h4>
            <input
                type="password"
                value={password}
                required
                onChange={e => setPassword(e.target.value)}
            />

            <h4>Confirm Password</h4>
            <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                required
                onChange={e => setConfirmPassword(e.target.value)}
            />


            <button type="submit" disabled={isLoading}>
                {isLoading ? 'Registering...' : 'Register'}
            </button>
            {message && <p>{message}</p>}
        </form>
    );
}
