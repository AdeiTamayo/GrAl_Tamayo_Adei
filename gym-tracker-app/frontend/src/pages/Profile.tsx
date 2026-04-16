import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface UserProfile {
    name: string;
    surname: string;
    email: string;
    gender: string;
    weight: number | null;
    height: number | null;
    birth_date: string | null;
}

export default function Profile() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [form, setForm] = useState<UserProfile | null>(null);
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const navigate = useNavigate();

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



    async function deleteProfile() {
        try {
            const response = await fetch("http://localhost:8000/api/user/deleteProfile", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("user_login_token")}`
                },
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error || "Unknown error");
            localStorage.removeItem('user_login_token');
            localStorage.removeItem('email');
            navigate("/");

        } catch (err: any) {
            setError(err.message || "Could not delete data.");
        } finally {
            setLoading(false);
        }
    }


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
        <div style={{ padding: "20px", fontFamily: "Arial, sans-serif", maxWidth: "500px", margin: "40px auto", border: "1px solid" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "20px", paddingBottom: "20px", borderBottom: "1px solid", marginBottom: "20px" }}>
                <div>
                    <h1 style={{ margin: 0, fontWeight: "bold" }}>
                        {profile.name}{profile.surname}
                    </h1>
                </div>
            </div>

            {/* Messages */}
            {success && <p style={{ fontWeight: "bold" }}>{success}</p>}
            {error && <p style={{ fontWeight: "bold" }}>{error}</p>}

            {/* Read-only Info */}
            {!editing && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
                    {[
                        { label: "Weight", value: profile.weight ? `${profile.weight} kg` : "—" },
                        { label: "Height", value: profile.height ? `${profile.height} cm` : "—" },
                        { label: "Birthdate", value: formatBirthDate(profile.birth_date) },
                    ].map(({ label, value }) => (
                        <div key={label} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #ccc", paddingBottom: "5px" }}>
                            <strong>{label}:</strong>
                            <span>{value}</span>
                        </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #ccc", paddingBottom: "5px" }}>
                        <strong>Email: </strong>
                        <span>{profile.email}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #ccc", paddingBottom: "5px" }}>
                        <strong>Gender: </strong>
                        <span>{profile.gender ?? "—"}</span>
                    </div>
                </div>
            )}

            {/* Editable fields */}
            {editing &&
                <div style={{ display: "flex", flexDirection: "column", gap: "15px", marginBottom: "20px" }}>
                    {[
                        { label: "Name", field: "name" as keyof UserProfile, type: "text" },
                        { label: "Surname", field: "surname" as keyof UserProfile, type: "text" },
                        { label: "Weight (kg)", field: "weight" as keyof UserProfile, type: "number" },
                        { label: "Height (cm)", field: "height" as keyof UserProfile, type: "number" },
                        { label: "Birth date", field: "birth_date" as keyof UserProfile, type: "date" },
                    ].map(({ label, field, type }) => (
                        <div key={field}>
                            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>{label}</label>
                            <input
                                type={type}
                                value={getFormValue(field)}
                                onChange={e => handleChange(field, e.target.value)}
                                style={{ width: "100%", padding: "8px", boxSizing: "border-box", border: "1px solid" }}
                            />
                        </div>
                    ))}

                    {/* Gender — select */}
                    <div>
                        <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Gender</label>
                        <select
                            value={form.gender ?? ""}
                            onChange={e => handleChange("gender", e.target.value)}
                            style={{ width: "100%", padding: "8px", boxSizing: "border-box", border: "1px solid" }}
                        >
                            <option value="">—</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="non-binary">Non-binary</option>
                        </select>
                    </div>
                </div>
            }

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "10px" }}>
                {editing ? (
                    <>
                        <button
                            onClick={saveProfile}
                            disabled={saving}
                            style={{ flex: 1, padding: "10px", border: "1px solid", background: "none", cursor: saving ? "not-allowed" : "pointer", fontWeight: "bold" }}
                        >
                            {saving ? "Saving..." : "Save changes"}
                        </button>
                        <button
                            onClick={cancelEdit}
                            style={{ flex: 1, padding: "10px", border: "1px solid", background: "none", cursor: "pointer", fontWeight: "bold" }}
                        >
                            Cancel
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            onClick={() => { setEditing(true); setSuccess(null); }}
                            style={{ flex: 1, padding: "10px", border: "1px solid", background: "none", cursor: "pointer", fontWeight: "bold" }}
                        >
                            Edit profile
                        </button>
                        <button
                            onClick={deleteProfile}
                            style={{ flex: 1, padding: "10px", border: "1px solid", background: "none", cursor: "pointer", fontWeight: "bold" }}
                        >
                            Delete User
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}