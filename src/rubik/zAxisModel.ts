import * as THREE from 'three';

function flipPositions(positions: Float32Array | number[]) {
    for (let i = 0; i < positions.length; i += 3) {
        const x0 = positions[i + 0]
        const y0 = positions[i + 1]
        const z0 = positions[i + 2]
        positions[i + 0] = -y0
        positions[i + 1] = -x0
        positions[i + 2] = -z0
    }
}
function flipVertices(vertices: Vertex[]) {
    vertices.forEach(vertex => {
        const x0 = vertex.position.x
        const y0 = vertex.position.y
        const z0 = vertex.position.z
        vertex.position.x = -y0
        vertex.position.y = -x0
        vertex.position.z = -z0
    })
}

interface Vertex {
    position: THREE.Vector3
    normal?: THREE.Vector3
    color?: THREE.Color
}
function cloneVertex(vertex: Vertex): Vertex {
    return {
        position: vertex.position.clone(),
        color: vertex.color ? vertex.color.clone() : undefined,
    }
}
interface Face {
    points: Vertex[]
}

function getFaceNormal(face: Face): THREE.Vector3 {
    const v0 = face.points[0].position
    const v1 = face.points[1].position
    const v2 = face.points[2].position
    return new THREE.Vector3()
        .subVectors(v1, v0)
        .cross(new THREE.Vector3().subVectors(v2, v0))
        .normalize()
}

class Model {
    points: Set<Vertex>
    faces: Set<Face>

    constructor() {
        this.points = new Set()
        this.faces = new Set()
    }

    addFace(points: Vertex[]) {
        points.forEach(p => this.points.add(p))
        this.faces.add({ points })
    }

