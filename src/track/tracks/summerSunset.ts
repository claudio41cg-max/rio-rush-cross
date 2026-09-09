import type { TrackDefinition } from '../../core/types';

/** Copa Verão 2/3 — orla ao pôr do sol, técnica mas limpa e sem cruzamentos. */
export const summerSunset: TrackDefinition = {
  id: 'summer_sunset', name: 'Orla do Pôr do Sol', theme: 'beach', laps: 3,
  description: 'Orla dourada, curvas em sequência e uma subida suave com vista para o mar.', difficulty: 2,
  controlPoints: [
    {x:0,y:0,z:0},{x:-10,y:0,z:-62},{x:4,y:.4,z:-128},{x:38,y:1.2,z:-180},
    {x:88,y:2.5,z:-210},{x:142,y:3.8,z:-202},{x:184,y:4.4,z:-164},{x:202,y:3.5,z:-112},
    {x:194,y:2.6,z:-56},{x:166,y:1.5,z:-12},{x:178,y:1.8,z:36},{x:164,y:1.5,z:84},
    {x:130,y:1,z:126},{x:84,y:.4,z:150},{x:38,y:0,z:142},{x:4,y:0,z:110},
    {x:-16,y:0,z:66},{x:-18,y:0,z:24}
  ],
  halfWidth:8.4,
  halfWidths:[8.8,8.8,8.6,8.4,8.4,8.4,8.6,8.8,8.8,8.4,8.4,8.4,8.6,8.8,8.8,8.6,8.6,8.8],
  wallHalfWidthFactor:1.6,itemBoxRows:[.11,.36,.6,.83],boostPads:[.22,.49,.89],
  environment:{skyTop:0x3b4f9f,skyHorizon:0xff9f66,skyBottom:0xffd39b,fogColor:0xd9a882,fogDensity:.0017,sunColor:0xffb46a,sunIntensity:2.5,sunDirection:{x:-.62,y:.42,z:.34},ambientSky:0x8d88ba,ambientGround:0x9e704d,ambientIntensity:.86},
  palette:{road:0x4a494c,roadStripe:0xffe7b6,curb:0xff7d3a,curbAlt:0xfff3df,offroad:0xc79c68,wall:0x343035,ground:0xbc8f60}
};
