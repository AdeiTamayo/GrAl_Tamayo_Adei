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

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <NotificationProvider>
          <SettingsProvider>
          <WorkoutProvider>
            <BrowserRouter>
              < Navbar />
              <App />
            </BrowserRouter >
          </WorkoutProvider>
          </SettingsProvider>
        </NotificationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

