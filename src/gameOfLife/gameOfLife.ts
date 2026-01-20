import { ComputeNode, StorageBufferAttribute, StorageTexture, WebGPURenderer } from 'three/webgpu';
import { wgslFn, storage, instanceIndex, textureStore, uvec2, vec4, Fn, select, vec3 } from 'three/tsl';
import type { GameOfLifePattern, GameOfLifePatternTransform } from './patterns';

const clearBufferWGSL = `
@group(0) @binding(0) var<storage, read_write> buffer: array<u32>;

@compute @workgroup_size(64)
fn compute(@builtin(global_invocation_id) globalId: vec3<u32>) {
    if (globalId.x >= arrayLength(&buffer)) {
        return;
    }
    let x = u32(globalId.x);
    buffer[x] = 0u;
}
`

const tickGameOfLifeWGSL = `
@group(0) @binding(0) var<storage, read> inputBuffer: array<u32>;
@group(0) @binding(1) var<storage, read_write> outputBuffer: array<u32>;

override gridWidth: u32 = 128;
override gridHeight: u32 = 128;

@compute @workgroup_size(64)
fn computeGameOfLife(
    @builtin(global_invocation_id) globalId: vec3<u32>
) {
    let x = u32(globalId.x);
    let n = countNeighbors(i32(x % gridWidth), i32(x / gridWidth));

    let currentState = inputBuffer[x];
    if (currentState == 1u) {
        if (n == 2u || n == 3u) {
            outputBuffer[x] = 1u; // Cell survives
        } else {
            outputBuffer[x] = 0u; // Cell dies
        }
    } else {
        if (n == 3u) {
            outputBuffer[x] = 1u; // Cell becomes alive
        } else {
            outputBuffer[x] = 0u; // Cell remains dead
        }
    }
}

fn countNeighbors(x: i32, y: i32) -> u32 {
    var count: u32 = 0u;
    
    for (var dy: i32 = -1; dy <= 1; dy++) {
        for (var dx: i32 = -1; dx <= 1; dx++) {
            if (dx == 0 && dy == 0) {
                continue;
            }
            let wx = (x + dx + i32(gridWidth)) % i32(gridWidth);
            let wy = (y + dy + i32(gridHeight)) % i32(gridHeight);
            let index = u32(wy) * gridWidth + u32(wx);
            count += inputBuffer[index];
        }
    }
    
    return count;
}
`

const applyPatternWGSL = `
@group(0) @binding(0) var<storage, read_write> buffer: array<u32>;
@group(0) @binding(1) var<storage, read> patternData: array<u32>;
@group(0) @binding(2) var<uniform> params: Params;

struct Params {
    width: u32,
    height: u32,
    patternWidth: u32,
    patternHeight: u32,
    offsetX: u32,
    offsetY: u32,
    xDirection: i32,
    yDirection: i32,
    flip: u32,
};

@compute @workgroup_size(1)
fn compute() {
    for (var py: u32 = 0u; py < params.patternHeight; py++) {
        for (var px: u32 = 0u; px < params.patternWidth; px++) {
            var tx: u32;
            var ty: u32;
            if (params.flip == 0u) {
                if (params.xDirection > 0) {
                    tx = px;
                } else {
                    tx = params.patternWidth - 1u - px;
                }
                if (params.yDirection > 0) {
                    ty = py;
                } else {
                    ty = params.patternHeight - 1u - py;
                }
            } else {
                if (params.yDirection > 0) {
                    ty = px;
                } else {
                    ty = params.patternWidth - 1u - px;
                }
                if (params.xDirection > 0) {
                    tx = py;
                } else {
                    tx = params.patternHeight - 1u - py;
                }
            }
            let state = patternData[py * params.patternWidth + px];
            if (state != 0u) {
                let index = ((params.offsetY + ty) % params.height) * params.width + ((params.offsetX + tx) % params.width);
                buffer[index] = state;
            }
        }
    }
}
`

const updateDisplayWGSL = `
@group(0) @binding(0) var<storage, read> inputBuffer: array<u32>;
@group(0) @binding(1) var<storage, read_write> outputBuffer: array<u32>;

@compute @workgroup_size(64)
fn compute(@builtin(global_invocation_id) globalId: vec3<u32>) {
    let x = u32(globalId.x);
    if (x >= arrayLength(&inputBuffer)) {
        return;
    }
    let cellState = inputBuffer[x];
    if (cellState == 1u) {
        outputBuffer[x] = 0xffffffffu;
    } else {
        outputBuffer[x] = 0xff000000u;
    }
}
`


