import { Link } from 'react-router-dom';
import './Home.css';

export default function Home() {
	const projects = [
		{
			title: 'Rubik\'s Cube',
			description: 'Interactive 3D Rubik\'s Cube puzzle',
			path: '/rubiks-cube'
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
