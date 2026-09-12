import * as THREE from 'three';
import type { BuildContext } from './context';
import type { TrackSample } from '../../core/types';

function makeSample(): TrackSample {
  return {
    position: new THREE.Vector3(),
    tangent: new THREE.Vector3(0, 0, -1),
    normal: new THREE.Vector3(0, 1, 0),
    binormal: new THREE.Vector3(1, 0, 0),
    halfWidth: 8,
    wallHalfWidth: 12,
    t: 0,
  };
}

function makePalm(): THREE.Group {
  const g = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.95 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f8f3d, roughness: 0.8, side: THREE.DoubleSide });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 7.4, 7), trunkMat);
  trunk.position.y = 3.7;
  trunk.castShadow = true;
  g.add(trunk);
  for (let i = 0; i < 8; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.85, 5.6, 4), leafMat);
    leaf.rotation.z = Math.PI / 2.25;
    leaf.rotation.y = (i / 8) * Math.PI * 2;
    leaf.position.y = 7.1;
    leaf.position.x = Math.cos(leaf.rotation.y) * 1.7;
    leaf.position.z = Math.sin(leaf.rotation.y) * 1.7;
    leaf.castShadow = true;
    g.add(leaf);
  }
  return g;
}

function makeUmbrella(color: number): THREE.Group {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.07, 2.2, 6),
    new THREE.MeshStandardMaterial({ color: 0xe8e2d6, roughness: 0.8 }),
  );
  pole.position.y = 1.1;
  const top = new THREE.Mesh(
    new THREE.ConeGeometry(1.25, 0.55, 16),
    new THREE.MeshStandardMaterial({ color, roughness: 0.75, side: THREE.DoubleSide }),
  );
  top.position.y = 2.25;
  g.add(pole, top);
  return g;
}

function makeCoastQuad(
  sample: TrackSample,
  side: number,
  innerOffset: number,
  outerOffset: number,
  halfLength: number,
  yOffset: number,
  material: THREE.Material,
): THREE.Mesh {
  const p = sample.position;
  const t = sample.tangent;
  const b = sample.binormal;
  const s = side;
  const vertices = new Float32Array([
    p.x - t.x * halfLength + b.x * s * innerOffset, p.y + yOffset, p.z - t.z * halfLength + b.z * s * innerOffset,
    p.x + t.x * halfLength + b.x * s * innerOffset, p.y + yOffset, p.z + t.z * halfLength + b.z * s * innerOffset,
    p.x + t.x * halfLength + b.x * s * outerOffset, p.y + yOffset, p.z + t.z * halfLength + b.z * s * outerOffset,
    p.x - t.x * halfLength + b.x * s * outerOffset, p.y + yOffset, p.z - t.z * halfLength + b.z * s * outerOffset,
  ]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  return mesh;
}

function addCoastStrip(root: THREE.Group, sample: TrackSample, side: number, sunset: boolean): void {
  const sandMat = new THREE.MeshStandardMaterial({
    color: sunset ? 0xd6a56f : 0xe8cf94,
    roughness: 0.98,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  const waterMat = new THREE.MeshStandardMaterial({
    color: sunset ? 0x3177a8 : 0x1aa7c7,
    roughness: 0.28,
    metalness: 0.08,
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide,
  });

  const sandInner = sample.wallHalfWidth + 1.5;
  const sandOuter = sample.wallHalfWidth + 8.5;
  const waterInner = sandOuter;
  const waterOuter = sample.wallHalfWidth + 31;
  root.add(makeCoastQuad(sample, side, sandInner, sandOuter, 31, -0.05, sandMat));
  root.add(makeCoastQuad(sample, side, waterInner, waterOuter, 31, -0.18, waterMat));
}

function addSunsetGrandstand(root: THREE.Group, ctx: BuildContext, sample: TrackSample, landSide: number): void {
  // One compact stand on the land side, well outside the barriers. Keeping it
  // short and one-sided prevents it from crossing the nearby return section.
  ctx.cl.sample(0.015, sample);
  const stand = new THREE.Group();
  stand.name = 'sunset-safe-grandstand';

  const concrete = new THREE.MeshStandardMaterial({ color: 0x8d8b91, roughness: 0.9 });
  const seatColors = [0xf04a47, 0xffd34e, 0x42b7ff, 0x7bd66a, 0xd45adf];
  const length = 25;
  const tiers = 4;
  const depth = 1.65;
  const rise = 0.95;

  for (let k = 0; k < tiers; k++) {
    const tier = new THREE.Mesh(new THREE.BoxGeometry(depth, rise * (k + 1), length), concrete);
    tier.position.set(k * depth, rise * (k + 1) * 0.5, 0);
    tier.castShadow = true;
    tier.receiveShadow = true;
    stand.add(tier);

    const seatMat = new THREE.MeshStandardMaterial({ color: seatColors[k % seatColors.length], roughness: 0.75 });
    for (let c = 0; c < 22; c++) {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.45, 0.48), seatMat);
      seat.position.set(k * depth - 0.35, rise * (k + 1) + 0.24, -length * 0.5 + 0.7 + c * 1.08);
      stand.add(seat);
    }
  }

  const roofMat = new THREE.MeshStandardMaterial({ color: 0x8f2f38, roughness: 0.75 });
  const roof = new THREE.Mesh(new THREE.BoxGeometry(tiers * depth + 2.5, 0.28, length + 1.8), roofMat);
  roof.position.set((tiers - 1) * depth * 0.5, 7.1, 0);
  roof.rotation.z = -0.08 * landSide;
  stand.add(roof);

  // Support poles stay on the back of the stand, away from the racing surface.
  for (const z of [-length * 0.42, 0, length * 0.42]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 7.1, 6), concrete);
    pole.position.set(tiers * depth + 0.7, 3.55, z);
    stand.add(pole);
  }

  const distance = sample.wallHalfWidth + 19;
  stand.position.set(
    sample.position.x + sample.binormal.x * landSide * distance,
    sample.position.y,
    sample.position.z + sample.binormal.z * landSide * distance,
  );
  stand.rotation.y = Math.atan2(-sample.tangent.x, -sample.tangent.z);
  if (landSide > 0) stand.rotation.y += Math.PI;
  root.add(stand);
}

