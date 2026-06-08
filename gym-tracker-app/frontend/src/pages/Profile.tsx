import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";
import TransparentNumericInput from "../components/TransparentNumericInput";

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
            const response = await apiFetch("/api/user/", {
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
            const response = await apiFetch("/api/user", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("user_login_token")}`,
                },
                body: JSON.stringify(form),
            });
            if (!response.ok) throw new Error("Failed to save");
            setProfile(form);
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
            const response = await apiFetch("/api/user/", {
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

    function logout() {
        localStorage.removeItem('user_login_token');
        localStorage.removeItem('email');
        navigate("/");
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
        if (field === "birth_date") {
            return formatBirthDate(val);
        }
        return String(val);
    }

    if (loading) return <p>Loading...</p>;
    if (error && !profile) return <p>{error}</p>;
    if (!profile || !form) return null;

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-8 mt-4 md:mt-8">
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 md:p-10 shadow-xl">
                {/* Header */}
                <div className="flex items-center gap-4 pb-6 border-b border-zinc-800/80 mb-6">
                    <div>
                        <h1 className="text-3xl font-display text-zinc-100 uppercase tracking-tight">
                            {profile.name} {profile.surname}
                        </h1>
                        <p className="text-zinc-400 font-medium mt-1">Manage your account details and preferences.</p>
                    </div>
                </div>

                {/* Messages */}
                {success && <div className="mb-6 p-4 bg-lime-400/10 border border-lime-400/20 text-lime-400 rounded-lg font-medium text-sm">{success}</div>}
                {error && <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg font-medium text-sm">{error}</div>}

                {/* Read-only Info */}
                {!editing && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        {[
                            { label: "Email", value: profile.email },
                            { label: "Weight", value: profile.weight ? `${profile.weight} kg` : "—" },
                            { label: "Height", value: profile.height ? `${profile.height} cm` : "—" },
                            { label: "Birthdate", value: formatBirthDate(profile.birth_date) },
                            { label: "Gender", value: profile.gender ?? "—" },
                        ].map(({ label, value }) => (
                            <div key={label} className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-4 flex flex-col gap-1">
                                <strong className="text-xs uppercase tracking-wider text-zinc-500">{label}</strong>
                                <span className="text-zinc-100 font-medium text-lg">{value}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Editable fields */}
                {editing && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                        {[
                            { label: "Name", field: "name" as keyof UserProfile, type: "text" },
                            { label: "Surname", field: "surname" as keyof UserProfile, type: "text" },
                            { label: "Weight (kg)", field: "weight" as keyof UserProfile, type: "number" },
                            { label: "Height (cm)", field: "height" as keyof UserProfile, type: "number" },
                            { label: "Birth date", field: "birth_date" as keyof UserProfile, type: "date" },
                        ].map(({ label, field, type }) => (
                            <div key={field}>
                                <label className="block text-sm font-semibold text-zinc-400 mb-2">{label}</label>
                                {type === "number" ? (
                                    <TransparentNumericInput
                                        value={getFormValue(field)}
                                        onChange={val => handleChange(field, val)}
                                        className="w-full"
                                        inputClassName="p-3 text-zinc-100 bg-zinc-900 border-zinc-800"
                                        max={field === "weight" ? 500 : 300}
                                        step={field === "weight" ? 0.1 : 1}
                                    />
                                ) : (
                                    <input
                                        type={type}
                                        value={getFormValue(field)}
                                        onChange={e => handleChange(field, e.target.value)}
                                        max={type === "date" ? new Date().toLocaleDateString('en-CA') : undefined}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-zinc-100 focus:outline-none focus:border-lime-400 transition-colors [color-scheme:dark]"
                                    />
                                )}
                            </div>
                        ))}

                        {/* Gender — select */}
                        <div>
                            <label className="block text-sm font-semibold text-zinc-400 mb-2">Gender</label>
                            <select
                                value={form.gender ?? ""}
                                onChange={e => handleChange("gender", e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-zinc-100 focus:outline-none focus:border-lime-400 transition-colors appearance-none"
                            >
                                <option value="">—</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="non-binary">Non-binary</option>
                            </select>
                        </div>
                    </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-zinc-800/80">
                    {editing ? (
                        <>
                            <button
                                onClick={saveProfile}
                                disabled={saving}
                                className="flex-1 bg-lime-400 text-black font-bold py-3 px-4 rounded-lg hover:bg-lime-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {saving ? "Saving..." : "Save changes"}
                            </button>
                            <button
                                onClick={cancelEdit}
                                className="flex-1 bg-transparent text-zinc-300 font-bold py-3 px-4 rounded-lg border border-zinc-700 hover:bg-zinc-800 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                Cancel
                            </button>
                        </>
                    ) : (
                        <>
                            {/* Primary Action */}
                            <button
                                onClick={() => { setEditing(true); setSuccess(null); }}
                                className="flex-1 bg-lime-400 text-black font-bold py-3 px-4 rounded-lg hover:bg-lime-300 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                Edit profile
                            </button>

                            {/* Modified Secondary Action (Logout) */}
                            <button
                                onClick={() => { logout(); console.log("logout option selected"); }}
                                className="flex-1 bg-transparent text-zinc-300 font-bold py-3 px-4 rounded-lg border border-zinc-800 hover:bg-zinc-900 hover:text-zinc-100 hover:border-zinc-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                Logout
                            </button>

                            {/* Danger Action */}
                            <button
                                onClick={deleteProfile}
                                className="flex-1 bg-rose-500/10 text-rose-500 font-bold py-3 px-4 rounded-lg border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                Delete account
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}