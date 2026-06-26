import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AuthContextValue {
    isAuthenticated: boolean;
    login: (token: string, email: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem("user_login_token"));

    useEffect(() => {
        const check = () => setIsAuthenticated(!!localStorage.getItem("user_login_token"));
        window.addEventListener("storage", check);
        return () => window.removeEventListener("storage", check);
    }, []);

    const login = (token: string, email: string) => {
        localStorage.setItem("user_login_token", token);
        localStorage.setItem("email", email);
        setIsAuthenticated(true);
    };

    const logout = () => {
        localStorage.removeItem("user_login_token");
        localStorage.removeItem("email");
        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
