import './TransformButton.css';

interface TransformButtonProps {
  onTransform: (action: 'rotateLeft' | 'rotateRight' | 'flipH' | 'flipV') => void;
}

export default function TransformButton({ onTransform }: TransformButtonProps) {
  return (
    <div className="transform-controls">
      <button 
        className="transform-button"
        onClick={() => onTransform('rotateRight')}
        title="Rotate Right 90°"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18.364 18.368 A9 9 0 1 1 18.364 5.636 L21 8" />
          <path d="M21 3 v5 h-5" />
        </svg>
      </button>
      
      <button 
        className="transform-button" 
        onClick={() => onTransform('rotateLeft')}
        title="Rotate Left 90°"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5.636 18.368 A9 9 0 1 0 5.636 5.636 L3 8" />
          <path d="M3 3 v5 h5" />
        </svg>
      </button>
      
      <button 
        className="transform-button" 
        onClick={() => onTransform('flipH')}
        title="Flip Horizontal"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h3" />
          <path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3" />
          <path d="M12 20v2" />
          <path d="M12 14v2" />
          <path d="M12 8v2" />
          <path d="M12 2v2" />
        </svg>
      </button>
      
      <button 
        className="transform-button" 
        onClick={() => onTransform('flipV')}
        title="Flip Vertical"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 8V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3" />
          <path d="M3 16v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3" />
          <path d="M20 12h2" />
          <path d="M14 12h2" />
          <path d="M8 12h2" />
          <path d="M2 12h2" />
        </svg>
      </button>
    </div>
  );
}
