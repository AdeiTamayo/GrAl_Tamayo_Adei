import { Routes, Route } from 'react-router-dom';
import Hero from './pages/Hero';
import UploadVideo from './pages/UploadVideo';
import Profile from './pages/Profile';
import Workouts from './pages/Workouts';
import Settings from './pages/Settings';
import Exercises from './pages/Exercises';
import Goals from './pages/Goals';
import Login from './pages/Login';
import Register from './pages/Register';
import Videos from './pages/Videos';
import Prs from './pages/Prs'
import Routines from './pages/Routines';
import WeightHistory from './pages/WeightHistory';
import WorkoutCalendar from './pages/WorkoutCalendar';
import CurrentWorkout from './pages/CurrentWorkout';
import CompareWorkouts from './pages/CompareWorkouts';
import ExerciseHistory from './pages/ExerciseHistory';
import ActiveWorkoutBanner from './components/ActiveWorkoutBanner';
import ProtectedRoute from './components/ProtectedRoute';
import { useWorkout } from './components/WorkoutContext';

function AppContent() {
  const { isWorkoutActive } = useWorkout();

  return (
    <>
      <div className={isWorkoutActive ? 'pb-20' : ''}>
        <Routes>
          <Route path="/" element={<Hero />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/active-workout" element={<ProtectedRoute><CurrentWorkout /></ProtectedRoute>} />
          <Route path="/compare-workouts" element={<ProtectedRoute><CompareWorkouts /></ProtectedRoute>} />
          <Route path="/exercise-history" element={<ProtectedRoute><ExerciseHistory /></ProtectedRoute>} />
          <Route path="/upload" element={<ProtectedRoute><UploadVideo /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/workouts" element={<ProtectedRoute><Workouts /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/exercises" element={<ProtectedRoute><Exercises /></ProtectedRoute>} />
          <Route path="/goals" element={<ProtectedRoute><Goals /></ProtectedRoute>} />
          <Route path="/videos" element={<ProtectedRoute><Videos /></ProtectedRoute>} />
          <Route path="/prs" element={<ProtectedRoute><Prs /></ProtectedRoute>} />
          <Route path="/routines" element={<ProtectedRoute><Routines /></ProtectedRoute>} />
          <Route path="/weight-history" element={<ProtectedRoute><WeightHistory /></ProtectedRoute>} />
          <Route path="/workout-calendar" element={<ProtectedRoute><WorkoutCalendar /></ProtectedRoute>} />
        </Routes>
      </div>
      <ActiveWorkoutBanner />
    </>
  );
}

function App() {
  return <AppContent />;
}

export default App;
