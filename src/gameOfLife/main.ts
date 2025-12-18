import * as THREE from 'three';
import { GameOfLife } from './gameOfLife';

export function initGameOfLife(container: HTMLElement): () => void {
  // Scene setup
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0a);

  // Camera
  const camera = new THREE.PerspectiveCamera(
    75,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );
  camera.position.z = 5;

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  // Grid dimensions
  const gridWidth = 128;
  const gridHeight = 128;

  // Create plane to display Game of Life
  const planeGeometry = new THREE.PlaneGeometry(8, 8);
  const planeMaterial = new THREE.MeshBasicMaterial({
    map: null,
    side: THREE.DoubleSide,
  });
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  scene.add(plane);

  // Create data texture for Game of Life state
  const createDataTexture = (data: Uint32Array): THREE.DataTexture => {
    const textureData = new Uint8Array(gridWidth * gridHeight * 4);
    for (let i = 0; i < data.length; i++) {
      const value = data[i] * 255;
      textureData[i * 4] = value;     // R
      textureData[i * 4 + 1] = value; // G
      textureData[i * 4 + 2] = value; // B
      textureData[i * 4 + 3] = 255;   // A
    }

    const texture = new THREE.DataTexture(
      textureData,
      gridWidth,
      gridHeight,
      THREE.RGBAFormat
    );
    texture.needsUpdate = true;
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    return texture;
  };

  // Initialize Game of Life
  let gameOfLife: GameOfLife | null = null;
  let currentBufferIndex = 0;
  let isInitialized = false;

  const initWebGPU = async () => {
    try {
      if (!navigator.gpu) {
        console.error('WebGPU not supported');
        return;
      }

      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        console.error('No GPU adapter found');
        return;
      }

      const device = await adapter.requestDevice();
      gameOfLife = new GameOfLife(device, gridWidth, gridHeight);
      await gameOfLife.init();

      // Initialize with random pattern
      gameOfLife.randomize(0, 0.3);

      // Get initial data and create texture
      const initialData = await gameOfLife.getData(0);
      const texture = createDataTexture(initialData);
      planeMaterial.map = texture;
      planeMaterial.needsUpdate = true;

      isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize WebGPU:', error);
    }
  };

  initWebGPU();

  // Animation
  let frameCount = 0;
  const updateInterval = 10; // Update every 10 frames

  const animate = async () => {
    if (!isInitialized || !gameOfLife) {
      requestAnimationFrame(animate);
      return;
    }

    frameCount++;

    if (frameCount >= updateInterval) {
      frameCount = 0;

      // Update Game of Life
      await gameOfLife.update(currentBufferIndex);
      currentBufferIndex = (currentBufferIndex + 1) % 2;

      // Get updated data
      const data = await gameOfLife.getData(currentBufferIndex);

      // Update texture
      if (planeMaterial.map) {
        const textureData = new Uint8Array(gridWidth * gridHeight * 4);
        for (let i = 0; i < data.length; i++) {
          const value = data[i] * 255;
          textureData[i * 4] = value;
          textureData[i * 4 + 1] = value;
          textureData[i * 4 + 2] = value;
          textureData[i * 4 + 3] = 255;
        }
        
        const dataTexture = planeMaterial.map as THREE.DataTexture;
        dataTexture.image.data = textureData;
        dataTexture.needsUpdate = true;
      }
    }

    // Rotate plane slightly
    plane.rotation.y += 0.002;

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  };
  animate();

  // Handle resize
  const handleResize = () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  };
  window.addEventListener('resize', handleResize);

  // Cleanup
  return () => {
    window.removeEventListener('resize', handleResize);
    container.removeChild(renderer.domElement);
    planeGeometry.dispose();
    planeMaterial.dispose();
    if (planeMaterial.map) {
      planeMaterial.map.dispose();
    }
    renderer.dispose();
    if (gameOfLife) {
      gameOfLife.destroy();
    }
  };
}
