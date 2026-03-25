import './index.css';

import * as THREE from 'three';
import * as CANNON from 'cannon';
import TWEEN from '@tweenjs/tween.js';
import Rx from 'rxjs/Rx';

import Twister from 'mersenne-twister';


const body = window.document.body,
      BODY_WIDTH = Math.min(body.offsetWidth, 540),
      BODY_HEIGHT = body.offsetHeight,
      ASPECT = BODY_WIDTH / BODY_HEIGHT,
      SCREEN_HEIGHT = BODY_HEIGHT,
      SCREEN_WIDTH = SCREEN_HEIGHT * ASPECT,
      FRUSTUM_HEIGHT = 6,
      FRUSTUM_WIDTH = FRUSTUM_HEIGHT * ASPECT,
      FRUSTUM_SCALE = FRUSTUM_HEIGHT / SCREEN_HEIGHT;

const FLIP_DISTANCE_UNIT = 2.5,
      FLIP_HEIGHT = 1.5,
      FLIP_DURATION = 500;

const BOTTLE_PRESSED_H = 1.2,
      BOTTLE_PRESSED_V = 0.45,
      BLOCK_PRESSED_H = 0.5,
      BLOCK_HEIGHT = 1;

const PRESS_DURATION = 3000,
      BOUNCE_DURATION = 500;

const font = new THREE.FontLoader().parse(require('./assets/font.json'))

// === La Maison PB — Design Tokens ===
const PB_ORANGE = 0xE8750A;
const PB_VERT_FONCE = 0x2D3319;
const PB_VERT_CLAIR = 0x8CB33F;
const PB_WHITE = 0xFFFFFF;
const PB_CREAM = 0xFFF3E0;
const PB_BRUN_BOIS = 0x6B3A1B;
const PB_GRIS_FONTE = 0x3A3A3A;
const PB_OR = 0xD4A017;

// === World definitions ===
export const WORLDS = {
  restaurant: { name: 'Restaurant', bg: 0x2D3319, ground: 0xFFF3E0, ambient: 0xFFE0AA, ambientIntensity: 0.9, fogDensity: 0.006 },
  espace:     { name: 'Espace',     bg: 0x020210, ground: 0x0a0a1a, ambient: 0x6666cc, ambientIntensity: 0.5, fogDensity: 0.008 },
  ocean:      { name: 'Océan',      bg: 0x0a3050, ground: 0xd4b483, ambient: 0xaaddff, ambientIntensity: 0.8, fogDensity: 0.005 },
  nuit:       { name: 'Nuit VIP',   bg: 0x0a0814, ground: 0x1a1020, ambient: 0xcc88ff, ambientIntensity: 0.5, fogDensity: 0.01 },
};

// === Procedural world builders (return {group, update}) ===
function addAt(parent, obj, x, y, z) {
  obj.position.set(x, y, z);
  parent.add(obj);
  return obj;
}

