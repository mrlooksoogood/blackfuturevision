// Light pool: the gallery has ~60 light fixtures, but a phone cannot shade 60 lights per pixel.
// A fixed set of real lights is moved each frame to the fixtures nearest the camera. The light count
// never changes (so shaders never recompile), and a fixture fades to zero before it is swapped out.
import * as THREE from 'three';

const FADE_BAND = 7;   // metres over which the farthest kept fixture fades out

export function createLightPool(scene, size) {
  const fixtures = [];
  const slots = [];
  for (let i = 0; i < size; i++) {
    const light = new THREE.PointLight(0xffffff, 0, 20, 2);
    scene.add(light);
    slots.push({ light, fixture: null });
  }

  // bias < 1 makes a fixture count as nearer than it is (large room fills that must not drop out).
  function add(x, y, z, color, intensity, distance, decay, bias = 1) {
    const f = { x, y, z, color: new THREE.Color(color), intensity, distance, decay, bias, d: 0, slot: null };
    fixtures.push(f);
    return f;
  }

  function update(cam) {
    for (const f of fixtures) f.d = Math.hypot(f.x - cam.x, f.y - cam.y, f.z - cam.z) * f.bias;
    fixtures.sort((a, b) => a.d - b.d);
    const keepN = Math.min(size, fixtures.length);
    const cut = fixtures.length > size ? fixtures[size].d : Infinity;
    for (let i = keepN; i < fixtures.length; i++) {
      const f = fixtures[i];
      if (f.slot) { f.slot.light.intensity = 0; f.slot.fixture = null; f.slot = null; }
    }
    for (let i = 0; i < keepN; i++) {
      const f = fixtures[i];
      if (!f.slot) {
        const s = slots.find(o => !o.fixture);
        if (!s) continue;
        s.fixture = f; f.slot = s;
        s.light.position.set(f.x, f.y, f.z); s.light.color.copy(f.color);
        s.light.distance = f.distance; s.light.decay = f.decay;
      }
      const w = cut === Infinity ? 1 : Math.min(1, Math.max(0, (cut - f.d) / FADE_BAND));
      f.slot.light.intensity = f.intensity * w;
    }
  }

  return { add, update, count: () => fixtures.length };
}
