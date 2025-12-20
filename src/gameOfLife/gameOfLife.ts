import * as THREE from 'three';
import { ComputeNode, StorageBufferAttribute, StorageTexture, TSL, WebGPURenderer } from 'three/webgpu';
import { wgslFn, storage, uint, instanceIndex, If, textureStore, ivec2, storageTexture, uvec2, float, vec4, Fn, select, vec3 } from 'three/tsl';
import type { GameOfLifePattern, GameOfLifePatternTransform } from './patterns';

// interface GameOfLifePattern {
//     name: string;
//     width: number;
//     height: number;
//     data: Uint32Array;
// }

// export const patterns: GameOfLifePattern[] = [
//     {
//         name: "Glider",
//         width: 3,
//         height: 3,
//         data: new Uint32Array([
//             0, 1, 0,
//             0, 0, 1,
//             1, 1, 1
//         ])
//     },
//     {
//         name: "Lightweight Spaceship",
//         width: 5,
//         height: 4,
//         data: new Uint32Array([
//             0, 1, 1, 1, 1,
//             1, 0, 0, 0, 1,
//             0, 0, 0, 0, 1,
//             1, 0, 0, 1, 0
//         ])
//     },
//     {
//         name: "Middleweight Spaceship",
//         width: 6,
//         height: 5,
//         data: new Uint32Array([
//             0, 1, 1, 1, 1, 1,
//             1, 0, 0, 0, 0, 1,
//             0, 0, 0, 0, 0, 1,
//             1, 0, 0, 0, 1, 0,
//             0, 0, 1, 0, 0, 0,
//         ])
//     },
// ]