function buildRestaurantScene() {
  const g = new THREE.Group();
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
  const phong = (c, s) => new THREE.MeshPhongMaterial({ color: c, specular: s || 0x222222, shininess: 30 });

  // Floor accents on the sides
  const stripL = new THREE.Mesh(new THREE.PlaneGeometry(2, 80), mat(0x4a2d14));
  stripL.position.set(-2, 20, 0.002); g.add(stripL);
  const stripR = new THREE.Mesh(new THREE.PlaneGeometry(2, 80), mat(0x4a2d14));
  stripR.position.set(5.5, 20, 0.002); g.add(stripR);

  // Table helper
  function makeTable(x, y) {
    const t = new THREE.Group();
    addAt(t, new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.08), phong(0x3d2b1a, 0x554433)), 0, 0, 1.1);
    const legG = new THREE.CylinderGeometry(0.04, 0.04, 1.05, 6); legG.rotateX(Math.PI / 2);
    [[-0.5,-0.3],[0.5,-0.3],[-0.5,0.3],[0.5,0.3]].forEach(([ox,oy]) => {
      const l = new THREE.Mesh(legG, mat(0x2a1a0a)); l.position.set(ox, oy, 0.52); t.add(l);
    });
    t.position.set(x, y, 0);
    return t;
  }

  // Poulet braisé on plate!
  function makeChickenPlate(x, y) {
    const p = new THREE.Group();
    // Plate
    const pGeo = new THREE.CylinderGeometry(0.22, 0.19, 0.04, 16); pGeo.rotateX(Math.PI / 2);
    p.add(new THREE.Mesh(pGeo, phong(0xFFF8F0, 0xffffff)));
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.012, 6, 16), mat(PB_ORANGE));
    rim.position.z = 0.02; p.add(rim);
    // Chicken drumstick (cuisse de poulet)
    const bodyGeo = new THREE.SphereGeometry(0.1, 8, 6);
    const body = new THREE.Mesh(bodyGeo, mat(0xCC6600));
    body.scale.set(1, 0.7, 0.6); body.position.z = 0.1; p.add(body);
    // Bone sticking out
    const boneGeo = new THREE.CylinderGeometry(0.015, 0.02, 0.12, 6); boneGeo.rotateX(Math.PI / 2);
    const bone = new THREE.Mesh(boneGeo, mat(0xFFF8E0));
    bone.position.set(0.08, 0, 0.14); bone.rotation.z = -0.5; p.add(bone);
    // Grill marks
    for (let i = -1; i <= 1; i++) {
      const mark = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.01, 0.005), mat(0x663300));
      mark.position.set(0, i * 0.03, 0.16); p.add(mark);
    }
    p.position.set(x, y, 1.14);
    return p;
  }

  // Frites (fries) side
  function makeFrites(x, y) {
    const f = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const frite = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.015, 0.08 + Math.random() * 0.04), mat(0xFFCC44));
      frite.position.set((Math.random() - 0.5) * 0.08, (Math.random() - 0.5) * 0.06, 1.18 + Math.random() * 0.02);
      frite.rotation.set(Math.random() * 0.3, Math.random() * 0.3, Math.random() * 0.5);
      f.add(frite);
    }
    f.position.set(x, y, 0);
    return f;
  }

  // Steam particles (animated)
  const steamParticles = [];
  function makeSteam(x, y) {
    const particles = [];
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Mesh(
        new THREE.SphereGeometry(0.02, 4, 4),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 })
      );
      s.position.set(x + (Math.random() - 0.5) * 0.1, y + (Math.random() - 0.5) * 0.1, 1.3);
      s.userData = { baseZ: 1.3, speed: 0.3 + Math.random() * 0.3, offset: Math.random() * Math.PI * 2, baseX: s.position.x, baseY: s.position.y };
      g.add(s);
      particles.push(s);
      steamParticles.push(s);
    }
  }

  // Chair
  function makeChair(x, y, rotZ) {
    const c = new THREE.Group();
    addAt(c, new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.06), mat(PB_ORANGE)), 0, 0, 0.65);
    addAt(c, new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.5), mat(0xBB5500)), 0, -0.23, 1.0);
    c.position.set(x, y, 0); c.rotation.z = rotZ || 0;
    return c;
  }

  // Lamp
  function makeLamp(x, y, z) {
    const l = new THREE.Group();
    const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.5, 4), mat(0x222222));
    wire.rotateX(Math.PI / 2); wire.position.z = 0.75; l.add(wire);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.25, 12, 1, true), new THREE.MeshLambertMaterial({ color: PB_ORANGE, side: THREE.DoubleSide }));
    shade.rotation.x = Math.PI / 2; l.add(shade);
    addAt(l, new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshBasicMaterial({ color: 0xFFDD88 })), 0, 0, 0.08);
    addAt(l, new THREE.PointLight(0xFFCC66, 0.6, 5), 0, 0, 0.05);
    l.position.set(x, y, z);
    return l;
  }

  // Candle with flickering flame
  const candleFlames = [];
  function makeCandle(x, y) {
    const c = new THREE.Group();
    // Candle body
    const candleGeo = new THREE.CylinderGeometry(0.02, 0.025, 0.12, 8);
    candleGeo.rotateX(Math.PI / 2);
    const candle = new THREE.Mesh(candleGeo, phong(0xFFF8E0, 0xffffff));
    candle.position.z = 0.06;
    c.add(candle);
    // Holder
    const holderGeo = new THREE.CylinderGeometry(0.04, 0.035, 0.03, 8);
    holderGeo.rotateX(Math.PI / 2);
    c.add(new THREE.Mesh(holderGeo, phong(0x886633, 0xaa8844)));
    // Flame
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.015, 0.05, 6),
      new THREE.MeshBasicMaterial({ color: 0xffaa33, transparent: true, opacity: 0.9 })
    );
    flame.position.z = 0.15;
    c.add(flame);
    // Warm glow
    const glow = new THREE.PointLight(0xff9933, 0.3, 2);
    glow.position.z = 0.15;
    c.add(glow);
    candleFlames.push({ flame, glow });
    c.position.set(x, y, 1.14);
    return c;
  }

  // Wine glass
  function makeGlass(x, y) {
    const gl = new THREE.Group();
    // Stem
    const stemGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.1, 6);
    stemGeo.rotateX(Math.PI / 2);
    gl.add(new THREE.Mesh(stemGeo, phong(0xcccccc, 0xffffff)));
    // Base
    const baseGeo = new THREE.CylinderGeometry(0.03, 0.035, 0.01, 8);
    baseGeo.rotateX(Math.PI / 2);
    const base = new THREE.Mesh(baseGeo, phong(0xcccccc, 0xffffff));
    base.position.z = -0.045;
    gl.add(base);
    // Bowl
    const bowlGeo = new THREE.CylinderGeometry(0.035, 0.015, 0.07, 8, 1, true);
    bowlGeo.rotateX(Math.PI / 2);
    const bowl = new THREE.Mesh(bowlGeo, new THREE.MeshPhongMaterial({ color: 0xdddddd, specular: 0xffffff, shininess: 100, transparent: true, opacity: 0.4 }));
    bowl.position.z = 0.085;
    gl.add(bowl);
    // Wine inside
    const wineGeo = new THREE.CylinderGeometry(0.032, 0.018, 0.04, 8);
    wineGeo.rotateX(Math.PI / 2);
    gl.add(new THREE.Mesh(wineGeo, new THREE.MeshPhongMaterial({ color: 0x880022, specular: 0x440011, shininess: 60 })));
    gl.position.set(x, y, 1.14);
    return gl;
  }

  // Napkin (folded cloth)
  function makeNapkin(x, y, color) {
    const n = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.02), mat(color || PB_ORANGE));
    n.position.set(x, y, 1.15);
    n.rotation.z = Math.random() * 0.3 - 0.15;
    return n;
  }

  // Dynamic table spawning — tables extend as player advances
  let lastSpawnedY = -6;
  const TABLE_SPACING = 5;
  const TABLE_RANGE_BEHIND = 10;  // keep tables up to 10 units behind camera
  const TABLE_RANGE_AHEAD = 40;   // spawn tables up to 40 units ahead
  const spawnedSets = [];  // track spawned table groups for cleanup

  function spawnTableSet(ty) {
    const set = new THREE.Group();
    [-2, 5.5].forEach((tx, side) => {
      const offsetY = side === 1 ? 2 : 0;
      const actualY = ty + offsetY;
      set.add(makeTable(tx, actualY));
      set.add(makeChair(tx - 0.8, actualY, 0));
      set.add(makeChair(tx + 0.8, actualY, Math.PI));
      set.add(makeChickenPlate(tx - 0.2, actualY));
      set.add(makeChickenPlate(tx + 0.2, actualY));
      set.add(makeFrites(tx, actualY - 0.15));
      set.add(makeCandle(tx, actualY + 0.2));
      set.add(makeGlass(tx - 0.35, actualY + 0.15));
      set.add(makeGlass(tx + 0.35, actualY + 0.15));
      set.add(makeNapkin(tx - 0.4, actualY - 0.2));
      set.add(makeNapkin(tx + 0.4, actualY - 0.2));
      // Inline steam for this set
      for (let sx = 0; sx < 2; sx++) {
        const steamX = tx + (sx === 0 ? -0.2 : 0.2);
        for (let si = 0; si < 4; si++) {
          const s = new THREE.Mesh(
            new THREE.SphereGeometry(0.02, 4, 4),
            new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 })
          );
          s.position.set(steamX + (Math.random() - 0.5) * 0.1, actualY + (Math.random() - 0.5) * 0.1, 1.3);
          s.userData = { baseZ: 1.3, speed: 0.3 + Math.random() * 0.3, offset: Math.random() * Math.PI * 2, baseX: s.position.x, baseY: s.position.y };
          set.add(s);
          steamParticles.push(s);
        }
      }
    });
    // Lamp pair
    set.add(makeLamp(-1.5, ty, 3.5));
    set.add(makeLamp(5, ty + 2, 3.5));
    // Wall art frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 0.5), phong(PB_OR, 0x886633));
    frame.position.set(-3.4, ty, 2);
    set.add(frame);
    set.userData = { baseY: ty };
    g.add(set);
    spawnedSets.push(set);
  }

  // Initial spawn
  for (let y = -6; y <= TABLE_RANGE_AHEAD; y += TABLE_SPACING) {
    spawnTableSet(y);
    lastSpawnedY = y;
  }

  // Grill/BBQ station
  const grill = new THREE.Group();
  addAt(grill, new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.0, 0.9), phong(0x222222, 0x333333)), 0, 0, 0.45);
  const charcoal = addAt(grill, new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.7), new THREE.MeshBasicMaterial({ color: 0xff3300, transparent: true })), 0, 0, 0.91);
  candleFlames.push({ flame: charcoal, glow: null, isCharcoal: true });
  for (let i = -3; i <= 3; i++) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.015, 0.02), mat(0x444444));
    line.position.set(0, i * 0.1, 0.93);
    grill.add(line);
  }
  for (let i = -3; i <= 3; i++) {
    const chk = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), phong(0xBB5500, 0x663300));
    chk.scale.set(1, 0.7, 0.5); chk.position.set(i * 0.2, 0, 0.98); grill.add(chk);
  }
  addAt(grill, new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.1, 0.05), mat(0x333333)), 0, 0, 1.8);
  grill.position.set(-2, 22, 0);
  g.add(grill);
  makeSteam(-2, 22); makeSteam(-1.7, 22); makeSteam(-2.3, 22);

  // Walls — very long to never run out
  const wm = mat(0x2D3319);
  const lw = new THREE.Mesh(new THREE.PlaneGeometry(400, 4), wm);
  lw.position.set(-3.5, 100, 2); lw.rotation.x = Math.PI / 2; lw.rotation.z = Math.PI / 2; g.add(lw);
  const rw = new THREE.Mesh(new THREE.PlaneGeometry(400, 4), wm);
  rw.position.set(7, 100, 2); rw.rotation.x = Math.PI / 2; rw.rotation.z = Math.PI / 2; g.add(rw);

  // Wainscoting — very long
  const wainMat = phong(0x3d2b1a, 0x554433);
  const wainL = new THREE.Mesh(new THREE.PlaneGeometry(400, 1.2), wainMat);
  wainL.position.set(-3.45, 100, 0.6); wainL.rotation.x = Math.PI / 2; wainL.rotation.z = Math.PI / 2; g.add(wainL);
  const wainR = new THREE.Mesh(new THREE.PlaneGeometry(400, 1.2), wainMat);
  wainR.position.set(6.95, 100, 0.6); wainR.rotation.x = Math.PI / 2; wainR.rotation.z = Math.PI / 2; g.add(wainR);

  // Floor strips — very long
  stripL.scale.y = 5; stripR.scale.y = 5;
  stripL.position.y = 100; stripR.position.y = 100;

  // Sign
  addAt(g, new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.05, 0.5), phong(PB_ORANGE, 0xff8833)), -2.5, 24, 2.5);
  addAt(g, new THREE.PointLight(PB_ORANGE, 0.4, 3), -2.5, 23, 2.5);

  // Track camera Y for dynamic spawning
  let _lastCamY = 0;

  return {
    group: g,
    update: (time, cameraY) => {
      const t = time * 0.001;

      // Dynamic spawning: extend tables ahead of camera
      if (cameraY !== undefined) _lastCamY = cameraY;
      const targetY = _lastCamY + TABLE_RANGE_AHEAD;
      while (lastSpawnedY < targetY) {
        lastSpawnedY += TABLE_SPACING;
        spawnTableSet(lastSpawnedY);
      }
      // Cleanup: remove sets far behind camera
      for (let i = spawnedSets.length - 1; i >= 0; i--) {
        if (spawnedSets[i].userData.baseY < _lastCamY - TABLE_RANGE_BEHIND) {
          g.remove(spawnedSets[i]);
          spawnedSets.splice(i, 1);
        }
      }

      // Animate steam rising
      steamParticles.forEach(s => {
        const d = s.userData;
        s.position.z = d.baseZ + ((t * d.speed + d.offset) % 1) * 0.5;
        s.position.x = d.baseX + Math.sin(t * 2 + d.offset) * 0.03;
        s.material.opacity = 0.35 - ((t * d.speed + d.offset) % 1) * 0.3;
      });
      // Candle flames flicker
      candleFlames.forEach((cf, i) => {
        if (cf.isCharcoal) {
          cf.flame.material.opacity = 0.6 + Math.sin(t * 8 + i) * 0.15;
          return;
        }
        const flicker = Math.sin(t * 12 + i * 3) * 0.3 + Math.sin(t * 7 + i * 5) * 0.2;
        cf.flame.scale.set(1 + flicker * 0.3, 1 + flicker * 0.3, 1 + flicker * 0.2);
        cf.flame.material.opacity = 0.8 + flicker * 0.15;
        if (cf.glow) cf.glow.intensity = 0.3 + flicker * 0.15;
      });
    }
  };
}