export class GameOfLife {
    private device!: GPUDevice
    private width: number
    private height: number
    private currentBuffer = 0

    private buffers!: [GPUBuffer, GPUBuffer]
    private displayBuffer!: GPUBuffer
    private patternBuffer!: GPUBuffer

    private clearShader!: {
        pipeline: GPUComputePipeline
        bindGroups: [GPUBindGroup, GPUBindGroup]
    }
    private tickShader!: {
        pipeline: GPUComputePipeline
        bindGroups: [GPUBindGroup, GPUBindGroup]
    }
    private applyPatternShader!: {
        pipeline: GPUComputePipeline
        bindGroups: [GPUBindGroup, GPUBindGroup]
        paramsBuffer: GPUBuffer
    }

    private updateDisplayShader!: {
        pipeline: GPUComputePipeline
        bindGroups: [GPUBindGroup, GPUBindGroup]
    }

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
    }

    initWGPU(device: GPUDevice) {
        this.device = device;

        this.buffers = [
            device.createBuffer({
                size: this.width * this.height * 4,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
            }),
            device.createBuffer({
                size: this.width * this.height * 4,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
            }),
        ];

        this.displayBuffer = device.createBuffer({
            size: this.width * this.height * 4,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC | GPUBufferUsage.STORAGE,
        });

        this.patternBuffer = device.createBuffer({
            size: 128 * 128 * 4, // 1MB for pattern data
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });

        this.createClearShader(device);
        this.createTickShader(device);
        this.createApplyPatternShader(device);
        this.createUpdateDisplayShader(device);
    }

    private createUpdateDisplayShader(device: GPUDevice): void {
        const updateDisplayShaderModule = device.createShaderModule({
            code: updateDisplayWGSL
        });
        const pipeline = device.createComputePipeline({
            compute: {
                module: updateDisplayShaderModule,
            },
            layout: 'auto',
        });
        const bindGroupLayout = pipeline.getBindGroupLayout(0);
        const bindGroup0 = device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: { buffer: this.buffers[0] },
                },
                {
                    binding: 1,
                    resource: { buffer: this.displayBuffer },
                },
            ],
        });
        const bindGroup1 = device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: { buffer: this.buffers[1] },
                },
                {
                    binding: 1,
                    resource: { buffer: this.displayBuffer },
                },
            ],
        });
        this.updateDisplayShader = {
            pipeline,
            bindGroups: [bindGroup0, bindGroup1],
        }
    }

    private createApplyPatternShader(device: GPUDevice): void {
        const paramsBuffer = device.createBuffer({
            label: 'ApplyPattern Params Buffer',
            size: 36, // Size of Params struct
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        const applyPatternShaderModule = device.createShaderModule({
            code: applyPatternWGSL
        });
        const pipeline = device.createComputePipeline({
            compute: {
                module: applyPatternShaderModule,
            },
            layout: 'auto',
        });

        const bindGroupLayout = pipeline.getBindGroupLayout(0);

        const bindGroup0 = device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: { buffer: this.buffers[0] },
                },
                {
                    binding: 1,
                    resource: { buffer: this.patternBuffer },
                },
                {
                    binding: 2,
                    resource: { buffer: paramsBuffer },
                },
            ],
        });
        const bindGroup1 = device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: { buffer: this.buffers[1] },
                },
                {
                    binding: 1,
                    resource: { buffer: this.patternBuffer },
                },
                {
                    binding: 2,
                    resource: { buffer: paramsBuffer },
                },
            ],
        });

        this.applyPatternShader = {
            pipeline,
            bindGroups: [bindGroup0, bindGroup1],
            paramsBuffer,
        }
    }

    private createTickShader(device: GPUDevice): void {
        const tickShaderModule = device.createShaderModule({
            code: tickGameOfLifeWGSL
        });
        const pipeline = device.createComputePipeline({
            compute: {
                module: tickShaderModule,
                constants: {
                    gridWidth: this.width,
                    gridHeight: this.height,
                }
            },
            layout: 'auto',
        });
        const bindGroupLayout = pipeline.getBindGroupLayout(0);
        const bindGroup0 = device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: { buffer: this.buffers[0] },
                },
                {
                    binding: 1,
                    resource: { buffer: this.buffers[1] },
                },
            ],
        });
        const bindGroup1 = device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: { buffer: this.buffers[1] },
                },
                {
                    binding: 1,
                    resource: { buffer: this.buffers[0] },
                },
            ],
        });
        this.tickShader = {
            pipeline,
            bindGroups: [bindGroup0, bindGroup1],
        }
    }

    private createClearShader(device: GPUDevice): void {
        const clearShaderModule = device.createShaderModule({
            code: clearBufferWGSL
        });
        const pipeline = device.createComputePipeline({
            compute: {
                module: clearShaderModule,
            },
            layout: 'auto',
        });

        const bindGroupLayout = pipeline.getBindGroupLayout(0);
        const bindGroup0 = device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: { buffer: this.buffers[0] },
                },
            ],
        });
        const bindGroup1 = device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: { buffer: this.buffers[1] },
                },
            ],
        });

        this.clearShader = {
            pipeline,
            bindGroups: [bindGroup0, bindGroup1],
        }
    }

    setPattern(renderer: WebGPURenderer, pattern: GameOfLifePattern, offsetX: number, offsetY: number, transform: GameOfLifePatternTransform): void {
        const paramsArrayBuffer = new ArrayBuffer(36);
        const paramsView = new DataView(paramsArrayBuffer);

        paramsView.setUint32(0, this.width, true);
        paramsView.setUint32(4, this.height, true);
        paramsView.setUint32(8, pattern.width, true);
        paramsView.setUint32(12, pattern.height, true);
        paramsView.setUint32(16, offsetX, true);
        paramsView.setUint32(20, offsetY, true);
        paramsView.setInt32(24, transform.xDirection, true);
        paramsView.setInt32(28, transform.yDirection, true);
        paramsView.setUint32(32, transform.flip ? 1 : 0, true);

        this.device.queue.writeBuffer(this.applyPatternShader.paramsBuffer, 0, paramsArrayBuffer);
        this.device.queue.writeBuffer(this.patternBuffer, 0, pattern.data.buffer, pattern.data.byteOffset, pattern.data.byteLength);

        const commandEncoder = this.device.createCommandEncoder();
        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(this.applyPatternShader.pipeline);
        passEncoder.setBindGroup(0, this.applyPatternShader.bindGroups[this.currentBuffer]);
        passEncoder.dispatchWorkgroups(1);
        passEncoder.end();

        this.device.queue.submit([commandEncoder.finish()]);
    }

    clear(): void {
        const device = this.device

        const commandEncoder = device.createCommandEncoder()
        const computePass = commandEncoder.beginComputePass()
        computePass.setPipeline(this.clearShader.pipeline)
        computePass.setBindGroup(0, this.clearShader.bindGroups[this.currentBuffer])
        const workgroupCount = Math.ceil((this.width * this.height) / 64)
        computePass.dispatchWorkgroups(workgroupCount)
        computePass.end()
        device.queue.submit([commandEncoder.finish()])
        // return await renderer.computeAsync(this.clearNodes[this.currentBuffer])
    }

    update(): void {
        const nextBuffer = (this.currentBuffer + 1) % 2;

        const commandEncoder = this.device.createCommandEncoder();
        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(this.tickShader.pipeline);
        passEncoder.setBindGroup(0, this.tickShader.bindGroups[this.currentBuffer]);
        const workgroupCount = Math.ceil((this.width * this.height) / 64);
        passEncoder.dispatchWorkgroups(workgroupCount);
        passEncoder.end();
        this.device.queue.submit([commandEncoder.finish()]);

        this.currentBuffer = nextBuffer;
    }

    getData(renderer: WebGPURenderer, texture: StorageTexture) {
        const textureObject = (renderer.backend as any).data.get(texture);
        if (!textureObject) {
            return
        }
        const gpuTexture: GPUTexture = textureObject.texture;

        const commandEncoder = this.device.createCommandEncoder();
        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(this.updateDisplayShader.pipeline);
        passEncoder.setBindGroup(0, this.updateDisplayShader.bindGroups[this.currentBuffer]);
        const workgroupCount = Math.ceil((this.width * this.height) / 64);
        passEncoder.dispatchWorkgroups(workgroupCount);
        passEncoder.end();
        commandEncoder.copyBufferToTexture(
            {
                buffer: this.displayBuffer,
                bytesPerRow: this.width * 4,
            },
            { texture: gpuTexture },
            [this.width, this.height, 1]
        );
        this.device.queue.submit([commandEncoder.finish()]);
    }
}
