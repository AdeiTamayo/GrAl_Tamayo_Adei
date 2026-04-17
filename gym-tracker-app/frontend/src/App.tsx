import { Routes, Route } from 'react-router-dom';
import Hero from './pages/Hero';
import UploadVideo from './pages/UploadVideo';
import Profile from './pages/Profile';
import Workouts from './pages/Workouts';
import Settings from './pages/Settings';
import Exercises from './pages/Exercises';
import Goals from './pages/Goals';
import Schedule from './pages/Schedule';
import Login from './pages/Login';
import Register from './pages/Register';
import Video from './pages/Videos';
import Pr from './pages/Prs'
import Routine from './pages/Routines';
function App() {
  return (
    <Routes>
      <Route path="/" element={<Hero />} />
      <Route path="/upload" element={<UploadVideo />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/workouts" element={<Workouts />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/exercises" element={<Exercises />} />
      <Route path="/goals" element={<Goals />} />
      <Route path="/schedule" element={<Schedule />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/videos" element={<Video />} />
      <Route path="/prs" element={<Pr />} />
      <Route path="/routines" element={<Routine />} />
    </Routes>
  );
}

export default App;