function buildEspaceScene() {
  const g = new THREE.Group();

  // Star field with varying brightness
  const starsGeo = new THREE.Geometry();
  for (let i = 0; i < 800; i++) {
    starsGeo.vertices.push(new THREE.Vector3(
      (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60, -2 - Math.random() * 18
    ));
  }
  const stars = new THREE.Points(starsGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.05, transparent: true }));
  g.add(stars);

  // Second layer of brighter stars
  const bigStarsGeo = new THREE.Geometry();
  for (let i = 0; i < 60; i++) {
    bigStarsGeo.vertices.push(new THREE.Vector3(
      (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40, -2 - Math.random() * 10
    ));
  }
  const bigStars = new THREE.Points(bigStarsGeo, new THREE.PointsMaterial({ color: 0xffffcc, size: 0.12, transparent: true }));
  g.add(bigStars);

  // Nebulae
  [0xff4488, 0x4488ff, 0x88ff44, 0xffaa22].forEach((c, i) => {
    const nebula = new THREE.Mesh(
      new THREE.SphereGeometry(2.5 + i * 0.5, 16, 16),
      new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.05 })
    );
    nebula.position.set(-8 + i * 6, 5 + i * 4, -10 - i * 2);
    g.add(nebula);
  });

  // Planet
  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(1.5, 24, 24),
    new THREE.MeshPhongMaterial({ color: 0x884422, specular: 0x442211, shininess: 10 })
  );
  planet.position.set(8, 12, -6);
  g.add(planet);
  // Planet ring
  const ringGeo = new THREE.RingGeometry(2.0, 2.8, 32);
  const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xaa8855, transparent: true, opacity: 0.4, side: THREE.DoubleSide }));
  ring.position.copy(planet.position);
  ring.rotation.x = 1.2;
  g.add(ring);

  // Animated asteroids
  const asteroids = [];
  for (let i = 0; i < 20; i++) {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.1 + Math.random() * 0.25, 0),
      new THREE.MeshLambertMaterial({ color: 0x666666 })
    );
    const angle = Math.random() * Math.PI * 2;
    const radius = 3 + Math.random() * 12;
    rock.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius + 5, -1 - Math.random() * 5);
    rock.userData = { angle, radius, speed: 0.00005 + Math.random() * 0.0001, rotSpeed: 0.5 + Math.random(), yBase: rock.position.y };
    g.add(rock);
    asteroids.push(rock);
  }

  // Shooting star trail
  const shootingStars = [];
  for (let i = 0; i < 3; i++) {
    const trail = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.02, 0.02),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
    );
    trail.userData = { timer: Math.random() * 10000, interval: 4000 + Math.random() * 6000 };
    g.add(trail);
    shootingStars.push(trail);
  }

  return {
    group: g,
    update: (time) => {
      // Twinkling stars
      stars.material.opacity = 0.6 + Math.sin(time * 0.002) * 0.2;
      bigStars.material.opacity = 0.8 + Math.sin(time * 0.003 + 1) * 0.2;
      // Rotate asteroids
      asteroids.forEach(r => {
        r.userData.angle += r.userData.speed * 16;
        r.position.x = Math.cos(r.userData.angle) * r.userData.radius;
        r.position.y = r.userData.yBase + Math.sin(r.userData.angle) * r.userData.radius * 0.3;
        r.rotation.x += r.userData.rotSpeed * 0.02;
        r.rotation.z += r.userData.rotSpeed * 0.015;
      });
      // Shooting stars
      shootingStars.forEach(s => {
        const phase = (time - s.userData.timer) % s.userData.interval;
        if (phase < 300) {
          const t = phase / 300;
          s.material.opacity = 1 - t;
          s.position.set(-10 + t * 25, 15 - t * 10 + s.userData.timer % 7, -3);
          s.rotation.z = -0.4;
        } else {
          s.material.opacity = 0;
        }
      });
    }
  };
}

function buildOceanScene() {
  const g = new THREE.Group();

  // Deep water — main surface with higher resolution for smoother waves
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100, 50, 50),
    new THREE.MeshPhongMaterial({
      color: 0x0e4d6e,
      specular: 0xaaddff,
      shininess: 120,
      transparent: true,
      opacity: 0.75,
    })
  );
  water.position.set(10, 20, -0.5);
  g.add(water);

  // Secondary deeper water layer for depth illusion
  const deepWater = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshPhongMaterial({ color: 0x082840, specular: 0x224466, shininess: 30, transparent: true, opacity: 0.6 })
  );
  deepWater.position.set(10, 20, -0.8);
  g.add(deepWater);

  // Surface foam / caustics layer
  const foam = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100, 20, 20),
    new THREE.MeshBasicMaterial({ color: 0xcceeff, transparent: true, opacity: 0.08 })
  );
  foam.position.set(10, 20, -0.45);
  g.add(foam);

  // Sand — very large
  addAt(g, new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshLambertMaterial({ color: 0xd4b483 })), 10, 20, -1.5);

  // Animated fish
  const fish = [];
  const fishColors = [0xffaa00, 0x00aaff, 0xff4444, 0x44ff88, 0xff88ff, 0xffff44];
  for (let i = 0; i < 15; i++) {
    const f = new THREE.Group();
    // Body
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), new THREE.MeshLambertMaterial({ color: fishColors[i % fishColors.length] }));
    body.scale.set(2, 1, 0.6);
    f.add(body);
    // Tail
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 4), new THREE.MeshLambertMaterial({ color: fishColors[i % fishColors.length] }));
    tail.rotation.z = Math.PI / 2; tail.position.x = -0.15;
    f.add(tail);
    // Eye
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.015, 4, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    eye.position.set(0.1, 0.03, 0.04);
    f.add(eye);

    const radius = 2 + Math.random() * 8;
    const speed = 0.0003 + Math.random() * 0.0005;
    const zBase = -0.3 - Math.random() * 0.8;
    f.userData = { angle: Math.random() * Math.PI * 2, radius, speed, zBase, centerX: (Math.random() - 0.5) * 10, centerY: Math.random() * 10 };
    f.position.z = zBase;
    g.add(f);
    fish.push(f);
  }

  // Boats on surface
  const boats = [];
  for (let i = 0; i < 3; i++) {
    const boat = new THREE.Group();
    // Hull
    const hull = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.15), new THREE.MeshLambertMaterial({ color: [0x8B4513, 0xCC2222, 0x2255AA][i] }));
    boat.add(hull);
    // Mast
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.6, 4), new THREE.MeshLambertMaterial({ color: 0x4a3520 }));
    mast.rotateX(Math.PI / 2); mast.position.z = 0.3;
    boat.add(mast);
    // Sail
    const sail = new THREE.Mesh(
      new THREE.PlaneGeometry(0.3, 0.4),
      new THREE.MeshLambertMaterial({ color: 0xfff8ee, side: THREE.DoubleSide })
    );
    sail.position.set(0.05, 0, 0.35);
    boat.add(sail);

    boat.userData = { angle: Math.random() * Math.PI * 2, radius: 4 + i * 3, speed: 0.0001 + Math.random() * 0.0002, bobOffset: Math.random() * 10 };
    boat.position.z = -0.42;
    g.add(boat);
    boats.push(boat);
  }

  // Coral + seaweed
  for (let i = 0; i < 20; i++) {
    const coral = new THREE.Mesh(
      new THREE.ConeGeometry(0.08 + Math.random() * 0.12, 0.3 + Math.random() * 0.5, 5),
      new THREE.MeshLambertMaterial({ color: [0xff6644, 0x44cc66, 0xff44aa, 0xffaa22, 0x6644ff][Math.floor(Math.random() * 5)] })
    );
    coral.position.set((Math.random() - 0.5) * 20, Math.random() * 20, -1.3);
    g.add(coral);
  }

  // Bubbles (animated)
  const bubbles = [];
  for (let i = 0; i < 20; i++) {
    const b = new THREE.Mesh(
      new THREE.SphereGeometry(0.015 + Math.random() * 0.02, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xaaddff, transparent: true, opacity: 0.5 })
    );
    b.userData = { baseX: (Math.random() - 0.5) * 15, baseY: Math.random() * 15, speed: 0.2 + Math.random() * 0.4, offset: Math.random() * 10 };
    b.position.set(b.userData.baseX, b.userData.baseY, -1.2);
    g.add(b);
    bubbles.push(b);
  }

  return {
    group: g,
    update: (time) => {
      const t = time * 0.001;
      // Multi-frequency wave animation for realistic water
      const verts = water.geometry.vertices;
      for (let i = 0, len = verts.length; i < len; i++) {
        const v = verts[i];
        v.z = Math.sin(v.x * 0.4 + t * 1.8) * 0.07
            + Math.cos(v.y * 0.3 + t * 1.3) * 0.05
            + Math.sin(v.x * 1.2 + v.y * 0.8 + t * 2.5) * 0.025
            + Math.cos(v.x * 0.7 - v.y * 0.5 + t * 3.0) * 0.015;
      }
      water.geometry.verticesNeedUpdate = true;
      // Foam layer subtle ripple
      const foamVerts = foam.geometry.vertices;
      for (let i = 0, len = foamVerts.length; i < len; i++) {
        const v = foamVerts[i];
        v.z = Math.sin(v.x * 0.6 + t * 2.2) * 0.02 + Math.cos(v.y * 0.5 + t * 1.7) * 0.015;
      }
      foam.geometry.verticesNeedUpdate = true;
      // Animate foam opacity for shimmer effect
      foam.material.opacity = 0.06 + Math.sin(t * 1.5) * 0.03;
      // Fish swimming in circles
      fish.forEach(f => {
        f.userData.angle += f.userData.speed * 16;
        const a = f.userData.angle;
        f.position.x = f.userData.centerX + Math.cos(a) * f.userData.radius;
        f.position.y = f.userData.centerY + Math.sin(a) * f.userData.radius * 0.5;
        f.position.z = f.userData.zBase + Math.sin(t + f.userData.angle) * 0.1;
        f.rotation.z = a + Math.PI;
      });
      // Boats bobbing and drifting
      boats.forEach(b => {
        b.userData.angle += b.userData.speed * 16;
        b.position.x = Math.cos(b.userData.angle) * b.userData.radius + 2;
        b.position.y = Math.sin(b.userData.angle) * b.userData.radius + 6;
        b.position.z = -0.42 + Math.sin(t * 2 + b.userData.bobOffset) * 0.04;
        b.rotation.z = b.userData.angle + Math.PI / 2;
        b.rotation.x = Math.sin(t * 3 + b.userData.bobOffset) * 0.1;
      });
      // Bubbles rising
      bubbles.forEach(b => {
        const phase = (t * b.userData.speed + b.userData.offset) % 1.5;
        b.position.z = -1.2 + phase * 0.6;
        b.position.x = b.userData.baseX + Math.sin(t * 3 + b.userData.offset) * 0.05;
        b.material.opacity = 0.5 - phase * 0.3;
      });
    }
  };
}

