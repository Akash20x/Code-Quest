export class WallIndex {
  constructor(walls, size = 4.2) {
    this.walls = walls;
    this.size = size;
    this.cells = new Map();
    this.candidates = [];
    this.visits = new Uint32Array(walls.length);
    this.visit = 0;
    walls.forEach((wall, i) => {
      for (let x = Math.floor((wall.x - wall.halfX) / size); x <= Math.floor((wall.x + wall.halfX) / size); x++) {
        for (let z = Math.floor((wall.z - wall.halfZ) / size); z <= Math.floor((wall.z + wall.halfZ) / size); z++) {
          const key = `${x},${z}`;
          if (!this.cells.has(key)) this.cells.set(key, []);
          this.cells.get(key).push(i);
        }
      }
    });
  }
  query(minX, minZ, maxX, maxZ) {
    this.candidates.length = 0;
    this.visit = (this.visit + 1) >>> 0;
    if (!this.visit) { this.visits.fill(0); this.visit = 1; }
    for (let x = Math.floor(minX / this.size); x <= Math.floor(maxX / this.size); x++) {
      for (let z = Math.floor(minZ / this.size); z <= Math.floor(maxZ / this.size); z++) {
        const cell = this.cells.get(`${x},${z}`);
        if (!cell) continue;
        for (const i of cell) if (this.visits[i] !== this.visit) { this.visits[i] = this.visit; this.candidates.push(this.walls[i]); }
      }
    }
    return this.candidates;
  }
  collides(x, z, radius = 0.38, feetY = 0) {
    for (const wall of this.query(x - radius, z - radius, x + radius, z + radius)) {
      if (feetY < wall.height - 0.08 && Math.abs(x - wall.x) < wall.halfX + radius && Math.abs(z - wall.z) < wall.halfZ + radius) return true;
    }
    return false;
  }
  cameraFraction(origin, target, padding = 0.15) {
    let nearest = 1;
    const dx = target.x - origin.x, dy = target.y - origin.y, dz = target.z - origin.z;
    for (const wall of this.query(Math.min(origin.x, target.x) - padding, Math.min(origin.z, target.z) - padding, Math.max(origin.x, target.x) + padding, Math.max(origin.z, target.z) + padding)) {
      let near = 0, far = nearest;
      for (const [start, delta, low, high] of [[origin.x, dx, wall.x - wall.halfX - padding, wall.x + wall.halfX + padding], [origin.y, dy, -padding, wall.height + padding], [origin.z, dz, wall.z - wall.halfZ - padding, wall.z + wall.halfZ + padding]]) {
        if (Math.abs(delta) < 1e-8) { if (start < low || start > high) { far = -1; break; } }
        else {
          const a = (low - start) / delta, b = (high - start) / delta;
          near = Math.max(near, Math.min(a, b));
          far = Math.min(far, Math.max(a, b));
          if (near > far) break;
        }
      }
      if (near <= far) nearest = Math.max(0, near - 0.02);
    }
    return nearest;
  }
}