export class GameOfLife {
    private width: number;
    private height: number;
    private storageBuffers: StorageBufferAttribute[] = [];
    private currentBuffer = 0;
    private updateNodes!: [ComputeNode, ComputeNode];
    private clearNodes!: [ComputeNode, ComputeNode];
    private setCellNode: any;
    private applyPatternNode: any;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.init();
    }

    private init(): void {
        // Create storage buffers for double buffering
        const size = this.width * this.height;
        
        // const bufferAttribute0 = new StorageBufferAttribute(new Uint32Array(size).map(() => Math.random() < 0.3 ? 1 : 0), 1);
        const bufferAttribute0 = new StorageBufferAttribute(new Uint32Array(size), 1);
        this.storageBuffers[0] = bufferAttribute0;
        const bufferAttribute1 = new StorageBufferAttribute(size, 1);
        this.storageBuffers[1] = bufferAttribute1;

        // Create compute node using TSL
        this.createComputeNode();
    }

    private createComputeNode(): void {
        const width = this.width;
        const height = this.height;

        const bufferStorage0 = storage(this.storageBuffers[0], 'uint', this.width * this.height);
        const bufferStorage1 = storage(this.storageBuffers[1], 'uint', this.width * this.height);

        const updateNode = wgslFn(`
            fn computeGameOfLife(
                inputBuffer: ptr<storage, array<u32>, read_write>,
                outputBuffer: ptr<storage, array<u32>, read_write>,
                globalId: vec3<u32>
            ) -> void {
                let x = u32(globalId.x);
                let n = countNeighbors(i32(x % ${width}u), i32(x / ${width}u), inputBuffer);

                let currentState = (*inputBuffer)[x];
                if (currentState == 1u) {
                    if (n == 2u || n == 3u) {
                        (*outputBuffer)[x] = 1u; // Cell survives
                    } else {
                        (*outputBuffer)[x] = 0u; // Cell dies
                    }
                } else {
                    if (n == 3u) {
                        (*outputBuffer)[x] = 1u; // Cell becomes alive
                    } else {
                        (*outputBuffer)[x] = 0u; // Cell remains dead
                    }
                }
            }
            
            fn countNeighbors(x: i32, y: i32, input: ptr<storage, array<u32>, read_write>) -> u32 {
                var count: u32 = 0u;
                
                for (var dy: i32 = -1; dy <= 1; dy++) {
                    for (var dx: i32 = -1; dx <= 1; dx++) {
                        if (dx == 0 && dy == 0) {
                            continue;
                        }
                        let wx = (x + dx + i32(${width})) % i32(${width});
                        let wy = (y + dy + i32(${height})) % i32(${height});
                        let index = u32(wy) * ${width}u + u32(wx);
                        count += (*input)[index];
                    }
                }
                
                return count;
            }
        `)

        this.updateNodes = [
            updateNode(
                bufferStorage0,
                bufferStorage1,
                instanceIndex
            ).compute(this.width * this.height),
            updateNode(
                bufferStorage1,
                bufferStorage0,
                instanceIndex
            ).compute(this.width * this.height),
        ]

        const clearNode = wgslFn(`
            fn computeGameOfLife(
                buffer: ptr<storage, array<u32>, read_write>,
                globalId: vec3<u32>
            ) -> void {
                let x = u32(globalId.x);
                (*buffer)[x] = 0u;
            }
        `)

        this.clearNodes = [
            clearNode(
                bufferStorage0,
                instanceIndex
            ).compute(this.width * this.height),
            clearNode(
                bufferStorage1,
                instanceIndex
            ).compute(this.width * this.height),
        ]

        this.setCellNode = wgslFn(`
            fn setCell(
                buffer: ptr<storage, array<u32>, read_write>,
                x: u32,
                y: u32,
                state: u32
            ) -> void {
                let index = y * ${width}u + x;
                (*buffer)[index] = state;
            }
        `)

        this.applyPatternNode = wgslFn(`
            fn applyPattern(
                buffer: ptr<storage, array<u32>, read_write>,
                patternData: ptr<storage, array<u32>, read_write>,
                patternWidth: u32,
                patternHeight: u32,
                offsetX: u32,
                offsetY: u32,
                xDirection: i32,
                yDirection: i32,
                flip: u32
            ) -> void {
                for (var py: u32 = 0u; py < patternHeight; py++) {
                    for (var px: u32 = 0u; px < patternWidth; px++) {
                        var tx: u32;
                        var ty: u32;
                        if (flip == 0u) {
                            if (xDirection > 0) {
                                tx = px;
                            } else {
                                tx = patternWidth - 1u - px;
                            }
                            if (yDirection > 0) {
                                ty = py;
                            } else {
                                ty = patternHeight - 1u - py;
                            }
                        } else {
                            if (xDirection > 0) {
                                ty = px;
                            } else {
                                ty = patternWidth - 1u - px;
                            }
                            if (yDirection > 0) {
                                tx = py;
                            } else {
                                tx = patternHeight - 1u - py;
                            }
                        }
                        let state = (*patternData)[py * patternWidth + px];
                        if (state != 0u) {
                            let index = ((offsetY + ty) % ${height}u) * ${width}u + ((offsetX + tx) % ${width}u);
                            (*buffer)[index] = state;
                        }
                    }
                }
            }
        `)
    }

    async setCell(renderer: WebGPURenderer, x: number, y: number, state: number): Promise<void> {
        const setCell = this.setCellNode;
        await renderer.computeAsync(setCell(
            storage(this.storageBuffers[this.currentBuffer], 'uint', this.width * this.height),
            x,
            y,
            state
        ).compute(1));
    }

    async setPattern(renderer: WebGPURenderer, pattern: GameOfLifePattern, offsetX: number, offsetY: number, transform: GameOfLifePatternTransform): Promise<void> {
        const applyPattern = this.applyPatternNode;
        const patternBuffer = new StorageBufferAttribute(pattern.data, 1);

        await renderer.computeAsync(applyPattern(
            storage(this.storageBuffers[this.currentBuffer], 'uint', this.width * this.height),
            storage(patternBuffer, 'uint', pattern.width * pattern.height),
            pattern.width,
            pattern.height,
            offsetX,
            offsetY,
            transform.xDirection,
            transform.yDirection,
            transform.flip ? 1 : 0
        ).compute(1));
    }

    async clear(renderer: WebGPURenderer): Promise<void> {
        return await renderer.computeAsync(this.clearNodes[this.currentBuffer]);
    }

    async update(renderer: WebGPURenderer): Promise<void> {
        const nextBuffer = (this.currentBuffer + 1) % 2;

        // Update compute node with current buffers
        await renderer.computeAsync(this.updateNodes[this.currentBuffer]);

        this.currentBuffer = nextBuffer;
    }

    async getData(renderer: WebGPURenderer, texture: StorageTexture) {
        const input = this.storageBuffers[this.currentBuffer];

        const count = this.width * this.height

        const writeTex = Fn(({storageTexture}: {storageTexture: StorageTexture}) => {

            const data = storage(input, 'uint', count)

            const x = instanceIndex.mod(this.width)
            const y = instanceIndex.div(this.width)
            const uv = uvec2(x, y)
            const cell = select(data.element(instanceIndex.x).equal(0), vec3(0,0,0), vec3(1,1,1))
            textureStore(storageTexture, uv, vec4(cell, 1.0)).toWriteOnly()
        })

        const computeNode = writeTex({storageTexture: texture}).compute(count)

        // console.log(texture)
        await renderer.computeAsync(computeNode)

        return new Uint32Array(this.storageBuffers[0].array);
    }
}
