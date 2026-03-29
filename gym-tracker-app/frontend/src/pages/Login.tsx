import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        setMessage("");
        console.log("token:", localStorage.getItem("token"));
        try {
            const response = await fetch('http://localhost:8000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                // Store token in localStorage
                if (data.token) {
                    localStorage.setItem('token', data.token);
                }

                navigate("/", {
                    replace: true, // Avoid users being able to go back
                    state: {
                        user: data.user,
                        email: data.email,
                        message: "Login succesful"
                    }
                });

            } else {
                setMessage(data.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login failed:', error);
            setMessage('Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <h2>Login</h2>
            {message && <p>{message}</p>}
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
            <button type="submit" disabled={isLoading}>
                {isLoading ? 'Logging in...' : 'Login'}
            </button>
        </form>
    );
}
