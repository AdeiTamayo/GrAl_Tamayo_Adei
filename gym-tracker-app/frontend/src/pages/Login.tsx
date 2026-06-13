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

    // E-mail formatua balioztatzeko laguntzailea
    const isEmailValid = (emailStr: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(emailStr.trim());
    };

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        setMessage("");

        // Sare-deia egin aurretik e-maila egiaztatu alferrikako eskaerak saihesteko
        if (!isEmailValid(email)) {
            setMessage("Mesedez, sartu baliozko e-mail helbide bat.");
            setIsLoading(false);
            return;
        }

        try {
            const response = await apiFetch('/api/user/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: email.trim(), password })
            });

            const data = await response.json();

            if (data.success) {
                if (data.token) {
                    localStorage.setItem('user_login_token', data.token);
                    localStorage.setItem('email', data.user.email);
                }
                navigate("/", {
                    replace: true,
                    state: {
                        user: data.user,
                        email: data.email,
                        message: "Login successful"
                    }
                });
            } else {
                setMessage(data.error || 'Login failed.');
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

                {/* Errore-mezu nagusia: Testu gorri garbia eta soildua */}
                {message && (
                    <p className="text-sm font-semibold text-rose-500 tracking-wide -mb-1 animate-in fade-in duration-300">
                        {message}
                    </p>
                )}

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-semibold text-zinc-400">Email</label>
                        {email && !isEmailValid(email) && (
                            <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider">Format okerra</span>
                        )}
                    </div>
                    <input
                        type="email"
                        value={email}
                        required
                        onChange={e => setEmail(e.target.value)}
                        className={`w-full bg-zinc-900 border rounded-lg p-3 text-zinc-100 focus:outline-none transition-colors placeholder:text-zinc-600 ${email && !isEmailValid(email) ? "border-rose-500/50 focus:border-rose-500" : "border-zinc-800 focus:border-lime-400"
                            }`}
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
                    variant="primary"
                    fullWidth
                >
                    {isLoading ? 'Logging in...' : 'Login'}
                </Button>

                <div className="pt-2">
                    <p className="text-center text-zinc-500 text-sm">
                        You don't have an account?{" "}
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