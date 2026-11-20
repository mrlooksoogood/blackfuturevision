// Walkable area = a union of simple shapes. Collision = "is the next point inside any shape".
//   rect   {x0,x1,z0,z1,y}            flat room
//   circle {cx,cz,r,y}                flat round room
//   seg    {ax,az,bx,bz,hw,ya,yb}     corridor / ramp of half-width hw; floor height runs ya -> yb
const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);

function segParam(s, x, z) {
  const dx = s.bx - s.ax, dz = s.bz - s.az;
  return clamp01(((x - s.ax) * dx + (z - s.az) * dz) / (dx * dx + dz * dz));
}
function segDist(s, x, z, t) {
  return Math.hypot(x - (s.ax + (s.bx - s.ax) * t), z - (s.az + (s.bz - s.az) * t));
}

export function createNav(zones) {
  const segs = zones.filter(z => z.hw !== undefined);
  const rects = zones.filter(z => z.x0 !== undefined);
  const circles = zones.filter(z => z.r !== undefined);

  // Floor height at (x,z), or null when the point is not walkable.
  function floorAt(x, z) {
    for (const s of segs) { const t = segParam(s, x, z); if (segDist(s, x, z, t) <= s.hw) return s.ya + (s.yb - s.ya) * t; }
    for (const r of rects) { if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return r.y; }
    for (const c of circles) { if (Math.hypot(x - c.cx, z - c.cz) <= c.r) return c.y; }
    return null;
  }

  // Try the full step, then slide along each axis. Returns a new position; never mutates p.
  function move(p, dx, dz) {
    const tries = [[p.x + dx, p.z + dz], [p.x + dx, p.z], [p.x, p.z + dz]];
    for (const [x, z] of tries) { const y = floorAt(x, z); if (y !== null) return { x, z, y, blocked: false }; }
    return { x: p.x, z: p.z, y: floorAt(p.x, p.z) ?? p.y ?? 0, blocked: true };
  }

  // Closest walkable point to (x,z): searches outward in rings. Used when leaving the tour rail mid-air.
  function nearest(x, z) {
    const y0 = floorAt(x, z); if (y0 !== null) return { x, z, y: y0 };
    for (let r = 0.4; r <= 10; r += 0.4) {
      for (let a = 0; a < 16; a++) {
        const px = x + Math.cos(a * Math.PI / 8) * r, pz = z + Math.sin(a * Math.PI / 8) * r, y = floorAt(px, pz);
        if (y !== null) return { x: px, z: pz, y };
      }
    }
    return null;
  }

  return { floorAt, move, nearest };
}
