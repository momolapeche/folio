import { useEffect, useRef } from 'react';
import './ProjectPage.css';
import { main } from '../rubik/main';

const moveNames: string[][] = ["R", "L", "U", "D", "F", "B", "X", "Y", "Z"].map(m => [m, m+"2", m+"'"]);

export default function RubiksCube() {
  const containerRef = useRef<HTMLDivElement>(null);
  const tryApplyMove = useRef<(name: string) => void>(() => {
    console.log("tryApplyMove not initialized yet");
  });

  useEffect(() => {
    const ret = main(containerRef)
    if (ret) {
      tryApplyMove.current = ret.tryApplyMove
      return ret.cleanup
    }
  }, []);

  return (
    <div className="project-page rubiks-cube-page">
      <div className="project-header">
        <h1>Rubik's Cube</h1>
      </div>
      <div ref={containerRef} className="canvas-container">
      </div>
      <div className="controls">
        {moveNames.map((moveCategory) => (
          <div key={moveCategory[0]} className="move-category">
            {moveCategory.map((move) => (
              <button key={move} onClick={() => tryApplyMove.current(move)}>{move}</button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
