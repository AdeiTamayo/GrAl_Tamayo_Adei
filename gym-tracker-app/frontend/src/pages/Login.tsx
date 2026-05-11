import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";

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
        console.log("token:", localStorage.getItem("user_login_token"));
        console.log("email:", localStorage.getItem("email"))
        try {
            const response = await apiFetch('/api/user/login', {
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
                    localStorage.setItem('user_login_token', data.token);
                    localStorage.setItem('email', data.user.email);
                }
                console.log(data.email);
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
        <div style={{ padding: "20px", fontFamily: "Arial, sans-serif", maxWidth: "400px", margin: "40px auto" }}>
            <form onSubmit={handleSubmit} style={{ border: "1px solid", padding: "20px", display: "flex", flexDirection: "column", gap: "15px" }}>
                <h2 style={{ margin: "0 0 10px 0" }}>Login</h2>
                {message && <p style={{ fontWeight: "bold" }}>{message}</p>}

                <div>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Email</label>
                    <input
                        type="email"
                        value={email}
                        required
                        onChange={e => setEmail(e.target.value)}
                        style={{ width: "100%", padding: "8px", boxSizing: "border-box", border: "1px solid" }}
                    />
                </div>

                <div>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Password</label>
                    <input
                        type="password"
                        value={password}
                        required
                        onChange={e => setPassword(e.target.value)}
                        style={{ width: "100%", padding: "8px", boxSizing: "border-box", border: "1px solid" }}
                    />
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                        padding: "10px",
                        border: "1px solid",
                        background: "none",
                        cursor: isLoading ? "not-allowed" : "pointer",
                        marginTop: "10px",
                        fontWeight: "bold"
                    }}
                >
                    {isLoading ? 'Logging in...' : 'Login'}
                </button>
            </form>
        </div>
    );
}