function buildNuitScene() {
  const g = new THREE.Group();
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });

  // Glossy dark floor — very large
  addAt(g, new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshPhongMaterial({ color: 0x0a0812, specular: 0x332244, shininess: 60 })
  ), 10, 20, -0.01);

  // Neon strips on BOTH side walls
  const neonColors = [0xff00ff, 0x00ffff, PB_ORANGE, 0xff0066, 0x00ff88, 0xffff00];
  const neons = [];
  for (let y = 0; y <= 30; y += 6) {
    [-3, 7].forEach((wx) => {
      const i = neons.length;
      const neon = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 4, 0.06),
        new THREE.MeshBasicMaterial({ color: neonColors[i % neonColors.length], transparent: true })
      );
      neon.position.set(wx, y, 2.8);
      g.add(neon);
      neons.push(neon);
      addAt(g, new THREE.PointLight(neonColors[i % neonColors.length], 0.3, 5), wx, y, 2);
    });
  }

  // VIP booths on LEFT side
  for (let y = 0; y <= 28; y += 8) {
    addAt(g, new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.8, 1.0), mat(0x1a1024)), -2.5, y, 0.5);
    addAt(g, new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.85, 0.04), mat(PB_OR)), -2.5, y, 1.02);
  }

  // Also booths on RIGHT side
  for (let y = 4; y <= 28; y += 8) {
    addAt(g, new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.8, 1.0), mat(0x1a1024)), 6, y, 0.5);
    addAt(g, new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.85, 0.04), mat(PB_OR)), 6, y, 1.02);
  }

  // Disco ball — high up, centered
  const discoBall = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.35, 2),
    new THREE.MeshPhongMaterial({ color: 0xcccccc, specular: 0xffffff, shininess: 200 })
  );
  discoBall.position.set(2, 10, 5);
  g.add(discoBall);

  // Spotlight beams from disco ball
  const spotlights = [];
  for (let i = 0; i < 4; i++) {
    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(1.2, 5, 8, 1, true),
      new THREE.MeshBasicMaterial({ color: neonColors[i], transparent: true, opacity: 0.06, side: THREE.DoubleSide })
    );
    beam.position.set(2, 10, 5);
    g.add(beam);
    spotlights.push(beam);
  }

  // DJ booth
  addAt(g, new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 1.2), mat(0x1a0a20)), -2, 25, 0.6);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.25), new THREE.MeshBasicMaterial({ color: 0x00ffff }));
  screen.position.set(-2, 24.6, 1.3); screen.rotation.x = Math.PI * 0.6;
  g.add(screen);

  // Dance floor — large glowing strips on the sides (not individual tiles)
  const danceTiles = [];
  const dancePositions = [[-2, 0], [-2, 10], [-2, 20], [6, 5], [6, 15], [6, 25]];
  dancePositions.forEach(([dx, dy], i) => {
    const tile = new THREE.Mesh(
      new THREE.PlaneGeometry(4, 8),
      new THREE.MeshBasicMaterial({ color: neonColors[i % neonColors.length], transparent: true, opacity: 0.06 })
    );
    tile.position.set(dx, dy, 0.005);
    tile.userData = { phaseOffset: i * 5 };
    g.add(tile);
    danceTiles.push(tile);
  });

  // Stars through glass ceiling — wider
  const starsGeo = new THREE.Geometry();
  for (let i = 0; i < 300; i++) {
    starsGeo.vertices.push(new THREE.Vector3((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30, 5 + Math.random() * 5));
  }
  g.add(new THREE.Points(starsGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.04 })));

  // Laser beams from DJ
  const lasers = [];
  for (let i = 0; i < 5; i++) {
    const laser = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 10, 4),
      new THREE.MeshBasicMaterial({ color: [0xff0000, 0x00ff00, 0xff00ff][i % 3], transparent: true, opacity: 0.3 })
    );
    laser.position.set(-2, 25, 2);
    g.add(laser);
    lasers.push(laser);
  }

  return {
    group: g,
    update: (time) => {
      const t = time * 0.001;
      // Disco ball rotation
      discoBall.rotation.z = t * 0.5;
      discoBall.rotation.y = t * 0.3;
      // Spotlight beams rotate
      spotlights.forEach((s, i) => {
        s.rotation.x = Math.sin(t * 0.7 + i * 1.5) * 0.5 + 0.8;
        s.rotation.z = t * 0.3 + i * Math.PI / 2;
        s.material.opacity = 0.06 + Math.sin(t * 2 + i) * 0.03;
      });
      // Neon pulse
      neons.forEach((n, i) => {
        n.material.opacity = 0.7 + Math.sin(t * 3 + i * 0.8) * 0.3;
      });
      // Dance floor tiles pulse
      danceTiles.forEach(tile => {
        tile.material.opacity = 0.05 + Math.abs(Math.sin(t * 4 + tile.userData.phaseOffset * 0.5)) * 0.15;
      });
      // Lasers sweep
      lasers.forEach((l, i) => {
        l.rotation.x = Math.sin(t * 1.5 + i * 1.2) * 0.6;
        l.rotation.z = t * 0.8 + i * Math.PI / 2.5;
        l.material.opacity = 0.15 + Math.sin(t * 5 + i * 2) * 0.1;
      });
    }
  };
}

