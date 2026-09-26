import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import NotFound from '../NotFound';
import { AuthProvider } from '../../contexts/AuthContext';

/** Render the page at a given URL, optionally with a token in localStorage. */
function renderAt(path: string, { authenticated = false } = {}) {
  if (authenticated) {
    localStorage.setItem('user_login_token', 'test-token');
  } else {
    localStorage.removeItem('user_login_token');
  }

  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

afterEach(() => {
  localStorage.removeItem('user_login_token');
});

describe('NotFound page', () => {
  test('shows a 404 heading', () => {
    renderAt('/home');
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument();
  });

  test('shows the path that was not found', () => {
    renderAt('/home');
    expect(screen.getByText('/home')).toBeInTheDocument();
  });

  test('offers a way back home when signed out', () => {
    renderAt('/home');
    expect(screen.getByRole('link', { name: /go to home/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /log in/i })).toHaveAttribute('href', '/login');
  });

  test('offers dashboard and workouts when signed in', () => {
    renderAt('/home', { authenticated: true });
    expect(screen.getByRole('link', { name: /go to dashboard/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /my workouts/i })).toHaveAttribute('href', '/workouts');
    expect(screen.queryByRole('link', { name: /log in/i })).not.toBeInTheDocument();
  });
});
