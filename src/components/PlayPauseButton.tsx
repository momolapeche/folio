import { useState } from 'react';
import './PlayPauseButton.css';

interface PlayPauseButtonProps {
  onToggle: (isPaused: boolean) => void;
}

export default function PlayPauseButton({ onToggle }: PlayPauseButtonProps) {
  const [isPaused, setIsPaused] = useState(true);

  const handleClick = () => {
    const newState = !isPaused;
    setIsPaused(newState);
    onToggle(newState);
  };

  return (
    <button className="play-pause-button" onClick={handleClick} title={isPaused ? 'Play' : 'Pause'}>
      {isPaused ? (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
        </svg>
      )}
    </button>
  );
}
