import { Link } from 'react-router-dom';
import './Navigation.css';

export default function Navigation() {
  return (
    <nav className="navigation">
      <div className="nav-container">
        <Link to="/" className="nav-logo">Three.js Portfolio</Link>
        <ul className="nav-menu">
          <li><Link to="/animated-sphere">Animated Sphere</Link></li>
          <li><Link to="/game-of-life">Game of Life</Link></li>
        </ul>
      </div>
    </nav>
  );
}
