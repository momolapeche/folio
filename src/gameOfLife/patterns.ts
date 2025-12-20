export interface GameOfLifePatternTransform {
    xDirection: number;
    yDirection: number;
    flip: boolean;
}

export interface GameOfLifePattern {
  name: string;
  width: number;
  height: number;
  data: Uint32Array;
  description?: string;
}

export const patterns: GameOfLifePattern[] = [
  {
    name: "Glider",
    width: 3,
    height: 3,
    description: "A small pattern that moves diagonally",
    data: new Uint32Array([
      0, 1, 0,
      0, 0, 1,
      1, 1, 1
    ])
  },
  {
    name: "Lightweight Spaceship",
    width: 5,
    height: 4,
    description: "A spaceship that moves horizontally",
    data: new Uint32Array([
      0, 1, 1, 1, 1,
      1, 0, 0, 0, 1,
      0, 0, 0, 0, 1,
      1, 0, 0, 1, 0
    ])
  },
  {
    name: "Middleweight Spaceship",
    width: 6,
    height: 5,
    description: "A larger spaceship",
    data: new Uint32Array([
      0, 1, 1, 1, 1, 1,
      1, 0, 0, 0, 0, 1,
      0, 0, 0, 0, 0, 1,
      1, 0, 0, 0, 1, 0,
      0, 0, 1, 0, 0, 0,
    ])
  },
  {
    name: "Blinker",
    width: 3,
    height: 1,
    description: "Oscillates between horizontal and vertical",
    data: new Uint32Array([1, 1, 1])
  },
  {
    name: "Toad",
    width: 4,
    height: 2,
    description: "A period-2 oscillator",
    data: new Uint32Array([
      0, 1, 1, 1,
      1, 1, 1, 0
    ])
  },
  {
    name: "Beacon",
    width: 4,
    height: 4,
    description: "A period-2 oscillator",
    data: new Uint32Array([
      1, 1, 0, 0,
      1, 1, 0, 0,
      0, 0, 1, 1,
      0, 0, 1, 1
    ])
  },
  {
    name: "Pulsar",
    width: 13,
    height: 13,
    description: "A large period-3 oscillator",
    data: new Uint32Array([
      0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1,
      1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1,
      1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1,
      0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0,
      1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1,
      1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1,
      1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0
    ])
  },
  {
    name: "Random",
    width: 0,
    height: 0,
    description: "Random pattern (30% density)",
    data: new Uint32Array()
  }
];
