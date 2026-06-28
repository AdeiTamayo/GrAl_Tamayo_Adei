import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";
import Button from "../components/Button";
import Input from "../components/Input";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
    const { login } = useAuth();
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
                    login(data.token, data.user.email);
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
        <div className="min-h-[80vh] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <form onSubmit={handleSubmit} className="bg-card border border-subtle rounded-xl p-6 sm:p-8 w-full max-w-md flex flex-col gap-5 shadow-2xl">
                <div>
                    <h2 className="font-display text-4xl font-bold tracking-tight uppercase italic text-accent mb-1">Login</h2>
                    <p className="text-muted text-sm">Welcome back to GymTracker.</p>
                </div>

                {/* Errore-mezu nagusia: Testu gorri garbia eta soildua */}
                {message && (
                    <p className="text-sm font-semibold text-rose-500 tracking-wide -mb-1 animate-in fade-in duration-300">
                        {message}
                    </p>
                )}

                <div>
                    <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-xs font-semibold text-muted">Email</label>
                        {email && !isEmailValid(email) && (
                            <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider">Incorrect format</span>
                        )}
                    </div>
                    <Input
                        type="email"
                        value={email}
                        required
                        onChange={e => setEmail(e.target.value)}
                        inputSize="lg"
                        placeholder="your@email.com"
                        className={email && !isEmailValid(email) ? "border-rose-500/50 focus:border-rose-500" : ""}
                    />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-muted mb-1.5">Password</label>
                    <Input
                        type="password"
                        value={password}
                        required
                        onChange={e => setPassword(e.target.value)}
                        inputSize="lg"
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
                    <p className="text-center text-dim text-sm">
                        You don't have an account?{" "}
                        <button
                            type="button"
                            onClick={() => navigate("/register")}
                            className="text-accent hover:text-accent-hover font-bold transition-colors"
                        >
                            Register
                        </button>
                    </p>
                </div>
            </form>
        </div>
    );
}