import { useEffect, useRef, useState } from 'react';
import { initGameOfLife } from '../gameOfLife/main';
import PatternSelector from '../components/PatternSelector';
import PlayPauseButton from '../components/PlayPauseButton';
import TransformButton from '../components/TransformButton';
import ClearButton from '../components/ClearButton';
import PatternPreview from '../components/PatternPreview';
import './ProjectPage.css';
import { patterns, type GameOfLifePattern, type GameOfLifePatternTransform } from '../gameOfLife/patterns';

export default function GameOfLife() {
	const containerRef = useRef<HTMLDivElement>(null);
	const eventTargetRef = useRef<EventTarget>(new EventTarget());
	const [currentPattern, setCurrentPattern] = useState<GameOfLifePattern>(patterns[0]);
	const [currentTransform, setCurrentTransform] = useState<GameOfLifePatternTransform>({
		xDirection: 1,
		yDirection: 1,
		flip: false,
	});

	useEffect(() => {
		if (!containerRef.current) return;

		const { cleanup, getInitialPattern } = initGameOfLife(containerRef.current, eventTargetRef.current);
		setCurrentPattern(getInitialPattern());

		return () => {
			cleanup();
		};
	}, []);

	const handleSelectPattern = (pattern: GameOfLifePattern) => {
		setCurrentPattern(pattern);
		eventTargetRef.current.dispatchEvent(new CustomEvent('selectPattern', { detail: { pattern } }));
	};

	const handleTogglePause = (isPaused: boolean) => {
		eventTargetRef.current.dispatchEvent(new CustomEvent('togglePause', { detail: { isPaused } }));
	};

	const handleTransfromUpdate = (event: any) => {
		setCurrentTransform(event.detail.transform);
	}
	eventTargetRef.current.addEventListener('transformUpdate', handleTransfromUpdate);

	const handleTransform = (action: 'rotateLeft' | 'rotateRight' | 'flipH' | 'flipV') => {
		eventTargetRef.current.dispatchEvent(new CustomEvent('transform', { detail: { action } }));
	};

	const handleClear = () => {
		eventTargetRef.current.dispatchEvent(new CustomEvent('clear'));
	};

	return (
		<div className="project-page game-of-life-page">
			<div className="project-header">
				<h1>Game of Life</h1>
			</div>
			<div ref={containerRef} className="canvas-container">
				<div className="controls">
					<div className="buttons">
						<PlayPauseButton onToggle={handleTogglePause} />
						<TransformButton onTransform={handleTransform} />
						<ClearButton onClear={handleClear} />
					</div>
					<PatternPreview pattern={currentPattern} transform={currentTransform} />
					<PatternSelector onSelectPattern={handleSelectPattern} />
				</div>
			</div>
		</div>
	);
}