function createRoundBlock(mainColor, accentColor, topRadius, bottomRadius, height) {
  const group = new THREE.Group();
  const bodyGeo = new THREE.CylinderGeometry(topRadius, bottomRadius, height, 32);
  const bodyMat = new THREE.MeshLambertMaterial({ color: mainColor });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.rotation.x = Math.PI / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);
  const rimGeo = new THREE.TorusGeometry(topRadius * 0.92, 0.03, 8, 32);
  const rimMat = new THREE.MeshLambertMaterial({ color: accentColor });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.position.z = height / 2;
  rim.castShadow = true;
  group.add(rim);
  return group;
}

function createBoxBlock(mainColor, accentColor, width, depth, height) {
  const group = new THREE.Group();
  const bodyGeo = new THREE.BoxGeometry(width, depth, height);
  const bodyMat = new THREE.MeshLambertMaterial({ color: mainColor });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.z = height / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);
  // Accent stripe on top
  const stripeGeo = new THREE.BoxGeometry(width * 0.9, depth * 0.9, 0.04);
  const stripeMat = new THREE.MeshLambertMaterial({ color: accentColor });
  const stripe = new THREE.Mesh(stripeGeo, stripeMat);
  stripe.position.z = height + 0.02;
  group.add(stripe);
  return group;
}

function createGrillBlock() {
  const group = new THREE.Group();
  // Base plate
  const baseGeo = new THREE.BoxGeometry(1.0, 1.0, 0.15);
  const baseMat = new THREE.MeshLambertMaterial({ color: PB_VERT_FONCE });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.z = 0.075;
  base.castShadow = true;
  group.add(base);
  // Grill lines
  for (let i = -3; i <= 3; i++) {
    const lineGeo = new THREE.BoxGeometry(0.9, 0.03, 0.05);
    const lineMat = new THREE.MeshLambertMaterial({ color: PB_GRIS_FONTE });
    const line = new THREE.Mesh(lineGeo, lineMat);
    line.position.set(0, i * 0.12, 0.2);
    group.add(line);
  }
  return group;
}

const cubes = [
  // Assiette plate cream — la plus commune
  { model: createRoundBlock(PB_CREAM, PB_ORANGE, 0.55, 0.50, 0.4), stayScore: 0, prob: 3 },
  // Marmite braisé — orange profond, plus haute
  { model: createRoundBlock(PB_ORANGE, PB_VERT_FONCE, 0.42, 0.50, 1.2), stayScore: 2, prob: 2 },
  // Planche à découper bois
  { model: createBoxBlock(PB_BRUN_BOIS, PB_VERT_FONCE, 0.95, 0.70, 0.3), stayScore: 0, prob: 3 },
  // Grill charbon
  { model: createGrillBlock(), stayScore: 8, prob: 1 },
  // Plat VIP doré
  { model: createRoundBlock(PB_OR, PB_ORANGE, 0.48, 0.52, 0.9), stayScore: 16, prob: 1 },
  // Assiette du chef — évasée, vert clair
  { model: createRoundBlock(PB_WHITE, PB_VERT_CLAIR, 0.55, 0.42, 1.0), stayScore: 32, prob: 1 },
];

class Text {
  mesh = new THREE.Group();
  material = null;

  static glyphs = null;

  fontSize = 0.4;
  scale = this.fontSize / font.data.resolution;
  lineHeight = ( font.data.boundingBox.yMax - font.data.boundingBox.yMin + font.data.underlineThickness ) * this.scale;
  
  _text = '';


  constructor(text = '', material = new THREE.MeshBasicMaterial({color: 0xffffff})){
    if (Text.glyphs === null) {
      Text.glyphs = {};
      '+0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ '.split('').forEach(key => {
        Text.glyphs[key] = {
          geometry: new THREE.TextGeometry(key, {
            font: font,
            size: this.fontSize,
            height: 0.1,
          }),
          width: font.data.glyphs[key].ha * this.scale
        }
      })
    }
    this.material = material;
    this._text = text.toString();
    this.redraw();
  }

  get text(){
    return this._text;
  }

  set text(_text) {
    this._text = _text.toString();
    this.redraw();
  }

  redraw() {
    this.mesh.children.length = 0;
    let offset = 0;
    this._text.toString().split('').map((key, index) => {
      const glyph = new THREE.Mesh(Text.glyphs[key].geometry, this.material);
      glyph.position.set(offset, 0, 0);
      offset += Text.glyphs[key].width;
      return glyph;
    }).forEach(char => {
      char.position.x -= offset/2;
      this.mesh.add(char);
    })
  }
}



class ShadowText {
  mesh = new THREE.Group();
  fill = new Text();
  shadow = new Text('', new THREE.MeshBasicMaterial({transparent: true, opacity: 0.3, color: 0x000000}));
  lineHeight = this.fill.lineHeight;
  _text = '';

  constructor(text = '') {
    this.text = text;
    this.shadow.mesh.position.set(0, -0.02, -0.1);
    this.mesh.add(this.fill.mesh, this.shadow.mesh);
  }

  get text() {
    return this._text;
  }

  set text(_text) {
    this._text = _text;
    this.fill.text = _text;
    this.shadow.text = _text;
    this.onUpdate();
  }

  onUpdate() {

  }
}

class ScoreText extends ShadowText {
  onUpdate() {
    this.mesh.position.set(FRUSTUM_WIDTH/2, FRUSTUM_HEIGHT - this.lineHeight/2 - 40 * FRUSTUM_SCALE, 0);
  }
}

class CenterText extends ShadowText {
  constructor(text) {
    super(text);
    this.mesh.visible = false;
    this.mesh.scale.set(0.8, 0.65, 1);
  }

  onUpdate() {
    this.mesh.position.set(FRUSTUM_WIDTH/2, FRUSTUM_HEIGHT/2, 0);
  }
}

class AddScoreText {
  text = new ShadowText('0');
  mesh = this.text.mesh;
  
  constructor() {
    this.mesh.scale.set(3,3,3);
    this.mesh.position.set(0,0,1);
  }
}


class Waves {
  mesh = new THREE.Group();
  rings = [];
  count = 5;
  duration = 2000;
  interval = this.duration / 10;

  constructor() {
    for(let i = 0; i < this.count; ++i) {
      let ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.4, 50, 50), new THREE.MeshBasicMaterial({transparent: true, opacity: 1, color: PB_ORANGE}) );
      ring.visible = false;
      ring.position.z = 0.01;
      this.rings.push(ring);
      this.mesh.add(ring);
    }
  }

  wave(count) {
    this.rings.forEach(ring => {
      ring.visible = false;
    });

    count = Math.min(this.count, count);
    for(let i = 0; i < count; ++i) {
      let ring = this.rings[i];
      

      ring.scale.set(1, 1, 1);
      new TWEEN.Tween(ring.scale).delay(this.interval * i).to({x: 4, y: 4}, this.duration)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onStart(() => {
        ring.visible = true;
      })
      .start();

      ring.material.opacity = 0.8;
      new TWEEN.Tween(ring.material).delay(this.interval * i).to({opacity: 0}, this.duration)
      .easing(TWEEN.Easing.Quadratic.Out)
      .start();
    }
  }
}

class SputteringParticles {
  mesh = new THREE.Group();
  texture = new THREE.CanvasTexture( this.generateSprite() );
  material = new THREE.SpriteMaterial( {
    map: this.texture,
    color: PB_ORANGE,
  } );

  count = 15;
  duration = 500;

  constructor() {
    for(let i = 0; i < this.count; ++i) {
      const particle = new THREE.Sprite(this.material);
      particle.visible = false;
      this.mesh.add(particle);
    }
  }

  generateSprite() {
    var canvas = document.createElement( 'canvas' );
    canvas.width = 16;
    canvas.height = 16;
    var context = canvas.getContext( '2d' );
    var gradient = context.createRadialGradient( canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width / 2 );
    gradient.addColorStop( 0, 'rgba(255,255,255,1)' );
    gradient.addColorStop( 1, 'rgba(255,255,255,1)' );
    context.fillStyle = gradient;
    context.fillRect( 0, 0, canvas.width, canvas.height );
    return canvas;
  }

