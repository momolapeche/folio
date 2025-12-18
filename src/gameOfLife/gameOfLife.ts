export class GameOfLife {
    private device: GPUDevice;
    private pipeline!: GPUComputePipeline;
    private bindGroups: GPUBindGroup[] = [];
    private buffers: GPUBuffer[] = [];
    private width: number;
    private height: number;
    private workgroupSize = 8;

    constructor(device: GPUDevice, width: number, height: number) {
        this.device = device;
        this.width = width;
        this.height = height;
    }

    async init(): Promise<void> {
        // Create shader module
        const shaderModule = this.device.createShaderModule({
            code: this.getComputeShader(),
        });

        // Create compute pipeline
        this.pipeline = this.device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: shaderModule,
                entryPoint: 'main',
            },
        });

        // Create buffers for double buffering
        const bufferSize = this.width * this.height * Uint32Array.BYTES_PER_ELEMENT;

        for (let i = 0; i < 2; i++) {
            this.buffers[i] = this.device.createBuffer({
                size: bufferSize,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
            });
        }

        // Create bind groups for double buffering
        for (let i = 0; i < 2; i++) {
            this.bindGroups[i] = this.device.createBindGroup({
                layout: this.pipeline.getBindGroupLayout(0),
                entries: [
                    {
                        binding: 0,
                        resource: { buffer: this.buffers[i] },
                    },
                    {
                        binding: 1,
                        resource: { buffer: this.buffers[(i + 1) % 2] },
                    },
                ],
            });
        }
    }

    private getComputeShader(): string {
        return `
struct Params {
    width: u32,
    height: u32,
}

@group(0) @binding(0) var<storage, read> input: array<u32>;
@group(0) @binding(1) var<storage, read_write> output: array<u32>;

const WIDTH: u32 = ${this.width}u;
const HEIGHT: u32 = ${this.height}u;

fn getCell(x: i32, y: i32) -> u32 {
    let wx = (x + i32(WIDTH)) % i32(WIDTH);
    let wy = (y + i32(HEIGHT)) % i32(HEIGHT);
    let index = u32(wy) * WIDTH + u32(wx);
    return input[index];
}

fn countNeighbors(x: i32, y: i32) -> u32 {
    var count: u32 = 0u;

    for (var dy: i32 = -1; dy <= 1; dy++) {
        for (var dx: i32 = -1; dx <= 1; dx++) {
            if (dx == 0 && dy == 0) {
                continue;
            }
            count += getCell(x + dx, y + dy);
        }
    }

    return count;
}

@compute @workgroup_size(${this.workgroupSize}, ${this.workgroupSize})
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let x = i32(global_id.x);
    let y = i32(global_id.y);

    if (global_id.x >= WIDTH || global_id.y >= HEIGHT) {
        return;
    }

    let index = global_id.y * WIDTH + global_id.x;
    let cell = input[index];
    let neighbors = countNeighbors(x, y);

    // Conway's Game of Life rules:
    // 1. Any live cell with 2 or 3 neighbors survives
    // 2. Any dead cell with exactly 3 neighbors becomes alive
    // 3. All other cells die or stay dead

    var newCell: u32 = 0u;

    if (cell == 1u) {
        // Cell is alive
        if (neighbors == 2u || neighbors == 3u) {
            newCell = 1u;
        }
    } else {
        // Cell is dead
        if (neighbors == 3u) {
            newCell = 1u;
        }
    }

    output[index] = newCell;
}
`;
    }

    async update(currentBuffer: number = 0): Promise<void> {
        const commandEncoder = this.device.createCommandEncoder();
        const passEncoder = commandEncoder.beginComputePass();

        passEncoder.setPipeline(this.pipeline);
        passEncoder.setBindGroup(0, this.bindGroups[currentBuffer]);

        const workgroupsX = Math.ceil(this.width / this.workgroupSize);
        const workgroupsY = Math.ceil(this.height / this.workgroupSize);

        passEncoder.dispatchWorkgroups(workgroupsX, workgroupsY);
        passEncoder.end();

        this.device.queue.submit([commandEncoder.finish()]);
        await this.device.queue.onSubmittedWorkDone();
    }

    async setData(data: Uint32Array, bufferIndex: number = 0): Promise<void> {
        this.device.queue.writeBuffer(this.buffers[bufferIndex], 0, data);
    }

    async getData(bufferIndex: number = 0): Promise<Uint32Array> {
        const bufferSize = this.width * this.height * Uint32Array.BYTES_PER_ELEMENT;
        const stagingBuffer = this.device.createBuffer({
            size: bufferSize,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });

        const commandEncoder = this.device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(
            this.buffers[bufferIndex],
            0,
            stagingBuffer,
            0,
            bufferSize
        );
        this.device.queue.submit([commandEncoder.finish()]);

        await stagingBuffer.mapAsync(GPUMapMode.READ);
        const data = new Uint32Array(stagingBuffer.getMappedRange().slice(0));
        stagingBuffer.unmap();
        stagingBuffer.destroy();

        return data;
    }

    randomize(bufferIndex: number = 0, probability: number = 0.3): void {
        const data = new Uint32Array(this.width * this.height);
        for (let i = 0; i < data.length; i++) {
            data[i] = Math.random() < probability ? 1 : 0;
        }
        this.setData(data, bufferIndex);
    }

    clear(bufferIndex: number = 0): void {
        const data = new Uint32Array(this.width * this.height);
        this.setData(data, bufferIndex);
    }

    destroy(): void {
        this.buffers.forEach(buffer => buffer.destroy());
    }

    getWidth(): number {
        return this.width;
    }

    getHeight(): number {
        return this.height;
    }
}
