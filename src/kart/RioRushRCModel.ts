import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { CharacterDef } from '../core/types';
import type { KartModelPartsEx } from './KartModel';
import bodyUrl from '../assets/base.glb?url';
import flUrl from '../assets/front-left.glb?url';
import frUrl from '../assets/front-right.glb?url';
import rlUrl from '../assets/back-left.glb?url';
import rrUrl from '../assets/back-right.glb?url';
const loader=new GLTFLoader();
async function load(url:string){const g=await loader.loadAsync(url);g.scene.traverse(o=>{const m=o as THREE.Mesh;if(m.isMesh){m.castShadow=true;m.receiveShadow=true;}});return g.scene;}
function tint(root:THREE.Object3D,color:number){root.traverse(o=>{const m=o as THREE.Mesh;if(!m.isMesh)return;const src=Array.isArray(m.material)?m.material[0]:m.material;if(src instanceof THREE.MeshStandardMaterial){const mat=src.clone();mat.color.lerp(new THREE.Color(color),.62);m.material=mat;}});}
export function installRioRushRCModel(parts:KartModelPartsEx,character:CharacterDef):void{
  const old=[...parts.root.children];old.forEach(c=>c.visible=false);const rc=new THREE.Group();parts.root.add(rc);
  Promise.all([load(bodyUrl),load(flUrl),load(frUrl),load(rlUrl),load(rrUrl)]).then(([body,fl,fr,rl,rr])=>{
    const box=new THREE.Box3().setFromObject(body),size=new THREE.Vector3();box.getSize(size);const scale=1.9/Math.max(size.x,size.z,.001);
    body.scale.setScalar(scale);body.rotation.y=0;body.position.y=.12;tint(body,character.color);rc.add(body);
    for(const wheel of [fl,fr,rl,rr]){wheel.scale.setScalar(scale);wheel.position.set(0,.12,0);wheel.rotation.set(0,0,0);rc.add(wheel);}
    rc.scale.setScalar(1.08);rc.position.y=.01;
  }).catch(e=>{console.error(e);old.forEach(c=>c.visible=true);rc.removeFromParent();});
}