  emit() {
    this.mesh.visible = true;
    const particles = this.mesh.children;
    particles.forEach((particle, i) => {
      particle.visible = true;

      const direction = new THREE.Vector3(Math.cos(Math.random() * 2 * Math.PI), Math.sin(Math.random() * 2 * Math.PI), 0);
      const start = direction.clone().multiplyScalar(0.15);
      const end = direction.clone().multiplyScalar(0.25);
      const height = 0.3;

      particle.scale.set(0.02, 0.02, 0.02);
      particle.position.copy(start);
      const up = new TWEEN.Tween(particle.position).to({z: height}, this.duration / 2);
      const down = new TWEEN.Tween(particle.position).to({z: end.z}, this.duration / 2);
      const move = new TWEEN.Tween(particle.position).to({x: end.x, y: end.y}, this.duration).onComplete(() => {
        particle.visible = false;
      });

      up.chain(down).start();
      move.start();
    })

  }

  stop() {
    this.mesh.visible = false;
  }

}

class PolymericParticles {
  particles = new THREE.Group();
  count = 15;
  interval = 15;

  texture = new THREE.CanvasTexture( this.generateSprite() );

  whiteMaterial = new THREE.SpriteMaterial( {
    map: this.texture,
    color: PB_ORANGE,
  } );

  greenMaterial = new THREE.SpriteMaterial( {
    map: this.texture,
    color: PB_VERT_CLAIR,
  } )

  constructor() {
    for ( var i = 0; i < this.count; i++ ) {
      let particle = new THREE.Sprite( i % 3 ? this.whiteMaterial : this.greenMaterial );
      this.step( particle, i * this.interval );
      this.particles.add(particle);
    }
    this.particles.visible = false;
  }

  step(particle, delay) {
    const position = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(Math.random() * 0.2 + 0.4);
    
    particle.scale.set(0.03, 0.03, 0.03);
    particle.position.copy(position);
    particle.visible = false;

    new TWEEN.Tween(particle.position).delay(delay).to({x: 0, y: 0, z: 0}, this.count * this.interval).easing(TWEEN.Easing.Quadratic.In).start()
    .onStart(() => {
      particle.visible = true;
    })
    .onComplete(() => {
      this.step(particle, delay);
    })
  }

  generateSprite() {
    var canvas = document.createElement( 'canvas' );
    canvas.width = 16;
    canvas.height = 16;
    var context = canvas.getContext( '2d' );
    var gradient = context.createRadialGradient( canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width / 2 );
    gradient.addColorStop( 0, 'rgba(255,255,255,1)' );
    gradient.addColorStop( 1, 'rgba(255,255,255,1)' );
    context.fillStyle = gradient;
    context.fillRect( 0, 0, canvas.width, canvas.height );
    return canvas;
  }
}

class Block {
  mesh = new THREE.Group();
  body = new CANNON.Body({
    mass: 0
  });

  stayScore = 0;
  scale = 1;

  constructor(cube, scale = 1) {
    this.scale = scale;
    this.stayScore = cube.stayScore;
    const model = cube.model.clone();
    model.position.z = 0.5;
    model.castShadow = true;
    model.receiveShadow = true;
    this.mesh.add(model);

    this.mesh.scale.set(scale, scale, 1);
    this.body.addShape(new CANNON.Box(new CANNON.Vec3(scale / 2, scale / 2, 0.5)), new CANNON.Vec3(0, 0, 0.5));
  }

  update() {
      
  }

  press() {   
    this.mesh.scale.z = 1;
    return [
        new TWEEN.Tween(this.mesh.scale).to({z: BLOCK_PRESSED_H}, PRESS_DURATION).easing(TWEEN.Easing.Quadratic.Out)
    ]
  }

  bounce() {
    return [
      new TWEEN.Tween(this.mesh.scale).to({z: 1}, BOUNCE_DURATION).easing(TWEEN.Easing.Bounce.Out)
    ];
  }

  down() {
    this.mesh.position.z = 3;
    this.mesh.visible = true;
    return new TWEEN.Tween(this.mesh.position).to({z: 0}, 800).easing(TWEEN.Easing.Bounce.Out).start();
  }

  canHold(position) {
    const offset = position.clone().sub(this.mesh.position).setZ(0);
    return (Math.abs(offset.x) <= this.scale / 2 && Math.abs(offset.y) < this.scale / 2)
  }

  hitCenter(position) {
    const offset = position.clone().sub(this.mesh.position).setZ(0);
    return offset.length() < 0.08 * this.scale;
  }
}

class Bottle {
  connected = false;

  boundingBox = new THREE.Box3();
  offset = null;

  mesh = new THREE.Group();
  bottle = new THREE.Group(); // Procedural sauce bottle

  body = new CANNON.Body({
    mass: 0.1,
  });

  polymeric = new PolymericParticles();
  waves = new Waves();
  sputtering = new SputteringParticles();

