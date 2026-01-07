import { type JSX } from 'react';
import { type GameOfLifePattern, type GameOfLifePatternTransform } from '../gameOfLife/patterns';
import './PatternPreview.css';

interface PatternPreviewProps {
    pattern: GameOfLifePattern;
    transform: GameOfLifePatternTransform;
}

function PatternSVG(props: { pattern: GameOfLifePattern, transform: GameOfLifePatternTransform }): JSX.Element {
    const cellSize = 10;
    const padding = 2;
    const width = props.pattern.width;
    const height = props.pattern.height;
    const svgWidth = (props.transform.flip ? height : width) * cellSize + padding * 2;
    const svgHeight = (props.transform.flip ? width : height) * cellSize + padding * 2;

    const rects: JSX.Element[] = []
    for (let index = 0; index < props.pattern.data.length; index++) {
        const cell = props.pattern.data[index];
        if (cell !== 0) {
            rects.push(
                <rect
                    key={index}
                    x={padding + (index % props.pattern.width) * cellSize}
                    y={padding + Math.floor(index / props.pattern.width) * cellSize}
                    width={cellSize}
                height={cellSize}
                fill="#00ff88"
            />
            );
        }
    }

    const { xDirection, yDirection, flip } = props.transform;
    console.log('Transforming SVG with:', props.transform);
    const transform = `
        matrix(1 0 0 -1 0 ${svgHeight})
        matrix(${xDirection} 0 0 ${yDirection} ${xDirection === -1 ? svgWidth : 0} ${yDirection === -1 ? svgHeight : 0})
        ${flip ? `matrix(0 1 1 0 0 0)` : ""}
    `

    return (
        <svg
            width={svgWidth}
            height={svgHeight}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="pattern-preview-svg"
        >
            <g transform={transform}>
                {/* Grid background */}
                <rect
                    x={padding}
                    y={padding}
                    width={width * cellSize}
                    height={height * cellSize}
                    fill="#0a0a0a"
                    stroke="#333"
                    strokeWidth="1"
                />
                {/* Cells */}
                {rects}

                {/* Grid lines */}
                {Array.from({ length: width + 1 }).map((_, i) => (
                    <line
                        key={`v-${i}`}
                        x1={padding + i * cellSize}
                        y1={padding}
                        x2={padding + i * cellSize}
                        y2={padding + height * cellSize}
                        stroke="#222"
                        strokeWidth="0.5"
                    />
                ))}
                {Array.from({ length: height + 1 }).map((_, i) => (
                    <line
                        key={`h-${i}`}
                        x1={padding}
                        y1={padding + i * cellSize}
                        x2={padding + width * cellSize}
                        y2={padding + i * cellSize}
                        stroke="#222"
                        strokeWidth="0.5"
                    />
                ))}
            </g>
        </svg>
    );
}

export default function PatternPreview({ pattern, transform }: PatternPreviewProps) {
    const svg = <PatternSVG pattern={pattern} transform={transform} />;
    return (
        <div className="pattern-preview">
            <div className="pattern-preview-header">
                <span className="pattern-name">{pattern.name}</span>
            </div>
            {svg}
        </div>
    );
}
