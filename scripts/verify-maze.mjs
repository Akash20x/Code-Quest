import * as THREE from 'three';
import { levels } from '../src/questions.js';
import { cellPosition, collidesWithHedge, getCoinCells, MAZE_SIZE, PORTAL_CELL, START_CELL } from '../src/park.js';
import { buildWorld } from '../src/worlds.js';

const key = ([col, row]) => `${col},${row}`;
for (let levelIndex = 0; levelIndex < levels.length; levelIndex++) {
  const walls = buildWorld(new THREE.Group(), levelIndex, levels[levelIndex]);
  const lowWall = walls.find((wall) => wall.height < 1.3);
  const tallWall = walls.find((wall) => wall.height > 3);
  if (!lowWall || !tallWall) throw new Error(`Level ${levelIndex + 1}: missing low or tall barriers`);
  if (collidesWithHedge(lowWall.x, lowWall.z, [lowWall], 0, 1.5)) throw new Error(`Level ${levelIndex + 1}: low barrier cannot be jumped`);
  if (!collidesWithHedge(tallWall.x, tallWall.z, [tallWall], 0, 1.5)) throw new Error(`Level ${levelIndex + 1}: tall barrier can be jumped`);
  const queue = [START_CELL];
  const visited = new Set([key(START_CELL)]);
  const distances = new Map([[key(START_CELL), 0]]);
  while (queue.length) {
    const [col, row] = queue.shift();
    const [x, z] = cellPosition(col, row);
    for (const next of [[col + 1, row], [col - 1, row], [col, row + 1], [col, row - 1]]) {
      const [nextCol, nextRow] = next;
      if (nextCol < 0 || nextCol >= MAZE_SIZE || nextRow < 0 || nextRow >= MAZE_SIZE || visited.has(key(next))) continue;
      const [nextX, nextZ] = cellPosition(nextCol, nextRow);
      if (collidesWithHedge((x + nextX) / 2, (z + nextZ) / 2, walls)) continue;
      visited.add(key(next));
      distances.set(key(next), distances.get(key([col, row])) + 1);
      queue.push(next);
    }
  }
  const coinCells = getCoinCells(levelIndex);
  if (coinCells.length !== 8 || new Set(coinCells.map(key)).size !== 8) throw new Error(`Level ${levelIndex + 1}: expected 8 distinct coins`);
  for (const coin of coinCells) {
    if (distances.get(key(coin)) < 16) throw new Error(`Level ${levelIndex + 1}: coin ${key(coin)} is too close to spawn`);
  }
  const destinations = [...coinCells, PORTAL_CELL];
  for (const destination of destinations) {
    if (!visited.has(key(destination))) throw new Error(`Level ${levelIndex + 1}: ${key(destination)} is unreachable`);
    const [x, z] = cellPosition(...destination);
    if (collidesWithHedge(x, z, walls)) throw new Error(`Level ${levelIndex + 1}: ${key(destination)} is blocked`);
  }
  console.log(`Level ${levelIndex + 1}: ${visited.size} reachable cells, 8 distant coins and portal accessible`);
}