export function buildSummerScenery(ctx: BuildContext): THREE.Group {
  const root = new THREE.Group();
  root.name = 'summer-scenery';
  const isSummer = ctx.def.id === 'summer_beach' || ctx.def.id === 'summer_sunset' || ctx.def.id === 'summer_tropical';
  if (!isSummer) return root;

  const sample = makeSample();
  const sunset = ctx.def.id === 'summer_sunset';
  const tropical = ctx.def.id === 'summer_tropical';
  const waterSide = tropical ? -1 : 1;

  const waterSteps = tropical ? 14 : 12;
  for (let i = 0; i < waterSteps; i++) {
    ctx.cl.sample((i + 0.5) / waterSteps, sample);
    addCoastStrip(root, sample, waterSide, sunset);
  }

  if (sunset) addSunsetGrandstand(root, ctx, sample, -waterSide);

  const palmBase = makePalm();
  const palmCount = tropical ? 34 : sunset ? 28 : 30;
  for (let i = 0; i < palmCount; i++) {
    const t = (i + 0.35) / palmCount;
    ctx.cl.sample(t, sample);
    const side = i % 3 === 0 ? -waterSide : waterSide;
    const distance = sample.wallHalfWidth + 7 + (i % 4) * 2.4;
    const palm = palmBase.clone(true);
    const scale = 0.78 + (i % 5) * 0.08;
    palm.scale.setScalar(scale);
    palm.position.set(
      sample.position.x + sample.binormal.x * side * distance,
      sample.position.y,
      sample.position.z + sample.binormal.z * side * distance,
    );
    palm.rotation.y = (i * 1.618) % (Math.PI * 2);
    root.add(palm);
  }

  const umbrellaColors = [0xff5b45, 0xffd34e, 0x42b7ff, 0xffffff];
  const umbrellaCount = tropical ? 16 : 18;
  for (let i = 0; i < umbrellaCount; i++) {
    const t = (i + 0.7) / umbrellaCount;
    ctx.cl.sample(t, sample);
    const side = -waterSide;
    const u = makeUmbrella(umbrellaColors[i % umbrellaColors.length]);
    const distance = sample.wallHalfWidth + 8 + (i % 3) * 3;
    u.position.set(
      sample.position.x + sample.binormal.x * side * distance,
      sample.position.y,
      sample.position.z + sample.binormal.z * side * distance,
    );
    u.rotation.y = i * 0.7;
    root.add(u);
  }

  if (tropical) {
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x8f8d83, roughness: 1 });
    for (let i = 0; i < 22; i++) {
      const t = (i + 0.2) / 22;
      ctx.cl.sample(t, sample);
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.8 + (i % 4) * 0.45, 0), rockMat);
      const side = waterSide;
      const distance = sample.wallHalfWidth + 15 + (i % 5) * 3.2;
      rock.position.set(
        sample.position.x + sample.binormal.x * side * distance,
        sample.position.y - 0.3,
        sample.position.z + sample.binormal.z * side * distance,
      );
      rock.scale.y = 0.8 + (i % 3) * 0.35;
      rock.rotation.set(i * 0.15, i * 0.41, i * 0.09);
      rock.castShadow = true;
      rock.receiveShadow = true;
      root.add(rock);
    }
  }

  return root;
}
