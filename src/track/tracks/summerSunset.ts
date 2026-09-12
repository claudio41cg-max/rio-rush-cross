import type { TrackDefinition } from '../../core/types';

/** Copa Verão 3/5 — orla ao pôr do sol, com morros e sequência técnica. */
export const summerSunset: TrackDefinition = {
  id: 'summer_sunset', name: 'Orla do Pôr do Sol', theme: 'beach', laps: 3,
  description: 'Orla dourada com subida longa, descida rápida e uma sequência de curvas em S perto do mar.', difficulty: 2,
  controlPoints: [
    {x:0,y:0,z:0},{x:-18,y:0,z:-70},{x:-4,y:2,z:-138},{x:42,y:7,z:-190},
    {x:105,y:13,z:-205},{x:160,y:16,z:-168},{x:182,y:14,z:-105},{x:170,y:10,z:-48},
    {x:120,y:6,z:-18},{x:78,y:4,z:12},{x:120,y:7,z:42},{x:152,y:11,z:82},
    {x:124,y:14,z:126},{x:66,y:11,z:154},{x:18,y:6,z:145},{x:-18,y:3,z:108},
    {x:-32,y:1,z:64},{x:-24,y:0,z:26}
  ],
  halfWidth:8.4,
  halfWidths:[8.8,8.8,8.6,8.3,8.2,8.2,8.3,8.5,8.4,8.2,8.1,8.1,8.3,8.6,8.8,8.6,8.6,8.8],
  wallHalfWidthFactor:1.6,itemBoxRows:[.11,.36,.6,.83],boostPads:[.20,.47,.71,.9],
  environment:{skyTop:0x4f67b4,skyHorizon:0xffad76,skyBottom:0xffdba9,fogColor:0xe3b493,fogDensity:.00145,sunColor:0xffc184,sunIntensity:2.8,sunDirection:{x:-.5,y:.62,z:.28},ambientSky:0xa6a3d0,ambientGround:0xb7855f,ambientIntensity:1.12},
  palette:{road:0x515054,roadStripe:0xffedc7,curb:0xff8747,curbAlt:0xfff6e6,offroad:0xcfa775,wall:0x39353b,ground:0xc59a6d}
};
