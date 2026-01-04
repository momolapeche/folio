import * as THREE from "three"
import { WebGPURenderer } from "three/webgpu";
import { createZAxisCubon } from "./zAxisModel";

function setFaceColor(colors: Float32Array, offset: number, r: number, g: number, b: number) {
    for (let i = 0; i < 4; i++) {
        colors[offset + i * 3 + 0] = r
        colors[offset + i * 3 + 1] = g
        colors[offset + i * 3 + 2] = b
    }
}

interface Move {
    axis: 'x' | 'y' | 'z'
    layer: number
    angle: number
}

const moves: Record<string, Move> = {
    "R": { axis: 'x', layer: 1, angle: Math.PI / 2 },
    "L": { axis: 'x', layer: -1, angle: Math.PI / 2 },
    "U": { axis: 'y', layer: 1, angle: Math.PI / 2 },
    "D": { axis: 'y', layer: -1, angle: Math.PI / 2 },
    "F": { axis: 'z', layer: 1, angle: Math.PI / 2 },
    "B": { axis: 'z', layer: -1, angle: Math.PI / 2 },
}

class Cubon extends THREE.Mesh {
    originalPosition: THREE.Vector3
    originalRotation = new THREE.Quaternion()

    constructor(position: THREE.Vector3, geometry: THREE.BufferGeometry, material: THREE.Material) {
        super(geometry, material)
        this.originalPosition = position.clone()
    }
}

const qq = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(-1, 1, 0).normalize(), Math.PI)
const mm = new THREE.Matrix4().makeRotationFromQuaternion(qq)
console.log(new THREE.Matrix3().setFromMatrix4(mm));
/*
0, -1, 0
-1, 0, 0
0, 0, -1
 */


function createCube() {
    const cube = new THREE.Group()

    for (let i = 0; i < 27; i++) {
        const x = i % 3
        const y = Math.floor(i / 3) % 3
        const z = Math.floor(i / 9) % 3

        const geometry = new THREE.BoxGeometry(0.9, 0.9, 0.9)
        geometry.translate(
            x - 1,
            y - 1,
            z - 1
        )
        const colors = new Float32Array(geometry.attributes.position.count * 3)
        // RIGHT
        if (x === 2) {
            setFaceColor(colors, 0, 0, 1, 1)
        }
        // LEFT
        if (x === 0) {
            setFaceColor(colors, 12, 0, 0, 1)
        }
        // TOP
        if (y === 2) {
            setFaceColor(colors, 24, 1, 1, 0)
        }
        // BOTTOM
        if (y === 0) {
            setFaceColor(colors, 36, 1, 1, 1)
        }
        // FRONT
        if (z === 2) {
            setFaceColor(colors, 48, 1, 0, 0)
        }
        // BACK
        if (z === 0) {
            setFaceColor(colors, 60, 1, 0.5, 0)
        }
        const colorAttribute = new THREE.BufferAttribute(colors, 3)
        geometry.setAttribute('color', colorAttribute)
        const material = new THREE.MeshStandardMaterial({})
        material.vertexColors = true
        // const mesh = new Cubon(new THREE.Vector3(x - 1, y - 1, z - 1), geometry, material)
        // mesh.castShadow = true
        // mesh.receiveShadow = true

        const gm = createZAxisCubon(x, y, z)
        if (gm === undefined) {
            continue
        }
        const mesh = new Cubon(new THREE.Vector3(x - 1, y - 1, z - 1), gm.geometry, gm.material)
        mesh.castShadow = true
        mesh.receiveShadow = true
        cube.add(mesh)
    }

    return cube
}

