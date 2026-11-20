// The wings off the main spine: bridges, the Void Deck with its colossal screen, the Rotunda with its
// curved carousel wall, and the concierge screen in the entrance. PLAN is the single source of the
// coordinates; index.html reads it for the wall openings, the tour path and the walkable zones.
import * as THREE from 'three';

const EMERALD = 0x3fd0b4, GOLD = 0xe6c04e, VIOLET = 0x9d8cff, ICE = 0xbfe0ff;
const DOOR_W = 3.6, DOOR_H = 4.2;

export const PLAN = {
  hallA: { eastDoors: [-28, -68] },
  hallB: { westDoors: [-144] },
  deck: { x0: 30, x1: 50, z0: -74, z1: -22, y: 5 },
  monolith: { x: 132, y: 24, z: -48, w: 120, h: 67.5 },             // ~394 ft wide, ~221 ft tall, 80 m off the deck
  rotunda: { cx: -44, cz: -144, r: 16, y: -4, top: 9, screenSpan: 130, screenH: 10 },
  concierge: { x: -5.8, y: 3.1, z: 9, w: 7.2, h: 4.05 },
  bridges: [
    { id: 'E1', a: [6, 0, -28], b: [30, 5, -28], style: 'portal', color: EMERALD, power: 0.8, light: 3, width: 3.2, hw: 1.25 },  // open ramp, twisting frames
    { id: 'E2', a: [6, 0, -68], b: [30, 5, -68], style: 'tube', color: 0xd9a441, power: 0.7, light: 1.4, width: 2.8, hw: 1.15 },       // gold glass tube, climbing
    { id: 'W1', a: [-6, 0, -144], b: [-28, -4, -144], style: 'tube', color: VIOLET, power: 1.3, light: 3.5, width: 2.8, hw: 1.15 },// violet glass tube, descending
  ],
};

const led = (color, power = 1.5) => new THREE.MeshStandardMaterial({ color: 0x0b100d, emissive: color, emissiveIntensity: power, roughness: .3 });
const screenMat = side => new THREE.MeshBasicMaterial({ color: 0xd8d8d8, fog: false, toneMapped: false, side });

function bridge(ctx, { a, b, style, color, width, power, light }) {
  const { world, mats, pool } = ctx;
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), L = A.distanceTo(B);
  const g = new THREE.Group(); g.position.copy(A); g.lookAt(B); world.add(g);       // local +z runs a -> b along the slope
  const put = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
  const glow = led(color, power);
  put(new THREE.BoxGeometry(width, 0.12, L), mats.glassFloorMat, 0, -0.06, L / 2);                // glass deck
  [-1, 1].forEach(s => put(new THREE.BoxGeometry(0.12, 0.14, L), glow, s * width / 2, 0.02, L / 2)); // LED edge rails
  const n = Math.round(L / 4);
  if (style === 'tube') {
    const R = 2.5;
    const glass = new THREE.MeshPhysicalMaterial({ color: 0x9fd0cc, metalness: 0, roughness: .05, transparent: true, opacity: .09, ior: 1.4, envMapIntensity: 1.8, side: THREE.DoubleSide, depthWrite: false });
    put(new THREE.CylinderGeometry(R, R, L, 36, 1, true), glass, 0, 1.35, L / 2).rotation.x = Math.PI / 2;
    for (let i = 1; i <= n; i++) put(new THREE.TorusGeometry(R, 0.07, 10, 40), glow, 0, 1.35, (i / n) * L);
  } else {
    [-1, 1].forEach(s => put(new THREE.BoxGeometry(0.04, 1.05, L), mats.glassMat, s * width / 2, 0.55, L / 2)); // glass balustrades
    const S = 4.8;                                                    // square LED frames that twist a quarter turn over the span
    for (let i = 1; i <= n; i++) {
      const f = new THREE.Group(); f.position.set(0, 1.75, (i / n) * L); f.rotation.z = (i / n) * Math.PI / 2; g.add(f);
      [[0, S / 2, S, 0.05], [0, -S / 2, S, 0.05], [S / 2, 0, 0.05, S], [-S / 2, 0, 0.05, S]].forEach(([x, y, w, h]) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), glow); m.position.set(x, y, 0); f.add(m); });
    }
  }
  [0.2, 0.5, 0.8].forEach(k => { const p = A.clone().lerp(B, k); pool.add(p.x, p.y + 2.2, p.z, color, light, 14, 2); });
}

