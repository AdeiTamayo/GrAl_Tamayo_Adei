import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "../utils/supabaseClient";
import { resetMyId } from "../data/client";

export interface RegisterProfile {
    name?: string | null;
    surname?: string | null;
    gender?: string | null;
    weight?: number | null;
    height?: number | null;
    birth_date?: string | null;
}

interface AuthContextValue {
    isAuthenticated: boolean;
    isLoading: boolean;
    user: User | null;
    login: (email: string, password: string) => Promise<{ error?: string }>;
    register: (
        email: string,
        password: string,
        profile?: RegisterProfile
    ) => Promise<{ error?: string; needsEmailConfirmation?: boolean }>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Create the profile row in `users` linked to the Supabase Auth user.
 * Safe to call on every sign-in: upsert with ignoreDuplicates never
 * overwrites existing profile data.
 */
async function ensureProfile(user: User) {
    const metadata = user.user_metadata || {};

    const { error } = await supabase
        .from('users')
        .upsert(
            {
                auth_id: user.id,
                email: user.email ?? '',
                name: metadata.name ?? null,
                surname: metadata.surname ?? null,
                gender: metadata.gender ?? null,
                weight: metadata.weight ?? null,
                height: metadata.height ?? null,
                birth_date: metadata.birth_date ?? null,
            },
            { onConflict: 'auth_id', ignoreDuplicates: true }
        );

    if (error) {
        console.error('[Auth] Failed to ensure profile row:', error.message);
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // The numeric `users.id` is memoised in data/client.ts for the lifetime of
    // the SPA. It must be dropped whenever the signed-in identity changes,
    // otherwise signing out and back in as someone else keeps writing rows
    // stamped with the previous account's id.
    const lastUserIdRef = useRef<string | null>(null);

    useEffect(() => {
        // Restore the session, then make sure the profile row exists BEFORE
        // anything below us queries it. SettingsProvider only waits for
        // `isLoading`, so clearing it before ensureProfile resolves re-opens
        // the "User profile not found" race on every cold start. A failure
        // must still clear loading, never hang on a blank screen.
        supabase.auth.getSession()
            .then(async ({ data }) => {
                const restored = data.session?.user ?? null;
                if (restored) {
                    lastUserIdRef.current = restored.id;
                    try {
                        await ensureProfile(restored);
                    } catch (err) {
                        console.error('[Auth] Failed to ensure profile row on restore:', err);
                    }
                }
                setUser(restored);
                setIsLoading(false);
            })
            .catch((err) => {
                console.error('[Auth] Failed to restore session:', err);
                setIsLoading(false);
            });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const nextUserId = session?.user?.id ?? null;
            if (nextUserId !== lastUserIdRef.current) {
                lastUserIdRef.current = nextUserId;
                resetMyId();
            }
            setUser(session?.user ?? null);
            if (session?.user) {
                ensureProfile(session.user);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const login = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message };
    };

    const register = async (email: string, password: string, profile: RegisterProfile = {}) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { ...profile } },
        });

        if (error) return { error: error.message };

        // If email confirmation is enabled, no session is created yet.
        return { needsEmailConfirmation: !data.session };
    };

    const logout = async () => {
        await supabase.auth.signOut();
        resetMyId();
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated: !!user, isLoading, user, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
