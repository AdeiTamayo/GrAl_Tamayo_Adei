import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";
import TransparentNumericInput from "../components/TransparentNumericInput";
import Select from "../components/Select";

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
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Account deletion states
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [passwordConfirm, setPasswordConfirm] = useState("");

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

        // --- Client side Input Validation Checks ---
        if (form.weight !== null && (form.weight <= 0 || form.weight > 500)) {
            setError("Please enter a valid weight between 0.1 and 500 kg.");
            setSaving(false);
            return;
        }

        if (form.height !== null && (form.height <= 0 || form.height > 300)) {
            setError("Please enter a valid height between 1 and 300 cm.");
            setSaving(false);
            return;
        }

        if (form.birth_date) {
            const chosenDate = new Date(form.birth_date);
            const today = new Date();
            if (chosenDate > today) {
                setError("Birth date cannot be set in the future.");
                setSaving(false);
                return;
            }
        }

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
            setError("Could not save changes. " + error);
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteAccountSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!passwordConfirm) return;

        setDeleting(true);
        setError(null);

        try {
            const response = await apiFetch("/api/user/", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("user_login_token")}`
                },
                body: JSON.stringify({ password: passwordConfirm })
            });

            const result = await response.json();
            if (!result.success) throw new Error(result.error || "Incorrect password or server error.");

            localStorage.removeItem('user_login_token');
            localStorage.removeItem('email');
            navigate("/");

        } catch (err: any) {
            setError(err.message || "Could not delete account.");
            setShowDeleteModal(false);
            setPasswordConfirm("");
        } finally {
            setDeleting(false);
        }
    }

    function logout() {
        localStorage.removeItem('user_login_token');
        localStorage.removeItem('email');
        navigate("/");
    }

    function cancelEdit() {
        setForm(profile);
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

    if (loading) return <p className="text-muted p-8">Loading...</p>;

    // Clean text error format for initial fetch failures
    if (error && !profile) return <p className="text-rose-500 font-semibold p-8">{error}</p>;
    if (!profile || !form) return null;

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-8 mt-4 md:mt-8 relative">
            <div className="bg-card border border-subtle rounded-xl p-6 md:p-10 shadow-xl">
                {/* Header */}
                <div className="flex items-center gap-4 pb-6 border-b border-subtle/80 mb-6">
                    <div>
                        <h1 className="text-3xl font-display text-body uppercase tracking-tight">
                            {profile.name} {profile.surname}
                        </h1>
                        <p className="text-muted font-medium mt-1">Manage your account details and preferences.</p>
                    </div>
                </div>

                {/* Status Messages Side by Side or Stacked without Boxes */}
                <div className="flex flex-col gap-2 mb-6">
                    {success && (
                        <p className="text-sm font-semibold text-lime-400 tracking-wide animate-in fade-in duration-300">
                            {success}
                        </p>
                    )}
                    {error && (
                        <p className="text-sm font-semibold text-rose-500 tracking-wide animate-in fade-in duration-300">
                            {error}
                        </p>
                    )}
                </div>

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
                            <div key={label} className="bg-surface/50 border border-subtle/50 rounded-lg p-4 flex flex-col gap-1">
                                <strong className="text-xs uppercase tracking-wider text-dim">{label}</strong>
                                <span className="text-body font-medium text-lg">{value}</span>
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
                                <label className="block text-sm font-semibold text-muted mb-2">{label}</label>
                                {type === "number" ? (
                                    <TransparentNumericInput
                                        value={getFormValue(field)}
                                        onChange={val => handleChange(field, val)}
                                        className="w-full"
                                        inputClassName="p-3 text-body bg-surface border-subtle"
                                        max={field === "weight" ? 500 : 300}
                                        step={field === "weight" ? 0.1 : 1}
                                    />
                                ) : (
                                    <input
                                        type={type}
                                        value={getFormValue(field)}
                                        onChange={e => handleChange(field, e.target.value)}
                                        max={type === "date" ? new Date().toLocaleDateString('en-CA') : undefined}
                                        className="w-full bg-surface border border-subtle rounded-lg p-3 text-body focus:outline-none focus:border-lime-400 transition-colors [color-scheme:dark]"
                                    />
                                )}
                            </div>
                        ))}

                        <Select
                            label="Gender"
                            value={form.gender ?? ""}
                            onChange={(val) => handleChange("gender", val)}
                            options={[
                                { value: "", label: "—" },
                                { value: "male", label: "Male" },
                                { value: "female", label: "Female" },
                                { value: "non-binary", label: "Non-binary" },
                            ]}
                        />
                    </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-subtle/80">
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
                                className="flex-1 bg-transparent text-muted font-bold py-3 px-4 rounded-lg border border-subtle hover:bg-elevated transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                Cancel
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => { setEditing(true); setSuccess(null); }}
                                className="flex-1 bg-lime-400 text-black font-bold py-3 px-4 rounded-lg hover:bg-lime-300 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                Edit profile
                            </button>

                            <button
                                onClick={() => logout()}
                                className="flex-1 bg-transparent text-muted font-bold py-3 px-4 rounded-lg border border-subtle hover:bg-surface hover:text-body hover:border-hover transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                Logout
                            </button>

                            <button
                                onClick={() => setShowDeleteModal(true)}
                                className="flex-1 bg-rose-500/10 text-rose-500 font-bold py-3 px-4 rounded-lg border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                Delete account
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* --- Confirm Account Deletion Modal --- */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="relative w-full max-w-md">
                        <button
                            onClick={() => { setShowDeleteModal(false); setPasswordConfirm(""); }}
                            className="absolute -top-3 right-0 z-10 px-2.5 py-0.5 text-xs font-semibold text-lime-400 bg-card border border-lime-400/30 rounded-full shadow-sm"
                        >
                            Close
                        </button>
                        <div className="w-full bg-card border border-subtle rounded-xl p-6 md:p-8 shadow-2xl">
                        <h2 className="text-xl font-display text-rose-500 uppercase tracking-tight mb-2">Delete Account Permanently</h2>
                        <p className="text-sm text-muted mb-6 leading-relaxed">
                            This action cannot be undone. Please type your password to confirm you want to delete your profile and wipe all logged application metrics.
                        </p>

                        <form onSubmit={handleDeleteAccountSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-dim font-semibold mb-2">
                                    Account Password
                                </label>
                                <input
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    value={passwordConfirm}
                                    onChange={(e) => setPasswordConfirm(e.target.value)}
                                    className="w-full bg-surface border border-subtle rounded-lg p-3 text-body focus:outline-none focus:border-rose-500 transition-colors"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setShowDeleteModal(false); setPasswordConfirm(""); }}
                                    disabled={deleting}
                                    className="flex-1 bg-surface text-muted font-bold py-3 px-4 rounded-lg border border-subtle hover:bg-elevated transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={deleting || !passwordConfirm}
                                    className="flex-1 bg-rose-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-rose-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {deleting ? "Deleting..." : "Confirm Delete"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            )}
        </div>
    );
}