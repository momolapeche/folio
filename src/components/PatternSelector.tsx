import { patterns, type GameOfLifePattern } from '../gameOfLife/patterns';
import './PatternSelector.css';

interface PatternSelectorProps {
    onSelectPattern: (pattern: GameOfLifePattern) => void;
}

export default function PatternSelector({ onSelectPattern }: PatternSelectorProps) {
    return (
        <div className="pattern-selector">
            <h3>Select Pattern</h3>
            <div className="pattern-grid">
                {patterns.map((pattern) => (
                    <button
                        key={pattern.name}
                        className="pattern-button"
                        onClick={() => onSelectPattern(pattern)}
                        title={pattern.description}
                    >
                        <span className="pattern-name">{pattern.name}</span>
                        {pattern.description && (
                            <span className="pattern-description">{pattern.description}</span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
