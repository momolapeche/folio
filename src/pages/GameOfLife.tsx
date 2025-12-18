import { useEffect, useRef } from 'react';
import { initGameOfLife } from '../gameOfLife/main';
import './ProjectPage.css';

export default function GameOfLife() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const cleanup = initGameOfLife(containerRef.current);

    return () => {
      cleanup();
    };
  }, []);

  return (
    <div className="project-page">
      <div className="project-header">
        <h1>Game of Life</h1>
        <p>Conway's Game of Life - A cellular automaton simulation</p>
      </div>
      <div ref={containerRef} className="canvas-container" />
    </div>
  );
}
