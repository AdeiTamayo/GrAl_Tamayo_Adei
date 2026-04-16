import { Link } from 'react-router-dom';

export default function Navbar() {
    return (
        <nav style={{ padding: "20px", borderBottom: "1px solid", fontFamily: "Arial, sans-serif", marginBottom: "20px" }}>
            <Link to="/" style={{ fontWeight: "bold", textDecoration: "none", color: "inherit" }}>Home</Link>
        </nav>
    );
}