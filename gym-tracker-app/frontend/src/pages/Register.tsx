import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";
import Button from "../components/Button";
import TransparentNumericInput from "../components/TransparentNumericInput";
import Select from "../components/Select";

export default function Register() {
    const [name, setName] = useState("");
    const [surname, setSurname] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [genderId, setGenderId] = useState("");
    const [weight, setWeight] = useState("");
    const [height, setHeight] = useState("");
    const [birthDate, setBirthDate] = useState("");

    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();

    function toNullableNumber(value: string | number) {
        if (typeof value === "number") return value;
        return value.trim() === "" ? null : Number(value);
    }

    function toNullableString(value: string) {
        return value.trim() === "" ? null : value.trim();
    }

    // --- Validation Helper Rules ---
    const isEmailValid = (emailStr: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(emailStr.trim());
    };

    const getPasswordStrength = (passStr: string) => {
        if (!passStr) return { score: 0, label: "", color: "text-zinc-600" };

        let score = 0;
        if (passStr.length >= 8) score++;
        if (/[a-zA-Z]/.test(passStr)) score++;
        if (/\d/.test(passStr)) score++;
        if (/[^A-Za-z0-9]/.test(passStr)) score++;

        if (score <= 2) return { score, label: "Weak", color: "text-rose-400" };
        if (score === 3) return { score, label: "Medium", color: "text-amber-400" };
        return { score, label: "Strong", color: "text-lime-400" };
    };

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setMessage("");

        // 1. Structural Email validation Check
        if (!isEmailValid(email)) {
            setMessage("Please enter a valid email address structure (e.g., name@domain.com).");
            return;
        }

        // 2. Structural Password Strength Check
        const strength = getPasswordStrength(password);
        if (strength.score < 3) {
            setMessage("Password is too weak. It must be at least 8 characters long and contain a mix of letters and numbers.");
            return;
        }

        // 3. Confirm Password Match Check
        if (password !== confirmPassword) {
            setMessage("Passwords do not match.");
            return;
        }

        setIsLoading(true);

        try {
            const payload = {
                name: toNullableString(name),
                surname: toNullableString(surname),
                email: email.trim(),
                password,
                gender_id: toNullableString(genderId),
                weight: toNullableNumber(weight),
                height: toNullableNumber(height),
                birth_date: toNullableString(birthDate)
            };

            const response = await apiFetch("/api/user/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.success) {
                const loginResponse = await apiFetch("/api/user/login", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ email: email.trim(), password })
                });

                const loginData = await loginResponse.json();

                if (loginData.success && loginData.token) {
                    localStorage.setItem('user_login_token', loginData.token);
                    localStorage.setItem('email', loginData.user.email);

                    navigate("/", {
                        replace: true,
                        state: {
                            user: loginData.user,
                            email: loginData.user.email,
                            message: "Registration and login successful"
                        }
                    });
                } else {
                    navigate("/login");
                }

            } else {
                setMessage(data.error || "Registration failed.");
            }
        } catch (error) {
            console.error("Registration failed:", error);
            setMessage("Registration failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }

    const pwdStrength = getPasswordStrength(password);

    return (
        <div className="min-h-screen flex items-center justify-center p-4 py-12">
            <form onSubmit={handleSubmit} className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 sm:p-10 w-full max-w-2xl flex flex-col gap-6 shadow-2xl">
                <div className="border-b border-zinc-800/80 pb-6 mb-2">
                    <h2 className="text-4xl font-display text-zinc-100 uppercase tracking-tight mb-2">Register</h2>
                    <p className="text-zinc-400 font-medium">Create your account to start tracking your journey.</p>
                </div>

                {/* Main Error Form Message (Now just clean red text) */}
                {message && (
                    <p className="text-sm font-semibold text-rose-500 tracking-wide -mb-2 animate-in fade-in duration-300">
                        {message}
                    </p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-2">Identify</h3>
                        <div>
                            <label className="block text-sm font-semibold text-zinc-400 mb-2">Name (optional)</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-zinc-100 focus:outline-none focus:border-lime-400 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-zinc-400 mb-2">Surname (optional)</label>
                            <input
                                type="text"
                                value={surname}
                                onChange={(e) => setSurname(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-zinc-100 focus:outline-none focus:border-lime-400 transition-colors "
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-semibold text-zinc-400">Email</label>
                                {email && !isEmailValid(email) && (
                                    <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider">Invalid Format</span>
                                )}
                            </div>
                            <input
                                type="email"
                                value={email}
                                required
                                onChange={(e) => setEmail(e.target.value)}
                                className={`w-full bg-zinc-900 border rounded-lg p-3 text-zinc-100 focus:outline-none transition-colors ${email && !isEmailValid(email) ? "border-rose-500/50 focus:border-rose-500" : "border-zinc-800 focus:border-lime-400"
                                    }`}
                            />
                        </div>
                    </div>

                    {/* Security */}
                    <div className="space-y-4">
                        <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-2">Security</h3>
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-semibold text-zinc-400">Password</label>
                                {password && (
                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${pwdStrength.color}`}>
                                        Strength: {pwdStrength.label}
                                    </span>
                                )}
                            </div>
                            <input
                                type="password"
                                value={password}
                                required
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-zinc-100 focus:outline-none focus:border-lime-400 transition-colors"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-semibold text-zinc-400">Confirm Password</label>
                                {confirmPassword && password !== confirmPassword && (
                                    <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider">Mismatch</span>
                                )}
                            </div>
                            <input
                                type="password"
                                value={confirmPassword}
                                required
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className={`w-full bg-zinc-900 border rounded-lg p-3 text-zinc-100 focus:outline-none transition-colors ${confirmPassword && password !== confirmPassword ? "border-rose-500/50 focus:border-rose-500" : "border-zinc-800 focus:border-lime-400"
                                    }`}
                            />
                        </div>
                    </div>

                    {/* Physical Details */}
                    <div className="space-y-4 md:col-span-2">
                        <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-2">Physical Details (Optional)</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <Select
                                    label="Gender"
                                    value={genderId}
                                    onChange={setGenderId}
                                    options={[
                                        { value: "", label: "Select" },
                                        { value: "male", label: "Male" },
                                        { value: "female", label: "Female" },
                                        { value: "non-binary", label: "Other" },
                                    ]}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-zinc-400 mb-2">Weight (kg)</label>
                                <TransparentNumericInput
                                    value={weight}
                                    onChange={setWeight}
                                    className="w-full"
                                    inputClassName="pl-3 pr-10 py-3 text-sm text-zinc-100 bg-zinc-900"
                                    max={500}
                                    step={0.5}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-zinc-400 mb-2">Height (cm)</label>
                                <TransparentNumericInput
                                    value={height}
                                    onChange={setHeight}
                                    className="w-full"
                                    inputClassName="pl-3 pr-10 py-3 text-sm text-zinc-100 bg-zinc-900"
                                    max={300}
                                    step={1}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-zinc-400 mb-2">Birth date</label>
                                <input
                                    type="date"
                                    value={birthDate}
                                    onChange={(e) => setBirthDate(e.target.value)}
                                    max={new Date().toLocaleDateString('en-CA')}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-zinc-100 focus:outline-none focus:border-lime-400 transition-colors [color-scheme:dark]"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-4 mt-2">
                    <Button
                        type="submit"
                        disabled={isLoading}
                        variant="primary"
                        fullWidth
                    >
                        {isLoading ? "Creating Account..." : "Register Now"}
                    </Button>
                    <p className="text-center text-zinc-500 text-sm mt-8">
                        Already have an account?{" "}
                        <button
                            type="button"
                            onClick={() => navigate("/login")}
                            className="text-lime-400 hover:text-lime-300 font-bold transition-colors"
                        >
                            Sign In
                        </button>
                    </p>
                </div>
            </form>
        </div>
    );
}