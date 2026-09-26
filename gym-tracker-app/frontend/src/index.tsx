import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';
import NotificationProvider from './components/NotificationProvider';
import WorkoutProvider from './components/WorkoutContext';
import ThemeProvider from './components/ThemeContext';
import SettingsProvider from './components/SettingsContext';
import { AuthProvider } from './contexts/AuthContext';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
// Provider order matters: AuthProvider must sit above any provider that reads
// user-scoped data, so those providers can wait for the session (and for
// AuthContext to create the `users` profile row) before issuing queries.
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <NotificationProvider>
          <AuthProvider>
            <SettingsProvider>
              <WorkoutProvider>
                <BrowserRouter>
                  <Navbar />
                  <App />
                </BrowserRouter>
              </WorkoutProvider>
            </SettingsProvider>
          </AuthProvider>
        </NotificationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

