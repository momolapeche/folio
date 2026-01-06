import * as THREE from 'three';

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

function getVertexAngle(face: Face, vertexIndex: number): number {
    const points = face.points
    const prevIndex = (vertexIndex - 1 + points.length) % points.length
    const nextIndex = (vertexIndex + 1) % points.length
    const vPrev = new THREE.Vector3().subVectors(points[prevIndex].position, points[vertexIndex].position).normalize()
    const vNext = new THREE.Vector3().subVectors(points[nextIndex].position, points[vertexIndex].position).normalize()
    return vPrev.angleTo(vNext)
}

interface RoundingEdge {
    f0: Face
    f1: Face
    f0i: number
    f1i: number
    v0: Vertex
    v1: Vertex
    delta: number
}

function createLine(center: THREE.Vector3, start: Vertex, end: Vertex, segments: number, radius: number) {
    const line: Vertex[] = [start]
    const p0 = start.position.clone().sub(center)
    const p1 = end.position.clone().sub(center)
    for (let i = 1; i < segments; i++) {
        const t = i / segments
        const n: Vertex = {
            position: p0.clone().lerp(p1, t).setLength(radius).add(center),
        }
        line.push(n)
    }
    line.push(end)
    return line;
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

    toGeometry(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
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
        const faceNormals = new Map<Face, THREE.Vector3>()
        const edges: RoundingEdge[] = []
        const corners: Map<Vertex, {normal: THREE.Vector3, faces: {face: Face, index: number}[]}> = new Map()
        const cornerCenters: Map<Vertex, THREE.Vector3> = new Map()
        const cornerLines: Map<Vertex, Vertex[][]> = new Map()

        for (const face of faces) {
            faceNormals.set(face, getFaceNormal(face))

            face.points.forEach((v, index) => {
                let corner = corners.get(v)
                if (!corner) {
                    corner = { normal: new THREE.Vector3(), faces: [] }
                    corners.set(v, corner)
                }
                corner.faces.push({ face, index })
            })
        }

        for (const corner of corners.values()) {
            let normal = corner.normal
            normal.set(0, 0, 0)
            for (const cornerFace of corner.faces) {
                const angle = getVertexAngle(cornerFace.face, cornerFace.index)
                const faceNormal = faceNormals.get(cornerFace.face)!
                normal.addScaledVector(faceNormal, angle)
            }
            normal.normalize()
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
                        console.log('edge', faceA.points[f0i] === faceB.points[f1i])
                        const edge: RoundingEdge = {
                            f0: faceA,
                            f1: faceB,
                            f0i: f0i,
                            f1i: f1i,
                            v0: faceA.points[f0i],
                            v1: faceB.points[f1i],
                            delta: delta,
                        }
                        edges.push(edge);
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
            const line0: Vertex[] = [p0]
            const line1: Vertex[] = [p1]

            const segments = 3
            for (let i = 1; i < segments; i++) {
                const theta0 = (i / segments) * angle
                const n0: Vertex = {
                    position: p0.position.clone().sub(c0.position).applyAxisAngle(axis, theta0).add(c0.position),
                }
                const n1: Vertex = {
                    position: p1.position.clone().sub(c0.position).applyAxisAngle(axis, theta0).add(c0.position),
                }
                line0.push(n0)
                line1.push(n1)
                points.push(n0)
                points.push(n1)
            }
            line0.push(p3)
            line1.push(p2)

            for (let i = 0; i < segments; i++) {
                this.addFace([
                    line0[i + 1],
                    line1[i + 1],
                    line1[i],
                    line0[i],
                ])
            }

            line1.reverse()

            if (cornerCenters.has(edge.v0) === false) {
                cornerCenters.set(edge.v0, c0.position)
            }

            if (cornerCenters.has(edge.v1) === false) {
                cornerCenters.set(edge.v1, c1.position)
            }

            if (cornerLines.has(edge.v0) === false) {
                cornerLines.set(edge.v0, [line0])
            }
            else {
                cornerLines.get(edge.v0)!.push(line0)
            }

            if (cornerLines.has(edge.v1) === false) {
                cornerLines.set(edge.v1, [line1])
            }
            else {
                cornerLines.get(edge.v1)!.push(line1)
            }

            points.forEach(p => newPoints.add(p))
        }

        const cornerSegments = 3
        const normalLines = new Map<Vertex, Vertex[]>()
        for (const corner of corners.entries()) {
            const v = corner[0]
            const info = corner[1]

            const center = cornerCenters.get(v)!
            const lines = cornerLines.get(v)!

            const pCorner: Vertex = {
                position: center.clone().addScaledVector(info.normal, radius),
                color: new THREE.Color(1, 1, 0),
            }
            newPoints.add(pCorner)

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i]

                let normalLine0 = normalLines.get(line[0])
                if (!normalLine0) {
                    normalLine0 = createLine(center, line[0], pCorner, cornerSegments, radius)
                    normalLines.set(line[0], normalLine0)
                    normalLine0.forEach(n => newPoints.add(n))
                }

                let normalLine1 = normalLines.get(line[line.length - 1])
                if (!normalLine1) {
                    normalLine1 = createLine(center, line[line.length - 1], pCorner, cornerSegments, radius)
                    normalLines.set(line[line.length - 1], normalLine1)
                    normalLine1.forEach(n => newPoints.add(n))
                }

                let lastLine = line
                for (let i = 1; i < cornerSegments; i++) {
                    const newLine: Vertex[] = [
                        normalLine0[i],
                    ]
                    const p0 = normalLine0[i].position.clone().sub(center);
                    const p1 = normalLine1[i].position.clone().sub(center);
                    for (let j = 1; j < lastLine.length - 2; j++) {
                        const t = i / (lastLine.length - 2)
                        const n: Vertex = {
                            position: p0.lerp(p1, t).setLength(radius).add(center),
                        }
                        newLine.push(n)
                        newPoints.add(n)
                    }
                    newLine.push(normalLine1[i])

                    for (let j = 0; j < newLine.length - 1; j++) {
                        this.addFace([
                            newLine[j],
                            newLine[j + 1],
                            lastLine[j + 1],
                            lastLine[j],
                        ])
                    }
                    this.addFace([
                        newLine[newLine.length - 1],
                        lastLine[lastLine.length - 1],
                        lastLine[lastLine.length - 2],
                    ])

                    lastLine = newLine
                }
                for (let j = 1; j < lastLine.length; j++) {
                    this.addFace([
                        lastLine[j],
                        lastLine[j - 1],
                        pCorner,
                    ])
                }
            }
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

        model.round(radius)

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

        model.round(radius)

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

        model.round(radius)

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

        model.round(radius)

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

        model.round(radius)

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
