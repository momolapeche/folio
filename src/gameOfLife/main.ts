import * as THREE from 'three';
import { GameOfLife } from './gameOfLife';
import { StorageTexture, WebGPURenderer } from 'three/webgpu';
import { patterns, type GameOfLifePatternTransform } from './patterns';

export function initGameOfLife(container: HTMLElement, eventTarget: EventTarget) {
    // Renderer
    const renderer = new WebGPURenderer({ antialias: true });
    const width = container.clientWidth;
    renderer.setSize(width * 0.5, width * 0.5);
    container.appendChild(renderer.domElement);
    // Initialize WebGPU renderer
    const initPromise = renderer.init();

    
    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);

    // Camera
    const rendererSize = renderer.getSize(new THREE.Vector2())
    const camera = new THREE.PerspectiveCamera(
        75,
        rendererSize.width / rendererSize.height,
        0.1,
        1000
    );
    camera.position.z = 5;

    // Grid dimensions
    const gridWidth = 128;
    const gridHeight = 128;

    // Create plane to display Game of Life
    const planeGeometry = new THREE.PlaneGeometry(8, 8);
    const texture = new StorageTexture(gridWidth, gridHeight)
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    const planeMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    scene.add(plane);

    // Initialize Game of Life
    let gameOfLife = new GameOfLife(gridWidth, gridHeight);

    // Animation
    let frameCount = 0;
    const updateInterval = 1; // Update every frame
    let isPaused = true;

    let textureNeedsUpdate = true;

    let quit = false;
    const animate = async () => {
        if (quit) {
            return;
        }

        frameCount++;

        if (!isPaused && frameCount >= updateInterval) {
            frameCount = 0;

            gameOfLife.update();
            textureNeedsUpdate = true;
        }

        if (textureNeedsUpdate) {
            gameOfLife.getData(renderer, planeMaterial.map as StorageTexture);
            textureNeedsUpdate = false;
        }

        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    };

    initPromise.then(() => {
        gameOfLife.initWGPU((renderer.backend as any).device);
        gameOfLife.getData(renderer, planeMaterial.map as StorageTexture);
        animate();
    })

    let currentPattern = patterns[0];
    let currentPatternTransform: GameOfLifePatternTransform = {
        xDirection: 1, yDirection: 1, flip: false
    };

    const handleSelectPattern = (event: any) => {
        console.log("Selected pattern:", event.detail.pattern);
        currentPattern = event.detail.pattern;
    }
    eventTarget.addEventListener("selectPattern", handleSelectPattern)

    const handleTogglePause = (event: any) => {
        isPaused = event.detail.isPaused;
    }
    eventTarget.addEventListener("togglePause", handleTogglePause)

    const handleTransform = (event: any) => {
        const action = event.detail.action;
        switch (action) {
            case 'rotateLeft':
                // Rotate 90° counterclockwise: (x,y) -> (y,-x)
                const tempX = currentPatternTransform.xDirection;
                currentPatternTransform.xDirection = currentPatternTransform.yDirection;
                currentPatternTransform.yDirection = -tempX;
                currentPatternTransform.flip = !currentPatternTransform.flip;
                break;
            case 'rotateRight':
                // Rotate 90° clockwise: (x,y) -> (-y,x)
                const tempX2 = currentPatternTransform.xDirection;
                currentPatternTransform.xDirection = -currentPatternTransform.yDirection;
                currentPatternTransform.yDirection = tempX2;
                currentPatternTransform.flip = !currentPatternTransform.flip;
                break;
            case 'flipH':
                console.log("Flipping horizontally");
                currentPatternTransform.xDirection *= -1;
                break;
            case 'flipV':
                console.log("Flipping vertically");
                currentPatternTransform.yDirection *= -1;
                break;
        }

        eventTarget.dispatchEvent(new CustomEvent('transformUpdate', { detail: { transform: {...currentPatternTransform} } }));
    }
    eventTarget.addEventListener("transform", handleTransform)

    // Handle resize
    const handleResize = () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    const raycaster = new THREE.Raycaster();

    const handleMouseMove = (event: MouseEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        raycaster.setFromCamera(new THREE.Vector2(
            (x / rect.width) * 2 - 1,
            -(y / rect.height) * 2 + 1
        ), camera);
        // const intersects = raycaster.intersectObject(plane);
        // if (intersects.length > 0) {
        //     const uv = intersects[0].uv;
        //     if (uv) {
        //         const gridX = Math.floor(uv.x * gridWidth) % gridWidth;
        //         const gridY = Math.floor(uv.y * gridHeight) % gridHeight;

        //         // gameOfLife.setCell(renderer, gridX, gridY, 1);
        //     }
        // }
    }
    renderer.domElement.addEventListener("mousemove", handleMouseMove)

    const handleClick = (event: MouseEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        raycaster.setFromCamera(new THREE.Vector2(
            (x / rect.width) * 2 - 1,
            -(y / rect.height) * 2 + 1
        ), camera);
        const intersects = raycaster.intersectObject(plane);
        if (intersects.length > 0) {
            const uv = intersects[0].uv;
            if (uv) {
                console.log(uv)

                const gridX = Math.floor(uv.x * gridWidth) % gridWidth;
                const gridY = Math.floor(uv.y * gridHeight) % gridHeight;
                
                gameOfLife.setPattern(renderer, currentPattern, gridX, gridY, currentPatternTransform);
                textureNeedsUpdate = true;
            }
        }
    }
    renderer.domElement.addEventListener("click", handleClick)

    const handleClear = () => {
        gameOfLife.clear();
        textureNeedsUpdate = true;
    }
    eventTarget.addEventListener("clear", handleClear)

    // Cleanup
    return {
        cleanup: () => {
            quit = true;
            window.removeEventListener('resize', handleResize);
            renderer.domElement.removeEventListener("mousemove", handleMouseMove)
            renderer.domElement.removeEventListener("click", handleClick)
            eventTarget.removeEventListener("selectPattern", handleSelectPattern)
            eventTarget.removeEventListener("togglePause", handleTogglePause)
            eventTarget.removeEventListener("transform", handleTransform)
            eventTarget.removeEventListener("clear", handleClear)
            container.removeChild(renderer.domElement);
            planeGeometry.dispose();
            planeMaterial.dispose();
            if (planeMaterial.map) {
                planeMaterial.map.dispose();
            }
            renderer.dispose();
        },
        gameOfLife: gameOfLife,
        getInitialPattern: () => currentPattern,
    }
}
