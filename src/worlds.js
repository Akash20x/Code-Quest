import * as THREE from 'three';
import { buildPark, CELL_SIZE, cellPosition, MAZE_EDGE, MAZE_SIZE, makeMaze } from './park.js';

export function buildWorld(group, levelIndex, level) {
  if (levelIndex === 0) return buildPark(group, levelIndex, level);
  const indoor = levelIndex === 1;
  const maze = makeMaze(levelIndex);
  const walls = [];
  const floor = new THREE.MeshStandardMaterial({ color: indoor ? 0x7b5647 : 0x303b4c, roughness: indoor ? 0.83 : 0.95 });
  const wallMat = new THREE.MeshStandardMaterial({ color: indoor ? 0xe7d8c1 : 0x43566d, roughness: 0.8 });
  const tallMat = new THREE.MeshStandardMaterial({ color: indoor ? 0x68596c : 0x233448, roughness: 0.82 });
  const trim = new THREE.MeshStandardMaterial({ color: indoor ? 0x513d42 : 0x79c2cc, roughness: 0.55, metalness: indoor ? 0 : 0.3 });
  const glow = new THREE.MeshStandardMaterial({ color: indoor ? 0xffd8a5 : 0x83efff, emissive: indoor ? 0xffba71 : 0x48d5ff, emissiveIntensity: indoor ? 1.3 : 1.8 });
  function box(w, h, d, x, y, z, mat, shadow = true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }
  box(MAZE_SIZE * CELL_SIZE + 8, 0.14, MAZE_SIZE * CELL_SIZE + 8, 0, -0.13, 0, floor, false);
  for (let row = 0; row < MAZE_SIZE; row++) for (let col = 0; col < MAZE_SIZE; col++) {
    const [x, z] = cellPosition(col, row);
    if (indoor) {
      box(CELL_SIZE - 0.2, 0.025, 0.055, x, 0.005, z + CELL_SIZE / 2 - 0.12, trim, false);
      box(0.055, 0.025, CELL_SIZE - 0.2, x + CELL_SIZE / 2 - 0.12, 0.005, z, trim, false);
      if ((row + col * 3) % 9 === 0) {
        box(0.8, 0.45, 0.48, x - 1.25, 0.25, z - 1.15, trim);
        box(0.66, 0.075, 0.55, x - 1.25, 0.52, z - 1.15, glow, false);
      }
    } else {
      box(CELL_SIZE - 0.25, 0.016, 0.08, x, 0.012, z + CELL_SIZE / 2 - 0.18, trim, false);
      box(0.08, 0.016, CELL_SIZE - 0.25, x + CELL_SIZE / 2 - 0.18, 0.012, z, trim, false);
      if ((row + col) % 4 === 0) box(0.12, 0.02, 1.15, x, 0.01, z, glow, false);
    }
  }
  function barrier(x, z, horizontal, tall) {
    const width = horizontal ? CELL_SIZE + 0.06 : indoor ? 0.32 : 0.48;
    const depth = horizontal ? indoor ? 0.32 : 0.48 : CELL_SIZE + 0.06;
    const height = tall ? indoor ? 3.45 : 4.2 : indoor ? 1.05 : 1.12;
    box(width, height, depth, x, height / 2, z, tall ? tallMat : wallMat);
    box(width + 0.04, 0.1, depth + 0.04, x, height + 0.05, z, trim, false);
    if (tall && !indoor) {
      const faceZ = horizontal ? z + depth / 2 + 0.012 : z;
      const faceX = horizontal ? x : x + width / 2 + 0.012;
      const sign = box(horizontal ? 0.85 : 0.025, 0.65, horizontal ? 0.025 : 0.85, faceX, 2.5, faceZ, glow, false);
      sign.material = glow;
    }
    if (tall && indoor) box(horizontal ? 0.9 : 0.04, 0.5, horizontal ? 0.04 : 0.9, x, 2.55, z, glow, false);
    walls.push({ x, z, halfX: width / 2, halfZ: depth / 2, height });
  }
  for (let row = 0; row < MAZE_SIZE; row++) for (let col = 0; col < MAZE_SIZE; col++) {
    const [x, z] = cellPosition(col, row);
    const cell = maze[row][col];
    if (cell.n) barrier(x, z - CELL_SIZE / 2, true, row === 0 || (row * 7 + col * 3) % 5 === 0);
    if (cell.w) barrier(x - CELL_SIZE / 2, z, false, col === 0 || (row * 3 + col * 7) % 5 === 0);
    if (row === MAZE_SIZE - 1 && cell.s) barrier(x, z + CELL_SIZE / 2, true, true);
    if (col === MAZE_SIZE - 1 && cell.e) barrier(x + CELL_SIZE / 2, z, false, true);
  }
  if (indoor) {
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(MAZE_SIZE * CELL_SIZE + 8, MAZE_SIZE * CELL_SIZE + 8), new THREE.MeshStandardMaterial({ color: 0x302a39, side: THREE.DoubleSide, roughness: 0.9 }));
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 5.8;
    group.add(ceiling);
    for (let row = 0; row < MAZE_SIZE; row += 2) for (let col = 0; col < MAZE_SIZE; col += 2) {
      const [x, z] = cellPosition(col, row);
      box(1.2, 0.04, 0.42, x, 5.68, z, glow, false);
    }
  } else {
    const dark = new THREE.MeshStandardMaterial({ color: 0x1b2939, roughness: 0.86 });
    for (const side of [-1, 1]) for (let i = 0; i < 9; i++) {
      const x = side * (MAZE_EDGE + 6 + i % 3 * 4);
      const z = -MAZE_EDGE + i * 5.5;
      const height = 7 + (i * 7 % 9);
      box(3.2, height, 3.3, x, height / 2, z, dark);
      for (let y = 2; y < height - 1; y += 2.1) box(0.08, 0.65, 0.5, x - side * 1.63, y, z, glow, false);
    }
    for (let i = 0; i < 8; i++) {
      const x = i % 2 ? MAZE_EDGE + 1.6 : -MAZE_EDGE - 1.6;
      const z = -MAZE_EDGE + 3 + i * 5.4;
      box(0.1, 5, 0.1, x, 2.5, z, trim);
      box(0.75, 0.08, 0.38, x, 5.05, z, glow, false);
    }
  }
  return walls;
}
