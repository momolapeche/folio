import { useEffect, useRef, useState } from 'react';
import { initGameOfLife } from '../gameOfLife/main';
import PatternSelector from '../components/PatternSelector';
import PlayPauseButton from '../components/PlayPauseButton';
import TransformButton from '../components/TransformButton';
import ClearButton from '../components/ClearButton';
import './ProjectPage.css';
import type { GameOfLifePattern } from '../gameOfLife/patterns';

export default function GameOfLife() {
  const containerRef = useRef<HTMLDivElement>(null);
  const eventTargetRef = useRef<EventTarget>(new EventTarget());

  useEffect(() => {
    if (!containerRef.current) return;

    const { cleanup } = initGameOfLife(containerRef.current, eventTargetRef.current);

    return () => {
      cleanup();
    };
  }, []);

  const handleSelectPattern = (pattern: GameOfLifePattern) => {
    eventTargetRef.current.dispatchEvent(new CustomEvent('selectPattern', { detail: {pattern} }));
  };

  const handleTogglePause = (isPaused: boolean) => {
    eventTargetRef.current.dispatchEvent(new CustomEvent('togglePause', { detail: { isPaused } }));
  };

  const handleTransform = (action: 'rotateLeft' | 'rotateRight' | 'flipH' | 'flipV') => {
    eventTargetRef.current.dispatchEvent(new CustomEvent('transform', { detail: { action } }));
  };

  const handleClear = () => {
    eventTargetRef.current.dispatchEvent(new CustomEvent('clear'));
  };

  return (
    <div className="project-page">
      <div className="project-header">
        <h1>Game of Life</h1>
        <p>Conway's Game of Life - A cellular automaton simulation</p>
      </div>
      <div ref={containerRef} className="canvas-container">
        <PatternSelector onSelectPattern={handleSelectPattern} />
        <PlayPauseButton onToggle={handleTogglePause} />
        <TransformButton onTransform={handleTransform} />
        <ClearButton onClear={handleClear} />
      </div>
    </div>
  );
}
