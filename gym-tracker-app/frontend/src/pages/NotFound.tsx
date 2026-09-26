import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/**
 * Rendered for any URL that matches no route, so a mistyped or stale link shows
 * a real page instead of React Router's blank "No routes matched location" screen.
 */
export default function NotFound() {
  const { pathname } = useLocation();
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md text-center">
        <p className="font-display text-7xl sm:text-8xl font-bold tracking-tight text-accent leading-none">
          404
        </p>

        <h1 className="font-display text-2xl font-bold tracking-tight uppercase italic text-heading mt-4">
          Page not found
        </h1>

        <p className="text-muted text-sm mt-3">
          We couldn't find anything at this address. It may have been moved, or
          the link may be incomplete.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-7">
          <Link
            to="/"
            className="rounded-xl bg-accent text-black font-bold hover:bg-accent-hover hover:scale-[1.02] active:scale-[0.98] border border-transparent px-6 py-3"
          >
            {isAuthenticated ? "Go to Dashboard" : "Go to Home"}
          </Link>

          {isAuthenticated ? (
            <Link
              to="/workouts"
              className="rounded-xl px-4 py-2 bg-elevated hover:bg-hover text-body font-bold border border-subtle text-sm self-center"
            >
              My Workouts
            </Link>
          ) : (
            <Link
              to="/login"
              className="rounded-xl px-4 py-2 bg-elevated hover:bg-hover text-body font-bold border border-subtle text-sm self-center"
            >
              Log in
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
