import { useState, useEffect } from "react";

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
    const [form, setForm] = useState<UserProfile | null>(null);
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => { getProfile(); }, []);

    async function getProfile() {
        try {
            const response = await fetch("http://localhost:8000/api/user/getProfile", {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("user_login_token")}`,
                },
            });
            if (!response.ok) throw new Error("Failed to fetch profile");
            const data = await response.json();
            setProfile(data.user as UserProfile);
            setForm(data.user as UserProfile);
        } catch {
            setError("Could not load profile.");
        } finally {
            setLoading(false);
        }
    }

    async function saveProfile() {
        if (!form) return;
        setSaving(true);
        setSuccess(null);
        setError(null);
        try {
            const response = await fetch("http://localhost:8000/api/user/updateProfile", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("user_login_token")}`,
                },
                body: JSON.stringify(form),
            });
            if (!response.ok) throw new Error("Failed to save");
            setProfile(form);   // update displayed data
            setEditing(false);
            setSuccess("Profile updated successfully.");
        } catch (error) {
            setError("Could not save changes." + error);
        } finally {
            setSaving(false);
        }
    }

    /*
    async function deleteProfile() {
        try{
            const response = await fetch("http://localhost:8000/api/user/deleteProfile")
        }
    }
        */

    function cancelEdit() {
        setForm(profile);   // discard changes
        setEditing(false);
        setError(null);
    }

    function handleChange(field: keyof UserProfile, value: string) {
        setForm(prev => {
            if (!prev) return prev;
            let newVal: any = value;
            if (field === "weight" || field === "height") {
                newVal = value === "" ? null : Number(value);
            } else if (field === "birth_date") {
                newVal = value === "" ? null : value;
            } else {
                newVal = value;
            }
            return { ...prev, [field]: newVal } as UserProfile;
        });
    }

    function formatBirthDate(birthDate: string | null): string {
        if (!birthDate) return "—";
        const match = birthDate.match(/\d{4}-\d{2}-\d{2}/);
        return match ? match[0] : (birthDate.length >= 10 ? birthDate.slice(0, 10) : birthDate);
    }

    function getFormValue(field: keyof UserProfile): string {
        if (!form) return "";
        const val = (form as any)[field];
        if (val === null || val === undefined) return "";
        return String(val);
    }

    if (loading) return <p>Loading...</p>;
    if (error && !profile) return <p>{error}</p>;
    if (!profile || !form) return null;

    return (
        <div>
            {/* Header */}
            <div>
                {profile.profile_picture && (
                    <img src={profile.profile_picture} alt="Profile" />
                )}
                <div>
                    <h1>
                        {profile.name} {profile.surname}
                    </h1>
                </div>
            </div>

            {/* Info */}
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
                <div>
                    <span>Email: </span>
                    <span>{profile.email}</span>
                </div>
                <div>
                    <span>Gender: </span>
                    <span>{profile.gender ?? "—"}</span>
                </div>
            </div>

            {/* Messages */}
            {success && <p>{success}</p>}
            {error && <p>{error}</p>}

            {/* Editable fields */}
            {editing &&
                <div>
                    {[
                        { label: "Name", field: "name" as keyof UserProfile, type: "text" },
                        { label: "Surname", field: "surname" as keyof UserProfile, type: "text" },
                        { label: "Weight (kg)", field: "weight" as keyof UserProfile, type: "number" },
                        { label: "Height (cm)", field: "height" as keyof UserProfile, type: "number" },
                        { label: "Birth date", field: "birth_date" as keyof UserProfile, type: "date" },
                    ].map(({ label, field, type }) => (
                        <div key={field}>
                            <span>{label}</span>
                            {editing ? (
                                <input
                                    type={type}
                                    value={getFormValue(field)}
                                    onChange={e => handleChange(field, e.target.value)}
                                />
                            ) : (
                                <span>
                                    {field === "birth_date" ? formatBirthDate(profile.birth_date) : ((profile as any)[field] ?? "—")}
                                </span>
                            )}
                        </div>
                    ))}

                    {/* Gender — select */}
                    <div>
                        <span>Gender</span>
                        {editing ? (
                            <select
                                value={form.gender ?? ""}
                                onChange={e => handleChange("gender", e.target.value)}
                            >
                                <option value="">—</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="non-binary">Non-binary</option>
                            </select>
                        ) : (
                            <span>{profile.gender ?? "—"}</span>
                        )}
                    </div>
                </div>
            }

            {/* Action buttons */}
            <div>
                {editing ? (
                    <>
                        <button onClick={saveProfile} disabled={saving}>
                            {saving ? "Saving..." : "Save changes"}
                        </button>
                        <button onClick={cancelEdit}>Cancel</button>
                    </>
                ) : (
                    <button onClick={() => { setEditing(true); setSuccess(null); }}>
                        Edit profile
                    </button>
                )}
            </div>
        </div>
    );
}