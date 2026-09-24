import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const MAZE_SIZE = 11;
export const CELL_SIZE = 4.2;
export const MAZE_EDGE = MAZE_SIZE * CELL_SIZE / 2;
export const START_CELL = [5, 8];
export const PORTAL_CELL = [5, 0];

export function cellPosition(col, row) {
  return [(col - (MAZE_SIZE - 1) / 2) * CELL_SIZE, (row - (MAZE_SIZE - 1) / 2) * CELL_SIZE];
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = Math.imul(value ^ value >>> 15, 1 | value);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function makeMaze(levelIndex) {
  const random = seededRandom(7129 + levelIndex * 431);
  const cells = Array.from({ length: MAZE_SIZE }, () => Array.from({ length: MAZE_SIZE }, () => ({ n: true, e: true, s: true, w: true, seen: false })));
  const stack = [[5, 10]];
  cells[10][5].seen = true;
  while (stack.length) {
    const [col, row] = stack[stack.length - 1];
    const candidates = [
      [col, row - 1, 'n', 's'], [col + 1, row, 'e', 'w'],
      [col, row + 1, 's', 'n'], [col - 1, row, 'w', 'e']
    ].filter(([nextCol, nextRow]) => nextCol >= 0 && nextCol < MAZE_SIZE && nextRow >= 0 && nextRow < MAZE_SIZE && !cells[nextRow][nextCol].seen);
    if (!candidates.length) { stack.pop(); continue; }
    const [nextCol, nextRow, from, to] = candidates[Math.floor(random() * candidates.length)];
    cells[row][col][from] = false;
    cells[nextRow][nextCol][to] = false;
    cells[nextRow][nextCol].seen = true;
    stack.push([nextCol, nextRow]);
  }
  // A few loops keep the routes broad and give players a choice at junctions.
  for (let row = 0; row < MAZE_SIZE; row++) for (let col = 0; col < MAZE_SIZE; col++) {
    if (col < MAZE_SIZE - 1 && cells[row][col].e && random() < 0.07) {
      cells[row][col].e = false;
      cells[row][col + 1].w = false;
    }
    if (row < MAZE_SIZE - 1 && cells[row][col].s && random() < 0.07) {
      cells[row][col].s = false;
      cells[row + 1][col].n = false;
    }
  }
  return cells;
}

export function getCoinCells(levelIndex) {
  const maze = makeMaze(levelIndex);
  const distances = Array.from({ length: MAZE_SIZE }, () => Array(MAZE_SIZE).fill(Infinity));
  const queue = [START_CELL];
  distances[START_CELL[1]][START_CELL[0]] = 0;
  for (let i = 0; i < queue.length; i++) {
    const [col, row] = queue[i];
    for (const [direction, dx, dz] of [['n', 0, -1], ['e', 1, 0], ['s', 0, 1], ['w', -1, 0]]) {
      const nextCol = col + dx;
      const nextRow = row + dz;
      if (maze[row][col][direction] || nextCol < 0 || nextCol >= MAZE_SIZE || nextRow < 0 || nextRow >= MAZE_SIZE || distances[nextRow][nextCol] !== Infinity) continue;
      distances[nextRow][nextCol] = distances[row][col] + 1;
      queue.push([nextCol, nextRow]);
    }
  }
  const candidates = [];
  for (let row = 0; row < MAZE_SIZE; row++) for (let col = 0; col < MAZE_SIZE; col++) {
    const steps = distances[row][col];
    const nearby = Math.abs(col - START_CELL[0]) + Math.abs(row - START_CELL[1]);
    if (steps < 16 || nearby < 5 || (col === PORTAL_CELL[0] && row === PORTAL_CELL[1])) continue;
    const exits = ['n', 'e', 's', 'w'].filter((direction) => !maze[row][col][direction]).length;
    candidates.push({ col, row, score: steps + (exits === 1 ? 15 : 0) + ((col === 0 || col === MAZE_SIZE - 1) && (row === 0 || row === MAZE_SIZE - 1) ? 4 : 0) });
  }
  candidates.sort((a, b) => b.score - a.score);
  const chosen = [];
  for (const spacing of [6, 5, 4, 3, 0]) {
    for (const cell of candidates) {
      if (chosen.length === 8) break;
      if (chosen.some((coin) => coin.col === cell.col && coin.row === cell.row)) continue;
      if (chosen.some((coin) => Math.abs(coin.col - cell.col) + Math.abs(coin.row - cell.row) < spacing)) continue;
      chosen.push(cell);
    }
  }
  return chosen.map(({ col, row }) => [col, row]);
}

function parkMaterial(color, roughness = 0.95) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
}

