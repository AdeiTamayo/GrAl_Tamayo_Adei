import { useState, FormEvent } from "react";

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

            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.success) {
                setMessage("Registration successful!");
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
        <form onSubmit={handleSubmit}>
            <h2>Register</h2>

            <h4>Name (optional)</h4>
            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
            />

            <h4>Surname (optional)</h4>
            <input
                type="text"
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
            />

            <h4>Email</h4>
            <input
                type="email"
                value={email}
                required
                onChange={(e) => setEmail(e.target.value)}
            />

            <h4>Password</h4>
            <input
                type="password"
                value={password}
                required
                onChange={(e) => setPassword(e.target.value)}
            />

            <h4>Confirm Password</h4>
            <input
                type="password"
                value={confirmPassword}
                required
                onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <h4>Gender (optional)</h4>
            <select value={genderId} onChange={e => setGenderId(e.target.value)}>
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="non-binary">Other</option>
            </select>

            <h4>Weight kg (optional)</h4>
            <input
                type="number"
                step="1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
            />

            <h4>Height cm (optional)</h4>
            <input
                type="number"
                step="1"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
            />

            <h4>Birth date (optional)</h4>
            <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
            />

            <h4>Profile picture URL (optional)</h4>
            <input
                type="url"
                value={profilePicture}
                onChange={(e) => setProfilePicture(e.target.value)}
            />

            <button type="submit" disabled={isLoading}>
                {isLoading ? "Registering..." : "Register"}
            </button>

            {message && <p>{message}</p>}
        </form >
    );
}