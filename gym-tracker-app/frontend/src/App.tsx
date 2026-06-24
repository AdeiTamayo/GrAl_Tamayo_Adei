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
import Video from './pages/Videos';
import Pr from './pages/Prs'
import Routine from './pages/Routines';
import WeightHistory from './pages/Weight_history';
import WorkoutCalendar from './pages/WorkoutCalendar';
import CurrentWorkout from './pages/CurrentWorkout';
import CompareWorkouts from './pages/CompareWorkouts';
import ExerciseHistory from './pages/ExerciseHistory';
import ActiveWorkoutBanner from './components/ActiveWorkoutBanner';
import { useWorkout } from './components/WorkoutContext';

function AppContent() {
  const { isWorkoutActive } = useWorkout();

  return (
    <>
      <div className={isWorkoutActive ? 'pb-20' : ''}>
        <Routes>
          <Route path="/" element={<Hero />} />
          <Route path="/active-workout" element={<CurrentWorkout />} />
          <Route path="/compare-workouts" element={<CompareWorkouts />} />
          <Route path="/exercise-history" element={<ExerciseHistory />} />
          <Route path="/upload" element={<UploadVideo />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/workouts" element={<Workouts />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/exercises" element={<Exercises />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/videos" element={<Video />} />
          <Route path="/prs" element={<Pr />} />
          <Route path="/routines" element={<Routine />} />
          <Route path="/Weight_history" element={<WeightHistory />} />
          <Route path="/workout-calendar" element={<WorkoutCalendar />} />
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
