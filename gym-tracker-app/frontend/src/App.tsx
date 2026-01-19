import { Routes, Route } from 'react-router-dom';
import Hero from './components/Hero';
import UploadVideo from './pages/UploadVideo';
import History from './pages/History';
import Profile from './pages/Profile';
import Workouts from './pages/Workouts';
import Settings from './pages/Settings';
import Exercises from './pages/Exercises';
import ExerciseDetail from './pages/ExerciseDetail';
import Stats from './pages/Stats';
import Goals from './pages/Goals';
import Schedule from './pages/Schedule';
import Login from './pages/Login';
import Register from './pages/Register';
import Video from './pages/Videos';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Hero />} />
      <Route path="/upload" element={<UploadVideo />} />
      <Route path="/history" element={<History />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/workouts" element={<Workouts />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/exercises" element={<Exercises />} />
      <Route path="/exercises/:id" element={<ExerciseDetail />} />
      <Route path="/stats" element={<Stats />} />
      <Route path="/goals" element={<Goals />} />
      <Route path="/schedule" element={<Schedule />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/videos" element={<Video />} />
    </Routes>
  );
}

export default App;
