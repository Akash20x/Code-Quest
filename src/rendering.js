import * as THREE from 'three';

// Batch by material and world region, retaining useful frustum culling.
export function batchScenery(group) {
  const batches = new Map();
  const geometries = new Map();
  const originals = new Set();
  for (const mesh of [...group.children]) {
    if (!mesh.isMesh || mesh.isInstancedMesh || Array.isArray(mesh.material)) continue;
    const original = mesh.geometry;
    const p = original.parameters;
    const scale = mesh.scale.clone();
    let shape = `${original.type}:${JSON.stringify(p)}`;
    if (original.type === 'BoxGeometry') { shape = 'box'; scale.multiply(new THREE.Vector3(p.width, p.height, p.depth)); }
    if (original.type === 'SphereGeometry') { shape = `sphere:${p.widthSegments}:${p.heightSegments}`; scale.multiplyScalar(p.radius); }
    if (!geometries.has(shape)) {
      geometries.set(shape, shape === 'box' ? new THREE.BoxGeometry(1, 1, 1) : original.type === 'SphereGeometry' ? new THREE.SphereGeometry(1, p.widthSegments, p.heightSegments) : original.clone());
    }
    const key = `${shape}:${mesh.material.uuid}:${mesh.castShadow}:${mesh.receiveShadow}:${Math.floor(mesh.position.x / 12)}:${Math.floor(mesh.position.z / 12)}`;
    if (!batches.has(key)) batches.set(key, { geometry: geometries.get(shape), material: mesh.material, cast: mesh.castShadow, receive: mesh.receiveShadow, matrices: [] });
    batches.get(key).matrices.push(new THREE.Matrix4().compose(mesh.position, mesh.quaternion, scale));
    originals.add(original);
    group.remove(mesh);
  }
  for (const batch of batches.values()) {
    const mesh = new THREE.InstancedMesh(batch.geometry, batch.material, batch.matrices.length);
    batch.matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
    mesh.castShadow = batch.cast;
    mesh.receiveShadow = batch.receive;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  for (const geometry of originals) geometry.dispose();
}

export function disposeGroup(group) {
  const geometries = new Set();
  const materials = new Set();
  group.traverse(object => {
    if (object.isInstancedMesh) object.dispose();
    if (object.geometry) geometries.add(object.geometry);
    if (object.material) for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
  });
  group.clear();
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  // Park surface textures are cached and reused between worlds, not owned by this group.
}

export class ParticlePool {
  constructor(parent) {
    this.mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 5, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }), 64);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    this.items = Array.from({ length: 64 }, () => ({ life: 0, size: 0, position: new THREE.Vector3(), velocity: new THREE.Vector3() }));
    this.transform = new THREE.Object3D();
    this.color = new THREE.Color();
    parent.add(this.mesh);
    this.clear();
  }
  clear() { for (const item of this.items) item.life = 0; this.mesh.visible = false; }
  emit(position, color) {
    this.color.set(color);
    let emitted = 0;
    for (let i = 0; i < this.items.length && emitted < 22; i++) {
      const item = this.items[i];
      if (item.life > 0) continue;
      const angle = Math.random() * Math.PI * 2;
      item.life = 1;
      item.size = 0.045 + Math.random() * 0.04;
      item.position.copy(position);
      item.velocity.set(Math.cos(angle) * 3, Math.random() * 4, Math.sin(angle) * 3);
      this.mesh.setColorAt(i, this.color);
      emitted++;
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
  update(dt) {
    let active = false;
    this.items.forEach((item, i) => {
      item.life = Math.max(0, item.life - dt);
      if (item.life > 0) {
        active = true;
        item.velocity.y -= dt * 6;
        item.position.addScaledVector(item.velocity, dt);
      }
      this.transform.position.copy(item.position);
      this.transform.scale.setScalar(item.life * item.size);
      this.transform.updateMatrix();
      this.mesh.setMatrixAt(i, this.transform.matrix);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.visible = active;
  }
}
