import { Link } from 'react-router-dom';

export default function Navbar() {
    return (
        <nav className="px-6 py-4 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <Link to="/" className="font-display text-xl font-bold tracking-tight text-zinc-100 uppercase italic hover:text-lime-400 transition-colors">
                    Home
                </Link>
            </div>
        </nav>
    );
}