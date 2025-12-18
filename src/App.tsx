import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import RotatingCube from './pages/RotatingCube';
import ParticleSystem from './pages/ParticleSystem';
import AnimatedSphere from './pages/AnimatedSphere.tsx';
import Terrain from './pages/Terrain';
import GameOfLife from './pages/GameOfLife';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Navigation />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/rotating-cube" element={<RotatingCube />} />
        <Route path="/particle-system" element={<ParticleSystem />} />
        <Route path="/animated-sphere" element={<AnimatedSphere />} />
        <Route path="/terrain" element={<Terrain />} />
        <Route path="/game-of-life" element={<GameOfLife />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
