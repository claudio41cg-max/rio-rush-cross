import * as THREE from 'three';
import type { Checkpoint, ITrack, MinimapData, StartSlot, SurfaceQuery, SurfaceType, TrackDefinition, TrackSample } from '../core/types';
import { CHECKPOINT_COUNT, ITEM_BOX_ROW_SIZE, KART_COUNT } from '../core/constants';
import { lerp, seededRandom, smoothstep, trackDelta, wrap01 } from '../core/math';
import { Centerline } from './Centerline';
import { TerrainField } from './TerrainField';
import type { BuildContext, Updater } from './builders/context';
import { buildRoad } from './builders/road';
import { buildBarriers, isVoidT } from './builders/barriers';
import { buildMountains, buildTerrain } from './builders/terrain';
import { buildSky } from './builders/sky';
import { buildDecorations } from './builders/decor';
import { BOOST_PAD_LENGTH, buildBoostPads, buildGantry, buildGrandstands, buildSponsorBridges, computeItemBoxPositions, type BoostPadInfo } from './builders/props';
import { buildAnimatedProps } from './builders/animated';
import { buildLandmarks } from './builders/landmarks';
import { buildSummerScenery } from './builders/summerScenery';

const BOOST_PAD_HALF_LENGTH = BOOST_PAD_LENGTH / 2;
const OFFROAD_BLEND_START = 0.5;
const OFFROAD_BLEND_END = 4.5;

export function createTrackSample(): TrackSample { return { position:new THREE.Vector3(), tangent:new THREE.Vector3(0,0,-1), normal:new THREE.Vector3(0,1,0), binormal:new THREE.Vector3(1,0,0), halfWidth:8, wallHalfWidth:12, t:0 }; }
export function createSurfaceQuery(): SurfaceQuery { return { t:0,surface:'road',groundY:0,groundNormal:new THREE.Vector3(0,1,0),lateral:0,halfWidth:8,wallHalfWidth:12,tangent:new THREE.Vector3(0,0,-1),binormal:new THREE.Vector3(1,0,0),center:new THREE.Vector3() }; }
const _qs=createTrackSample(); const _gs=createTrackSample();
function hashString(s:string):number { let h=2166136261; for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);} return h>>>0; }

