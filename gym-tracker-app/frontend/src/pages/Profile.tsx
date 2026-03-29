import { useState, useEffect } from "react";
import { data } from "react-router-dom";

interface UserProfile {
    name: string;
    surname: string;
    email: string;
    gender: string;
    weight: number | null;
    height: number | null;
    birth_date: string | null;
    profile_picture: string | null;
}

export default function Profile() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getProfile();
    }, []);

    async function getProfile() {
        try {
            const response = await fetch("http://localhost:8000/api/profile/getProfile", {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("user_login_token")}`,
                },
            });

            if (!response.ok) throw new Error("Failed to fetch profile");

            const data = await response.json();
            setProfile(data.user);
        } catch (err) {
            setError("Could not load profile." + err);
        } finally {
            setLoading(false);
        }
    }

    function formatBirthDate(birthDate: string | null): string {
        if (!birthDate) return "—";
        const match = birthDate.match(/\d{4}-\d{2}-\d{2}/);
        return match ? match[0] : (birthDate.length >= 10 ? birthDate.slice(0, 10) : birthDate);
    }




    if (loading) return <p>Loading...</p>;
    if (error) return <p>{error}</p>;
    if (!profile) return null;

    return (
        <div>
            <div>
                {profile.profile_picture && (
                    <img src={profile.profile_picture} alt="Profile" />
                )}
                <div>
                    <h1>
                        Name and Surname: {profile.name} {profile.surname}
                    </h1>
                    <p>{profile.email}</p>
                </div>
            </div>

            <div>
                {[
                    { label: "Weight", value: profile.weight ? `${profile.weight} kg` : "—" },
                    { label: "Height", value: profile.height ? `${profile.height} cm` : "—" },
                    { label: "Birthdate", value: formatBirthDate(profile.birth_date) },
                ].map(({ label, value }) => (
                    <div key={label}>
                        <p>{label}</p>
                        <p>{value}</p>
                    </div>
                ))}
            </div>

            <div>
                {[
                    { label: "Email: ", value: profile.email },
                    { label: "Gender: ", value: profile.gender ?? "—" },
                ].map(({ label, value }) => (
                    <div key={label}>
                        <span>{label}</span>
                        <span>{value}</span>
                    </div>
                ))}
            </div>

            <div>
                <button>Edit profile</button>
                <button>Change password</button>
            </div>
        </div>
    );
}