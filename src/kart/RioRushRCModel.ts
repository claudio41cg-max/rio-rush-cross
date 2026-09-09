import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { KartModelPartsEx } from './KartModel';
import bodyUrl from '../assets/base.glb?url';
import flUrl from '../assets/front-left.glb?url';
import frUrl from '../assets/front-right.glb?url';
import rlUrl from '../assets/back-left.glb?url';
import rrUrl from '../assets/back-right.glb?url';

const loader = new GLTFLoader();

function prepareObject(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });
}

async function load(url: string): Promise<THREE.Object3D> {
  const gltf = await loader.loadAsync(url);
  const obj = gltf.scene;
  prepareObject(obj);
  return obj;
}

export function installRioRushRCModel(parts: KartModelPartsEx): void {
  const oldChildren = [...parts.root.children];
  for (const child of oldChildren) child.visible = false;

  const rc = new THREE.Group();
  rc.name = 'rio-rush-rc-player';
  parts.root.add(rc);

  Promise.all([load(bodyUrl), load(flUrl), load(frUrl), load(rlUrl), load(rrUrl)])
    .then(([body, fl, fr, rl, rr]) => {
      const bodyBox = new THREE.Box3().setFromObject(body);
      const bodySize = new THREE.Vector3();
      bodyBox.getSize(bodySize);
      const longest = Math.max(bodySize.x, bodySize.z, 0.001);
      const scale = 1.55 / longest;

      body.scale.setScalar(scale);
      body.rotation.y = Math.PI;
      body.position.set(0, 0.18, 0);
      rc.add(body);

      const wheelScale = scale * 1.15;
      const wheels = [fl, fr, rl, rr];
      for (const wheel of wheels) {
        wheel.scale.setScalar(wheelScale);
        rc.add(wheel);
      }

      fl.position.set(-0.52, 0.18, -0.52);
      fr.position.set(0.52, 0.18, -0.52);
      rl.position.set(-0.55, 0.20, 0.50);
      rr.position.set(0.55, 0.20, 0.50);

      fl.rotation.y = Math.PI;
      fr.rotation.y = Math.PI;
      rl.rotation.y = 0;
      rr.rotation.y = 0;

      rc.scale.setScalar(0.92);
      rc.position.y = 0.02;
    })
    .catch((err) => {
      console.error('Rio Rush RC model failed to load; restoring stock kart.', err);
      for (const child of oldChildren) child.visible = true;
      rc.removeFromParent();
    });
}
