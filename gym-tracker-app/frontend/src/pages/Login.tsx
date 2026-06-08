import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";
import Button from "../components/Button";

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
        <div className="min-h-[80vh] flex items-center justify-center p-4">
            <form onSubmit={handleSubmit} className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 sm:p-8 w-full max-w-md flex flex-col gap-5 shadow-2xl">
                <div>
                    <h2 className="text-3xl font-display text-zinc-100 uppercase tracking-tight mb-1">Login</h2>
                    <p className="text-zinc-400 text-sm">Welcome back to GymTracker.</p>
                </div>
                {message && <p className="text-rose-400 font-medium text-sm bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">{message}</p>}

                <div>
                    <label className="block text-sm font-semibold text-zinc-400 mb-2">Email</label>
                    <input
                        type="email"
                        value={email}
                        required
                        onChange={e => setEmail(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-zinc-100 focus:outline-none focus:border-lime-400 transition-colors placeholder:text-zinc-600"
                        placeholder="your@email.com"
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-zinc-400 mb-2">Password</label>
                    <input
                        type="password"
                        value={password}
                        required
                        onChange={e => setPassword(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-zinc-100 focus:outline-none focus:border-lime-400 transition-colors placeholder:text-zinc-600"
                        placeholder="••••••••"
                    />
                </div>

                <Button
                    type="submit"
                    disabled={isLoading}
                    variant="primary" fullWidth
                >
                    {isLoading ? 'Logging in...' : 'Login'}
                </Button>
                <div className="pt-4 mt-2">
                    <p className="text-center text-zinc-500 text-sm mt-8">
                        You don't have an account'?{" "}
                        <button
                            type="button"
                            onClick={() => navigate("/register")}
                            className="text-lime-400 hover:text-lime-300 font-bold transition-colors"
                        >
                            Register
                        </button>
                    </p>
                </div>
            </form>
        </div>
    );
}
