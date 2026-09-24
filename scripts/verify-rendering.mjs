import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { WallIndex } from '../src/collision.js';
import { batchScenery, disposeGroup } from '../src/rendering.js';
import { buildWorld } from '../src/worlds.js';
import { collidesWithHedge } from '../src/park.js';
import { levels } from '../src/questions.js';

test('indexed collision matches the original walls at ground and jump heights', () => {
  for (let level = 0; level < 3; level++) {
    const group = new THREE.Group();
    const walls = buildWorld(group, level, levels[level]);
    const index = new WallIndex(walls);
    for (let i = 0; i < 1600; i++) {
      const x = (i * 17.13 % 50) - 25, z = (i * 31.47 % 50) - 25;
      for (const y of [0, 1.2, 1.5, 3.2]) assert.equal(index.collides(x, z, 0.38, y), collidesWithHedge(x, z, walls, 0.38, y));
    }
    const before = group.children.length;
    batchScenery(group);
    assert.ok(group.children.length < before * 0.6, `world ${level + 1} must materially reduce draw objects`);
    disposeGroup(group);
    assert.equal(group.children.length, 0);
  }
});

test('camera ray is clipped before tall walls but clears low barriers overhead', () => {
  const walls = [{ x: 0, z: 2, halfX: 2, halfZ: 0.24, height: 3.05 }];
  const index = new WallIndex(walls);
  const start = { x: 0, y: 1.45, z: 0 }, end = { x: 0, y: 2.5, z: 6 };
  assert.ok(index.cameraFraction(start, end) > 0.2 && index.cameraFraction(start, end) < 0.3);
  assert.equal(new WallIndex([{ ...walls[0], height: 1.05 }]).cameraFraction(start, end), 1);
  assert.equal(index.cameraFraction({ x: 4, y: 1, z: 0 }, { x: 4, y: 1, z: 6 }), 1);
});