function voidDeck(ctx) {
  const { box, mats, pool, world } = ctx, d = PLAN.deck, m = PLAN.monolith;
  const cx = (d.x0 + d.x1) / 2, cz = (d.z0 + d.z1) / 2, w = d.x1 - d.x0, l = d.z1 - d.z0;
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x0b0f0d, roughness: .92, metalness: .05, envMapIntensity: .25 });   // matte-dark: the open deck sits in direct sun, a mirror floor glares
  box(w, 0.35, l, deckMat, cx, d.y - 0.18, cz);
  const edge = led(EMERALD, 1.3);
  [d.z0, d.z1].forEach(z => box(w, 0.1, 0.14, edge, cx, d.y + 0.03, z));
  [d.x0, d.x1].forEach(x => box(0.14, 0.1, l, edge, x, d.y + 0.03, cz));
  const rail = (x0, x1, z0, z1) => box(Math.max(Math.abs(x1 - x0), 0.05), 1.1, Math.max(Math.abs(z1 - z0), 0.05), mats.glassMat, (x0 + x1) / 2, d.y + 0.55, (z0 + z1) / 2);
  rail(d.x0, d.x1, d.z0, d.z0); rail(d.x0, d.x1, d.z1, d.z1);       // the east edge stays open: nothing between you and the screen
  let top = d.z1;                                                     // west edge: gaps where the two bridges land
  [...PLAN.hallA.eastDoors].sort((p, q) => q - p).forEach(zc => { rail(d.x0, d.x0, top, zc + 2.2); top = zc - 2.2; });
  rail(d.x0, d.x0, top, d.z0);
  // light pylons at the corners and an inlaid ring at the centre (no obstacles on the walking surface)
  const postMat = new THREE.MeshStandardMaterial({ color: 0x141a17, roughness: .5, metalness: .7 });
  [[d.x0, d.z0], [d.x0, d.z1], [d.x1, d.z0], [d.x1, d.z1], [d.x1, cz - 13], [d.x1, cz + 13]].forEach(([x, z]) => {
    const px = x + (x === d.x0 ? 0.3 : -0.3), pz = z + (z === d.z0 ? 0.3 : z === d.z1 ? -0.3 : 0);
    box(0.14, 2.4, 0.14, postMat, px, d.y + 1.2, pz); box(0.16, 0.2, 0.16, led(ICE, 0.6), px, d.y + 2.5, pz); });
  const ring = new THREE.Mesh(new THREE.RingGeometry(5.3, 5.4, 72), new THREE.MeshBasicMaterial({ color: 0x2f9c88 })); ring.rotation.x = -Math.PI / 2; ring.position.set(cx, d.y + 0.012, cz); world.add(ring);
  pool.add(cx, d.y + 5, cz - 15, ICE, 3, 30, 1.6); pool.add(cx, d.y + 5, cz + 15, ICE, 3, 30, 1.6);
  pool.add(d.x1 + 3, d.y + 4, cz, 0x9fe0d0, 3.5, 38, 1.5);            // the screen's glow spilling onto the deck

  // THE MONOLITH: a screen the size of a stadium, floating in the void east of the deck
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(m.w, m.h), screenMat(THREE.FrontSide));
  screen.position.set(m.x, m.y, m.z); screen.rotation.y = -Math.PI / 2; world.add(screen);
  const fr = led(EMERALD, 0.55); fr.fog = false;
  [1, -1].forEach(s => { box(1, 0.5, m.w + 1, fr, m.x + 0.5, m.y + s * (m.h / 2 + 0.25), m.z); box(1, m.h, 0.5, fr, m.x + 0.5, m.y, m.z + s * (m.w / 2 + 0.25)); });
  return screen;
}