  constructor()  {
    // === Build 3D "Sauce PB Verte" squeeze bottle ===
    // Reference: upside-down squeeze bottle — white cap at BOTTOM,
    // body widens, narrow waist, upper bulge, rounded dome on top
    const segments = 32;
    const rotMatrix = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
    const rotateGeo = (geo) => { geo.applyMatrix(rotMatrix); return geo; };

    // --- Green body (main silhouette via LatheGeometry) ---
    const bodyPts = [];
    // Bottom: narrow neck just above the cap (z=0 is bottom)
    bodyPts.push(new THREE.Vector2(0.00, 0.00));
    bodyPts.push(new THREE.Vector2(0.13, 0.00));
    bodyPts.push(new THREE.Vector2(0.14, 0.02));
    // Lower body expands
    bodyPts.push(new THREE.Vector2(0.16, 0.06));
    bodyPts.push(new THREE.Vector2(0.20, 0.12));
    bodyPts.push(new THREE.Vector2(0.24, 0.20));
    bodyPts.push(new THREE.Vector2(0.26, 0.28));
    // Waist (narrow squeeze point) — around 35-45% height
    bodyPts.push(new THREE.Vector2(0.23, 0.34));
    bodyPts.push(new THREE.Vector2(0.20, 0.38));
    bodyPts.push(new THREE.Vector2(0.19, 0.42));
    bodyPts.push(new THREE.Vector2(0.20, 0.46));
    // Upper bulge (widest part with label)
    bodyPts.push(new THREE.Vector2(0.23, 0.52));
    bodyPts.push(new THREE.Vector2(0.27, 0.60));
    bodyPts.push(new THREE.Vector2(0.29, 0.68));
    bodyPts.push(new THREE.Vector2(0.30, 0.76));
    bodyPts.push(new THREE.Vector2(0.29, 0.82));
    // Rounded dome top
    bodyPts.push(new THREE.Vector2(0.27, 0.86));
    bodyPts.push(new THREE.Vector2(0.24, 0.90));
    bodyPts.push(new THREE.Vector2(0.19, 0.93));
    bodyPts.push(new THREE.Vector2(0.13, 0.96));
    bodyPts.push(new THREE.Vector2(0.06, 0.98));
    bodyPts.push(new THREE.Vector2(0.00, 0.99));

    const bodyGeo = new THREE.LatheGeometry(bodyPts, segments);
    rotateGeo(bodyGeo);

    const greenMat = new THREE.MeshPhongMaterial({
      color: 0x8BA847,
      specular: 0x444422,
      shininess: 50,
    });
    this.bottle.add(new THREE.Mesh(bodyGeo, greenMat));

    // --- White cap at the very bottom ---
    const capPts = [];
    capPts.push(new THREE.Vector2(0.00, -0.18));
    capPts.push(new THREE.Vector2(0.16, -0.18));
    capPts.push(new THREE.Vector2(0.17, -0.16));
    capPts.push(new THREE.Vector2(0.17, -0.04));
    capPts.push(new THREE.Vector2(0.16, -0.02));
    capPts.push(new THREE.Vector2(0.14, 0.00));
    capPts.push(new THREE.Vector2(0.13, 0.00));

    const capGeo = new THREE.LatheGeometry(capPts, segments);
    rotateGeo(capGeo);
    const capMat = new THREE.MeshPhongMaterial({
      color: 0xF0EDE8,
      specular: 0xFFFFFF,
      shininess: 70,
    });
    this.bottle.add(new THREE.Mesh(capGeo, capMat));

    // --- Dark label on front face only (partial arc ~120deg) ---
    const labelArc = Math.PI * 0.65; // ~117 degrees
    const labelStart = -labelArc / 2; // centered on front
    const darkLabelGeo = rotateGeo(
      new THREE.CylinderGeometry(0.302, 0.282, 0.32, 20, 1, true, labelStart, labelArc)
    );
    const darkLabelMat = new THREE.MeshPhongMaterial({
      color: 0x2A3320,
      specular: 0x111111,
      shininess: 20,
      side: THREE.DoubleSide,
    });
    const labelBand = new THREE.Mesh(darkLabelGeo, darkLabelMat);
    labelBand.position.z = 0.68;
    this.bottle.add(labelBand);

    // --- Label image on front face (slightly outside dark background) ---
    const labelTexture = new THREE.TextureLoader().load('/sauce-label.png');
    labelTexture.wrapS = THREE.ClampToEdgeWrapping;
    labelTexture.wrapT = THREE.ClampToEdgeWrapping;

    const labelImgGeo = rotateGeo(
      new THREE.CylinderGeometry(0.305, 0.285, 0.28, 20, 1, true, labelStart, labelArc)
    );
    const labelMat = new THREE.MeshPhongMaterial({
      map: labelTexture,
      specular: 0x222222,
      shininess: 30,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const labelMesh = new THREE.Mesh(labelImgGeo, labelMat);
    labelMesh.position.z = 0.68;
    this.bottle.add(labelMesh);

    // Scale bottle to game size
    this.bottle.scale.set(0.5, 0.5, 0.5);

    this.mesh.add(this.bottle);
    this.mesh.position.z = 1;

    this.computeBoundingBox();
    const size = this.boundingBox.getSize();
    this.bottle.position.set(0, 0, - this.boundingBox.min.z);

    this.offset = new THREE.Vector3(0, 0, - this.boundingBox.min.z);

    const _size = new CANNON.Vec3().copy(size.clone().multiplyScalar(0.5));

    this.body.addShape(new CANNON.Box(_size));
    this.body.sleep();

    this.mesh.add(this.polymeric.particles);
    this.mesh.add(this.sputtering.mesh);
    this.mesh.add(this.waves.mesh);
  }

  _tmpVec = new THREE.Vector3();
  _tmpOffset = new THREE.Vector3();

  update() {
    if (this.connected) {
      this._tmpOffset.copy(this.offset).applyQuaternion(this.body.quaternion);
      this._tmpVec.copy(this.body.position).sub(this._tmpOffset);
      this.mesh.position.copy(this._tmpVec);
      this.mesh.quaternion.copy(this.body.quaternion);
    }
  }

  computeBoundingBox() {
    const boundingBox = object => {
      if (object instanceof THREE.Mesh) {
        const { geometry } = object;
        if (!geometry.boundingBox) geometry.computeBoundingBox();
        return geometry.boundingBox;
      }
      return new THREE.Box3();
    }

    const compute = object => {
      const box = boundingBox(object);
      object.children.forEach(o => {
        box.union(compute(o));
      })
      box.min.multiply(object.scale).applyEuler(object.rotation);
      box.max.multiply(object.scale).applyEuler(object.rotation);
      return box;
    }

    this.boundingBox = compute(this.mesh);
    return this.boundingBox;
  }

  flip(distance, direction) {
    const displacement = direction.clone().multiplyScalar(distance);

    // 翻滚
    const tumbleAxis = direction.clone().applyAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI/2).normalize();

    // 移动
    const {x, y} = this.mesh.position.clone().add(displacement),
    move = new TWEEN.Tween(this.mesh.position).to({x, y}, FLIP_DURATION);

    const rotate = new TWEEN.Tween({angle: 0, progress: 0}).to({angle: Math.PI * 2, progress: 1}, FLIP_DURATION).easing(TWEEN.Easing.Quadratic.Out).onUpdate(({angle, progress}) => {
      const tumble = new THREE.Quaternion().setFromAxisAngle(tumbleAxis, angle);
      this.bottle.quaternion.copy(tumble);
    }),
    up = new TWEEN.Tween(this.mesh.position).to({z: 1 + FLIP_HEIGHT}, FLIP_DURATION / 2).easing(TWEEN.Easing.Quadratic.Out),
    down = new TWEEN.Tween(this.mesh.position).to({z: 1}, FLIP_DURATION / 2).easing(TWEEN.Easing.Quadratic.In);
    up.chain(down);

    return [
      move, up, rotate
    ]
  }

  fall() {
    this.body.position.copy(this.mesh.position.clone().setZ(BLOCK_HEIGHT + this.offset.z));
    this.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 0), 0);
    this.body.wakeUp();
    this.connected = true;
  }

  press() {
    this.mesh.scale.set(1, 1, 1);
    this.mesh.position.z = 1;
    return [
        new TWEEN.Tween(this.mesh.scale).to({x: BOTTLE_PRESSED_H, y: BOTTLE_PRESSED_H, z: BOTTLE_PRESSED_V}, PRESS_DURATION).easing(TWEEN.Easing.Quadratic.Out),
        new TWEEN.Tween(this.mesh.position).to({z: BLOCK_PRESSED_H}, PRESS_DURATION).easing(TWEEN.Easing.Quadratic.Out),
    ];
  }

  bounce() {
    return [
      new TWEEN.Tween(this.mesh.scale).to({x: 1, y: 1, z: 1}, BOUNCE_DURATION).easing(TWEEN.Easing.Bounce.Out),
    ]
  }
}

export default class Game extends THREE.EventDispatcher {
  score = 0;
  combo = 0;

  scroreText = new ScoreText(this.score);
  gameOverText = new CenterText('GAME OVER');
  addScoreText = new AddScoreText();

  gameOver = false;
  
  time = 0;
  
  flipping = false;
  falling = false;

  pause = false;

  updates = [];

  world = new CANNON.World()

  renderer = new THREE.WebGLRenderer({antialias: true, alpla: true})

  scene = new THREE.Scene();

  camera = new THREE.OrthographicCamera(FRUSTUM_WIDTH / -2, FRUSTUM_WIDTH / 2, FRUSTUM_HEIGHT / 2, FRUSTUM_HEIGHT / -2, -40, 1000);

  bottle = new Bottle();

  light = new THREE.DirectionalLight(0xffffff, 0.28);

  blocks = [];

  steps = [];

  step = 0;

  UI = new THREE.Group();

  down$ =  Rx.Observable.merge(
    Rx.Observable.fromEvent(this.renderer.domElement, 'mousedown'),
    Rx.Observable.fromEvent(this.renderer.domElement, 'touchstart')
  ).do(e => { e.preventDefault(); });

  up$ = Rx.Observable.merge(
    Rx.Observable.fromEvent(this.renderer.domElement, 'mouseup'),
    Rx.Observable.fromEvent(this.renderer.domElement, 'touchend')
  ).do(e => { e.preventDefault(); });

  update$ = new Rx.Subject();

  constructor() {
    super();
    this.resestRandom();

    //renderer
    this.renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
    // this.renderer.shadowMap.enabled = true;
    // this.renderer.clearColor = 0xffffff;

    // const canvas = this.renderer.domElement;
    // canvas.style.height = '100%';
    // canvas.style.width = '100%';
    // body.appendChild(canvas);

    //scene
    this.scene.receiveShadow = true;
    
    //helper
    
    // const gridHelper = new THREE.GridHelper(1000, 500);
    // gridHelper.rotateX(Math.PI/-2)
    // this.scene.add(gridHelper);
    // this.scene.add(new THREE.AxisHelper(1000));
    this.renderer.setPixelRatio(Math.min(2,window.devicePixelRatio));

    //lights
    this.ambientLight = new THREE.AmbientLight(0xFFF0DD, 0.9);
    this.scene.add(this.ambientLight);


    this.light.position.set(2, -10, 15);
    this.light.castShadow = true;
    // this.light.target = this.bottle.mesh;
    this.scene.add(this.light);
    this.scene.add(this.light.target);

    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(FRUSTUM_WIDTH, FRUSTUM_HEIGHT), new THREE.MeshLambertMaterial({color: PB_CREAM}));
    this.ground.position.z = -20;
    this.camera.add(this.ground);
    
    this.camera.position.set(-5, -6, 7);
    this.camera.castShadow = true;
    this.camera.receiveShadow = true;
    this.camera.up.set(0, 0, 1);
    this.camera.lookAt(new THREE.Vector3(0,0,0))

    
    this.UI.position.set(FRUSTUM_WIDTH/-2, FRUSTUM_HEIGHT/-2, 0);
    
    this.camera.add(this.UI);
    
