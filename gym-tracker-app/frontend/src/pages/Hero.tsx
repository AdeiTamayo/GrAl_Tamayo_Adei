
import { Link, useLocation } from 'react-router-dom';

type LocationState = {
    user?: { email?: string };
    email?: string;
};

export default function Hero() {
    const location = useLocation();
    const { user, email } = (location.state as LocationState) || {};


    return (
        <>
            {/* Navigation */}
            <nav className='flex gap-4 mb-6'>
                <Link to="/">Home</Link>
                <Link to="/login">Login</Link>
                <Link to="/register">Register</Link>
                <Link to="/profile">Profile</Link>
                <Link to="/workouts">Workouts</Link>
                <Link to="/videos">Videos</Link>
                <Link to="/upload">Upload Video</Link>
                <Link to="/stats">Stats</Link>
                {/* <Link to="/settings">Settings</Link> */}
                <Link to="/schedule">Schedule</Link>
                <Link to="/history">History</Link>
                <Link to="/goals">Goals</Link>
                <Link to="/exercises">Exercises</Link>
            </nav>
            <p>Email: {user?.email ?? email ?? 'N/A'}</p>

        </>



    );
}