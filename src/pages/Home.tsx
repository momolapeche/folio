import { Link } from 'react-router-dom';
import './Home.css';

export default function Home() {
  const projects = [
    {
      title: 'Rotating Cube',
      description: 'A basic rotating cube with colorful faces',
      path: '/rotating-cube'
    },
    {
      title: 'Particle System',
      description: 'Floating particles with mouse interaction',
      path: '/particle-system'
    },
    {
      title: 'Animated Sphere',
      description: 'A morphing sphere with dynamic geometry',
      path: '/animated-sphere'
    },
    {
      title: 'Terrain',
      description: 'Procedural terrain with lighting',
      path: '/terrain'
    },
    {
      title: 'Game of Life',
      description: 'Conway\'s Game of Life cellular automaton',
      path: '/game-of-life'
    }
  ];

  return (
    <div className="home">
      <h1>Three.js Project Portfolio</h1>
      <p className="subtitle">Explore interactive 3D projects</p>
      
      <div className="projects-grid">
        {projects.map((project) => (
          <Link key={project.path} to={project.path} className="project-card">
            <h2>{project.title}</h2>
            <p>{project.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