    this.UI.add(this.gameOverText.mesh);
    this.scroreText.mesh.visible = false;
    this.UI.add(this.scroreText.mesh);
    this.scene.add(this.camera);

    
    //graphics ground


    //background
    // const background = new THREE.Mesh(new THREE.IcosahedronGeometry(100), new THREE.MeshLambertMaterial({color: 0xeeeeee, side: THREE.BackSide}));
    // this.scene.add(background);

    this.world.gravity.set(0, 0, -9.8);

    const _ground = new CANNON.Body({
      mass: 0,
    });

    _ground.addShape(new CANNON.Plane(), new CANNON.Vec3(0, 0, 0))
    this.world.addBody(_ground);



    this.add(this.bottle);

    this.restart(20);
    this.scroreText.mesh.visible = false;

    const _flipped$ = this.down$
      .filter(() => (!this.falling && !this.gameOver && !this.flipping))
      .map(() => {
        this.flipping = true;
        this.bottle.polymeric.particles.visible = true;
        this.bottle.sputtering.stop();
        return {
          time: this.time,
          tweens: [
            ...this.currentBlock.press(),
            ...this.bottle.press(), 
          ].map(tween => (tween.start()))
        }
      })
      .debounce(() => this.up$)
      .map(({time, tweens}) => {
        this.bottle.polymeric.particles.visible = false;
        tweens.forEach(tween => {
          tween.stop();
        })

        const interval = Math.min(5000, this.time - time);
        this.steps.push([time, this.time]);

        [
          ...this.currentBlock.bounce(),
          ...this.bottle.bounce(),
        ].map( tween => ( tween.start() ) );


        const direction = this.nextBlock.mesh.position.clone().sub(this.bottle.mesh.position.clone()).setZ(0).normalize();
        const distance = interval / 1000 * FLIP_DISTANCE_UNIT;
        
        const completes = this.bottle.flip(distance, direction)
          .map( tween => ( tween.start() ) )
          .map(tween => {
            return Rx.Observable.bindCallback(tween.onComplete.bind(tween))()
          });

        return completes;
      })
      .debounce(completes => {
        return Rx.Observable.merge(...completes).last()
      })
      .do(() => {
        this.flipping = false;
        
        
        if (this.currentBlock.canHold(this.bottle.mesh.position)) {
          this.combo = 0;
        } else {
          
          if ( !this.nextBlock.canHold(this.bottle.mesh.position) ) {
            //game over
            this.bottle.fall();
            this.falling = true;

            //this.gameOverText.mesh.visible = true;
            this.gameOver = true;
            setTimeout(() => {
              this.falling = false;
              this.scroreText.mesh.visible = false;
              this.dispatchEvent({type: 'gameover'});
            }, 800);
          } else {
            if (this.nextBlock.hitCenter(this.bottle.mesh.position)) {
              this.bottle.waves.wave(++ this.combo);
            } else {
              this.combo = 0;
            }
            

            this.scroreText.text = (this.score += (1 + Math.min(5, this.combo)));
            

            this.bottle.sputtering.emit();
            this.createBlock();
            this.nextBlock.down();
            this.moveCamera();

            const len = this.steps.length;
            setTimeout(() => {
              if (this.steps.length === len && !this.flipping && !this.falling && !this.gameOver) {
                this.addScore(this.currentBlock.stayScore);
              }
            }, 2000);
          }
        }
      }).map((val ,index) => (index));

      _flipped$.subscribe();

      // Default world
      this.setWorld('restaurant');

  }

  setWorld(worldId) {
    const world = WORLDS[worldId];
    if (!world) return;
    this.currentWorld = worldId;

    // Update colors + fog
    const bgColor = new THREE.Color(world.bg);
    this.scene.background = bgColor;
    this.scene.fog = new THREE.FogExp2(bgColor, world.fogDensity || 0.04);
    this.ground.material.color.set(world.ground);
    this.ambientLight.color.set(world.ambient);
    this.ambientLight.intensity = world.ambientIntensity;

    // Remove previous world scene
    if (this._worldScene) {
      this.scene.remove(this._worldScene);
      this._worldScene = null;
      this._worldUpdate = null;
    }

    // Build procedural world
    const builders = {
      restaurant: buildRestaurantScene,
      espace: buildEspaceScene,
      ocean: buildOceanScene,
      nuit: buildNuitScene,
    };
    if (builders[worldId]) {
      const result = builders[worldId]();
      this._worldScene = result.group;
      this._worldUpdate = result.update || null;
      this.scene.add(this._worldScene);
    }

    this.render();
  }

  addScore(score) {
    if (score !== 0) {
      this.scroreText.text = (this.score += score);
    }
  }

  createBlock() {
    const cube = this.randomCube();
    const scale = 1 - this.random() * this.difficulty * 0.4;
    let block = new Block(cube, scale);
    if (this.blocks.length) {
        const direction = this.random() > 0.5 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
        const last = this.blocks[this.blocks.length - 1];
        const position = last.mesh.position.clone().add(direction.multiplyScalar(1.2 + this.random() * (1.2 + this.difficulty * 1.2))).setZ(0);
        block.body.position.copy(position);
        block.mesh.position.copy(position);
    } else {
        block.body.position.set(0, 0, 0);
        block.mesh.position.set(0, 0, 0);
    }
    block.mesh.visible = false;
    this.blocks.push(block);
    this.add(block);

    return block;
  }

  get currentBlock() {
      return this.blocks[this.blocks.length - 3];
  }

  get nextBlock() {
      return this.blocks[this.blocks.length - 2];
  }

  get towardsBlock() {
    return this.blocks[this.blocks.length - 1];
  }

  moveCamera(animate = true) {
    const position = this.blocks.length >= 2 ? this.nextBlock.mesh.position.clone().setZ(0).add(this.currentBlock.mesh.position.clone().setZ(0)).divideScalar(2) : new THREE.Vector3();
    const cameraTarget = new THREE.Vector3(-5, -6, 8).add(position);
    if (animate) {
      new TWEEN.Tween(this.camera.position).to(cameraTarget, 500).easing(TWEEN.Easing.Quadratic.Out).start();
    } else {
      this.camera.position.copy(cameraTarget);
    }

    this.addScoreText.mesh.lookAt(new THREE.Vector3(-5, -6, 8));
    
    this.light.position.copy(new THREE.Vector3(2, -10, 15).add(position));
    this.light.target.position.copy(position);
  }

  add(object) {
    this.world.addBody(object.body);
    this.scene.add(object.mesh);
  }

  remove(object) {
    this.world.remove(object.body);
    this.scene.remove(object.mesh);
  }


  start() {
    this.pause = false;
    this.render();
    requestAnimationFrame(this.update);
  }

  restart(seed = Math.floor(Math.random() * 0xffffff)) {
    this.resestRandom(seed);
    this.gameOver = false;
    this.scroreText.mesh.visible = true;
    this.gameOverText.mesh.visible = false;
    this.combo = 0;
    this.score = 0;
    this.scroreText.text = 0;
    this.blocks.forEach(block => {
      this.remove(block);
    })
    this.steps = [];
    this.blocks.length = 0;
    this.createBlock().mesh.visible = true;
    this.createBlock().down();
    this.createBlock();
    this.bottle.mesh.position.set(0, 0, 1);
    this.bottle.mesh.quaternion.set(0, 0, 0, 0);
    this.bottle.bottle.quaternion.setFromAxisAngle(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(1, 0, 0).angleTo( this.nextBlock.mesh.position.clone().sub(this.currentBlock.mesh.position).setZ(0).normalize() )
    );
    this.bottle.connected = false;
    this.moveCamera(false);
    
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  update = (time) => {
    if (this.pause) return;
    this.time = time;
    requestAnimationFrame(this.update);
    TWEEN.update();
    this.world.step(1/60);
    this.bottle.update();
    if (this._worldUpdate) this._worldUpdate(time, this.camera.position.y + 6);
    this.update$.next();
    this.render();
  }

  get difficulty() {
    const v = 1 - Math.pow(0.5, this.steps.length / 28);
    return v;
  }

  resestRandom(seed) {
    const twister = new Twister(seed);
    this.random = () => {
      const value = twister.random();
      return value;
    }
  }

  randomCube() {
    let sum = 0;
    cubes.forEach(i => {
      sum += i.prob;
    });

    let random = Math.floor(this.random() * (sum + 1));
    let index = 0;
    for(let i = 0; i < cubes.length; ++i) {
      random -= cubes[i].prob;
      if (random <= 0) {
        index = i;
        break;
      }
    }

    return cubes[index];
  }
}