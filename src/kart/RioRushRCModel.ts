import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { CharacterDef } from '../core/types';
import type { KartModelPartsEx } from './KartModel';
import bodyUrl from '../assets/base.glb?url';
import flUrl from '../assets/front-left.glb?url';
import frUrl from '../assets/front-right.glb?url';
import rlUrl from '../assets/back-left.glb?url';
import rrUrl from '../assets/back-right.glb?url';

const loader = new GLTFLoader();
type RcAssets = { body: THREE.Object3D; fl: THREE.Object3D; fr: THREE.Object3D; rl: THREE.Object3D; rr: THREE.Object3D };
let sharedAssetsPromise: Promise<RcAssets> | null = null;
function prepare(root: THREE.Object3D): THREE.Object3D { root.traverse((obj) => { const mesh=obj as THREE.Mesh; if(mesh.isMesh){mesh.castShadow=true;mesh.receiveShadow=true;} }); return root; }
function loadOne(url:string):Promise<THREE.Object3D>{return loader.loadAsync(url).then((gltf)=>prepare(gltf.scene));}
function getSharedAssets():Promise<RcAssets>{if(!sharedAssetsPromise)sharedAssetsPromise=Promise.all([loadOne(bodyUrl),loadOne(flUrl),loadOne(frUrl),loadOne(rlUrl),loadOne(rrUrl)]).then(([body,fl,fr,rl,rr])=>({body,fl,fr,rl,rr}));return sharedAssetsPromise;}
function cloneForRacer(source:THREE.Object3D):THREE.Object3D{const clone=source.clone(true);clone.traverse((obj)=>{const mesh=obj as THREE.Mesh;if(!mesh.isMesh)return;if(Array.isArray(mesh.material))mesh.material=mesh.material.map((m)=>m.clone());else if(mesh.material)mesh.material=mesh.material.clone();});return clone;}
function tintBody(root:THREE.Object3D,color:number,accent:number):void{let index=0;root.traverse((obj)=>{const mesh=obj as THREE.Mesh;if(!mesh.isMesh)return;const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];for(const material of mats){if(!(material instanceof THREE.MeshStandardMaterial))continue;const target=new THREE.Color(index++%4===0?accent:color);material.color.lerp(target,.68);material.metalness=Math.max(material.metalness,.22);material.roughness=Math.min(material.roughness,.52);}});}

/** Shared RC assets: load once and clone for all racers. */
export function installRioRushRCModel(parts:KartModelPartsEx,character:CharacterDef):void{
  const oldChildren=[...parts.root.children];const rc=new THREE.Group();rc.name=`rc-rush-${character.id}`;parts.root.add(rc);
  getSharedAssets().then((assets)=>{
    const body=cloneForRacer(assets.body),fl=cloneForRacer(assets.fl),fr=cloneForRacer(assets.fr),rl=cloneForRacer(assets.rl),rr=cloneForRacer(assets.rr);
    const box=new THREE.Box3().setFromObject(body),size=new THREE.Vector3();box.getSize(size);const scale=1.9/Math.max(size.x,size.z,.001);
    body.scale.setScalar(scale);body.rotation.y=0;body.position.y=.12;tintBody(body,character.color,character.accent);rc.add(body);
    for(const wheel of [fl,fr,rl,rr]){wheel.scale.setScalar(scale);wheel.position.y+=.12;rc.add(wheel);}
    // Keep all racers at the approved visual size, but lower the model so the tyres sit on the road instead of looking airborne.
    rc.scale.setScalar(1.20);rc.position.y=-.10;
    for(const child of oldChildren)child.visible=false;
  }).catch((err)=>{console.error('[RC Rush] Falha ao carregar o modelo RC; mantendo o carro provisório.',err);rc.removeFromParent();for(const child of oldChildren)child.visible=true;});
}
