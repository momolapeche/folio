import * as THREE from 'three'

export interface Vertex {
    position: THREE.Vector3
    normal?: THREE.Vector3
    color?: THREE.Color
}
const vertexDefaults: Partial<Vertex> = {
    color: new THREE.Color(1, 1, 1),
    normal: new THREE.Vector3(0, 0, 1),
}
export function cloneVertex(vertex: Vertex): Vertex {
    return {
        position: vertex.position.clone(),
        color: vertex.color ? vertex.color.clone() : undefined,
        normal: vertex.normal ? vertex.normal.clone() : undefined,
    }
}

export function lerpVertices(v0: Vertex, v1: Vertex, t: number): Vertex {
    return {
        position: new THREE.Vector3().lerpVectors(v0.position, v1.position, t),
        color: v0.color && v1.color ? v0.color.clone().lerp(v1.color, t) : (v0.color || v1.color)?.clone(),
        normal: v0.normal && v1.normal ? v0.normal.clone().lerp(v1.normal, t).normalize() : (v0.normal || v1.normal)?.clone(),
    }
}

export interface Face {
    points: Vertex[]
}

export function getFaceNormal(face: Face): THREE.Vector3 {
    const v0 = face.points[0].position
    const v1 = face.points[1].position
    const v2 = face.points[2].position
    return new THREE.Vector3()
        .subVectors(v1, v0)
        .cross(new THREE.Vector3().subVectors(v2, v0))
        .normalize()
}

export function getVertexAngle(face: Face, vertexIndex: number): number {
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
    for (let i = 1; i < segments; i++) {
        const t = i / segments
        const n: Vertex = lerpVertices(start, end, t)
        n.position.sub(center).setLength(radius).add(center)
        if (n.normal) {
            n.normal.copy(n.position).sub(center).normalize()
        }
        line.push(n)
    }
    line.push(end)
    return line;
}

export class Model {
    points: Set<Vertex>
    faces: Set<Face>

    constructor() {
        this.points = new Set()
        this.faces = new Set()
    }

    addFace(points: Vertex[]): Face {
        const face: Face = { points }

        points.forEach(p => this.points.add(p))
        this.faces.add(face)

        return face
    }

    removeUnusedPoints() {
        const usedPoints = new Set<Vertex>()
        for (const face of this.faces) {
            for (const point of face.points) {
                usedPoints.add(point)
            }
        }
        this.points = usedPoints
    }

    computeNormals() {
        for (const vertex of this.points) {
            vertex.normal = new THREE.Vector3(0, 0, 0)
        }
        for (const face of this.faces) {
            const normal = getFaceNormal(face)
            for (let i = 0; i < face.points.length; i++) {
                face.points[i].normal!.addScaledVector(normal, getVertexAngle(face, i))
            }
        }
        for (const vertex of this.points) {
            vertex.normal!.normalize()
        }
    }

    toGeometry(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
        const positions: number[] = []
        const colors: number[] = []
        const normals: number[] = []
        
        this.faces.forEach(face => {
            for (let i = 2; i < face.points.length; i++) {
                const vertexOrder = [0, i - 1, i]
                vertexOrder.forEach(idx => {
                    const vertex = face.points[idx]
                    positions.push(vertex.position.x, vertex.position.y, vertex.position.z)
                    if (vertex.color) {
                        colors.push(vertex.color.r, vertex.color.g, vertex.color.b)
                    } else {
                        colors.push(vertexDefaults.color!.r, vertexDefaults.color!.g, vertexDefaults.color!.b)
                    }
                    if (vertex.normal) {
                        normals.push(vertex.normal.x, vertex.normal.y, vertex.normal.z)
                    }
                    else {
                        normals.push(vertexDefaults.normal!.x, vertexDefaults.normal!.y, vertexDefaults.normal!.z)
                    }
                })
            }
        })
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
        geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3))
        geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3))
        return geometry
    }

    // part du principe que les faces sont des polygones convexes et que le rayon est petit
    round(radius: number, computeNormals: boolean) {
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
                if (computeNormals) {
                    v.normal = faceNormals.get(face)!.clone()
                }

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
                const t = i / segments
                const theta0 = t * angle

                const np0: Vertex = lerpVertices(p0, p2, t)
                np0.position = p0.position.clone().sub(c0.position).applyAxisAngle(axis, theta0).add(c0.position)
                const np1: Vertex = lerpVertices(p1, p3, t)
                np1.position = p1.position.clone().sub(c0.position).applyAxisAngle(axis, theta0).add(c0.position)
                if (computeNormals) {
                    np0.normal = n0.clone().applyAxisAngle(axis, theta0)
                    np1.normal = np0.normal.clone()
                }

                line0.push(np0)
                line1.push(np1)
                points.push(np0)
                points.push(np1)
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


            cornerLines.get(edge.v0)?.push(line0) ?? cornerLines.set(edge.v0, [line0])
            cornerLines.get(edge.v1)?.push(line1) ?? cornerLines.set(edge.v1, [line1])

            points.forEach(p => newPoints.add(p))
        }

        const cornerSegments = 3
        const normalLines = new Map<Vertex, Vertex[]>()
        for (const corner of corners.entries()) {
            const v = corner[0]
            const info = corner[1]

            const center = cornerCenters.get(v)!
            const lines = cornerLines.get(v)!

            const pCorner: Vertex = cloneVertex(v)
            pCorner.position.copy(center).addScaledVector(info.normal, radius)
            if (computeNormals) {
                pCorner.normal = info.normal.clone()
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
                    const p0 = normalLine0[i]
                    const p1 = normalLine1[i]
                    for (let j = 1; j < lastLine.length - 2; j++) {
                        const t = i / (lastLine.length - 2)
                        const n: Vertex = lerpVertices(p0, p1, t)
                        n.position.sub(center).setLength(radius).add(center)
                        if (computeNormals) {
                            n.normal = n.position.clone().sub(center).normalize()
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
