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

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header / User Info Area */}
            <div className="flex justify-between items-center mb-8 pb-4 border-b">
                <h1 className="text-xl font-bold">Fitness App</h1>
                <p className="text-sm font-medium">
                    Logged in as: <span className="font-normal italic">{displayEmail}</span>
                </p>
            </div>

            {/* Navigation Grid */}
            <nav className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
                <Link to="/login" className="p-3 border text-center rounded hover:bg-gray-50">Login</Link>
                <Link to="/register" className="p-3 border text-center rounded hover:bg-gray-50">Register</Link>
                <Link to="/profile" className="p-3 border text-center rounded hover:bg-gray-50">Profile</Link>

                <Link to="/workouts" className="p-3 border text-center rounded hover:bg-gray-50">Workouts</Link>
                <Link to="/exercises" className="p-3 border text-center rounded hover:bg-gray-50">Exercises</Link>
                <Link to="/videos" className="p-3 border text-center rounded hover:bg-gray-50">Videos</Link>
                <Link to="/upload" className="p-3 border text-center rounded hover:bg-gray-50">Upload</Link>

                <Link to="/schedule" className="p-3 border text-center rounded hover:bg-gray-50">Schedule</Link>
                <Link to="/history" className="p-3 border text-center rounded hover:bg-gray-50">History</Link>
                <Link to="/goals" className="p-3 border text-center rounded hover:bg-gray-50">Goals</Link>
                <Link to="/stats" className="p-3 border text-center rounded hover:bg-gray-50">Stats</Link>
                <Link to="/prs" className="p-3 border text-center rounded hover:bg-gray-50">PRs</Link>
            </nav>
        </div>
    );
}