import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";
import Button from "../components/Button";
import CloseButton from "../components/CloseButton";
import ErrorBanner from "../components/ErrorBanner";
import LoadingSkeleton from "../components/LoadingSkeleton";
import DatePicker from "../components/DatePicker";
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

    if (loading) return <div className="p-8"><LoadingSkeleton type="card" count={3} /></div>;

    // Clean text error format for initial fetch failures
    if (error && !profile) return <div className="p-8"><ErrorBanner message={error} /></div>;
    if (!profile || !form) return null;

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-8 mt-4 md:mt-8 relative animate-in fade-in duration-200">
            <div className="bg-card border border-subtle rounded-xl p-6 md:p-10 shadow-xl">
                {/* Header */}
                <div className="flex items-center gap-4 pb-6 border-b border-subtle/80 mb-6">
                    <div>
                        <h1 className="font-display text-4xl font-bold tracking-tight uppercase italic text-accent">
                            {profile.name} {profile.surname}
                        </h1>
                        <p className="text-muted font-medium mt-1">Manage your account details and preferences.</p>
                    </div>
                </div>

                {success && (
                    <p className="text-sm font-semibold text-accent tracking-wide animate-in fade-in duration-300 mb-4">
                        {success}
                    </p>
                )}
                {error && <ErrorBanner message={error} />}

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
                                <label className="block text-xs font-semibold text-muted mb-1.5">{label}</label>
                                {type === "number" ? (
                                    <TransparentNumericInput
                                        value={getFormValue(field)}
                                        onChange={val => handleChange(field, val)}
                                        className="w-full"
                                        inputClassName="p-3 text-body bg-surface border-subtle"
                                        max={field === "weight" ? 500 : 300}
                                        step={field === "weight" ? 0.1 : 1}
                                    />
                                ) : type === "date" ? (
                                    <DatePicker
                                        value={getFormValue(field)}
                                        onChange={(val) => handleChange(field, val)}
                                        buttonClassName="!px-3 !py-3 text-sm"
                                    />
                                ) : (
                                    <input
                                        type={type}
                                        value={getFormValue(field)}
                                        onChange={e => handleChange(field, e.target.value)}
                                        className="w-full bg-surface border border-subtle rounded-lg p-3 text-body focus:outline-none focus:border-accent transition-colors [color-scheme:dark]"
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
                            <Button
                                onClick={saveProfile}
                                disabled={saving}
                                variant="primary"
                                className="flex-1"
                            >
                                {saving ? "Saving..." : "Save changes"}
                            </Button>
                            <Button
                                onClick={cancelEdit}
                                variant="secondary"
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                onClick={() => { setEditing(true); setSuccess(null); }}
                                variant="primary"
                                className="flex-1"
                            >
                                Edit profile
                            </Button>

                            <Button
                                onClick={() => logout()}
                                variant="secondary"
                                className="flex-1"
                            >
                                Logout
                            </Button>

                            <Button
                                onClick={() => setShowDeleteModal(true)}
                                variant="danger"
                                className="flex-1"
                            >
                                Delete account
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* --- Confirm Account Deletion Modal --- */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="relative w-full max-w-md">
                        <CloseButton onClick={() => { setShowDeleteModal(false); setPasswordConfirm(""); }} />
                        <div className="w-full bg-card border border-subtle rounded-2xl p-6 md:p-8 shadow-2xl">
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
                                <Button
                                    onClick={() => { setShowDeleteModal(false); setPasswordConfirm(""); }}
                                    disabled={deleting}
                                    variant="secondary"
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={deleting || !passwordConfirm}
                                    variant="danger"
                                    className="flex-1"
                                >
                                    {deleting ? "Deleting..." : "Confirm Delete"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            )}
        </div>
    );
}