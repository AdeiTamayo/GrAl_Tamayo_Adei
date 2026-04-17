import { Link, useLocation } from 'react-router-dom';

type LocationState = {
    user?: { email?: string };
    email?: string;
};

export default function Hero() {
    const location = useLocation();
    const { user, email: stateEmail } = (location.state as LocationState) || {};

    // Logic: Look at localStorage first, then navigation state, then N/A
    const displayEmail = localStorage.getItem('email') || user?.email || stateEmail || 'N/A';

    const linkStyle = {
        padding: "15px",
        border: "1px solid",
        textAlign: "center" as const,
        textDecoration: "none",
        color: "inherit",
        fontWeight: "bold",
        display: "block"
    };

    return (
        <div style={{ padding: "20px", fontFamily: "Arial, sans-serif", maxWidth: "800px", margin: "40px auto" }}>
            {/* Header / User Info Area */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", paddingBottom: "15px", borderBottom: "1px solid" }}>
                <h1 style={{ margin: 0, fontWeight: "bold" }}>Fitness App</h1>
                <p style={{ margin: 0, fontWeight: "bold" }}>
                    Logged in as: <span style={{ fontWeight: "normal", fontStyle: "italic" }}>{displayEmail}</span>
                </p>
            </div>

            {/* Navigation Grid */}
            <nav style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "15px" }}>
                <Link to="/login" style={linkStyle}>Login</Link>
                <Link to="/register" style={linkStyle}>Register</Link>
                <Link to="/profile" style={linkStyle}>Profile</Link>

                <Link to="/workouts" style={linkStyle}>Workouts</Link>
                <Link to="/exercises" style={linkStyle}>Exercises</Link>
                <Link to="/videos" style={linkStyle}>Videos</Link>
                <Link to="/upload" style={linkStyle}>Upload</Link>

                <Link to="/schedule" style={linkStyle}>Schedule</Link>
                <Link to="/goals" style={linkStyle}>Goals</Link>
                <Link to="/prs" style={linkStyle}>PRs</Link>
            </nav>
        </div>
    );
}