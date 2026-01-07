import * as THREE from 'three';
import { Model, type Vertex } from '../common/Model';

function flipVertices(vertices: Vertex[]) {
    vertices.forEach(vertex => {
        const x0 = vertex.position.x
        const y0 = vertex.position.y
        const z0 = vertex.position.z
        vertex.position.x = -y0
        vertex.position.y = -x0
        vertex.position.z = -z0
        if (vertex.normal != undefined) {
            const nx = vertex.normal.x
            const ny = vertex.normal.y
            const nz = vertex.normal.z
            vertex.normal.x = -ny
            vertex.normal.y = -nx
            vertex.normal.z = -nz
        }
    })
}


const nx =
    new THREE.Vector3(1, -1, -1).sub(new THREE.Vector3(0, 1, 1)).cross(
    new THREE.Vector3(-1, 1, -1).sub(new THREE.Vector3(0, 1, 1))
).normalize()
const ny =
    new THREE.Vector3(-1, 1, -1).sub(new THREE.Vector3(1, 1, 0)).cross(
    new THREE.Vector3(-1, -1, 1).sub(new THREE.Vector3(1, 1, 0))
).normalize()
const nz = new THREE.Vector3().crossVectors(nx, ny).normalize()

const mat = new THREE.Matrix4()
mat.makeBasis(nx, ny, nz)
const forwardMat = mat.clone()
mat.invert()

const inters = [
    new THREE.Vector3(-1/3, -1/3, -1/3),
    new THREE.Vector3(-1/3, -1/3,  1/3),
    new THREE.Vector3(-1/3,  1/3, -1/3),
    new THREE.Vector3(-1/3,  1/3,  1/3),
    new THREE.Vector3( 1/3, -1/3, -1/3),
    new THREE.Vector3( 1/3, -1/3,  1/3),
    new THREE.Vector3( 1/3,  1/3, -1/3),
    new THREE.Vector3( 1/3,  1/3,  1/3),
]
inters.forEach(
    p => p.applyMatrix4(forwardMat)
)