export function main(containerRef: React.RefObject<HTMLDivElement | null>) {
    if (!containerRef.current || containerRef.current.firstChild !== null) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 5;

    // Renderer
    const renderer = new WebGPURenderer({
        antialias: true,
    });
    renderer.shadowMap.enabled = true;
    renderer.init().then(() => {
        requestAnimationFrame(animate)
    })
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    containerRef.current.appendChild(renderer.domElement);

    // Lighting
    const pointLight = new THREE.PointLight(0xffffff, 20);
    pointLight.castShadow = true;
    pointLight.shadow.mapSize.width = 1024;
    pointLight.shadow.mapSize.height = 1024;
    pointLight.shadow.bias = -0.0001;
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({color: 0xffffff});
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2;
    ground.receiveShadow = true;
    scene.add(ground);

    const cube = createCube()
    scene.add(cube)

    let currentMove: {
        cubons: Cubon[]
        axis: THREE.Vector3
        angle: number
        progress: number
    } | null = null;

    let then = 0;
    const animate = (now: number) => {
        now /= 1000
        const deltaTime = now - then;
        then = now;

        // cube.rotation.x = now * 0.3;
        // cube.rotation.y = -now * 0.8;
        // cube.rotation.y = -3;
        // cube.rotation.x = 0.7;
        if (currentMove) {
            currentMove.progress += Math.abs(deltaTime * 3)
            if (currentMove.progress >= 1) {
                currentMove.cubons.forEach((child) => {
                    const cubon = child as Cubon
                    const axis = currentMove!.axis
                    const quaternion = new THREE.Quaternion().setFromAxisAngle(axis, currentMove!.angle)
                    cubon.quaternion.multiplyQuaternions(quaternion, cubon.originalRotation)
                    cubon.quaternion.x = Math.round(cubon.quaternion.x * 10) / 10
                    cubon.quaternion.y = Math.round(cubon.quaternion.y * 10) / 10
                    cubon.quaternion.z = Math.round(cubon.quaternion.z * 10) / 10
                    cubon.quaternion.w = Math.round(cubon.quaternion.w * 10) / 10
                    cubon.quaternion.normalize()
                })
                currentMove = null
            }
            else {
                const angle = currentMove.angle * currentMove.progress
                currentMove.cubons.forEach((child) => {
                    const cubon = child as Cubon
                    const axis = currentMove!.axis
                    const quaternion = new THREE.Quaternion().setFromAxisAngle(axis, angle)
                    cubon.quaternion.multiplyQuaternions(quaternion, cubon.originalRotation)
                })
            }
        }

        
        renderer.render(scene, camera);

        requestAnimationFrame(animate);
    };

    const onKeyDown = (event: KeyboardEvent) => {
        const move = moves[event.key.toUpperCase()]
        if (!move || currentMove !== null) return;

        const tmpVec3 = new THREE.Vector3()
        const layerCubons = cube.children.filter((child) => {
            const cubon = child as Cubon
            if (move.axis === 'x') {
                return Math.round(tmpVec3.copy(cubon.originalPosition).applyQuaternion(cubon.quaternion).x) === move.layer
            } else if (move.axis === 'y') {
                return Math.round(tmpVec3.copy(cubon.originalPosition).applyQuaternion(cubon.quaternion).y) === move.layer
            } else { // 'z'
                return Math.round(tmpVec3.copy(cubon.originalPosition).applyQuaternion(cubon.quaternion).z) === move.layer
            }
        })

        layerCubons.forEach((child) => {
            const cubon = child as Cubon
            cubon.originalRotation.copy(cubon.quaternion)
        })
        currentMove = {
            cubons: layerCubons as Cubon[],
            axis: move.axis === 'x' ? new THREE.Vector3(1, 0, 0) :
                  move.axis === 'y' ? new THREE.Vector3(0, 1, 0) :
                  new THREE.Vector3(0, 0, 1),
            angle: move.angle,
            progress: 0,
        }
    }
    window.addEventListener('keydown', onKeyDown);

    // Handle resize
    const handleResize = () => {
        if (!containerRef.current) return;
        camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    console.log("setup complete")

    // Cleanup
    return () => {
        console.log("cleanup")
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('keydown', onKeyDown);
        containerRef.current?.removeChild(renderer.domElement);
        renderer.dispose();
    };
}