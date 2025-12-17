import { useEffect, useRef } from 'react';
import './ProjectPage.css';
import { main } from '../rubik/main';

export default function AnimatedSphere() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    main(containerRef);
  }, []);

  return (
    <div className="project-page">
      <div className="project-header">
        <h1>Animated Sphere</h1>
        <p>A morphing sphere with dynamic vertex animation</p>
      </div>
      <div ref={containerRef} className="canvas-container" />
    </div>
  );
}
