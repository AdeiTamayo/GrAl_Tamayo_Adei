import { Link } from 'react-router-dom';

export default function Navbar() {
    return (
        <nav>
            <Link to="/" className='p-6 font-extrabold hover: underline'>Home</Link>
        </nav>

    );
}