function rotunda(ctx) {
  const { world, pool } = ctx, r = PLAN.rotunda;
  const flat = (geo, mat, y, rx) => { const m = new THREE.Mesh(geo, mat); m.rotation.x = rx; m.position.set(r.cx, y, r.cz); world.add(m); return m; };
  flat(new THREE.CircleGeometry(r.r, 64), new THREE.MeshStandardMaterial({ color: 0x0d0b14, roughness: .16, metalness: .7, envMapIntensity: 1 }), r.y, -Math.PI / 2);
  flat(new THREE.CircleGeometry(r.r, 64), new THREE.MeshStandardMaterial({ color: 0x0b0a10, roughness: .95 }), r.top, Math.PI / 2);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x1b1727, roughness: .92, metalness: .04, envMapIntensity: .4, side: THREE.DoubleSide });
  const arc = (t0, len, y0, y1, mat, rad = r.r) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, y1 - y0, Math.max(8, Math.round(len * 20)), 1, true, t0, len), mat);
    m.position.set(r.cx, (y0 + y1) / 2, r.cz); world.add(m); return m; };
  const door = Math.PI / 2, gap = Math.asin((DOOR_W / 2) / r.r);     // the doorway faces +x, toward Hall B
  arc(door + gap, Math.PI * 2 - 2 * gap, r.y, r.top, wallMat);
  arc(door - gap, 2 * gap, r.y + DOOR_H, r.top, wallMat);
  const violet = led(VIOLET, 1.4);
  flat(new THREE.TorusGeometry(r.r - 0.12, 0.07, 8, 96), violet, r.y + 0.08, Math.PI / 2);
  flat(new THREE.TorusGeometry(4, 0.12, 8, 64), violet, r.top - 0.15, Math.PI / 2);
  flat(new THREE.CircleGeometry(3.9, 48), new THREE.MeshBasicMaterial({ color: 0x2a2440 }), r.top - 0.05, Math.PI / 2);
  // curved carousel wall: an arc of screen wrapping the west side of the room
  const span = THREE.MathUtils.degToRad(r.screenSpan), sR = r.r - 0.35, y0 = r.y + 1.4, t0 = Math.PI * 1.5 - span / 2;
  const screen = arc(t0, span, y0, y0 + r.screenH, screenMat(THREE.BackSide), sR);
  const trim = led(GOLD, 0.9); trim.side = THREE.DoubleSide;
  arc(t0, span, y0 - 0.14, y0, trim, sR - 0.02); arc(t0, span, y0 + r.screenH, y0 + r.screenH + 0.14, trim, sR - 0.02);
  pool.add(r.cx, r.top - 1.2, r.cz, 0xcdbfff, 15, 34, 1.6);
  pool.add(r.cx + 9, r.y + 5, r.cz, 0xffe6b0, 9, 20, 1.6);            // warm wash on the hung pieces beside the door
  pool.add(r.cx - 9, r.y + 5, r.cz, ICE, 7, 22, 1.6);
  // wall slots for hung pieces: [x, z, yaw, y] flanking the doorway, facing the centre
  const slots = [62, 118, 36, 144].map(deg => { const t = THREE.MathUtils.degToRad(deg);
    return [r.cx + (r.r - 0.5) * Math.sin(t), r.cz + (r.r - 0.5) * Math.cos(t), t + Math.PI, r.y + 2.6]; });
  return { screen, slots };
}

function concierge(ctx) {
  const { box, mats, world } = ctx, c = PLAN.concierge;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(c.w, c.h), screenMat(THREE.FrontSide));
  screen.position.set(c.x, c.y, c.z); screen.rotation.y = Math.PI / 2; world.add(screen);
  [1, -1].forEach(s => { box(0.08, 0.1, c.w + 0.2, mats.goldMat, c.x - 0.02, c.y + s * (c.h / 2 + 0.05), c.z); box(0.08, c.h, 0.1, mats.goldMat, c.x - 0.02, c.y, c.z + s * (c.w / 2 + 0.05)); });
  return screen;
}

export function buildWings(ctx) {
  PLAN.bridges.forEach(b => bridge(ctx, b));
  const monolith = voidDeck(ctx), rot = rotunda(ctx), welcome = concierge(ctx);
  const d = PLAN.deck, r = PLAN.rotunda;
  const zones = [
    ...PLAN.bridges.map(b => ({ ax: b.a[0], az: b.a[2], bx: b.b[0], bz: b.b[2], hw: b.hw, ya: b.a[1], yb: b.b[1] })),
    { x0: d.x0 - 0.2, x1: d.x1 - 0.6, z0: d.z0 + 0.6, z1: d.z1 - 0.6, y: d.y },
    { cx: r.cx, cz: r.cz, r: r.r - 0.9, y: r.y },
  ];
  return { zones, rotundaSlots: rot.slots, screens: { monolith, rotunda: rot.screen, concierge: welcome } };
}