export class Track implements ITrack {
 readonly def:TrackDefinition; readonly object:THREE.Group; readonly length:number; readonly checkpoints:readonly Checkpoint[]; readonly startGrid:readonly StartSlot[]; readonly itemBoxPositions:readonly THREE.Vector3[]; readonly boostPads:readonly BoostPadInfo[]; readonly minimap:MinimapData;
 private readonly cl:Centerline; private readonly field:TerrainField; private readonly updaters:Updater[]=[]; private readonly disposables:{dispose():void}[]=[]; private readonly timeUniform={value:0}; private readonly boostPadTs:number[]; private readonly boostPadHalfWidths:Float64Array; private disposed=false;
 constructor(def:TrackDefinition){
  this.def=def; this.cl=new Centerline(def); this.length=this.cl.length; this.field=new TerrainField(def,this.cl); this.boostPadTs=def.boostPads.map(t=>wrap01(t));
  const ctx:BuildContext={def,cl:this.cl,field:this.field,rng:seededRandom(hashString(def.id)),disposables:this.disposables,updaters:this.updaters,timeUniform:this.timeUniform};
  this.checkpoints=this.buildCheckpoints(); this.startGrid=this.buildStartGrid(); this.itemBoxPositions=computeItemBoxPositions(ctx,ITEM_BOX_ROW_SIZE); this.minimap=this.buildMinimap();
  const root=new THREE.Group(); root.name=`track:${def.id}`; root.add(buildSky(ctx)); root.add(buildTerrain(ctx)); root.add(buildMountains(ctx)); root.add(buildRoad(ctx)); root.add(buildBarriers(ctx));
  const cleanCoastal=def.id==='coastal_rush';
  const specialSummer=def.id==='summer_beach'||def.id==='summer_sunset'||def.id==='summer_tropical';
  if(!cleanCoastal&&!specialSummer){ root.add(buildDecorations(ctx)); root.add(buildLandmarks(ctx)); }
  if(!cleanCoastal){ if(def.id!=='summer_sunset') root.add(buildGrandstands(ctx)); root.add(buildGantry(ctx)); root.add(buildSponsorBridges(ctx)); root.add(buildAnimatedProps(ctx)); }
  if(specialSummer) root.add(buildSummerScenery(ctx));
  const pads:BoostPadInfo[]=[]; const padGroup=buildBoostPads(ctx,pads); if(padGroup) root.add(padGroup); this.boostPads=pads; this.boostPadHalfWidths=new Float64Array(this.boostPadTs.length); for(let i=0;i<pads.length&&i<this.boostPadHalfWidths.length;i++) this.boostPadHalfWidths[i]=pads[i].halfWidth;
  this.object=root;
 }
 sample(t:number,out?:TrackSample):TrackSample{return this.cl.sample(t,out??createTrackSample());}
 closestT(position:THREE.Vector3,hintT?:number):number{return this.cl.closestT(position.x,position.z,hintT);}
 query(position:THREE.Vector3,hintT?:number,out?:SurfaceQuery):SurfaceQuery{const q=out??createSurfaceQuery();const t=this.cl.closestT(position.x,position.z,hintT);this.cl.sample(t,_qs);q.t=t;q.center.copy(_qs.position);q.tangent.copy(_qs.tangent);q.binormal.copy(_qs.binormal);q.halfWidth=_qs.halfWidth;q.wallHalfWidth=_qs.wallHalfWidth;const dx=position.x-_qs.position.x,dz=position.z-_qs.position.z,lateral=dx*_qs.binormal.x+dz*_qs.binormal.z;q.lateral=lateral;const a=Math.abs(lateral),hw=_qs.halfWidth,whw=_qs.wallHalfWidth;let surface:SurfaceType;if(a<=hw)surface=this.isBoostAt(t,a)?'boost':'road';else if(a<=whw)surface='offroad';else surface=isVoidT(this.def,t)?'void':'wall';q.surface=surface;const roadY=_qs.position.y;if(a<=whw+OFFROAD_BLEND_START){q.groundY=roadY;q.groundNormal.copy(_qs.normal);}else{const k=smoothstep(whw+OFFROAD_BLEND_START,whw+OFFROAD_BLEND_END,a);const terrain=this.field.heightAt(position.x,position.z);q.groundY=lerp(roadY,terrain,k);const e=.6,hx1=this.field.heightAt(position.x+e,position.z),hx0=this.field.heightAt(position.x-e,position.z),hz1=this.field.heightAt(position.x,position.z+e),hz0=this.field.heightAt(position.x,position.z-e),nx=(hx0-hx1)/(2*e),nz=(hz0-hz1)/(2*e);q.groundNormal.set(lerp(_qs.normal.x,nx,k),lerp(_qs.normal.y,1,k),lerp(_qs.normal.z,nz,k)).normalize();}return q;}
 heightAt(x:number,z:number):number{return this.field.heightAt(x,z);}
 private isBoostAt(t:number,absLateral:number):boolean{for(let i=0;i<this.boostPadTs.length;i++)if(absLateral<=this.boostPadHalfWidths[i]&&Math.abs(trackDelta(this.boostPadTs[i],t))*this.length<=BOOST_PAD_HALF_LENGTH)return true;return false;}
 update(dt:number,elapsed:number):void{this.timeUniform.value=elapsed;for(let i=0;i<this.updaters.length;i++)this.updaters[i](dt,elapsed);}
 dispose():void{if(this.disposed)return;this.disposed=true;const seen=new Set<{dispose():void}>();for(const d of this.disposables){if(seen.has(d))continue;seen.add(d);d.dispose();}this.object.traverse(o=>{const mesh=o as THREE.Mesh;if(mesh.geometry&&!seen.has(mesh.geometry)){seen.add(mesh.geometry);mesh.geometry.dispose();}const m=mesh.material as THREE.Material|THREE.Material[]|undefined;if(!m)return;for(const mat of(Array.isArray(m)?m:[m])){if(seen.has(mat))continue;seen.add(mat);mat.dispose();}});this.updaters.length=0;this.disposables.length=0;this.object.clear();this.object.removeFromParent();}
 private buildCheckpoints():Checkpoint[]{const out:Checkpoint[]=[];for(let i=0;i<CHECKPOINT_COUNT;i++){const t=i/CHECKPOINT_COUNT;this.cl.sample(t,_gs);out.push({index:i,t,position:_gs.position.clone(),forward:_gs.tangent.clone(),halfWidth:_gs.halfWidth,isFinishLine:i===0});}return out;}
 private buildStartGrid():StartSlot[]{const slots:StartSlot[]=[];const rowSpacing=4.5,lateral=2.2,firstRow=6,count=Math.max(KART_COUNT,8),euler=new THREE.Euler();for(let i=0;i<count;i++){const row=Math.floor(i/2),col=i%2,sBack=firstRow+row*rowSpacing+(col===1?rowSpacing*.5:0),t=this.cl.tOf(-sBack);this.cl.sample(t,_gs);const lat=col===0?-lateral:lateral;const position=new THREE.Vector3(_gs.position.x+_gs.binormal.x*lat,_gs.position.y,_gs.position.z+_gs.binormal.z*lat);const heading=Math.atan2(-_gs.tangent.x,-_gs.tangent.z);euler.set(0,heading,0);slots.push({position,quaternion:new THREE.Quaternion().setFromEuler(euler),t});}return slots;}
 private buildMinimap():MinimapData{const N=200,points:{x:number;y:number}[]=[],leftEdge:{x:number;y:number}[]=[],rightEdge:{x:number;y:number}[]=[],cw:THREE.Vector3[]=[],lw:THREE.Vector3[]=[],rw:THREE.Vector3[]=[];let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;for(let k=0;k<N;k++){this.cl.sample(k/N,_gs);const c=_gs.position.clone(),l=new THREE.Vector3(c.x-_gs.binormal.x*_gs.halfWidth,c.y,c.z-_gs.binormal.z*_gs.halfWidth),r=new THREE.Vector3(c.x+_gs.binormal.x*_gs.halfWidth,c.y,c.z+_gs.binormal.z*_gs.halfWidth);cw.push(c);lw.push(l);rw.push(r);for(const p of[l,r]){if(p.x<minX)minX=p.x;if(p.x>maxX)maxX=p.x;if(p.z<minZ)minZ=p.z;if(p.z>maxZ)maxZ=p.z;}}const w=maxX-minX,h=maxZ-minZ,size=Math.max(w,h)*1.08,ox=minX-(size-w)/2,oz=minZ-(size-h)/2,worldToMap=(x:number,z:number)=>({x:(x-ox)/size,y:(z-oz)/size});for(let k=0;k<N;k++){points.push(worldToMap(cw[k].x,cw[k].z));leftEdge.push(worldToMap(lw[k].x,lw[k].z));rightEdge.push(worldToMap(rw[k].x,rw[k].z));}return{points,leftEdge,rightEdge,worldToMap};}
}