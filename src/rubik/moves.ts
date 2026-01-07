export interface Move {
    axis: 'x' | 'y' | 'z'
    layers: number[]
    angle: number
}

function addVarients(obj: Record<string, Move>) {
    for (const key in obj) {
        const move = obj[key]
        obj[key + "'"] = { axis: move.axis, layers: move.layers, angle: -move.angle }
        obj[key + "2"] = { axis: move.axis, layers: move.layers, angle: move.angle * 2 }
    }
}

export const moves: Record<string, Move> = {
    "R": { axis: 'x', layers: [1], angle: -Math.PI / 2 },
    "L": { axis: 'x', layers: [-1], angle: Math.PI / 2 },
    "U": { axis: 'y', layers: [1], angle: -Math.PI / 2 },
    "D": { axis: 'y', layers: [-1], angle: Math.PI / 2 },
    "F": { axis: 'z', layers: [1], angle: -Math.PI / 2 },
    "B": { axis: 'z', layers: [-1], angle: Math.PI / 2 },
    "X": { axis: 'x', layers: [-1, 0, 1], angle: -Math.PI / 2 },
    "Y": { axis: 'y', layers: [-1, 0, 1], angle: -Math.PI / 2 },
    "Z": { axis: 'z', layers: [-1, 0, 1], angle: -Math.PI / 2 },
}
addVarients(moves)
