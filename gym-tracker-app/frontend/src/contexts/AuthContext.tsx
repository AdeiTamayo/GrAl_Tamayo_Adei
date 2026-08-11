import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "../utils/supabaseClient";

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

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setUser(data.session?.user ?? null);
            setIsLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