const surfaceTextures = new Map();
function surfaceTexture(kind) {
  if (surfaceTextures.has(kind)) return surfaceTextures.get(kind);
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  const noise = seededRandom(kind === 'stone' ? 17 : 41);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const offset = (y * size + x) * 4;
    const mortar = kind === 'stone' && (y % 32 < 1 || (x + (Math.floor(y / 32) % 2) * 32) % 64 < 1);
    const value = mortar ? 132 : kind === 'stone' ? 220 + noise() * 30 : 150 + noise() * 100;
    data[offset] = data[offset + 1] = data[offset + 2] = value;
    data[offset + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.repeat.set(kind === 'grass' ? 100 : kind === 'stone' ? 2 : 5, kind === 'grass' ? 100 : kind === 'stone' ? 2 : 3);
  texture.needsUpdate = true;
  surfaceTextures.set(kind, texture);
  return texture;
}

export function buildPark(group, levelIndex, level) {
  const random = seededRandom(2053 + levelIndex * 379);
  const walls = [];
  const maze = makeMaze(levelIndex);
  const groundMaterial = parkMaterial(level.grass);
  const pathMaterial = parkMaterial(level.path);
  const pathEdgeMaterial = parkMaterial(level.pathEdge);
  const hedgeMaterial = parkMaterial(level.hedge);
  const hedgeTopMaterial = parkMaterial(level.hedgeTop);
  const trunkMaterial = parkMaterial(0x6e503b);
  const treeMaterial = parkMaterial(level.tree);
  const stoneMaterial = parkMaterial(0x87917d);
  pathMaterial.map = pathMaterial.bumpMap = surfaceTexture('stone');
  pathMaterial.bumpScale = 0.035;
  hedgeMaterial.map = hedgeMaterial.bumpMap = surfaceTexture('leaves');
  hedgeMaterial.bumpScale = 0.13;
  groundMaterial.map = surfaceTexture('grass');

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(130, 130), groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.09;
  ground.receiveShadow = true;
  group.add(ground);

  function block(width, height, depth, x, y, z, meshMaterial) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), meshMaterial);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    mesh.castShadow = height > 0.2;
    group.add(mesh);
    return mesh;
  }

  function path(width, depth, x, z) {
    block(width + 0.18, 0.045, depth + 0.18, x, -0.035, z, pathEdgeMaterial);
    block(width, 0.048, depth, x, -0.009, z, pathMaterial);
  }

  for (let row = 0; row < MAZE_SIZE; row++) for (let col = 0; col < MAZE_SIZE; col++) {
    const [x, z] = cellPosition(col, row);
    path(CELL_SIZE - 0.52, CELL_SIZE - 0.52, x, z);
    if (!maze[row][col].e) path(0.95, CELL_SIZE - 0.52, x + CELL_SIZE / 2, z);
    if (!maze[row][col].s) path(CELL_SIZE - 0.52, 0.95, x, z + CELL_SIZE / 2);
  }

  const leafTransforms = [];
  function hedge(x, z, horizontal, tall) {
    const width = horizontal ? CELL_SIZE + 0.06 : 0.48;
    const depth = horizontal ? 0.48 : CELL_SIZE + 0.06;
    const height = tall ? 3.05 : 1.05;
    block(width + 0.08, 0.17, depth + 0.08, x, 0.055, z, stoneMaterial);
    const shrub = new THREE.Mesh(new RoundedBoxGeometry(width, height, depth, 2, 0.12), hedgeMaterial);
    shrub.position.set(x, height / 2 + 0.08, z);
    shrub.castShadow = shrub.receiveShadow = true;
    group.add(shrub);
    for (let i = 0; i < 26; i++) {
      const along = (i / 25 - 0.5) * (CELL_SIZE - 0.18);
      leafTransforms.push({
        x: x + (horizontal ? along : (random() - 0.5) * 0.22),
        y: height + 0.06 + random() * 0.1,
        z: z + (horizontal ? (random() - 0.5) * 0.22 : along),
        scale: 0.075 + random() * 0.08
      });
    }
    for (const side of [-1, 1]) for (let i = 0; i < 15; i++) {
      const along = (random() - 0.5) * CELL_SIZE;
      leafTransforms.push({
        x: x + (horizontal ? along : side * 0.23),
        y: 0.25 + random() * (height - 0.18),
        z: z + (horizontal ? side * 0.23 : along),
        scale: 0.05 + random() * 0.07
      });
    }
    walls.push({ x, z, halfX: width / 2, halfZ: depth / 2, height });
  }

  for (let row = 0; row < MAZE_SIZE; row++) for (let col = 0; col < MAZE_SIZE; col++) {
    const [x, z] = cellPosition(col, row);
    const cell = maze[row][col];
    if (cell.n) hedge(x, z - CELL_SIZE / 2, true, row === 0 || (row * 7 + col * 3) % 5 === 0);
    if (cell.w) hedge(x - CELL_SIZE / 2, z, false, col === 0 || (row * 3 + col * 7) % 5 === 0);
    if (row === MAZE_SIZE - 1 && cell.s) hedge(x, z + CELL_SIZE / 2, true, true);
    if (col === MAZE_SIZE - 1 && cell.e) hedge(x + CELL_SIZE / 2, z, false, true);
  }

  const leaves = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), hedgeTopMaterial, leafTransforms.length);
  const leafTransform = new THREE.Object3D();
  leafTransforms.forEach((leaf, i) => {
    leafTransform.position.set(leaf.x, leaf.y, leaf.z);
    leafTransform.scale.set(leaf.scale * 1.3, leaf.scale * 0.65, leaf.scale * 1.3);
    leafTransform.rotation.set(0, random() * Math.PI, 0);
    leafTransform.updateMatrix();
    leaves.setMatrixAt(i, leafTransform.matrix);
    leaves.setColorAt(i, new THREE.Color(level.hedgeTop).multiplyScalar(0.8 + random() * 0.45));
  });
  leaves.castShadow = leaves.receiveShadow = true;
  group.add(leaves);

  // A ring of trees places the maze inside a larger landscaped park.
  for (let i = 0; i < 38; i++) {
    const angle = i / 38 * Math.PI * 2 + random() * 0.11;
    const radius = MAZE_EDGE + 4 + random() * 18;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (z > MAZE_EDGE && Math.abs(x) < 19) continue;
    const height = 2.5 + random() * 1.8;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.23, height, 8), trunkMaterial);
    trunk.position.set(x, height / 2, z);
    trunk.castShadow = true;
    group.add(trunk);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(1.25 + random() * 0.55, 12, 9), treeMaterial);
    crown.position.set(x, height + 0.75, z);
    crown.scale.y = 1.15;
    crown.castShadow = crown.receiveShadow = true;
    group.add(crown);
    const upper = new THREE.Mesh(new THREE.SphereGeometry(0.88 + random() * 0.25, 12, 9), hedgeTopMaterial);
    upper.position.set(x + 0.24, height + 1.65, z - 0.19);
    upper.castShadow = true;
    group.add(upper);
    for (let branch = 0; branch < 3; branch++) {
      const angle = branch / 3 * Math.PI * 2;
      const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.85, 10, 8), treeMaterial);
      lobe.position.set(x + Math.cos(angle) * 0.9, height + 0.5 + random() * 0.6, z + Math.sin(angle) * 0.9);
      lobe.castShadow = lobe.receiveShadow = true;
      group.add(lobe);
    }
  }

  const wood = parkMaterial(0x98613c);
  const metal = new THREE.MeshStandardMaterial({ color: 0x263b3e, roughness: 0.38, metalness: 0.65 });
  for (const x of [-MAZE_EDGE - 3, MAZE_EDGE + 3]) for (const z of [-8, 4]) {
    for (let slat = 0; slat < 4; slat++) block(1.8, 0.09, 0.14, x, 0.53, z + slat * 0.18, wood);
    for (const legX of [-0.65, 0.65]) block(0.09, 0.5, 0.65, x + legX, 0.22, z + 0.26, metal);
    block(1.8, 0.42, 0.09, x, 0.94, z + 0.6, wood);
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, 2.5, 8), metal);
    lamp.position.set(x + 1.4, 1.2, z);
    lamp.castShadow = true;
    group.add(lamp);
    const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.3, 0.26), new THREE.MeshStandardMaterial({ color: 0xffedc6, emissive: 0xffd698, emissiveIntensity: 0.7 }));
    lantern.position.set(x + 1.4, 2.55, z);
    group.add(lantern);
  }

  // Short flower patches add color without filling the walking lanes.
  const flowerColors = [0xf8c8d0, 0xffe6a4, 0xcad8ff, 0xffffff];
  const flowerMaterials = flowerColors.map(color => new THREE.MeshBasicMaterial({ color }));
  for (let i = 0; i < 85; i++) {
    const angle = random() * Math.PI * 2;
    const radius = MAZE_EDGE + 1.5 + random() * 17;
    const flower = new THREE.Mesh(new THREE.SphereGeometry(0.085, 6, 5), flowerMaterials[i % flowerMaterials.length]);
    flower.position.set(Math.cos(angle) * radius, 0.1, Math.sin(angle) * radius);
    group.add(flower);
  }

  const pond = new THREE.Mesh(new THREE.CircleGeometry(4.5, 48), new THREE.MeshStandardMaterial({ color: 0x69bac6, metalness: 0.12, roughness: 0.28, transparent: true, opacity: 0.82, side: THREE.DoubleSide }));
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(-MAZE_EDGE - 10, -0.035, -4);
  pond.scale.y = 0.65;
  group.add(pond);

  return walls;
}

export function collidesWithHedge(x, z, walls, radius = 0.38, feetY = 0) {
  return walls.some((wall) => feetY < wall.height - 0.08 && Math.abs(x - wall.x) < wall.halfX + radius && Math.abs(z - wall.z) < wall.halfZ + radius);
}
