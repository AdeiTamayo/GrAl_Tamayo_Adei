import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";
import Button from "../components/Button";
import TransparentNumericInput from "../components/TransparentNumericInput";

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
    const [profilePicture, setProfilePicture] = useState("");

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

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setMessage("");

        if (password !== confirmPassword) {
            setMessage("Passwords do not match");
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
                birth_date: toNullableString(birthDate),
                profile_picture: toNullableString(profilePicture)
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
                setMessage(data.error || "Registration failed");
            }
        } catch (error) {
            console.error("Registration failed:", error);
            setMessage("Registration failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 py-12">
            <form onSubmit={handleSubmit} className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 sm:p-10 w-full max-w-2xl flex flex-col gap-6 shadow-2xl">
                <div className="border-b border-zinc-800/80 pb-6 mb-2">
                    <h2 className="text-4xl font-display text-zinc-100 uppercase tracking-tight mb-2">Register</h2>
                    <p className="text-zinc-400 font-medium">Create your account to start tracking your journey.</p>
                </div>

                {message && (
                    <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl font-medium text-sm animate-in fade-in duration-300">
                        {message}
                    </div>
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
                            <label className="block text-sm font-semibold text-zinc-400 mb-2">Email</label>
                            <input
                                type="email"
                                value={email}
                                required
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-zinc-100 focus:outline-none focus:border-lime-400 transition-colors"
                            />
                        </div>
                    </div>

                    {/* Security */}
                    <div className="space-y-4">
                        <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-2">Security</h3>
                        <div>
                            <label className="block text-sm font-semibold text-zinc-400 mb-2">Password</label>
                            <input
                                type="password"
                                value={password}
                                required
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-zinc-100 focus:outline-none focus:border-lime-400 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-zinc-400 mb-2">Confirm Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                required
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-zinc-100 focus:outline-none focus:border-lime-400 transition-colors"
                            />
                        </div>
                    </div>

                    {/* Physical Details */}
                    <div className="space-y-4 md:col-span-2">
                        <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-2">Physical Details (Optional)</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-zinc-400 mb-2">Gender</label>
                                <select
                                    value={genderId}
                                    onChange={e => setGenderId(e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-zinc-100 focus:outline-none focus:border-lime-400 transition-colors [color-scheme:dark]"
                                >
                                    <option value="">Select</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="non-binary">Other</option>
                                </select>
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