export function createZAxisCubon(x: number, y: number, z: number) {
    let geometry = new THREE.BufferGeometry()

    if (x=== 1 && y ===1 && z ===1) {
        return
    }

    const radius = 0.05


    if ((x === 0 && y === 0 && z === 0) || (x === 2 && y === 2 && z === 2)) {
        const model = new Model()

        const p0: Vertex = { position: new THREE.Vector3(-1, -1, -1), color: new THREE.Color(1, 0.5, 0) }
        const p1: Vertex = { position: new THREE.Vector3(0, -1, -1), color: new THREE.Color(1, 0.5, 0) }
        const p2: Vertex = { position: new THREE.Vector3(-1, 0, -1), color: new THREE.Color(1, 0.5, 0) }
        const p3: Vertex = { position: new THREE.Vector3(-1, -1, 0), color: new THREE.Color(1, 0.5, 0) }

        const p4 = { position: new THREE.Vector3(-1/3, -1/3, -1/3), color: new THREE.Color(1, 0.5, 0) }

        model.addFace([p2, p1, p0])
        model.addFace([p3, p2, p0])
        model.addFace([p1, p3, p0])

        model.addFace([p1, p2, p4])
        model.addFace([p2, p3, p4])
        model.addFace([p3, p1, p4])

        model.round(radius, true)

        if (x === 2 && y === 2 && z === 2) {
            flipVertices(Array.from(model.points))
        }
        model.toGeometry(geometry)
    }
    else if (
        (x === 1 && y === 1 && z === 2) ||
        (x === 1 && y === 2 && z === 1) ||
        (x === 2 && y === 1 && z === 1) ||

        (x === 1 && y === 1 && z === 0) ||
        (x === 1 && y === 0 && z === 1) ||
        (x === 0 && y === 1 && z === 1)
    ) {
        const model = new Model()

        const p0: Vertex = { position: new THREE.Vector3(1, 0, 1), color: new THREE.Color(1, 0, 0) }
        const p1: Vertex = { position: new THREE.Vector3(1/3, -1/3, 1), color: new THREE.Color(1, 0, 0) }
        const p2: Vertex = { position: new THREE.Vector3(1, -1, 1), color: new THREE.Color(1, 0, 0) }
        const p3: Vertex = { position: new THREE.Vector3(1, -1/3, 1/3), color: new THREE.Color(1, 0, 0) }

        const p4 = { position: inters[0b111], color: new THREE.Color(1, 0, 0) }
        const p5 = { position: inters[0b011], color: new THREE.Color(1, 0, 0) }
        const p6 = { position: inters[0b101], color: new THREE.Color(1, 0, 0) }
        const p7 = { position: inters[0b001], color: new THREE.Color(1, 0, 0) }

        model.addFace([p0, p1, p2])
        model.addFace([p2, p3, p0])

        model.addFace([p1, p0, p4, p5])
        model.addFace([p2, p1, p5, p7])
        model.addFace([p3, p2, p7, p6])
        model.addFace([p0, p3, p6, p4])

        model.addFace([p4, p6, p7, p5])

        model.round(radius, true)

        if (x + y + z === 2) {
            flipVertices(Array.from(model.points))
        }

        model.toGeometry(geometry)
        if (y === 2 || x === 0) {
            geometry.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 1, 1).normalize(), Math.PI * 4 / 3))
        }
        else if (x === 2 || z === 0) {
            geometry.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 1, 1).normalize(), Math.PI * 2 / 3))
        }
    }
    else if (
        (x === 1 && y === 2 && z === 2) ||
        (x === 2 && y === 1 && z === 2) ||
        (x === 2 && y === 2 && z === 1) ||

        (x === 0 && y === 0 && z === 1) ||
        (x === 0 && y === 1 && z === 0) ||
        (x === 1 && y === 0 && z === 0)
    ) {
        const model = new Model()

        const p0: Vertex = { position: new THREE.Vector3(-1/3, 1/3, 1), color: new THREE.Color(1, 1, 0) }
        const p1: Vertex = { position: new THREE.Vector3(1/3, -1/3, 1), color: new THREE.Color(1, 1, 0) }
        const p2: Vertex = { position: new THREE.Vector3(1, 0, 1), color: new THREE.Color(1, 1, 0) }
        const p3: Vertex = { position: new THREE.Vector3(0, 1, 1), color: new THREE.Color(1, 1, 0) }

        const p4 = { position: inters[0b011], color: new THREE.Color(1, 1, 0) }
        const p5 = { position: inters[0b111], color: new THREE.Color(1, 1, 0) }

        model.addFace([p0, p1, p2, p3])

        model.addFace([p0, p3, p5, p4])
        model.addFace([p2, p1, p4, p5])

        model.addFace([p1, p0, p4])
        model.addFace([p3, p2, p5])

        model.round(radius, true)

        if (x + y + z === 1) {
            flipVertices(Array.from(model.points))
        }

        model.toGeometry(geometry)
        if (x + y + z === 5) {
            if (y === 1) {
                geometry.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 1, 1).normalize(), Math.PI * 2 / 3))
            }
            else if (z === 1) {
                geometry.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 1, 1).normalize(), Math.PI * 4 / 3))
            }
        }
        else {
            if (y === 1) {
                geometry.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 1, 1).normalize(), Math.PI * 2 / 3))
            }
            else if (z === 1) {
                geometry.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 1, 1).normalize(), Math.PI * 4 / 3))
            }
        }
    }
    else if (
        (x === 0 && y === 2 && z === 2) ||
        (x === 2 && y === 0 && z === 2) ||
        (x === 2 && y === 2 && z === 0) ||

        (x === 2 && y === 0 && z === 0) ||
        (x === 0 && y === 2 && z === 0) ||
        (x === 0 && y === 0 && z === 2)
    ) {
        const model = new Model()

        const p0: Vertex = { position: new THREE.Vector3(1/3, -1/3, 1), color: new THREE.Color(0, 1, 0) }
        const p1: Vertex = { position: new THREE.Vector3(-1/3, 1/3, 1), color: new THREE.Color(0, 1, 0) }
        const p2: Vertex = { position: new THREE.Vector3(-1, -1, 1), color: new THREE.Color(0, 1, 0) }

        const p3: Vertex = { position: inters[0b011], color: new THREE.Color(0, 1, 0) }

        model.addFace([p0, p1, p2])
        model.addFace([p1, p0, p3])
        model.addFace([p2, p1, p3])
        model.addFace([p0, p2, p3])

        model.round(radius, true)

        if (x + y + z === 2) {
            flipVertices(Array.from(model.points))
        }

        model.toGeometry(geometry)

        if (x + y + z === 4) {
            if (y === 0) {
                geometry.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 1, 1).normalize(), Math.PI * 2 / 3))
            }
            else if (z === 0) {
                geometry.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 1, 1).normalize(), Math.PI * 4 / 3))
            }
        }
        else {
            if (y === 2) {
                geometry.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 1, 1).normalize(), Math.PI * 2 / 3))
            }
            else if (z === 2) {
                geometry.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 1, 1).normalize(), Math.PI * 4 / 3))
            }
        }
    }
    else if (
        (x === 0 && y === 1 && z === 2) ||
        (x === 2 && y === 0 && z === 1) ||
        (x === 1 && y === 2 && z === 0) ||

        (x === 0 && y === 2 && z === 1) ||
        (x === 1 && y === 0 && z === 2) ||
        (x === 2 && y === 1 && z === 0)
    ) {
        const model = new Model()

        if (x === (y + 1) % 3) {
            const p0: Vertex = { position: new THREE.Vector3(-1, -1, 1), color: new THREE.Color(0, 0, 1) }
            const p1: Vertex = { position: new THREE.Vector3(-1, 1, 1), color: new THREE.Color(0, 0, 1) }
            const p2: Vertex = { position: new THREE.Vector3(-1/3, 1/3, 1), color: new THREE.Color(0, 0, 1) }
            const p3: Vertex = { position: new THREE.Vector3(-1, -1/3, 1/3), color: new THREE.Color(0, 0, 1) }

            const p4 = { position: inters[0b010], color: new THREE.Color(0, 0, 1) }
            const p5 = { position: inters[0b011], color: new THREE.Color(0, 0, 1) }

            model.addFace([p0, p2, p1])
            model.addFace([p0, p1, p3])

            model.addFace([p2, p0, p5])
            model.addFace([p3, p1, p4])

            model.addFace([p1, p2, p5, p4])
            model.addFace([p0, p3, p4, p5])
        }
        else {
            const p0: Vertex = { position: new THREE.Vector3(-1, -1, 1), color: new THREE.Color(0, 0, 1) }
            const p1: Vertex = { position: new THREE.Vector3(1, -1, 1), color: new THREE.Color(0, 0, 1) }
            const p2: Vertex = { position: new THREE.Vector3(1/3, -1/3, 1), color: new THREE.Color(0, 0, 1) }
            const p3: Vertex = { position: new THREE.Vector3(-1/3, -1, 1/3), color: new THREE.Color(0, 0, 1) }

            const p4 = { position: inters[0b001], color: new THREE.Color(0, 0, 1) }
            const p5 = { position: inters[0b011], color: new THREE.Color(0, 0, 1) }

            model.addFace([p0, p1, p2])
            model.addFace([p1, p0, p3])

            model.addFace([p1, p3, p4])
            model.addFace([p0, p2, p5])
            model.addFace([p2, p1, p4, p5])
            model.addFace([p3, p0, p5, p4])
        }

        model.round(radius, true)

        model.toGeometry(geometry)

        if (y === 0) {
            geometry.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 1, 1).normalize(), Math.PI * 2 / 3))
        }
        else if (z === 0) {
            geometry.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 1, 1).normalize(), Math.PI * 4 / 3))
        }
    }
    else {
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(), 3))
        geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(), 3))
        geometry.computeVertexNormals()
    }

    geometry.applyMatrix4(mat)

    const material = new THREE.MeshStandardMaterial({})
    material.roughness = 0.1
    // material.roughness = 1
    // material.color = new THREE.Color(0, 0, 0)
    material.vertexColors = true
    // material.emissiveNode = normalView.mul(0.5).add(0.5)
    return {
        geometry,
        material
    }
}
