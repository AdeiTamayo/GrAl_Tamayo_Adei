import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";

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

    function toNullableNumber(value: string) {
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
        <div style={{ padding: "20px", fontFamily: "Arial, sans-serif", maxWidth: "400px", margin: "40px auto" }}>
            <form onSubmit={handleSubmit} style={{ border: "1px solid", padding: "20px", display: "flex", flexDirection: "column", gap: "15px" }}>
                <h2 style={{ margin: "0 0 10px 0" }}>Register</h2>
                {message && <p style={{ fontWeight: "bold" }}>{message}</p>}

                <div>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Name (optional)</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        style={{ width: "100%", padding: "8px", boxSizing: "border-box", border: "1px solid" }}
                    />
                </div>

                <div>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Surname (optional)</label>
                    <input
                        type="text"
                        value={surname}
                        onChange={(e) => setSurname(e.target.value)}
                        style={{ width: "100%", padding: "8px", boxSizing: "border-box", border: "1px solid" }}
                    />
                </div>

                <div>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Email</label>
                    <input
                        type="email"
                        value={email}
                        required
                        onChange={(e) => setEmail(e.target.value)}
                        style={{ width: "100%", padding: "8px", boxSizing: "border-box", border: "1px solid" }}
                    />
                </div>

                <div>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Password</label>
                    <input
                        type="password"
                        value={password}
                        required
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ width: "100%", padding: "8px", boxSizing: "border-box", border: "1px solid" }}
                    />
                </div>

                <div>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Confirm Password</label>
                    <input
                        type="password"
                        value={confirmPassword}
                        required
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        style={{ width: "100%", padding: "8px", boxSizing: "border-box", border: "1px solid" }}
                    />
                </div>

                <div>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Gender (optional)</label>
                    <select
                        value={genderId}
                        onChange={e => setGenderId(e.target.value)}
                        style={{ width: "100%", padding: "8px", boxSizing: "border-box", border: "1px solid" }}
                    >
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="non-binary">Other</option>
                    </select>
                </div>

                <div>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Weight kg (optional)</label>
                    <input
                        type="number"
                        step="1"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        style={{ width: "100%", padding: "8px", boxSizing: "border-box", border: "1px solid" }}
                    />
                </div>

                <div>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Height cm (optional)</label>
                    <input
                        type="number"
                        step="1"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        style={{ width: "100%", padding: "8px", boxSizing: "border-box", border: "1px solid" }}
                    />
                </div>

                <div>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Birth date (optional)</label>
                    <input
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        style={{ width: "100%", padding: "8px", boxSizing: "border-box", border: "1px solid" }}
                    />
                </div>

                <div>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Profile picture URL (optional)</label>
                    <input
                        type="url"
                        value={profilePicture}
                        onChange={(e) => setProfilePicture(e.target.value)}
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
                    {isLoading ? "Registering..." : "Register"}
                </button>
            </form>
        </div>
    );
}