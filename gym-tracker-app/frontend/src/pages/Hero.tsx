import { Link, useLocation } from 'react-router-dom';

type LocationState = {
    user?: { email?: string };
    email?: string;
};

export default function Hero() {
    const location = useLocation();
    const { user, email: stateEmail } = (location.state as LocationState) || {};

    const displayEmail = localStorage.getItem('email') || user?.email || stateEmail || 'N/A';
    const isLoggedIn = displayEmail !== 'N/A';

    // Shared Link Style String
    const linkStyle = "block bg-lime-400 text-zinc-950 font-display font-bold tracking-wide rounded-xl px-5 py-4 text-center hover:bg-lime-300 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-[0_0_15px_rgba(163,230,53,0.2)]";

    // Dynamically build the account navigation links based on login state
    const accountLinks = isLoggedIn
        ? [{ to: "/profile", label: "Profile" }]
        : [
            { to: "/login", label: "Login" },
            { to: "/register", label: "Register" }
        ];

    const WORKSPACE_LINKS = isLoggedIn
        ? [
            { to: "/active-workout", label: "Active Workout" },
            { to: "/workouts", label: "Workouts" },
            { to: "/compare-workouts", label: "Compare" },
            { to: "/exercise-history", label: "Progress History" },
            { to: "/exercises", label: "Exercises" },
            { to: "/videos", label: "Videos" },
            { to: "/upload", label: "Upload" },
            { to: "/goals", label: "Goals" },
            { to: "/prs", label: "PRs" },
            { to: "/routines", label: "Routines" },
            { to: "/Weight_history", label: "Weight History" }
        ]
        : [];

    return (
        isLoggedIn ? (
            // --- LOGGED IN VIEW ---
            <div className="p-6 font-sans bg-black text-zinc-100 min-h-screen selection:bg-lime-400 selection:text-zinc-950">
                <div className="max-w-6xl mx-auto mt-6">
                    {/* Top Navbar Area */}
                    <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 pb-4 border-b border-zinc-800 gap-4">
                        <div>
                            <h1 className="font-display text-2xl font-bold tracking-tight text-zinc-100 uppercase italic">
                                Dashboard
                            </h1>
                            <p className="font-sans text-xs font-normal text-zinc-400 mt-1">
                                Logged in as: <span className="font-mono text-sm font-bold text-lime-400 tracking-tight ml-1">{displayEmail}</span>
                            </p>
                        </div>

                        {/* Inline Account Navbar */}
                        <nav className="flex items-center gap-3 w-full sm:w-auto">
                            {accountLinks.map((link) => (
                                <Link key={link.to} to={link.to} className={`${linkStyle} py-2 sm:py-3 text-sm min-w-[100px]`}>
                                    {link.label}
                                </Link>
                            ))}
                        </nav>
                    </header>

                    {/* Main Content Area */}
                    {WORKSPACE_LINKS && WORKSPACE_LINKS.length > 0 && (
                        <main>
                            <nav className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                {WORKSPACE_LINKS.map((link) => (
                                    <Link key={link.to} to={link.to} className={linkStyle}>
                                        {link.label}
                                    </Link>
                                ))}
                            </nav>
                        </main>
                    )}
                </div>
            </div>
        ) : (
            <div className="flex items-center justify-center min-h-screen bg-black text-zinc-100 p-4 font-sans selection:bg-lime-400 selection:text-zinc-950">
                <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-2xl p-6 md:p-8 shadow-xl text-center space-y-5">

                    {/* Header */}
                    <div className="space-y-1">
                        <h2 className="text-xl font-display font-bold uppercase tracking-tight text-zinc-200">
                            Please log in to continue
                        </h2>
                        <p className="text-xs text-zinc-500 font-medium">
                            You need to be signed in to view your dashboard.
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2.5 pt-2">
                        <Link
                            to="/login"
                            className="w-full bg-lime-400 text-black font-display font-bold tracking-wide py-3 px-6 rounded-xl hover:bg-lime-300 hover:scale-[1.01] active:scale-[0.99] transition-all"
                        >
                            Log In
                        </Link>

                        <Link
                            to="/register"
                            className="w-full bg-transparent text-zinc-400 border border-zinc-900 font-display font-bold tracking-wide py-3 px-6 rounded-xl hover:bg-zinc-900 hover:text-zinc-200 hover:scale-[1.01] active:scale-[0.99] transition-all"
                        >
                            Create an account
                        </Link>
                    </div>

                </div>
            </div>
        )
    );
}