import type { CharacterDef } from '../core/types';
export const CHARACTERS: CharacterDef[] = [
  {id:'zippy',name:'Vermelho',color:0xe32222,accent:0xffd23f,driverColor:0xffffff,weightClass:'medium',stats:{speed:.55,acceleration:.55,handling:.55,weight:.5,miniTurbo:.55},tagline:'Equilibrado em tudo.'},
  {id:'pixel',name:'Azul',color:0x1769ff,accent:0x5fd8ff,driverColor:0xffffff,weightClass:'light',stats:{speed:.72,acceleration:.48,handling:.58,weight:.35,miniTurbo:.55},tagline:'Alta velocidade.'},
  {id:'fennec',name:'Verde',color:0x1f9a4b,accent:0x8cff65,driverColor:0xffffff,weightClass:'light',stats:{speed:.48,acceleration:.58,handling:.82,weight:.35,miniTurbo:.6},tagline:'Mais aderência.'},
  {id:'max',name:'Amarelo',color:0xffcf1f,accent:0xff8a00,driverColor:0xffffff,weightClass:'light',stats:{speed:.45,acceleration:.88,handling:.62,weight:.3,miniTurbo:.62},tagline:'Aceleração forte.'},
  {id:'juno',name:'Laranja',color:0xff6a00,accent:0xffd04d,driverColor:0xffffff,weightClass:'medium',stats:{speed:.58,acceleration:.6,handling:.58,weight:.5,miniTurbo:.58},tagline:'Todo terreno.'},
  {id:'kai',name:'Roxo',color:0x7c3aed,accent:0xd46bff,driverColor:0xffffff,weightClass:'medium',stats:{speed:.5,acceleration:.55,handling:.78,weight:.45,miniTurbo:.68},tagline:'Controle preciso.'},
  {id:'bram',name:'Branco',color:0xf2f2f2,accent:0x8fdcff,driverColor:0x222222,weightClass:'light',stats:{speed:.62,acceleration:.7,handling:.65,weight:.25,miniTurbo:.62},tagline:'Leve e ágil.'},
  {id:'rosa',name:'Preto',color:0x24242a,accent:0xff3030,driverColor:0xffffff,weightClass:'heavy',stats:{speed:1,acceleration:.25,handling:.38,weight:.9,miniTurbo:.35},tagline:'Potência máxima.'},

  // Modelos clássicos do Turbo Kart Rush original. Eles usam o kart procedural
  // original do jogo em vez da carroceria RC importada.
  {id:'classic_sprint',name:'Clássico Sprint',color:0xf24d3d,accent:0xffd166,driverColor:0xffffff,weightClass:'light',stats:{speed:.7,acceleration:.72,handling:.7,weight:.3,miniTurbo:.65},tagline:'O kart original leve e rápido.'},
  {id:'classic_grip',name:'Clássico Grip',color:0x23a36d,accent:0x8fffd1,driverColor:0xffffff,weightClass:'medium',stats:{speed:.63,acceleration:.62,handling:.84,weight:.5,miniTurbo:.7},tagline:'O clássico com foco em controle.'},
  {id:'classic_turbo',name:'Clássico Turbo',color:0x5d55e8,accent:0xf56cff,driverColor:0xffffff,weightClass:'medium',stats:{speed:.82,acceleration:.62,handling:.61,weight:.55,miniTurbo:.8},tagline:'Conquista especial para campeões.'},
  {id:'classic_heavy',name:'Clássico Titã',color:0x2d3038,accent:0xff9f1c,driverColor:0xffffff,weightClass:'heavy',stats:{speed:.9,acceleration:.42,handling:.46,weight:.92,miniTurbo:.48},tagline:'Conquista especial de alto nível.'},
];
export function getCharacter(id:string):CharacterDef{return CHARACTERS.find(c=>c.id===id)??CHARACTERS[0];}
