import * as THREE from 'three';

function flipPositions(positions: Float32Array) {
    for (let i = 0; i < positions.length; i += 3) {
        const x0 = positions[i + 0]
        const y0 = positions[i + 1]
        const z0 = positions[i + 2]
        positions[i + 0] = -y0
        positions[i + 1] = -x0
        positions[i + 2] = -z0
    }
}

export function createZAxisCubon(x: number, y: number, z: number) {
    const geometry = new THREE.BufferGeometry()

    if ((x === 0 && y === 0 && z === 0) || (x === 2 && y === 2 && z === 2)) {
        const positions = new Float32Array([
            0, -1, -1, -1, 0, -1, -1, -1, 0,
            -1, 0, -1, 0, -1, -1, -1, -1, -1,
            -1, -1, 0, -1, 0, -1, -1, -1, -1,
            0, -1, -1, -1, -1, 0, -1, -1, -1,
        ])
        const colors = new Float32Array([
            0,0,0, 0,0,0, 0,0,0,
            1,0.5,0, 1,0.5,0, 1,0.5,0,
            0,0,1, 0,0,1, 0,0,1,
            1,1,1, 1,1,1, 1,1,1,
        ])

        if (x === 2 && y === 2 && z === 2) {
            flipPositions(positions)
        }
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    }
    else if (
        (x === 1 && y === 1 && z === 2) ||
        (x === 1 && y === 2 && z === 1) ||
        (x === 2 && y === 1 && z === 1) ||

        (x === 1 && y === 1 && z === 0) ||
        (x === 1 && y === 0 && z === 1) ||
        (x === 0 && y === 1 && z === 1)
    ) {
        const positions = new Float32Array([
            1, 0, 1,
            1/3, -1/3, 1,
            1, -1, 1,

            1, -1, 1,
            1, -1/3, 1/3,
            1, 0, 1,

            1, -1/3, 1/3,
            1/3, -1/3, 1,
            1, 0, 1,

            1/3, -1/3, 1,
            1, -1/3, 1/3,
            1, -1, 1,
        ])
        const colors = new Float32Array([
            1,0,0, 1,0,0, 1,0,0,
            0,1,0, 0,1,0, 0,1,0,
            0,0,0, 0,0,0, 0,0,0,
            0,0,0, 0,0,0, 0,0,0,
        ])

        if (x + y + z === 2) {
            flipPositions(positions)
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        if (y === 2 || x === 0) {
            geometry.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 1, 1).normalize(), Math.PI * 4 / 3))
        }
        else if (x === 2 || z === 0) {
            geometry.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 1, 1).normalize(), Math.PI * 2 / 3))
        }
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    }
    else if (
        (x === 1 && y === 2 && z === 2) ||
        (x === 2 && y === 1 && z === 2) ||
        (x === 2 && y === 2 && z === 1) ||

        (x === 0 && y === 0 && z === 1) ||
        (x === 0 && y === 1 && z === 0) ||
        (x === 1 && y === 0 && z === 0)
    ) {
        const positions = new Float32Array([
            -1/3, 1/3, 1,
            1/3, -1/3, 1,
            1, 0, 1,

            -1/3, 1/3, 1,
            1, 0, 1,
            0, 1, 1,
        ])
        const colors = new Float32Array([
            1,1,0, 1,1,0, 1,1,0,
            1,1,0, 1,1,0, 1,1,0,
        ])

        if (x + y + z === 1) {
            flipPositions(positions)
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
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
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    }
    else if (
        (x === 0 && y === 2 && z === 2) ||
        (x === 2 && y === 0 && z === 2) ||
        (x === 2 && y === 2 && z === 0) ||

        (x === 2 && y === 0 && z === 0) ||
        (x === 0 && y === 2 && z === 0) ||
        (x === 0 && y === 0 && z === 2)
    ) {
        const positions = new Float32Array([
            1/3, -1/3, 1,
            -1/3, 1/3, 1,
            -1, -1, 1,
        ])
        const colors = new Float32Array([
            1,0,0, 1,0,0, 1,0,0,
            0,1,0, 0,1,0, 0,1,0,
            0,0,0, 0,0,0, 0,0,0,
            0,0,0, 0,0,0, 0,0,0,
        ])
        if (x + y + z === 2) {
            flipPositions(positions)
        }
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
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
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    }
    else if (
        (x === 0 && y === 1 && z === 2) ||
        (x === 2 && y === 0 && z === 1) ||
        (x === 1 && y === 2 && z === 0) ||

        (x === 0 && y === 2 && z === 1) ||
        (x === 1 && y === 0 && z === 2) ||
        (x === 2 && y === 1 && z === 0)
    ) {
        const positions = new Float32Array([
            -1, -1, 1,
            1, -1, 1,
            1/3, -1/3, 1,

            1, -1, 1,
            -1, -1, 1,
            -1/3, -1, 1/3,
        ])
        const colors = new Float32Array([
            0,0,1, 0,0,1, 0,0,1,
            0,1,0, 0,1,0, 0,1,0,
        ])
        if (x === (y + 1) % 3) {
            for (let i = 0; i < positions.length; i += 9) {
                const x0 = positions[i + 0]
                const y0 = positions[i + 1]
                const z0 = positions[i + 2]
                const x1 = positions[i + 3]
                const y1 = positions[i + 4]
                const z1 = positions[i + 5]
                const x2 = positions[i + 6]
                const y2 = positions[i + 7]
                const z2 = positions[i + 8]
                positions[i + 0] = y1
                positions[i + 1] = x1
                positions[i + 2] = z1
                positions[i + 3] = y0
                positions[i + 4] = x0
                positions[i + 5] = z0
                positions[i + 6] = y2
                positions[i + 7] = x2
                positions[i + 8] = z2
            }
        }
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        if (y === 0) {
            geometry.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 1, 1).normalize(), Math.PI * 2 / 3))
        }
        else if (z === 0) {
            geometry.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 1, 1).normalize(), Math.PI * 4 / 3))
        }
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    }
    else {
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(), 3))
        geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(), 3))
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
    mat.invert()
    geometry.applyMatrix4(mat)

    geometry.computeVertexNormals()
    const material = new THREE.MeshStandardMaterial({})
    material.vertexColors = true
    return {
        geometry,
        material
    }
}