    toGeometry(): THREE.BufferGeometry {
        const geometry = new THREE.BufferGeometry()
        const positions: number[] = []
        const colors: number[] = []
        this.faces.forEach(face => {
            for (let i = 2; i < face.points.length; i++) {
                const vertexOrder = [0, i - 1, i]
                vertexOrder.forEach(idx => {
                    const vertex = face.points[idx]
                    positions.push(vertex.position.x, vertex.position.y, vertex.position.z)
                    if (vertex.color) {
                        colors.push(vertex.color.r, vertex.color.g, vertex.color.b)
                    } else {
                        colors.push(1, 1, 1) // default color white
                    }
                })
            }
        })
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
        geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3))
        return geometry
    }

    // part du principe que les faces sont des polygones convexes et que le facteur est petit
    round(radius: number) {
        const newPoints: Set<Vertex> = new Set<Vertex>()

        const faces = Array.from(this.faces)
        const edges: {f0: Face, f1: Face, f0i: number, f1i: number, delta: number}[] = []
        const corners: Map<Vertex, {face: Face, index: number}[]> = new Map()

        for (let i = 0; i < faces.length; i++) {
            const face = faces[i]
            face.points.forEach((v, index) => {
                let arr = corners.get(v)
                if (!arr) {
                    arr = []
                    corners.set(v, arr)
                }
                arr.push({ face, index })
            })
        }

        for (let i = 0; i < faces.length; i++) {
            const faceA = faces[i]
            const ps = new Map<Vertex, number>();
            faceA.points.forEach((v, i) => {
                ps.set(v, i)
            })
            for (let j = i + 1; j < faces.length; j++) {
                const faceB = faces[j]
                if (faceA === faceB) {
                    continue
                }
                for (let f1j = 0; f1j < faceB.points.length; f1j++) {
                    const f1i = (f1j - 1 + faceB.points.length) % faceB.points.length;
                    const p = faceB.points[f1j];
                    let f0i: number | undefined

                    if (
                        (f0i = ps.get(p)) !== undefined &&
                        faceA.points[(f0i + 1) % faceA.points.length] === faceB.points[f1i]
                    ) {
                        const f0Normal = getFaceNormal(faceA)
                        const f1Normal = getFaceNormal(faceB)
                        const angle = f0Normal.angleTo(f1Normal)
                        const delta = Math.tan(angle / 2) * radius
                        edges.push({ f0: faceA, f1: faceB, f0i: f0i, f1i: f1i, delta: delta});
                    }
                }
            }
        }

        for (const face of faces) {
            const edgesDirections: THREE.Vector3[] = face.points.map((point, index) => {
                const nextPoint = face.points[(index + 1) % face.points.length]
                const edgeDir = new THREE.Vector3().subVectors(nextPoint.position, point.position).normalize()
                return edgeDir
            })
            const faceNormal = edgesDirections[0]
                .clone()
                .negate()
                .cross(edgesDirections[1])
                .normalize()
                .negate()
            
            const beveledPoints: Vertex[] = face.points.map((point, index) => {
                const nextEdge = edges.find(e =>
                    (e.f0 === face && e.f0i === index) ||
                    (e.f1 === face && e.f1i === index)
                )
                const prevEdge = edges.find(e =>
                    (e.f0 === face && e.f0i === (index + e.f0.points.length - 1) % e.f0.points.length) ||
                    (e.f1 === face && e.f1i === (index + e.f1.points.length - 1) % e.f1.points.length)
                )

                const v = cloneVertex(point)
                const prevEdgeDir = edgesDirections[(index - 1 + edgesDirections.length) % edgesDirections.length]
                    .clone().cross(faceNormal).negate()
                const nextEdgeDir = edgesDirections[index].clone().cross(faceNormal).negate()

                const o0 = prevEdge ? v.position.clone().addScaledVector(
                    prevEdgeDir,
                    prevEdge.delta
                ) : v.position.clone()
                
                const o1 = nextEdge ? v.position.clone().addScaledVector(
                    nextEdgeDir,
                    nextEdge.delta
                ) : v.position.clone()

                const d0 = edgesDirections[(index - 1 + edgesDirections.length) % edgesDirections.length]
                        .clone()
                const d1 = edgesDirections[index]
                        .clone()

                const cross = new THREE.Vector3().crossVectors(d0, d1)
                const denom = cross.lengthSq()
                if (denom === 0) {
                    v.position.copy(o0.add(o1).multiplyScalar(0.5))
                    return v
                }

                const t = new THREE.Vector3().subVectors(o1, o0).dot(new THREE.Vector3().crossVectors(d1, cross)) / denom
                v.position.copy(o0).addScaledVector(d0, t)

                return v
            })

            beveledPoints.forEach(p => newPoints.add(p))
            face.points = beveledPoints
        }

        for (const edge of edges) {
            const n0 = getFaceNormal(edge.f0)
            const n1 = getFaceNormal(edge.f1)

            const angle = n0.angleTo(n1)

            const p0 = edge.f0.points[edge.f0i]
            const p1 = edge.f0.points[(edge.f0i + 1) % edge.f0.points.length]

            const c0: Vertex = {position: p0.position.clone().addScaledVector(n0, -radius)}
            const c1: Vertex = {position: p1.position.clone().addScaledVector(n0, -radius)}

            const axis = c1.position.clone().sub(c0.position).normalize()

            const p2 = edge.f1.points[edge.f1i]
            const p3 = edge.f1.points[(edge.f1i + 1) % edge.f1.points.length]

            const points: Vertex[] = []
            const segments = 6
            for (let i = 0; i <= segments; i++) {
                const theta0 = (i / segments) * angle
                points.push({
                    position: p0.position.clone().sub(c0.position).applyAxisAngle(axis, theta0).add(c0.position),
                })
                points.push({
                    position: p1.position.clone().sub(c0.position).applyAxisAngle(axis, theta0).add(c0.position),
                })
            }

            for (let i = 0; i < segments; i++) {
                this.addFace([
                    points[i*2 + 2],
                    points[i*2 + 3],
                    points[i*2 + 1],
                    points[i*2],
                ])
            }

            points.forEach(p => newPoints.add(p))
        }

        this.points = newPoints
    }
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
    new THREE.Vector3(-1/3, -1/3, -1/3),    // 000
    new THREE.Vector3(-1/3, -1/3, 1/3),     // 001
    new THREE.Vector3(-1/3, 1/3, -1/3),     // 010
    new THREE.Vector3(-1/3, 1/3, 1/3),      // 011
    new THREE.Vector3(1/3, -1/3, -1/3),     // 100
    new THREE.Vector3(1/3, -1/3, 1/3),      // 101
    new THREE.Vector3(1/3, 1/3, -1/3),      // 110
    new THREE.Vector3(1/3, 1/3, 1/3),       // 111
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

        model.round(radius)

        if (x === 2 && y === 2 && z === 2) {
            flipVertices(Array.from(model.points))
        }
        geometry = model.toGeometry()
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

        model.addFace([p1, p0, p4, p5])
        model.addFace([p2, p1, p5, p7])
        model.addFace([p3, p2, p7, p6])
        model.addFace([p0, p3, p6, p4])

        model.addFace([p0, p1, p2])
        model.addFace([p2, p3, p0])

        model.round(radius)

        if (x + y + z === 2) {
            flipVertices(Array.from(model.points))
        }

        geometry = model.toGeometry()
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

        model.round(radius)

        if (x + y + z === 1) {
            flipVertices(Array.from(model.points))
        }

        geometry = model.toGeometry()
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

        model.round(radius)

        if (x + y + z === 2) {
            flipVertices(Array.from(model.points))
        }

        geometry = model.toGeometry()

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

        model.round(radius)

        geometry = model.toGeometry()

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
    }

    geometry.applyMatrix4(mat)

    geometry.computeVertexNormals()
    const material = new THREE.MeshStandardMaterial({})
    material.vertexColors = true
    return {
        geometry,
        material
    }
}
